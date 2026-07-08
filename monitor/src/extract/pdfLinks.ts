import type { ExtractedLink, PdfLink } from "../types.ts";

/**
 * Vejdirektoratet publishes substantive material (VVM, høringsmateriale,
 * støjrapporter) as files under sites/default/files — usually .pdf, so treat
 * both the extension and that path as document links worth tracking.
 */
export function isDocumentUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return /\.pdf($|[?#])/.test(lower) || lower.includes("/sites/default/files/");
}

export function collectPdfLinks(links: ExtractedLink[]): PdfLink[] {
  const seen = new Set<string>();
  const out: PdfLink[] = [];
  for (const link of links) {
    if (!isDocumentUrl(link.url) || seen.has(link.url)) continue;
    seen.add(link.url);
    out.push({ url: link.url, text: link.text, section: link.nearestHeading });
  }
  return out;
}
