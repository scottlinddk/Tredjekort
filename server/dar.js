// Danmarks Adresseregister (DAR) access, replacing DAWA which closed on 1 October 2026.
//
// Two services are combined, because DAR itself offers no search-as-you-type:
//   1. Adressevælger (Klimadatastyrelsen), phonetic search of husnumre: used for the
//      search box and for resolving typed addresses. It returns only type, id and a
//      display text, never coordinates.
//   2. Datafordeler GraphQL, DAR register: the authoritative record for one access
//      address (road name, municipality and road code, house number, postcode, position).
//
// An access address is a DAR "husnummer". Its id equals the DAWA "adgangsadresse" id,
// so ids stored in old links and API consumers stay valid.
//
// IMPORTANT: every assumption about upstream response shapes lives in this file, in the
// parse* and *Query functions. The Adressevælger part follows its published documentation
// ("Fonetisk søgning"); the GraphQL part was written without credentials. Run `node scripts/verify-dar.mjs` with real keys to check them.
import { ApiError } from './api-error.js'
import { utm32ToWgs84 } from './crs.js'

export const DAR_SOURCE_URL = 'https://danmarksadresser.dk/om-adresser/danmarks-adresseregister-dar'
const ADRESSEVAELGER_URL = 'https://adressevaelger.dk/husnumre/soeg'
const DEFAULT_GRAPHQL_URL = 'https://graphql.datafordeler.dk/DAR/v1'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function darConfig(env = process.env) {
  return {
    adressevaelgerToken: env.ADRESSEVAELGER_TOKEN?.trim() || null,
    graphqlKey: env.DATAFORDELER_API_KEY?.trim() || null,
    graphqlUrl: env.DAR_GRAPHQL_URL?.trim() || DEFAULT_GRAPHQL_URL,
  }
}

function notConfigured(variable) {
  return new ApiError(503, 'address_service_not_configured', `The address service is not configured (missing ${variable}).`)
}

// Keys travel in the query string because that is what both gateways document. They are
// never logged and never interpolated into error messages.
//
// A non-2xx answer is reported as `service` + `upstreamStatus` (never the URL or body), so
// a misconfigured key (401/403), a wrong path (404) or a rejected parameter (400) can be told
// apart without leaking anything. The first part of the body is logged server-side only.
async function fetchJson(fetchImpl, url, init, timeoutMs, service) {
  try {
    const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
    if (!response.ok) {
      const snippet = await response.text?.().then((text) => text.slice(0, 200).replace(/\s+/g, ' ')).catch(() => '')
      console.error(`[dar] ${service} answered HTTP ${response.status}${snippet ? `: ${snippet}` : ''}`)
      throw new ApiError(502, 'address_service_unavailable', `The address service (${service}) rejected the request with HTTP ${response.status}.`, { service, upstreamStatus: response.status })
    }
    return { body: await response.json() }
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new ApiError(504, 'address_service_timeout', 'The address service timed out. Try again later.', { service })
    }
    throw new ApiError(502, 'address_service_unavailable', 'The address service is unavailable or returned invalid JSON.', { service })
  }
}

function toWgs84(x, y, crs) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  const geographic = /4326|wgs ?84/i.test(String(crs ?? '')) || (Math.abs(x) <= 180 && Math.abs(y) <= 90)
  if (geographic) return Math.abs(x) <= 180 && Math.abs(y) <= 90 ? { longitude: x, latitude: y } : null
  const position = utm32ToWgs84(x, y)
  return Number.isFinite(position.longitude) && Number.isFinite(position.latitude) ? position : null
}

// ---- Adressevælger (search box and typed addresses) ---------------------------------------

// Documented output per hit: type, id, titel (plus vejnavn, husnummer, postnr, postdistrikt,
// antal_husnumre depending on type). Only type "husnummer" carries an access-address id;
// "vejnavn", "navngivenvejpostnummer" and "vejnavnhusnummer" mean the input was not specific
// enough, and their text is meant to be used to refine the search.
export const HOUSE_NUMBER_TYPE = 'husnummer'

// The envelope is not documented, so accept a bare array or an object holding one array.
function extractHits(body) {
  if (Array.isArray(body)) return body
  if (body && typeof body === 'object') return Object.values(body).find(Array.isArray) ?? null
  return null
}

function parseHit(hit) {
  const type = typeof hit?.type === 'string' ? hit.type.toLowerCase() : ''
  const text = typeof hit?.titel === 'string' ? hit.titel.trim() : ''
  if (!type || !text) return null
  if (type === HOUSE_NUMBER_TYPE) return UUID.test(hit.id ?? '') ? { type, id: hit.id.toLowerCase(), text } : null
  return { type, id: null, text }
}

/** Raw hits in the order Adressevælger ranks them, including refinement hints. */
export async function searchAddresses(query, { limit = 8, fetchImpl = fetch, timeoutMs = 8000, env } = {}) {
  const { adressevaelgerToken } = darConfig(env)
  if (!adressevaelgerToken) throw notConfigured('ADRESSEVAELGER_TOKEN')
  const url = new URL(ADRESSEVAELGER_URL)
  url.searchParams.set('tekst', query)
  url.searchParams.set('token', adressevaelgerToken)
  const { body } = await fetchJson(fetchImpl, url, { headers: { accept: 'application/json' } }, timeoutMs, 'adressevaelger')
  const hits = extractHits(body)
  if (!hits) throw new ApiError(502, 'invalid_upstream_response', 'The address service returned an unexpected response.')
  return hits.map(parseHit).filter(Boolean).slice(0, limit)
}

/** Access addresses only, for resolving typed addresses. */
export async function searchAccessAddresses(query, options) {
  return (await searchAddresses(query, { ...options, limit: Number.MAX_SAFE_INTEGER })).filter((hit) => hit.type === HOUSE_NUMBER_TYPE).slice(0, options?.limit ?? 8)
}

/** Search-box suggestions: `{ id, text, type }`. Non-husnummer hits have no id and refine the query. */
export async function suggestAddresses(query, options) {
  return searchAddresses(query, { ...options, limit: 8 })
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
  }, timeoutMs, 'datafordeler-graphql')
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

/** Position of one access address, in the shape the search box needs. */
export async function lookupAddress(id, options) {
  const { text, longitude, latitude } = await fetchAccessAddress(id, options)
  return { id: id.toLowerCase(), text, longitude, latitude }
}
