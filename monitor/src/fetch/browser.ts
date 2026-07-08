import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { RawExtraction } from "../types.ts";

let browser: Browser | null = null;
let context: BrowserContext | null = null;

export async function openBrowser(userAgent: string): Promise<void> {
  if (browser) return;
  // MONITOR_CHROMIUM_PATH lets you point at an existing Chromium/Chrome build
  // instead of downloading one with `npx playwright install chromium`.
  const executablePath = process.env.MONITOR_CHROMIUM_PATH;
  browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  context = await browser.newContext({ userAgent, locale: "da-DK" });
}

export async function closeBrowser(): Promise<void> {
  await context?.close();
  await browser?.close();
  browser = null;
  context = null;
}

async function renderedPage(url: string): Promise<Page> {
  if (!context) throw new Error("openBrowser() must be called first");
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  // Give client-side rendering a moment to settle even after network idle.
  await page.waitForTimeout(1_500);
  return page;
}

/**
 * In-page extraction script. Passed to page.evaluate as a STRING on purpose:
 * tsx/esbuild rewrites serialized function callbacks with a `__name` helper
 * that doesn't exist inside the browser, so a plain-JS string is the only
 * transform-proof way to ship this code into the page.
 */
const EXTRACT_SCRIPT = `(() => {
  const BOILERPLATE =
    '[id*="ookie" i],[class*="ookie" i],[id*="CybotCookiebot" i],nav,header,footer,aside,[role="navigation"]';
  const root = document.querySelector("main") || document.body;

  const clean = (s) => (s || "").replace(/\\s+/g, " ").trim();

  const blocks = [];
  const links = [];
  let nearestHeading = null;
  const seenText = new Set();

  const elements = root.querySelectorAll("h1,h2,h3,h4,p,li,a[href]");
  for (const el of elements) {
    if (el.closest(BOILERPLATE)) continue;
    const tag = el.tagName.toLowerCase();
    if (tag === "a") {
      const text = clean(el.textContent);
      if (el.href && (text || el.href.toLowerCase().includes(".pdf"))) {
        links.push({ url: el.href, text, nearestHeading });
      }
      continue;
    }
    let text;
    if (tag === "li" && el.querySelector("p, ul, ol")) {
      // A <li> wrapping a <p> or nested list would duplicate text collected
      // from the children — read only its own text.
      const copy = el.cloneNode(true);
      copy.querySelectorAll("p, ul, ol").forEach((c) => c.remove());
      text = clean(copy.textContent);
    } else {
      text = clean(el.textContent);
    }
    if (text.length < 3) continue;
    if (tag[0] === "h") {
      nearestHeading = text;
      blocks.push({ kind: "h", level: Number(tag[1]), text });
    } else {
      if (seenText.has(text)) continue;
      seenText.add(text);
      blocks.push({ kind: "p", text });
    }
  }

  const h1 = document.querySelector("h1");
  const title = clean(h1 && h1.textContent) || clean(document.title);
  return { title, blocks, links };
})()`;

/** Render a (client-side rendered) page and pull out its content structure. */
export async function extractPage(url: string): Promise<RawExtraction> {
  const page = await renderedPage(url);
  try {
    return (await page.evaluate(EXTRACT_SCRIPT)) as RawExtraction;
  } finally {
    await page.close();
  }
}

const ALL_LINKS_SCRIPT = `Array.from(document.querySelectorAll("a[href]")).map((a) => ({
  url: a.href,
  text: (a.textContent || "").replace(/\\s+/g, " ").trim(),
}))`;

/** Used by discover mode: all in-page links, incl. navigation, for menu mapping. */
export async function extractAllLinks(url: string): Promise<{ url: string; text: string }[]> {
  const page = await renderedPage(url);
  try {
    return (await page.evaluate(ALL_LINKS_SCRIPT)) as { url: string; text: string }[];
  } finally {
    await page.close();
  }
}
