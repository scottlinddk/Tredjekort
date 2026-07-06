import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchRoadAlignment } from '../api/roadAlignment.api'

export const roadAlignmentKeys = {
  all: ['road-alignment'] as const,
}

export const roadAlignmentOptions = () =>
  queryOptions({
    queryKey: roadAlignmentKeys.all,
    queryFn: fetchRoadAlignment,
    staleTime: Infinity, // static bundled data, never goes stale within a session
  })

export function useRoadAlignment() {
  return useQuery(roadAlignmentOptions())
}
