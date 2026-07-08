/**
 * Structured-source path: Vejdirektoratet's site is decoupled Drupal with an
 * API prefix at /api/drupal/. If its JSON:API + router endpoints are open we
 * prefer them over browser rendering (cheaper for both sides). Everything here
 * is defensive: any surprise returns null and the caller falls back to
 * Playwright. `npm run discover` reports which path is actually in use.
 */
import type { ContentBlock, ExtractedLink, RawExtraction } from "../types.ts";

const TIMEOUT = 10_000;

function headers(userAgent: string): Record<string, string> {
  return { "User-Agent": userAgent, Accept: "application/vnd.api+json, application/json" };
}

export async function probeJsonApi(baseUrl: string, userAgent: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/drupal/jsonapi`, {
      headers: headers(userAgent),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { links?: unknown };
    return typeof body === "object" && body !== null && "links" in body;
  } catch {
    return false;
  }
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  aelig: "æ", oslash: "ø", aring: "å", AElig: "Æ", Oslash: "Ø", Aring: "Å",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, name: string) => ENTITIES[name] ?? m);
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Heuristic HTML → blocks/links for Drupal rich-text field values. */
export function htmlToBlocks(html: string, baseUrl: string): { blocks: ContentBlock[]; links: ExtractedLink[] } {
  const blocks: ContentBlock[] = [];
  const links: ExtractedLink[] = [];
  let nearestHeading: string | null = null;

  const re = /<(h[1-4]|p|li)[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const m of html.matchAll(re)) {
    const tag = m[1]!.toLowerCase();
    const inner = m[2]!;
    const text = stripTags(inner);
    if (text.length < 3) continue;
    if (tag.startsWith("h")) {
      nearestHeading = text;
      blocks.push({ kind: "h", level: Number(tag[1]), text });
    } else {
      blocks.push({ kind: "p", text });
    }
    for (const a of inner.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
      try {
        links.push({
          url: new URL(decodeEntities(a[1]!), baseUrl).toString(),
          text: stripTags(a[2]!),
          nearestHeading,
        });
      } catch {
        // unresolvable href — skip
      }
    }
  }
  return { blocks, links };
}

interface TranslatePathResponse {
  entity?: { uuid?: string; type?: string; bundle?: string };
  jsonapi?: { individual?: string };
}

export async function fetchViaJsonApi(
  baseUrl: string,
  pageUrl: string,
  userAgent: string
): Promise<RawExtraction | null> {
  try {
    const path = new URL(pageUrl).pathname;
    const routerUrl = `${baseUrl}/api/drupal/router/translate-path?path=${encodeURIComponent(path)}&_format=json`;
    const routed = await fetch(routerUrl, { headers: headers(userAgent), signal: AbortSignal.timeout(TIMEOUT) });
    if (!routed.ok) return null;
    const route = (await routed.json()) as TranslatePathResponse;
    const individual = route.jsonapi?.individual;
    if (!individual) return null;

    const res = await fetch(individual, { headers: headers(userAgent), signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) return null;
    const doc = (await res.json()) as { data?: { attributes?: Record<string, unknown> } };
    const attrs = doc.data?.attributes;
    if (!attrs) return null;

    // Collect every rich-text-looking field (Drupal text fields carry
    // { value, processed } objects; some fields are plain HTML strings).
    const htmlParts: string[] = [];
    for (const value of Object.values(attrs)) {
      if (typeof value === "string" && /<(p|h[1-4]|li)\b/i.test(value)) htmlParts.push(value);
      else if (value && typeof value === "object") {
        const processed = (value as { processed?: unknown }).processed;
        if (typeof processed === "string" && processed.trim()) htmlParts.push(processed);
      }
    }
    if (htmlParts.length === 0) return null;

    const { blocks, links } = htmlToBlocks(htmlParts.join("\n"), baseUrl);
    if (blocks.length === 0) return null;
    const title = typeof attrs.title === "string" ? attrs.title : "";
    return { title, blocks, links };
  } catch {
    return null;
  }
}
