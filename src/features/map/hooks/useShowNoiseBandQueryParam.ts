import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

const SHOW_NOISE_BAND_QUERY_PARAM = 'showNoiseBand'

export interface UseShowNoiseBandQueryParamResult {
  showNoiseBand: boolean
  setShowNoiseBand: (next: boolean) => void
}

/**
 * Persists the noise band overlay's visibility in the URL, so a shared or
 * bookmarked link reproduces what the sender was looking at.
 */
export function useShowNoiseBandQueryParam(): UseShowNoiseBandQueryParamResult {
  const [searchParams, setSearchParams] = useSearchParams()

  const showNoiseBand = searchParams.get(SHOW_NOISE_BAND_QUERY_PARAM) === 'true'

  const setShowNoiseBand = useCallback(
    (next: boolean) => {
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous)
          if (next) {
            params.set(SHOW_NOISE_BAND_QUERY_PARAM, 'true')
          } else {
            params.delete(SHOW_NOISE_BAND_QUERY_PARAM)
          }
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return { showNoiseBand, setShowNoiseBand }
}
