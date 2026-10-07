import type { MunicipalProposalFeatureCollection } from '../types/municipalProposal.types'
import type { MunicipalClosureFeatureCollection } from '../types/municipalClosure.types'
import type { MunicipalCrossSectionFeatureCollection } from '../types/municipalCrossSection.types'

// Bundled as a static asset, same pattern as noiseScreens.api.ts.
export async function fetchMunicipalProposal(): Promise<MunicipalProposalFeatureCollection> {
  const module = await import('../../../data/municipal-road-proposal.geojson?url')
  const response = await fetch(module.default)
  if (!response.ok) {
    throw new Error(`Failed to load municipal road proposal data: ${response.status}`)
  }
  return response.json() as Promise<MunicipalProposalFeatureCollection>
}

export async function fetchMunicipalClosures(): Promise<MunicipalClosureFeatureCollection> {
  const module = await import('../../../data/municipal-road-closures.geojson?url')
  const response = await fetch(module.default)
  if (!response.ok) {
    throw new Error(`Failed to load municipal road closure data: ${response.status}`)
  }
  return response.json() as Promise<MunicipalClosureFeatureCollection>
}

export async function fetchMunicipalCrossSections(): Promise<MunicipalCrossSectionFeatureCollection> {
  const module = await import('../../../data/municipal-cross-sections.geojson?url')
  const response = await fetch(module.default)
  if (!response.ok) {
    throw new Error(`Failed to load municipal cross-section data: ${response.status}`)
  }
  return response.json() as Promise<MunicipalCrossSectionFeatureCollection>
}
