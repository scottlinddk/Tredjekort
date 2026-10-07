import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchMunicipalProposal } from '../api/municipalProposal.api'

export const municipalProposalKeys = {
  all: ['municipal-road-proposal'] as const,
}

export const municipalProposalOptions = () =>
  queryOptions({
    queryKey: municipalProposalKeys.all,
    queryFn: fetchMunicipalProposal,
    staleTime: Infinity, // static bundled data, never goes stale within a session
  })

// Opt-in layer: nothing is fetched until the user turns it on.
export function useMunicipalProposal(enabled: boolean) {
  return useQuery({ ...municipalProposalOptions(), enabled })
}
