// Danmarks Adresseregister (DAR) access, replacing DAWA which closed on 1 October 2026.
//
// Two services are combined, because DAR itself offers no search-as-you-type:
//   1. Dataforsyningen GSearch (husnummer resource): free-text search, used for the
//      search box and for resolving typed addresses to candidate access addresses.
//   2. Datafordeler GraphQL, DAR register: the authoritative record for one access
//      address (road name, municipality and road code, house number, postcode, position).
//
// An access address is a DAR "husnummer". Its id equals the DAWA "adgangsadresse" id,
// so ids stored in old links and API consumers stay valid.
//
// IMPORTANT: every assumption about upstream response shapes lives in this file, in the
// parse* and *Query functions. They were written from public documentation without
// credentials. Run `node scripts/verify-dar.mjs` with real keys to check them.
import { ApiError } from './api-error.js'
import { utm32ToWgs84 } from './crs.js'

export const DAR_SOURCE_URL = 'https://danmarksadresser.dk/om-adresser/danmarks-adresseregister-dar'
const GSEARCH_URL = 'https://api.dataforsyningen.dk/rest/gsearch/v2.0/husnummer'
const DEFAULT_GRAPHQL_URL = 'https://graphql.datafordeler.dk/DAR/v1'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function darConfig(env = process.env) {
  return {
    gsearchToken: env.DATAFORSYNINGEN_TOKEN?.trim() || null,
    graphqlKey: env.DATAFORDELER_API_KEY?.trim() || null,
    graphqlUrl: env.DAR_GRAPHQL_URL?.trim() || DEFAULT_GRAPHQL_URL,
  }
}

function notConfigured(variable) {
  return new ApiError(503, 'address_service_not_configured', `The address service is not configured (missing ${variable}).`)
}

// Keys travel in the query string because that is what both gateways document. They are
// never logged and never interpolated into error messages.
async function fetchJson(fetchImpl, url, init, timeoutMs) {
  try {
    const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    if (!response.ok) throw new ApiError(502, 'address_service_unavailable', 'The address service could not complete this request. Try again later.')
    return { body: await response.json() }
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new ApiError(504, 'address_service_timeout', 'The address service timed out. Try again later.')
    }
    throw new ApiError(502, 'address_service_unavailable', 'The address service is unavailable or returned invalid JSON.')
  }
}

function toWgs84(x, y, crs) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  const geographic = /4326|wgs ?84/i.test(String(crs ?? '')) || (Math.abs(x) <= 180 && Math.abs(y) <= 90)
  if (geographic) return Math.abs(x) <= 180 && Math.abs(y) <= 90 ? { longitude: x, latitude: y } : null
  const position = utm32ToWgs84(x, y)
  return Number.isFinite(position.longitude) && Number.isFinite(position.latitude) ? position : null
}

// ---- GSearch (search box and typed addresses) -----------------------------------------

// Assumed item: { id, visningstekst, geometri: { type: 'Point', coordinates: [x, y] }, crs? }
function parseSearchItem(item) {
  if (!UUID.test(item?.id ?? '') || typeof item.visningstekst !== 'string' || !item.visningstekst.trim()) return null
  const coordinates = item.geometri?.coordinates
  const position = Array.isArray(coordinates) ? toWgs84(coordinates[0], coordinates[1], item.geometri?.crs?.properties?.name ?? item.crs) : null
  return { id: item.id.toLowerCase(), text: item.visningstekst.trim(), position }
}

