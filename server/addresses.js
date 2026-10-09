import { ApiError } from './api-error.js'
import { suggestAddresses } from './dar.js'

// GET /api/addresses?q=<query>: address suggestions for the search box, as
// [{ id, text, longitude, latitude }]. Keeps the Dataforsyningen token server-side.
export function createAddressesHandler({ suggest = suggestAddresses } = {}) {
  return async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const send = (status, body, cache = 'no-store') => {
      res.setHeader('Cache-Control', cache)
      res.statusCode = status
      res.end(JSON.stringify(body))
    }
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      send(405, { error: { code: 'method_not_allowed', message: 'Use GET to search addresses.' } })
      return
    }
    const q = new URL(req.url, 'http://localhost').searchParams.get('q')?.trim() ?? ''
    if (q.length < 2 || q.length > 200) {
      send(400, { error: { code: 'invalid_query', message: 'Query parameter "q" must be 2–200 characters.' } })
      return
    }
    try {
      // Addresses change rarely; let the edge cache absorb repeated queries and spare the token's quota.
      send(200, await suggest(q), 's-maxage=86400, stale-while-revalidate=604800')
    } catch (error) {
      if (error instanceof ApiError) send(error.status, { error: { code: error.code, message: error.message, ...error.details } })
      else send(502, { error: { code: 'address_service_unavailable', message: 'The address service is unavailable.' } })
    }
  }
}
