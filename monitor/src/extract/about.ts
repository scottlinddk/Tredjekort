import type { PageSection, PageSnapshot, TrackedPage } from "../types.ts";
import { fullText, hashText } from "./page.ts";

export const ABOUT_PAGE_ID = "om-projektet";

/**
 * Combine the descriptive text of every `aboutSource` page into one "about
 * this project" document, with a source attribution heading per page, so the
 * report/storage carries the fullest available project description rather
 * than a landing-page snippet. Stored, hashed and diffed like a normal page.
 */
export function buildAboutSnapshot(
  sources: { page: TrackedPage; snapshot: PageSnapshot }[]
): PageSnapshot | null {
  if (sources.length === 0) return null;
  const sections: PageSection[] = [];
  for (const { page, snapshot } of sources) {
    sections.push({ heading: `Kilde: ${page.label} — ${page.url}`, level: 2, paragraphs: [] });
    sections.push(...snapshot.sections);
  }
  const first = sources[0]!;
  return {
    pageId: ABOUT_PAGE_ID,
    url: first.page.url,
    fetchedAt: new Date().toISOString(),
    method: "derived",
    title: "Om projektet (sammensat beskrivelse)",
    sections,
    pdfLinks: [],
    links: [],
    textHash: hashText(fullText(sections)),
  };
}
