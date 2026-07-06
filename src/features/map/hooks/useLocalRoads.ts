import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchLocalRoads } from '../api/localRoads.api'

export const localRoadsKeys = {
  all: ['local-roads'] as const,
}

export const localRoadsOptions = () =>
  queryOptions({
    queryKey: localRoadsKeys.all,
    queryFn: fetchLocalRoads,
    staleTime: Infinity, // static bundled data, never goes stale within a session
  })

export function useLocalRoads() {
  return useQuery(localRoadsOptions())
}
