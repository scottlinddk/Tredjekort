import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchMunicipalClosures, fetchMunicipalProposal } from '../api/municipalProposal.api'

export const municipalProposalKeys = {
  all: ['municipal-road-proposal'] as const,
  closures: () => [...municipalProposalKeys.all, 'closures'] as const,
}

export const municipalProposalOptions = () =>
  queryOptions({
    queryKey: municipalProposalKeys.all,
    queryFn: fetchMunicipalProposal,
    staleTime: Infinity, // static bundled data, never goes stale within a session
  })

export const municipalClosuresOptions = () =>
  queryOptions({
    queryKey: municipalProposalKeys.closures(),
    queryFn: fetchMunicipalClosures,
    staleTime: Infinity,
  })

// Opt-in layer: nothing is fetched until the user turns it on.
export function useMunicipalProposal(enabled: boolean) {
  return useQuery({ ...municipalProposalOptions(), enabled })
}

export function useMunicipalClosures(enabled: boolean) {
  return useQuery({ ...municipalClosuresOptions(), enabled })
}
