import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchAlternativesGeometry } from '../api/alternatives.api'

export const alternativesKeys = {
  all: ['alternatives-2026-11'] as const,
  geometry: () => [...alternativesKeys.all, 'geometry'] as const,
}

export const alternativesGeometryOptions = () =>
  queryOptions({
    queryKey: alternativesKeys.geometry(),
    queryFn: fetchAlternativesGeometry,
    staleTime: Infinity, // static bundled data
  })

// Opt-in map layer: nothing is fetched until the user turns it on.
export function useAlternativesGeometry(enabled: boolean) {
  return useQuery({ ...alternativesGeometryOptions(), enabled })
}
