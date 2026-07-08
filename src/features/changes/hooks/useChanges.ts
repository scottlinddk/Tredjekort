import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchChanges } from '../api/changes.api'

export const changesKeys = {
  all: ['changes-feed'] as const,
}

export const changesOptions = () =>
  queryOptions({
    queryKey: changesKeys.all,
    queryFn: ({ signal }) => fetchChanges(signal),
    // Live data (unlike the bundled map layers), but it changes at most daily —
    // 30 min keeps it fresh without refetching on every navigation.
    staleTime: 30 * 60_000,
  })

export function useChanges() {
  return useQuery(changesOptions())
}
