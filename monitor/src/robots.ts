/**
 * Minimal robots.txt fetcher/parser/matcher following the original REP plus
 * Google's wildcard extensions (`*` and `$`), which most sites assume.
 *
 * Policy: if robots.txt fetch fails with a network/server error we ABORT the
 * run (fail closed) — better for a personal monitor to skip a run than to
 * crawl blind. A 404/410 means "no restrictions" per the spec.
 */

interface RobotsGroup {
  agents: string[];
  rules: { allow: boolean; pattern: string }[];
  crawlDelay?: number;
}

export interface RobotsInfo {
  status: number;
  raw: string | null;
  groups: RobotsGroup[];
}

export function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (!current) continue;
      if (field === "allow" || field === "disallow") {
        if (value) current.rules.push({ allow: field === "allow", pattern: value });
        else if (field === "disallow") {
          // "Disallow:" (empty) means allow everything — represent as a no-op.
        }
      } else if (field === "crawl-delay") {
        const n = Number(value);
        if (Number.isFinite(n)) current.crawlDelay = n;
      }
    }
  }
  return groups;
}

function patternToRegex(pattern: string): RegExp {
  let re = "";
  for (const ch of pattern) {
    if (ch === "*") re += ".*";
    else if (ch === "$") re += "$";
    else re += ch.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}`);
}

/** Pick the group that most specifically matches our UA token, falling back to `*`. */
export function groupFor(groups: RobotsGroup[], uaToken: string): RobotsGroup | null {
  const token = uaToken.toLowerCase();
  let best: RobotsGroup | null = null;
  let bestLen = -1;
  for (const g of groups) {
    for (const agent of g.agents) {
      if (agent === "*") {
        if (bestLen < 0) best = best ?? g;
      } else if (token.includes(agent) && agent.length > bestLen) {
        best = g;
        bestLen = agent.length;
      }
    }
  }
  return best;
}

/** Longest-match-wins; allow wins ties (Google semantics). */
export function isAllowed(group: RobotsGroup | null, path: string): boolean {
  if (!group) return true;
  let verdict = true;
  let matchLen = -1;
  for (const rule of group.rules) {
    if (patternToRegex(rule.pattern).test(path)) {
      const len = rule.pattern.length;
      if (len > matchLen || (len === matchLen && rule.allow && !verdict)) {
        verdict = rule.allow;
        matchLen = len;
      }
    }
  }
  return verdict;
}

export async function fetchRobots(baseUrl: string, userAgent: string): Promise<RobotsInfo> {
  const url = new URL("/robots.txt", baseUrl).toString();
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 404 || res.status === 410) {
    return { status: res.status, raw: null, groups: [] };
  }
  if (!res.ok) {
    throw new Error(`robots.txt returned HTTP ${res.status} — refusing to crawl blind`);
  }
  const raw = await res.text();
  return { status: res.status, raw, groups: parseRobots(raw) };
}
