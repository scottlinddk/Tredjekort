import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { MonitorState, PageSnapshot } from "../types.ts";

export interface Store {
  dataDir: string;
  snapshotsDir: string;
  reportsDir: string;
  statePath: string;
}

export function openStore(dataDir: string): Store {
  const store: Store = {
    dataDir,
    snapshotsDir: join(dataDir, "snapshots"),
    reportsDir: join(dataDir, "reports"),
    statePath: join(dataDir, "state.json"),
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
