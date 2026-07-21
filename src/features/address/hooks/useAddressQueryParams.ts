import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

// Namespaced so the address query can't collide with other query params the
// page might grow later.
const ADDRESS_QUERY_PARAM = 'address.q'

export interface UseAddressQueryParamsResult {
  addressQuery: string
  setAddressQuery: (text: string | null) => void
}

/**
 * Persists the searched address text in the URL query string, so a search
 * result (and the noise band it reveals) can be bookmarked, shared, or
 * restored with the browser's back/forward navigation. Only the human-
 * readable text is stored; the matching coordinates are re-resolved from it
 * so the URL stays short and free of opaque ids.
 */
export function useAddressQueryParams(): UseAddressQueryParamsResult {
  const [searchParams, setSearchParams] = useSearchParams()

  const addressQuery = searchParams.get(ADDRESS_QUERY_PARAM) ?? ''

  const setAddressQuery = useCallback(
    (text: string | null) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          if (!text) {
            next.delete(ADDRESS_QUERY_PARAM)
          } else {
            next.set(ADDRESS_QUERY_PARAM, text)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return { addressQuery, setAddressQuery }
}
