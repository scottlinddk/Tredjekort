import type { ChangeFeedEntry, ChangeFeedPage, PageDiff, ParagraphChange } from "../types.ts";

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
