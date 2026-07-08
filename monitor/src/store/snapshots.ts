import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ChangeFeed, MonitorState, PageSnapshot } from "../types.ts";

/** How many recent change-runs the website-facing feed keeps. */
export const CHANGE_FEED_LIMIT = 50;

export interface Store {
  dataDir: string;
  snapshotsDir: string;
  reportsDir: string;
  statePath: string;
  changeFeedPath: string;
}

export function openStore(dataDir: string): Store {
  const store: Store = {
    dataDir,
    snapshotsDir: join(dataDir, "snapshots"),
    reportsDir: join(dataDir, "reports"),
    statePath: join(dataDir, "state.json"),
    changeFeedPath: join(dataDir, "changes-feed.json"),
  };
  mkdirSync(store.snapshotsDir, { recursive: true });
  mkdirSync(store.reportsDir, { recursive: true });
  return store;
}

export function loadState(store: Store): MonitorState {
  if (!existsSync(store.statePath)) return { pages: {} };
  return JSON.parse(readFileSync(store.statePath, "utf8")) as MonitorState;
}

export function saveState(store: Store, state: MonitorState): void {
  writeFileSync(store.statePath, JSON.stringify(state, null, 2));
}

/** Snapshots live under data/snapshots/<runId>/<pageId>.json — one folder per run that changed something. */
export function saveSnapshot(store: Store, runId: string, snapshot: PageSnapshot): string {
  const path = join(store.snapshotsDir, runId, `${snapshot.pageId}.json`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snapshot, null, 2));
  return path;
}

export function loadSnapshot(path: string): PageSnapshot | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as PageSnapshot;
}

export function saveReport(store: Store, runId: string, markdown: string): string {
  const path = join(store.reportsDir, `${runId}.md`);
  writeFileSync(path, markdown);
  return path;
}

export function loadChangeFeed(store: Store): ChangeFeed {
  if (!existsSync(store.changeFeedPath)) return { updatedAt: "", entries: [] };
  return JSON.parse(readFileSync(store.changeFeedPath, "utf8")) as ChangeFeed;
}

export function saveChangeFeed(store: Store, feed: ChangeFeed): void {
  writeFileSync(store.changeFeedPath, JSON.stringify(feed, null, 2));
}
