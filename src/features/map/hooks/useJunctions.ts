import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchJunctions } from '../api/junctions.api'

export const junctionKeys = {
  all: ['junctions'] as const,
  detail: (id: string) => [...junctionKeys.all, id] as const,
}

export const junctionsOptions = () =>
  queryOptions({
    queryKey: junctionKeys.all,
    queryFn: fetchJunctions,
    staleTime: Infinity,
  })

export function useJunctions() {
  return useQuery(junctionsOptions())
}
