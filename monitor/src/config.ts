import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { MonitorConfig, TrackedPage } from "./types.ts";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const BASE_URL = "https://www.vejdirektoratet.dk";

// Descriptive UA so Vejdirektoratet can identify and contact us if the tool misbehaves.
// Override the contact suffix with MONITOR_CONTACT if you want an email in there.
const contact = process.env.MONITOR_CONTACT ?? "https://github.com/scottlinddk/Tredjekort";
export const USER_AGENT = `TredjekortMonitor/1.0 (personal project-page monitor; +${contact})`;

/**
 * Tracked pages. URL slugs were mapped via web search in July 2026 and are
 * verified against the live menu by `npm run discover` — if discover reports a
 * divergence, fix the URLs here.
 */
const TRACKED_PAGES: TrackedPage[] = [
  {
    id: "hovedside",
    url: `${BASE_URL}/vejprojekter/3-limfjordsforbindelse`,
    label: "Projektside (forside)",
    priority: "normal",
    aboutSource: true,
  },
  {
    id: "stoej",
    url: `${BASE_URL}/vvm/limfjorden/miljoe/stoej`,
    label: "Støj",
    priority: "high",
  },
  {
    id: "tidsplan",
    url: `${BASE_URL}/projekt/3-limfjordsforbindelse/tidsplan`,
    label: "Tidsplan",
    priority: "high",
  },
  {
    id: "arbejder-paa-nu",
    url: `${BASE_URL}/vejprojekter/3-limfjordsforbindelse/det-arbejder-vi-paa-lige-nu`,
    label: "Det arbejder vi på lige nu",
    priority: "high",
  },
  {
    id: "stoejskaerme",
    url: `${BASE_URL}/vvm/limfjorden/miljoe/planlagte-stoejskaerme`,
    label: "Planlagte støjskærme",
    priority: "high",
  },
  {
    id: "stoej-anlaeg",
    url: `${BASE_URL}/vvm/limfjorden/projektet/stoej-under-anlaegsarbejde`,
    label: "Støj under anlægsarbejde",
    priority: "high",
  },
  {
    id: "dokumenter",
    url: `${BASE_URL}/projekt/3-limfjordsforbindelse/dokumenter`,
    label: "Dokumenter",
    priority: "normal",
    notes: "Primary source of new PDFs (høringsmateriale, støjrapporter, VVM).",
  },
  {
    id: "vvm-hub",
    url: `${BASE_URL}/vvm/3-limfjordsforbindelse`,
    label: "VVM-side",
    priority: "normal",
    aboutSource: true,
  },
  {
    id: "hoering-2023-24",
    url: `${BASE_URL}/projekt/3-limfjordsforbindelse/offentlig-hoering-202324`,
    label: "Offentlig høring 2023/24",
    priority: "normal",
    notes: "Possibly a static archive page; kept tracked in case new høringer land here.",
  },
];

export const DEFAULT_CONFIG: MonitorConfig = {
  baseUrl: BASE_URL,
  pages: TRACKED_PAGES,
  userAgent: USER_AGENT,
  crawlDelayMs: 4000,
  dataDir: "data",
};

/**
 * Load an alternative config (used by the fixture tests); falls back to the
 * default. Page URLs without a scheme are treated as paths relative to
 * monitor/ and turned into file:// URLs so fixtures work from any cwd.
 */
export function loadConfig(path?: string): MonitorConfig {
  if (!path) return DEFAULT_CONFIG;
  const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<MonitorConfig>;
  const merged = { ...DEFAULT_CONFIG, ...raw };
  merged.pages = merged.pages.map((p) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(p.url)) return p;
    const abs = isAbsolute(p.url) ? p.url : join(PACKAGE_ROOT, p.url);
    return { ...p, url: pathToFileURL(abs).toString() };
  });
  return merged;
}
