import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { AddressSuggestion } from '../api/addressSearch.api'

// Namespaced so the address selection can't collide with other query params
// the page might grow later.
const addressParamKeys = {
  id: 'address.id',
  text: 'address.q',
  lon: 'address.lon',
  lat: 'address.lat',
} as const

export interface UseAddressQueryParamsResult {
  selected: AddressSuggestion | null
  setSelected: (suggestion: AddressSuggestion | null) => void
}

/**
 * Persists the selected address in the URL query string, so a search result
 * (and the noise band it reveals) can be bookmarked, shared, or restored
 * with the browser's back/forward navigation.
 */
export function useAddressQueryParams(): UseAddressQueryParamsResult {
  const [searchParams, setSearchParams] = useSearchParams()

  const selected = useMemo<AddressSuggestion | null>(() => {
    const id = searchParams.get(addressParamKeys.id)
    const text = searchParams.get(addressParamKeys.text)
    const longitude = Number(searchParams.get(addressParamKeys.lon))
    const latitude = Number(searchParams.get(addressParamKeys.lat))

    if (!id || !text || !Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return null
    }
    return { id, text, longitude, latitude }
  }, [searchParams])

  const setSelected = useCallback(
    (suggestion: AddressSuggestion | null) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          if (!suggestion) {
            next.delete(addressParamKeys.id)
            next.delete(addressParamKeys.text)
            next.delete(addressParamKeys.lon)
            next.delete(addressParamKeys.lat)
          } else {
            next.set(addressParamKeys.id, suggestion.id)
            next.set(addressParamKeys.text, suggestion.text)
            next.set(addressParamKeys.lon, String(suggestion.longitude))
            next.set(addressParamKeys.lat, String(suggestion.latitude))
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return { selected, setSelected }
}
