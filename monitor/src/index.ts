import { writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.ts";
import { diffSnapshots } from "./diff/differ.ts";
import { ABOUT_PAGE_ID, buildAboutSnapshot } from "./extract/about.ts";
import { buildSnapshot } from "./extract/page.ts";
import { closeBrowser, extractAllLinks, extractPage, openBrowser } from "./fetch/browser.ts";
import { politeDelay } from "./fetch/politeness.ts";
import { buildChangeFeedEntry, buildSeedFeedEntry } from "./report/changeFeed.ts";
import { renderReport } from "./report/markdown.ts";
import { fetchRobots, groupFor, isAllowed, type RobotsInfo } from "./robots.ts";
import {
  CHANGE_FEED_LIMIT,
  loadChangeFeed,
  loadSnapshot,
  openStore,
  saveChangeFeed,
  saveReport,
  saveSnapshot,
  saveState,
  loadState,
} from "./store/snapshots.ts";
import type { MonitorConfig, PageDiff, PageSnapshot, TrackedPage } from "./types.ts";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const UA_TOKEN = "tredjekortmonitor";

function parseArgs(argv: string[]): { command: string; configPath?: string } {
  const command = argv[0] && !argv[0].startsWith("--") ? argv[0] : "run";
  let configPath: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--config") configPath = argv[++i];
    else if (arg.startsWith("--config=")) configPath = arg.slice("--config=".length);
  }
  return { command, configPath };
}

function runId(): string {
  return new Date().toISOString().replace(/:/g, "-").replace(/\.\d+Z$/, "Z");
}

