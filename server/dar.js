// Danmarks Adresseregister (DAR) access, replacing DAWA which closed on 1 October 2026.
//
// Both operations go through Adressevælger (Klimadatastyrelsen), with one token:
//   1. Phonetic search of husnumre (`/husnumre/soeg`): the search box and typed addresses.
//      It returns only type, id and a display text, never coordinates.
//   2. Lookup by id (`/husnumre/{id}`): the DAR record for one access address (road name,
//      municipality and road code, house number, postcode, access-point position).
//
// An access address is a DAR "husnummer". Its id equals the DAWA "adgangsadresse" id,
// so ids stored in old links and API consumers stay valid.
//
// IMPORTANT: every assumption about upstream response shapes lives in this file. Both parts
// follow the published documentation ("Fonetisk søgning" and "Opslag med ID"). The id-lookup
// parser is deliberately tolerant about envelope and key casing, because no live payload has
// been checked. Run `node scripts/verify-dar.mjs` with a real token to confirm it.
import { ApiError } from './api-error.js'
import { utm32ToWgs84 } from './crs.js'

export const DAR_SOURCE_URL = 'https://danmarksadresser.dk/om-adresser/danmarks-adresseregister-dar'
const ADRESSEVAELGER_URL = 'https://adressevaelger.dk/husnumre/soeg'
const ADRESSEVAELGER_LOOKUP_URL = 'https://adressevaelger.dk/husnumre/'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function darConfig(env = process.env) {
  return { adressevaelgerToken: env.ADRESSEVAELGER_TOKEN?.trim() || null }
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

// ---- Adressevælger id lookup (authoritative record for one access address) ------------------

// Key casing and nesting are not verified against a live payload, so keys are compared in
// lower case and the record is found by its `adgangspunkt` member wherever the envelope puts it.
function lowerKeys(value) {
  if (Array.isArray(value)) return value.map(lowerKeys)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key.toLowerCase(), lowerKeys(inner)]))
  return value
}

function findRecord(node, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 4) return null
  if (!Array.isArray(node) && node.adgangspunkt && typeof node.adgangspunkt === 'object') return node
  for (const inner of Object.values(node)) {
    const found = findRecord(inner, depth + 1)
    if (found) return found
  }
  return null
}

const text = (value) => (typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '')
const padded = (value) => (text(value) ? text(value).padStart(4, '0') : null)

/** Public for tests: turns one `/husnumre/{id}` answer into the record the app uses, or null. */
export function parseHouseNumberRecord(body, id) {
  const record = findRecord(lowerKeys(body))
  if (!record) return null
  const point = record.adgangspunkt
  const coordinates = point.koordinater ?? point.position ?? point.geometri
  const x = Number(coordinates?.x ?? coordinates?.coordinates?.[0])
  const y = Number(coordinates?.y ?? coordinates?.coordinates?.[1])
  const position = toWgs84(x, y, coordinates?.crs?.properties?.name ?? coordinates?.crs ?? point.crs ?? 'EPSG:25832')
  const road = record.navngivenvej ?? {}
  const roadPart = Array.isArray(record.navngivenvejkommunedel) ? record.navngivenvejkommunedel[0] : record.navngivenvejkommunedel ?? {}
  const postcode = record.postnummer ?? {}
  const roadName = text(road.vejnavn) || text(record.vejnavn)
  const houseNumber = text(record.husnummertekst)
  const label = roadName && houseNumber && text(postcode.postnr)
    ? `${roadName} ${houseNumber}, ${text(postcode.postnr)} ${text(postcode.navn ?? postcode.postnrnavn)}`.trim()
    : text(record.adgangsadressebetegnelse)
  if (!position || !label) return null
  return {
    id: id.toLowerCase(),
    text: label,
    longitude: position.longitude,
    latitude: position.latitude,
    municipalityCode: padded(roadPart.kommune ?? roadPart.kommunekode),
    roadCode: padded(roadPart.vejkode),
    houseNumber: houseNumber || null,
  }
}

/** Full record for one access address, or throws 404 when the id is unknown. */
export async function fetchAccessAddress(id, { fetchImpl = fetch, timeoutMs = 8000, env } = {}) {
  if (!UUID.test(id)) throw new ApiError(400, 'invalid_id', 'id must be a DAR access-address UUID.')
  const { adressevaelgerToken } = darConfig(env)
  if (!adressevaelgerToken) throw notConfigured('ADRESSEVAELGER_TOKEN')
  const url = new URL(`${ADRESSEVAELGER_LOOKUP_URL}${id.toLowerCase()}`)
  url.searchParams.set('token', adressevaelgerToken)
  const { body } = await fetchJson(fetchImpl, url, { headers: { accept: 'application/json' } }, timeoutMs, 'adressevaelger')
  const record = parseHouseNumberRecord(body, id)
  if (!record) {
    const status = lowerKeys(body)?.status
    if (typeof status === 'string' && status.toLowerCase() !== 'ok') throw new ApiError(404, 'address_not_found', 'No matching access address was found.')
    throw new ApiError(502, 'invalid_upstream_response', 'The address service returned an incomplete address.')
  }
  return record
}

/** Position of one access address, in the shape the search box needs. */
export async function lookupAddress(id, options) {
  const { text: label, longitude, latitude } = await fetchAccessAddress(id, options)
  return { id: id.toLowerCase(), text: label, longitude, latitude }
}
