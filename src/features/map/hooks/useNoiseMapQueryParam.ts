import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { isOfficialNoiseScenario, type NoiseMapMode } from '../constants/officialNoiseConfig'

const SHOW_NOISE_BAND_QUERY_PARAM = 'showNoiseBand'

export interface UseNoiseMapQueryParamResult {
  noiseMode: NoiseMapMode
  setNoiseMode: (next: NoiseMapMode) => void
}

/**
 * Persists the distance zones or official noise scenario in the URL, so a shared or
 * bookmarked link reproduces what the sender was looking at.
 */
export function useNoiseMapQueryParam(): UseNoiseMapQueryParamResult {
  const [searchParams, setSearchParams] = useSearchParams()

  const scenario = searchParams.get('noiseScenario')
  const noiseMode: NoiseMapMode = isOfficialNoiseScenario(scenario) ? scenario
    : searchParams.get(SHOW_NOISE_BAND_QUERY_PARAM) === 'true' ? 'distance' : 'none'

  const setNoiseMode = useCallback(
    (next: NoiseMapMode) => {
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous)
          params.delete('noiseScenario')
          params.delete(SHOW_NOISE_BAND_QUERY_PARAM)
          if (next === 'distance') {
            params.set(SHOW_NOISE_BAND_QUERY_PARAM, 'true')
          } else if (isOfficialNoiseScenario(next)) {
            params.set('noiseScenario', next)
          }
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return { noiseMode, setNoiseMode }
}
