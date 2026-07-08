import { isNoiseRelated } from "../diff/noiseFlags.ts";
import type {
  ChangeFeedEntry,
  ChangeFeedPage,
  PageDiff,
  PageSnapshot,
  ParagraphChange,
  TrackedPage,
} from "../types.ts";

/** Keep feed payloads small; the website only needs a readable excerpt. */
function truncate(s: string, max = 400): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function truncateChange(c: ParagraphChange): ParagraphChange {
  return { before: truncate(c.before), after: truncate(c.after) };
}

function toFeedPage(diff: PageDiff): ChangeFeedPage {
  return {
    pageId: diff.pageId,
    label: diff.label,
    url: diff.url,
    priority: diff.priority,
    status: diff.status === "new" ? "new" : "changed",
    addedParagraphs: diff.addedParagraphs.map((p) => truncate(p)),
    removedParagraphs: diff.removedParagraphs.map((p) => truncate(p)),
    changedParagraphs: diff.changedParagraphs.map(truncateChange),
    dateChanges: diff.dateChanges.map(truncateChange),
    addedPdfs: diff.addedPdfs,
    removedPdfs: diff.removedPdfs,
    noiseHits: diff.noiseHits.map((h) => truncate(h)),
  };
}

/**
 * Build a feed entry from a run's diffs, or null when nothing changed. Only
 * `new`/`changed` pages are included — `unchanged`/`error` pages are omitted so
 * the website feed is a pure changelog.
 */
export function buildChangeFeedEntry(runId: string, diffs: PageDiff[]): ChangeFeedEntry | null {
  const pages = diffs
    .filter((d) => d.status === "new" || d.status === "changed")
    .sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "high" ? -1 : 1))
    .map(toFeedPage);
  if (pages.length === 0) return null;
  return { runId, fetchedAt: new Date().toISOString(), pages };
}

function seedPage(page: TrackedPage, snapshot: PageSnapshot): ChangeFeedPage {
  const paragraphs = snapshot.sections.flatMap((s) => s.paragraphs);
  const noiseHits = [
    ...paragraphs,
    ...snapshot.pdfLinks.map((p) => p.text),
  ].filter(isNoiseRelated);
  return {
    pageId: page.id,
    label: page.label,
    url: page.url,
    priority: page.priority,
    status: "new",
    addedParagraphs: paragraphs.map((p) => truncate(p)),
    removedParagraphs: [],
    changedParagraphs: [],
    dateChanges: [],
    addedPdfs: snapshot.pdfLinks,
    removedPdfs: [],
    noiseHits: noiseHits.map((h) => truncate(h)),
  };
}

/**
 * One-time baseline entry used when the feed is still empty: records every
 * currently-tracked page as a "first capture" so the website has something to
 * show on the very first run, even when nothing changed vs. the stored state.
 */
export function buildSeedFeedEntry(
  runId: string,
  sources: { page: TrackedPage; snapshot: PageSnapshot }[]
): ChangeFeedEntry | null {
  if (sources.length === 0) return null;
  const pages = sources
    .slice()
    .sort((a, b) =>
      a.page.priority === b.page.priority ? 0 : a.page.priority === "high" ? -1 : 1
    )
    .map(({ page, snapshot }) => seedPage(page, snapshot));
  return { runId, fetchedAt: new Date().toISOString(), pages };
}
