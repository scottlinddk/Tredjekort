export interface TrackedPage {
  id: string;
  url: string;
  label: string;
  /** high = Støj / Tidsplan / Det arbejder vi på lige nu — always called out first in reports */
  priority: "high" | "normal";
  /** Pages whose descriptive text is folded into the combined "about this project" document */
  aboutSource?: boolean;
  notes?: string;
}

export interface MonitorConfig {
  baseUrl: string;
  pages: TrackedPage[];
  userAgent: string;
  crawlDelayMs: number;
  /** Directory for snapshots/state/reports, relative to monitor/ */
  dataDir: string;
}

export interface ContentBlock {
  kind: "h" | "p";
  level?: number;
  text: string;
}

export interface ExtractedLink {
  url: string;
  text: string;
  nearestHeading: string | null;
}

export interface RawExtraction {
  title: string;
  blocks: ContentBlock[];
  links: ExtractedLink[];
}

export interface PageSection {
  heading: string | null;
  level: number;
  paragraphs: string[];
}

export interface PdfLink {
  url: string;
  text: string;
  section: string | null;
}

export interface PageSnapshot {
  pageId: string;
  url: string;
  fetchedAt: string;
  method: "browser" | "derived";
  title: string;
  sections: PageSection[];
  pdfLinks: PdfLink[];
  links: { url: string; text: string }[];
  textHash: string;
}

export interface PageState {
  textHash: string;
  snapshotPath: string;
  lastChangedAt: string;
  lastCheckedAt: string;
}

export interface MonitorState {
  pages: Record<string, PageState>;
}

export interface ParagraphChange {
  before: string;
  after: string;
}

export interface PageDiff {
  pageId: string;
  url: string;
  label: string;
  priority: "high" | "normal";
  status: "new" | "changed" | "unchanged" | "error";
  addedParagraphs: string[];
  removedParagraphs: string[];
  changedParagraphs: ParagraphChange[];
  /** Subset of changes where date/timeline tokens differ between before and after */
  dateChanges: ParagraphChange[];
  addedPdfs: PdfLink[];
  removedPdfs: PdfLink[];
  /** Added/changed text fragments that match noise-related keywords */
  noiseHits: string[];
  error?: string;
}

/**
 * Machine-readable change feed consumed by the website. This is a serialized,
 * truncated subset of the `PageDiff[]` the run already computes — persisted so
 * the frontend renders findings natively instead of parsing the Markdown report.
 */
export interface ChangeFeedPage {
  pageId: string;
  label: string;
  url: string;
  priority: "high" | "normal";
  status: "new" | "changed";
  addedParagraphs: string[];
  removedParagraphs: string[];
  changedParagraphs: ParagraphChange[];
  /** Subset of changedParagraphs where date/timeline tokens differ */
  dateChanges: ParagraphChange[];
  addedPdfs: PdfLink[];
  removedPdfs: PdfLink[];
  /** Added/changed text fragments that match noise-related keywords */
  noiseHits: string[];
}

export interface ChangeFeedEntry {
  runId: string;
  fetchedAt: string;
  pages: ChangeFeedPage[];
}

/** Newest-first, capped list of runs that had changes. */
export interface ChangeFeed {
  updatedAt: string;
  entries: ChangeFeedEntry[];
}
