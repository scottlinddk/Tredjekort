export interface AddressSuggestion {
  id: string
  text: string
  longitude: number
  latitude: number
}

const ENDPOINT = '/api/addresses'

/**
 * Looks up Danish access addresses via the app's own /api/addresses endpoint, which
 * searches DAR (Danmarks Adresseregister) through Dataforsyningen. There is no direct
 * browser fallback: the upstream search needs a token that must stay server-side.
 */
export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const response = await fetch(`${ENDPOINT}?q=${encodeURIComponent(query)}`, { signal })
  if (!response.ok) {
    throw new Error(`Address lookup failed: ${response.status}`)
  }
  return (await response.json()) as AddressSuggestion[]
}
