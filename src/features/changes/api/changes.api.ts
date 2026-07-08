import type { ChangeFeed } from '../types/changes.types'

// The change feed is served both by our /api/changes proxy and — as a fallback —
// straight from the monitor-data branch on GitHub's raw host (the same URL the
// proxy reads). The direct fallback keeps the page working on a static host
// without serverless functions, mirroring addressSearch.api.ts.
const LOCAL_ENDPOINT = '/api/changes'
const RAW_ENDPOINT =
  'https://raw.githubusercontent.com/scottlinddk/Tredjekort/monitor-data/changes-feed.json'

const EMPTY_FEED: ChangeFeed = { updatedAt: '', entries: [] }

/**
 * Loads the monitor's change feed. Tries the app's own /api/changes endpoint
 * first, then falls back to reading the raw file directly. A missing feed
 * (monitor hasn't pushed a changed run yet) resolves to an empty feed so the
 * page renders its empty state rather than throwing.
 */
export async function fetchChanges(signal?: AbortSignal): Promise<ChangeFeed> {
  let response: Response | null = null
  try {
    response = await fetch(LOCAL_ENDPOINT, { signal })
  } catch (error) {
    if (signal?.aborted) throw error
    response = null
  }

  if (!response || !response.ok) {
    try {
      response = await fetch(RAW_ENDPOINT, { signal })
    } catch (error) {
      if (signal?.aborted) throw error
      response = null
    }
  }

  // Feed file doesn't exist yet on the monitor-data branch.
  if (response && response.status === 404) return EMPTY_FEED
  if (!response || !response.ok) {
    throw new Error(`Change feed request failed: ${response?.status ?? 'network error'}`)
  }

  return (await response.json()) as ChangeFeed
}
