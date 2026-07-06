// Vercel serverless function: GET /api/addresses?q=<query>
//
// Proxies Danmarks Adressers Web API (DAWA / Dataforsyningen) address autocomplete,
// so the frontend has a stable first-party endpoint. The DAWA response body is passed
// through unchanged; the frontend parses the DAWA shape directly (the Vite dev server
// proxies the same path straight to DAWA, so both environments serve identical JSON).
//
// DAWA docs: https://dawadocs.dataforsyningen.dk/dok/api/adgangsadresse#autocomplete
const DAWA_AUTOCOMPLETE_URL = 'https://api.dataforsyningen.dk/adgangsadresser/autocomplete'

export default async function handler(req, res) {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (q.length < 2) {
    res.status(400).json({ error: 'Query parameter "q" must be at least 2 characters.' })
    return
  }

  const url = new URL(DAWA_AUTOCOMPLETE_URL)
  url.searchParams.set('q', q)
  url.searchParams.set('per_side', '8')
  url.searchParams.set('fuzzy', '')

  try {
    const upstream = await fetch(url, { headers: { accept: 'application/json' } })
    if (!upstream.ok) {
      res.status(502).json({ error: `Address service responded with ${upstream.status}.` })
      return
    }
    const body = await upstream.json()
    // Addresses change rarely; let Vercel's edge cache absorb repeated queries.
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    res.status(200).json(body)
  } catch {
    res.status(502).json({ error: 'Address service is unreachable.' })
  }
}
