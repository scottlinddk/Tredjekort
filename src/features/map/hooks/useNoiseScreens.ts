import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchNoiseScreens } from '../api/noiseScreens.api'

export const noiseScreensKeys = {
  all: ['noise-screens'] as const,
}

export const noiseScreensOptions = () =>
  queryOptions({
    queryKey: noiseScreensKeys.all,
    queryFn: fetchNoiseScreens,
    staleTime: Infinity, // static bundled data, never goes stale within a session
  })

export function useNoiseScreens() {
  return useQuery(noiseScreensOptions())
}
