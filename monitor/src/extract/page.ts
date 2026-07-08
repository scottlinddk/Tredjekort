import { createHash } from "node:crypto";
import type { PageSection, PageSnapshot, RawExtraction } from "../types.ts";
import { collectPdfLinks } from "./pdfLinks.ts";

export function buildSections(raw: RawExtraction): PageSection[] {
  const sections: PageSection[] = [];
  let current: PageSection = { heading: null, level: 0, paragraphs: [] };
  for (const block of raw.blocks) {
    if (block.kind === "h") {
      if (current.paragraphs.length > 0 || current.heading !== null) sections.push(current);
      current = { heading: block.text, level: block.level ?? 2, paragraphs: [] };
    } else {
      current.paragraphs.push(block.text);
    }
  }
  if (current.paragraphs.length > 0 || current.heading !== null) sections.push(current);
  return sections;
}

export function fullText(sections: PageSection[]): string {
  return sections
    .map((s) => [s.heading ?? "", ...s.paragraphs].filter(Boolean).join("\n"))
    .join("\n\n");
}

export function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function buildSnapshot(
  pageId: string,
  url: string,
  method: PageSnapshot["method"],
  raw: RawExtraction
): PageSnapshot {
  const sections = buildSections(raw);
  const seen = new Set<string>();
  const links = raw.links
    .filter((l) => (seen.has(l.url) ? false : (seen.add(l.url), true)))
    .map((l) => ({ url: l.url, text: l.text }));
  return {
    pageId,
    url,
    fetchedAt: new Date().toISOString(),
    method,
    title: raw.title,
    sections,
    pdfLinks: collectPdfLinks(raw.links),
    links,
    textHash: hashText(fullText(sections)),
  };
}
