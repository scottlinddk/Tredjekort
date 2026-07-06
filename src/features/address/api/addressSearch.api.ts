export interface AddressSuggestion {
  id: string
  text: string
  longitude: number
  latitude: number
}

// Raw DAWA adgangsadresse-autocomplete item, the shape served both by our
// /api/addresses proxy and by DAWA directly.
interface DawaAutocompleteItem {
  tekst: string
  adgangsadresse?: {
    id: string
    x: number // longitude, WGS84
    y: number // latitude, WGS84
  }
}

const LOCAL_ENDPOINT = '/api/addresses'
const DAWA_ENDPOINT = 'https://api.dataforsyningen.dk/adgangsadresser/autocomplete'

function toSuggestions(items: DawaAutocompleteItem[]): AddressSuggestion[] {
  return items
    .filter(
      (item): item is Required<DawaAutocompleteItem> =>
        item.adgangsadresse != null &&
        Number.isFinite(item.adgangsadresse.x) &&
        Number.isFinite(item.adgangsadresse.y),
    )
    .map((item) => ({
      id: item.adgangsadresse.id,
      text: item.tekst,
      longitude: item.adgangsadresse.x,
      latitude: item.adgangsadresse.y,
    }))
}

/**
 * Looks up Danish addresses via the app's own /api/addresses endpoint (a proxy for
 * DAWA, Danmarks Adressers Web API). If that endpoint is unavailable, for example
 * on a static host without serverless functions, it falls back to calling DAWA
 * directly, which allows CORS from any origin.
 */
export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  let response: Response | null = null
  try {
    response = await fetch(`${LOCAL_ENDPOINT}?q=${encodeURIComponent(query)}`, { signal })
  } catch (error) {
    if (signal?.aborted) throw error
    response = null
  }

  if (!response || !response.ok) {
    const url = new URL(DAWA_ENDPOINT)
    url.searchParams.set('q', query)
    url.searchParams.set('per_side', '8')
    url.searchParams.set('fuzzy', '')
    response = await fetch(url, { signal })
  }

  if (!response.ok) {
    throw new Error(`Address lookup failed: ${response.status}`)
  }

  return toSuggestions((await response.json()) as DawaAutocompleteItem[])
}
