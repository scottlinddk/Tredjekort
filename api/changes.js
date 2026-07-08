// Vercel serverless function: GET /api/changes
//
// Serves the monitor's website-facing change feed. The scraper (monitor/) runs
// in CI and commits changes-feed.json to the dedicated `monitor-data` branch,
// which is separate from the app's `main` deploy. Rather than rebuild the site
// on every scraper run, this endpoint reads that file live from GitHub's raw
// host at request time, so the site always reflects the latest run.
//
// The repo is public, so no token is needed. The frontend parses the feed shape
// directly (the Vite dev server proxies the same path to the same raw URL, so
// both environments serve identical JSON).
const FEED_URL =
  'https://raw.githubusercontent.com/scottlinddk/Tredjekort/monitor-data/changes-feed.json'

export default async function handler(_req, res) {
  try {
    const upstream = await fetch(FEED_URL, { headers: { accept: 'application/json' } })
    // The feed only exists once the monitor has pushed at least one changed run.
    // Until then, serve an empty feed so the page can render its empty state.
    if (upstream.status === 404) {
      res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400')
      res.status(200).json({ updatedAt: '', entries: [] })
      return
    }
    if (!upstream.ok) {
      res.status(502).json({ error: `Change feed responded with ${upstream.status}.` })
      return
    }
    const body = await upstream.json()
    // Data updates at most once a day; let Vercel's edge cache absorb requests.
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400')
    res.status(200).json(body)
  } catch {
    res.status(502).json({ error: 'Change feed is unreachable.' })
  }
}
