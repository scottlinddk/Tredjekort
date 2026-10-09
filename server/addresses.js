import { ApiError } from './api-error.js'
import { lookupAddress, suggestAddresses } from './dar.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_QUERY_LENGTH = 73 // Adressevælger's documented limit for `tekst`

// GET /api/addresses?q=<query>  -> [{ id, text, type }]   search-box hits. Only type "husnummer"
//                                                       has an id; other types refine the query.
// GET /api/addresses?id=<uuid>  -> { id, text, longitude, latitude }   position of one address.
// Keeps the Adressevælger token and the Datafordeler key server-side.
export function createAddressesHandler({ suggest = suggestAddresses, lookup = lookupAddress } = {}) {
  return async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const send = (status, body, cache = 'no-store') => {
      res.setHeader('Cache-Control', cache)
      res.statusCode = status
      res.end(JSON.stringify(body))
    }
    const invalid = (message) => send(400, { error: { code: 'invalid_query', message } })
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      send(405, { error: { code: 'method_not_allowed', message: 'Use GET to search addresses.' } })
      return
    }
    const params = new URL(req.url, 'http://localhost').searchParams
    const id = params.get('id')?.trim()
    const q = params.get('q')?.trim() ?? ''
    if (params.has('id') === params.has('q')) return invalid('Provide exactly one of "q" or "id".')
    if (params.has('id') && !UUID.test(id ?? '')) return invalid('"id" must be a DAR access-address UUID.')
    if (params.has('q') && (q.length < 2 || q.length > MAX_QUERY_LENGTH)) return invalid(`Query parameter "q" must be 2–${MAX_QUERY_LENGTH} characters.`)
    try {
      // Addresses change rarely; let the edge cache absorb repeated queries and spare the token's quota.
      send(200, params.has('id') ? await lookup(id) : await suggest(q), 's-maxage=86400, stale-while-revalidate=604800')
    } catch (error) {
      if (error instanceof ApiError) send(error.status, { error: { code: error.code, message: error.message, ...error.details } })
      else send(502, { error: { code: 'address_service_unavailable', message: 'The address service is unavailable.' } })
    }
  }
}