function isHttp(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

async function getRobots(config: MonitorConfig): Promise<RobotsInfo | null> {
  if (!isHttp(config.baseUrl)) return null; // file:// fixtures — robots not applicable
  return fetchRobots(config.baseUrl, config.userAgent);
}

interface FetchResult {
  snapshot: PageSnapshot;
  method: PageSnapshot["method"];
}

async function fetchTrackedPage(
  page: TrackedPage,
  config: MonitorConfig,
  browserOpened: { value: boolean }
): Promise<FetchResult> {
  if (!browserOpened.value) {
    await openBrowser(config.userAgent);
    browserOpened.value = true;
  }
  const raw = await extractPage(page.url);
  return { snapshot: buildSnapshot(page.id, page.url, "browser", raw), method: "browser" };
}

async function commandRun(configPath?: string): Promise<void> {
  const config = loadConfig(configPath);
  const dataDir = isAbsolute(config.dataDir) ? config.dataDir : join(PACKAGE_ROOT, config.dataDir);
  const store = openStore(dataDir);
  const state = loadState(store);
  const id = runId();
  const notes: string[] = [];
  const diffs: PageDiff[] = [];
  const browserOpened = { value: false };

  // Robots gate — fail closed on fetch errors, honor Disallow and Crawl-delay.
  let robotsGroup: ReturnType<typeof groupFor> = null;
  let crawlDelayMs = config.crawlDelayMs;
  if (isHttp(config.baseUrl)) {
    const robots = await getRobots(config);
    if (robots && robots.raw !== null) {
      robotsGroup = groupFor(robots.groups, UA_TOKEN);
      const robotsDelay = (robotsGroup?.crawlDelay ?? 0) * 1000;
      if (robotsDelay > crawlDelayMs) {
        crawlDelayMs = robotsDelay;
        notes.push(`robots.txt angiver Crawl-delay ${robotsGroup?.crawlDelay}s — respekteret.`);
      }
    } else {
      notes.push("robots.txt findes ikke (404) — ingen crawl-begrænsninger angivet.");
    }
  }

  notes.push("Indhold hentes med headless browser (Playwright).");

  const aboutSources: { page: TrackedPage; snapshot: PageSnapshot }[] = [];
  const allFetched: { page: TrackedPage; snapshot: PageSnapshot }[] = [];

  try {
    let first = true;
    for (const page of config.pages) {
      if (!first) await politeDelay(crawlDelayMs);
      first = false;

      if (isHttp(page.url) && !isAllowed(robotsGroup, new URL(page.url).pathname)) {
        diffs.push({
          pageId: page.id, url: page.url, label: page.label, priority: page.priority,
          status: "error", addedParagraphs: [], removedParagraphs: [], changedParagraphs: [],
          dateChanges: [], addedPdfs: [], removedPdfs: [], noiseHits: [],
          error: "Stien er blokeret af robots.txt — siden springes over.",
        });
        continue;
      }

      try {
        const { snapshot } = await fetchTrackedPage(page, config, browserOpened);
        allFetched.push({ page, snapshot });
        if (page.aboutSource) aboutSources.push({ page, snapshot });

        const prevState = state.pages[page.id];
        const previous = prevState ? loadSnapshot(prevState.snapshotPath) : null;
        const diff = diffSnapshots(page, previous, snapshot);
        diffs.push(diff);

        if (diff.status === "new" || diff.status === "changed") {
          const path = saveSnapshot(store, id, snapshot);
          state.pages[page.id] = {
            textHash: snapshot.textHash,
            snapshotPath: path,
            lastChangedAt: id,
            lastCheckedAt: id,
          };
        } else if (prevState) {
          prevState.lastCheckedAt = id;
        }
        console.log(`  ✓ ${page.label} [${snapshot.method}] — ${diff.status}`);
      } catch (err) {
        diffs.push({
          pageId: page.id, url: page.url, label: page.label, priority: page.priority,
          status: "error", addedParagraphs: [], removedParagraphs: [], changedParagraphs: [],
          dateChanges: [], addedPdfs: [], removedPdfs: [], noiseHits: [],
          error: err instanceof Error ? err.message : String(err),
        });
        console.error(`  ✗ ${page.label} — ${err instanceof Error ? err.message : err}`);
      }
    }

    // Derived combined "about the project" document.
    const about = buildAboutSnapshot(aboutSources);
    if (about) {
      const aboutPage: TrackedPage = {
        id: ABOUT_PAGE_ID,
        url: about.url,
        label: "Om projektet (sammensat beskrivelse)",
        priority: "normal",
      };
      const prevState = state.pages[ABOUT_PAGE_ID];
      const previous = prevState ? loadSnapshot(prevState.snapshotPath) : null;
      const diff = diffSnapshots(aboutPage, previous, about);
      diffs.push(diff);
      if (diff.status === "new" || diff.status === "changed") {
        const path = saveSnapshot(store, id, about);
        state.pages[ABOUT_PAGE_ID] = {
          textHash: about.textHash,
          snapshotPath: path,
          lastChangedAt: id,
          lastCheckedAt: id,
        };
      } else if (prevState) {
        prevState.lastCheckedAt = id;
      }
    }
  } finally {
    if (browserOpened.value) await closeBrowser();
  }

  saveState(store, state);
  const report = renderReport(id, diffs, notes);
  const reportPath = saveReport(store, id, report);
  console.log(`\n${report}`);
  console.log(`\nRapport gemt: ${reportPath}`);

  // Machine-readable summary so callers (e.g. the CI workflow) can decide
  // whether to notify without parsing the Markdown report.
  const lastRun = {
    runId: id,
    reportPath,
    changed: diffs.filter((d) => d.status === "changed").length,
    new: diffs.filter((d) => d.status === "new").length,
    errors: diffs.filter((d) => d.status === "error").length,
    noisePages: diffs.filter((d) => d.noiseHits.length > 0).length,
  };
  writeFileSync(join(dataDir, "last-run.json"), JSON.stringify(lastRun, null, 2));

  // Website-facing rolling feed: prepend this run's structured changes (if any)
  // and cap to the most recent runs. Consumed live by the site via the
  // monitor-data branch, so unchanged runs leave it untouched. When the feed is
  // still empty (e.g. state was captured by an earlier monitor version that
  // never wrote a feed), emit a one-time baseline entry so the site has content
  // without waiting for the next real change.
  const feed = loadChangeFeed(store);
  let entry = buildChangeFeedEntry(id, diffs);
  if (!entry && feed.entries.length === 0) {
    entry = buildSeedFeedEntry(id, allFetched);
  }
  if (entry) {
    feed.entries = [entry, ...feed.entries].slice(0, CHANGE_FEED_LIMIT);
    feed.updatedAt = new Date().toISOString();
    saveChangeFeed(store, feed);
  }
}

async function commandDiscover(configPath?: string): Promise<void> {
  const config = loadConfig(configPath);
  const dataDir = isAbsolute(config.dataDir) ? config.dataDir : join(PACKAGE_ROOT, config.dataDir);
  openStore(dataDir); // ensures the data directory tree exists
  const findings: Record<string, unknown> = { at: new Date().toISOString() };

  // 1. robots.txt — print the applicable rules verbatim.
  console.log("=== robots.txt ===");
  if (isHttp(config.baseUrl)) {
    try {
      const robots = await fetchRobots(config.baseUrl, config.userAgent);
      if (robots.raw === null) {
        console.log(`HTTP ${robots.status} — no robots.txt, no crawl restrictions declared.`);
        findings.robots = { status: robots.status, raw: null };
      } else {
        console.log(robots.raw.trim());
        findings.robots = { status: robots.status, raw: robots.raw };
        const group = groupFor(robots.groups, UA_TOKEN);
        for (const page of config.pages) {
          const path = new URL(page.url).pathname;
          const ok = isAllowed(group, path);
          console.log(`${ok ? "  ALLOWED " : "  BLOCKED "} ${path}`);
          if (!ok) console.log("    ^ remove this page from config.ts or it will be skipped on every run");
        }
      }
    } catch (err) {
      console.log(`Could not fetch robots.txt: ${err instanceof Error ? err.message : err}`);
      console.log("Runs will ABORT until this resolves (the tool fails closed).");
      findings.robots = { error: String(err) };
    }
  } else {
    console.log("(non-HTTP base URL — robots.txt not applicable)");
  }

  // 2. Live menu structure of the main page.
  console.log("\n=== Menu / subpage links on the main project page ===");
  const mainPage = config.pages[0];
  if (mainPage) {
    await openBrowser(config.userAgent);
    try {
      const links = await extractAllLinks(mainPage.url);
      const host = isHttp(config.baseUrl) ? new URL(config.baseUrl).host : null;
      const relevant = links.filter((l) => {
        if (!/limfjord/i.test(l.url) && !/limfjord/i.test(l.text)) return false;
        if (host) {
          try { return new URL(l.url).host === host; } catch { return false; }
        }
        return true;
      });
      const seen = new Set<string>();
      const unique = relevant.filter((l) => (seen.has(l.url) ? false : (seen.add(l.url), true)));
      for (const l of unique) console.log(`  ${l.text || "(no text)"} → ${l.url}`);
      findings.menuLinks = unique;

      console.log("\n=== Config check ===");
      const found = new Set(unique.map((l) => l.url.replace(/\/$/, "")));
      for (const page of config.pages) {
        const hit = found.has(page.url.replace(/\/$/, ""));
        console.log(`  ${hit ? "✓ linked from main page" : "? NOT linked from main page"} — ${page.label} (${page.url})`);
        if (!hit) console.log("    ^ may be reachable elsewhere or a stale slug; verify in a browser and update config.ts if needed");
      }
      findings.configCheck = config.pages.map((p) => ({ id: p.id, url: p.url, linkedFromMain: found.has(p.url.replace(/\/$/, "")) }));
    } finally {
      await closeBrowser();
    }
  }

  const discoveryPath = join(dataDir, "discovery.json");
  writeFileSync(discoveryPath, JSON.stringify(findings, null, 2));
  console.log(`\nFindings written to ${discoveryPath}`);
}

const { command, configPath } = parseArgs(process.argv.slice(2));
if (command === "run") {
  await commandRun(configPath);
} else if (command === "discover") {
  await commandDiscover(configPath);
} else {
  console.error(`Unknown command "${command}". Use: run | discover [--config <path>]`);
  process.exit(1);
}
