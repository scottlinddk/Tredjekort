import type { LocalRoadFeatureCollection } from '../types/localRoad.types'

// Bundled as a static asset, same pattern as roadAlignment.api.ts.
export async function fetchLocalRoads(): Promise<LocalRoadFeatureCollection> {
  const module = await import('../../../data/local-roads.geojson?url')
  const response = await fetch(module.default)
  if (!response.ok) {
    throw new Error(`Failed to load local roads data: ${response.status}`)
  }
  return response.json() as Promise<LocalRoadFeatureCollection>
}
