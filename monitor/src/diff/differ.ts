import type {
  PageDiff,
  PageSnapshot,
  ParagraphChange,
  PdfLink,
  TrackedPage,
} from "../types.ts";
import { isNoiseRelated } from "./noiseFlags.ts";

function paragraphsOf(snapshot: PageSnapshot): string[] {
  const out: string[] = [];
  for (const section of snapshot.sections) {
    if (section.heading) out.push(`# ${section.heading}`);
    out.push(...section.paragraphs);
  }
  return out;
}

function tokenSet(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length > 1)
  );
}

/** Jaccard similarity over word tokens — used to pair a removed paragraph with its edited successor. */
function similarity(a: string, b: string): number {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return common / (ta.size + tb.size - common);
}

const DATE_TOKEN =
  /\b(19|20)\d{2}\b|\b[1-4]\.\s*kvartal\b|\bprimo\b|\bmedio\b|\bultimo\b|\bjanuar\b|\bfebruar\b|\bmarts\b|\bapril\b|\bmaj\b|\bjuni\b|\bjuli\b|\baugust\b|\bseptember\b|\boktober\b|\bnovember\b|\bdecember\b|\b\d{1,2}\.\s*(januar|februar|marts|april|maj|juni|juli|august|september|oktober|november|december)\b/gi;

function dateTokens(s: string): string {
  return (s.match(DATE_TOKEN) ?? []).map((t) => t.toLowerCase()).sort().join("|");
}

function diffPdfs(before: PdfLink[], after: PdfLink[]): { added: PdfLink[]; removed: PdfLink[] } {
  const beforeUrls = new Set(before.map((p) => p.url));
  const afterUrls = new Set(after.map((p) => p.url));
  return {
    added: after.filter((p) => !beforeUrls.has(p.url)),
    removed: before.filter((p) => !afterUrls.has(p.url)),
  };
}

export function diffSnapshots(
  page: TrackedPage,
  previous: PageSnapshot | null,
  current: PageSnapshot
): PageDiff {
  const base: PageDiff = {
    pageId: page.id,
    url: page.url,
    label: page.label,
    priority: page.priority,
    status: "unchanged",
    addedParagraphs: [],
    removedParagraphs: [],
    changedParagraphs: [],
    dateChanges: [],
    addedPdfs: [],
    removedPdfs: [],
    noiseHits: [],
  };

  if (!previous) {
    base.status = "new";
    base.addedParagraphs = paragraphsOf(current);
    base.addedPdfs = current.pdfLinks;
    base.noiseHits = base.addedParagraphs.filter(isNoiseRelated);
    return base;
  }

  if (previous.textHash === current.textHash) {
    // Text identical; PDFs can still differ (link hrefs are not part of the hash).
    const { added, removed } = diffPdfs(previous.pdfLinks, current.pdfLinks);
    base.addedPdfs = added;
    base.removedPdfs = removed;
    if (added.length > 0 || removed.length > 0) base.status = "changed";
    base.noiseHits = added.filter((p) => isNoiseRelated(`${p.text} ${p.url}`)).map((p) => p.text || p.url);
    return base;
  }

  base.status = "changed";
  const beforeParas = paragraphsOf(previous);
  const afterParas = paragraphsOf(current);
  const beforeSet = new Set(beforeParas);
  const afterSet = new Set(afterParas);
  let removed = beforeParas.filter((p) => !afterSet.has(p));
  const added = afterParas.filter((p) => !beforeSet.has(p));

  // Pair up edits: an added paragraph similar enough to a removed one is a change.
  const changed: ParagraphChange[] = [];
  const unmatchedAdded: string[] = [];
  for (const a of added) {
    let bestIdx = -1;
    let bestScore = 0;
    removed.forEach((r, i) => {
      const score = similarity(a, r);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    });
    if (bestScore >= 0.5 && bestIdx >= 0) {
      changed.push({ before: removed[bestIdx]!, after: a });
      removed = removed.filter((_, i) => i !== bestIdx);
    } else {
      unmatchedAdded.push(a);
    }
  }

  base.addedParagraphs = unmatchedAdded;
  base.removedParagraphs = removed;
  base.changedParagraphs = changed;
  base.dateChanges = changed.filter((c) => dateTokens(c.before) !== dateTokens(c.after));

  const pdfDiff = diffPdfs(previous.pdfLinks, current.pdfLinks);
  base.addedPdfs = pdfDiff.added;
  base.removedPdfs = pdfDiff.removed;

  base.noiseHits = [
    ...new Set([
      ...unmatchedAdded.filter(isNoiseRelated),
      ...changed.filter((c) => isNoiseRelated(c.after) || isNoiseRelated(c.before)).map((c) => c.after),
      ...pdfDiff.added.filter((p) => isNoiseRelated(`${p.text} ${p.url}`)).map((p) => p.text || p.url),
    ]),
  ];
  return base;
}
