import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { isOfficialNoiseScenario, type NoiseMapMode } from '../constants/officialNoiseConfig'

const SHOW_NOISE_BAND_QUERY_PARAM = 'showNoiseBand'
const NOISE_SCENARIO_QUERY_PARAM = 'noiseScenario'
const NO_NOISE_LAYER = 'none'
const DEFAULT_NOISE_MODE: NoiseMapMode = 'original'

export interface UseNoiseMapQueryParamResult {
  noiseMode: NoiseMapMode
  setNoiseMode: (next: NoiseMapMode) => void
}

/**
 * Persists the distance zones or official noise scenario in the URL, so a shared or
 * bookmarked link reproduces what the sender was looking at. The official "original"
 * scenario is the default when the URL says nothing; choosing no noise layer is stored
 * explicitly as `noiseScenario=none`, so it survives a reload.
 */
export function useNoiseMapQueryParam(): UseNoiseMapQueryParamResult {
  const [searchParams, setSearchParams] = useSearchParams()

  const scenario = searchParams.get(NOISE_SCENARIO_QUERY_PARAM)
  const noiseMode: NoiseMapMode = isOfficialNoiseScenario(scenario) ? scenario
    : scenario === NO_NOISE_LAYER ? 'none'
      : searchParams.get(SHOW_NOISE_BAND_QUERY_PARAM) === 'true' ? 'distance' : DEFAULT_NOISE_MODE

  const setNoiseMode = useCallback(
    (next: NoiseMapMode) => {
      setSearchParams(
        (previous) => {
          const params = new URLSearchParams(previous)
          params.delete(NOISE_SCENARIO_QUERY_PARAM)
          params.delete(SHOW_NOISE_BAND_QUERY_PARAM)
          if (next === 'distance') {
            params.set(SHOW_NOISE_BAND_QUERY_PARAM, 'true')
          } else if (next === 'none') {
            params.set(NOISE_SCENARIO_QUERY_PARAM, NO_NOISE_LAYER)
          } else if (next !== DEFAULT_NOISE_MODE) {
            params.set(NOISE_SCENARIO_QUERY_PARAM, next)
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
