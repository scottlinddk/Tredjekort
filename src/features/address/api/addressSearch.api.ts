/** One hit from Adressevælger's phonetic search. */
export interface AddressSuggestion {
  /** "husnummer" is a selectable access address. Other types ("vejnavn", "navngivenvejpostnummer",
   * "vejnavnhusnummer") mean the input was too vague, and their text is meant to refine it. */
  type: string
  /** DAR access-address UUID. Null for hits that are not access addresses. */
  id: string | null
  text: string
}

/** An access address with its position, resolved from a selected suggestion. */
export interface ResolvedAddress {
  id: string
  text: string
  longitude: number
  latitude: number
}

const ENDPOINT = '/api/addresses'
const MAX_QUERY_LENGTH = 73 // Adressevælger's documented limit for `tekst`

export function isSelectableAddress(suggestion: AddressSuggestion): suggestion is AddressSuggestion & { id: string } {
  return suggestion.type === 'husnummer' && suggestion.id !== null
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new Error(`Address lookup failed: ${response.status}`)
  }
  return (await response.json()) as T
}

/**
 * Searches Danish addresses through the app's own /api/addresses endpoint, which queries
 * Adressevælger (Klimadatastyrelsen). There is no direct browser fallback: the upstream
 * needs a token that must stay server-side. Hits carry no coordinates; use `lookupAddress`.
 */
export function searchAddresses(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  return getJson(`${ENDPOINT}?q=${encodeURIComponent(query.slice(0, MAX_QUERY_LENGTH))}`, signal)
}

/** Position of one access address, read from DAR through the same endpoint. */
export function lookupAddress(id: string, signal?: AbortSignal): Promise<ResolvedAddress> {
  return getJson(`${ENDPOINT}?id=${encodeURIComponent(id)}`, signal)
}