export async function searchAccessAddresses(query, { limit = 8, fetchImpl = fetch, timeoutMs = 8000, env } = {}) {
  const { gsearchToken } = darConfig(env)
  if (!gsearchToken) throw notConfigured('DATAFORSYNINGEN_TOKEN')
  const url = new URL(GSEARCH_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('token', gsearchToken)
  const { body } = await fetchJson(fetchImpl, url, { headers: { accept: 'application/json' } }, timeoutMs)
  if (!Array.isArray(body)) throw new ApiError(502, 'invalid_upstream_response', 'The address service returned an unexpected response.')
  return body.map(parseSearchItem).filter(Boolean)
}

/** Search-box suggestions in the shape the frontend consumes. */
export async function suggestAddresses(query, options) {
  const results = await searchAccessAddresses(query, { ...options, limit: 8 })
  return results.filter((item) => item.position).map((item) => ({
    id: item.id,
    text: item.text,
    longitude: item.position.longitude,
    latitude: item.position.latitude,
  }))
}

// ---- Datafordeler GraphQL (authoritative record for one access address) -----------------

// Every entity query must carry virkningstid and registreringstid; "now" for both returns
// the currently valid state. ids are validated UUIDs, so inlining them is injection-safe.
const nowLiteral = (now) => JSON.stringify(now.toISOString())
const temporal = (now) => `virkningstid: ${nowLiteral(now)}, registreringstid: ${nowLiteral(now)}`
const byId = (id) => `where: { id_lokalId: { eq: ${JSON.stringify(id)} } }`

export function houseNumberQuery(id, now = new Date()) {
  return `{ DAR_Husnummer(first: 1, ${temporal(now)}, ${byId(id)}) { nodes { id_lokalId husnummertekst adgangspunkt navngivenVej postnummer } } }`
}

// DAR references are ids, not nested objects, so the related records need a second document.
export function relatedRecordsQuery(refs, now = new Date()) {
  return `{
    point: DAR_Adressepunkt(first: 1, ${temporal(now)}, ${byId(refs.adgangspunkt)}) { nodes { id_lokalId position { wkt crs } } }
    road: DAR_NavngivenVej(first: 1, ${temporal(now)}, ${byId(refs.navngivenVej)}) { nodes { id_lokalId vejnavn } }
    roadPart: DAR_NavngivenVejKommunedel(first: 1, ${temporal(now)}, where: { navngivenVej: { eq: ${JSON.stringify(refs.navngivenVej)} } }) { nodes { kommune vejkode } }
    postcode: DAR_Postnummer(first: 1, ${temporal(now)}, ${byId(refs.postnummer)}) { nodes { postnr navn } }
  }`
}

async function graphql(query, { fetchImpl, timeoutMs, env }) {
  const { graphqlKey, graphqlUrl } = darConfig(env)
  if (!graphqlKey) throw notConfigured('DATAFORDELER_API_KEY')
  const url = new URL(graphqlUrl)
  url.searchParams.set('apikey', graphqlKey)
  const { body } = await fetchJson(fetchImpl, url, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  }, timeoutMs)
  if (!body || typeof body !== 'object' || body.errors?.length || !body.data) {
    throw new ApiError(502, 'invalid_upstream_response', 'The address register returned an error or an unexpected response.')
  }
  return body.data
}

const firstNode = (connection) => connection?.nodes?.[0] ?? null

// Assumed WKT: "POINT (x y)" in EPSG:25832 unless position.crs says otherwise.
export function parsePointWkt(wkt, crs) {
  const match = /^\s*POINT\s*(?:Z\s*)?\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/i.exec(wkt ?? '')
  return match ? toWgs84(Number(match[1]), Number(match[2]), crs) : null
}

/** Full record for one access address, or throws 404 when the id is unknown. */
export async function fetchAccessAddress(id, { fetchImpl = fetch, timeoutMs = 8000, env, now = new Date() } = {}) {
  if (!UUID.test(id)) throw new ApiError(400, 'invalid_id', 'id must be a DAR access-address UUID.')
  const options = { fetchImpl, timeoutMs, env }
  const house = firstNode((await graphql(houseNumberQuery(id, now), options)).DAR_Husnummer)
  if (!house) throw new ApiError(404, 'address_not_found', 'No matching access address was found.')
  if (String(house.id_lokalId).toLowerCase() !== id.toLowerCase()) {
    throw new ApiError(502, 'invalid_upstream_response', 'The address service returned an unexpected address ID.')
  }
  const refs = { adgangspunkt: house.adgangspunkt, navngivenVej: house.navngivenVej, postnummer: house.postnummer }
  if (!Object.values(refs).every((ref) => UUID.test(ref ?? ''))) {
    throw new ApiError(502, 'invalid_upstream_response', 'The address register returned an incomplete address.')
  }
  const related = await graphql(relatedRecordsQuery(refs, now), options)
  const point = firstNode(related.point)
  const road = firstNode(related.road)
  const roadPart = firstNode(related.roadPart)
  const postcode = firstNode(related.postcode)
  const position = parsePointWkt(point?.position?.wkt, point?.position?.crs)
  if (!position || typeof road?.vejnavn !== 'string' || !road.vejnavn || !house.husnummertekst || !postcode?.postnr) {
    throw new ApiError(502, 'invalid_upstream_response', 'The address register returned an incomplete address.')
  }
  const municipalityCode = roadPart?.kommune != null ? String(roadPart.kommune).padStart(4, '0') : null
  const roadCode = roadPart?.vejkode != null ? String(roadPart.vejkode).padStart(4, '0') : null
  return {
    id: id.toLowerCase(),
    text: `${road.vejnavn} ${house.husnummertekst}, ${postcode.postnr} ${postcode.navn ?? ''}`.trim(),
    longitude: position.longitude,
    latitude: position.latitude,
    municipalityCode,
    roadCode,
    houseNumber: String(house.husnummertekst),
  }
}
