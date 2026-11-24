import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { isCrossingAlternativeId } from '../constants/alternatives'
import type { CrossingAlternativeId } from '../types/alternatives.types'

const SHOW_PARAM = 'alternatives'
const CROSSING_PARAM = 'crossing'
const DEFAULT_CROSSING: CrossingAlternativeId = 'immersed-tunnel'

/**
 * Keeps the November 2026 alternatives layer and the chosen fjord-crossing solution in
 * the URL (`?alternatives=1&crossing=high-bridge`), so the comparison page can link
 * straight to a map view and a shared link reproduces it.
 */
export function useAlternativesQueryParam() {
  const [searchParams, setSearchParams] = useSearchParams()
  const showAlternatives = searchParams.get(SHOW_PARAM) === '1'
  const requested = searchParams.get(CROSSING_PARAM)
  const crossing: CrossingAlternativeId = isCrossingAlternativeId(requested) ? requested : DEFAULT_CROSSING

  const update = useCallback((show: boolean, next: CrossingAlternativeId) => {
    setSearchParams((previous) => {
      const params = new URLSearchParams(previous)
      params.delete(SHOW_PARAM)
      params.delete(CROSSING_PARAM)
      if (show) {
        params.set(SHOW_PARAM, '1')
        if (next !== DEFAULT_CROSSING) params.set(CROSSING_PARAM, next)
      }
      return params
    }, { replace: true })
  }, [setSearchParams])

  const setShowAlternatives = useCallback((show: boolean) => update(show, crossing), [update, crossing])
  const setCrossing = useCallback((next: CrossingAlternativeId) => update(true, next), [update])

  return { showAlternatives, setShowAlternatives, crossing, setCrossing }
}
