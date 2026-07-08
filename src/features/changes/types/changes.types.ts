// Mirrors the monitor's change-feed JSON (see monitor/src/types.ts:
// ChangeFeed / ChangeFeedEntry / ChangeFeedPage), served via /api/changes.

export interface ParagraphChange {
  before: string
  after: string
}

export interface PdfLink {
  url: string
  text: string
  section: string | null
}

export interface ChangeFeedPage {
  pageId: string
  label: string
  url: string
  priority: 'high' | 'normal'
  status: 'new' | 'changed'
  addedParagraphs: string[]
  removedParagraphs: string[]
  changedParagraphs: ParagraphChange[]
  /** Subset of changedParagraphs where date/timeline tokens differ. */
  dateChanges: ParagraphChange[]
  addedPdfs: PdfLink[]
  removedPdfs: PdfLink[]
  /** Added/changed text fragments matching noise-related keywords. */
  noiseHits: string[]
}

export interface ChangeFeedEntry {
  runId: string
  fetchedAt: string
  pages: ChangeFeedPage[]
}

/** Newest-first, capped list of runs that had changes. */
export interface ChangeFeed {
  updatedAt: string
  entries: ChangeFeedEntry[]
}
