import type { AlignmentFeatureCollection } from '../types/road.types'

// Bundled as a static asset for now. If this ever moves to a real endpoint (Vejdirektoratet
// open data, an internal CMS, etc.), only this function needs to change, everything
// downstream reads through useRoadAlignment / roadAlignmentOptions.
export async function fetchRoadAlignment(): Promise<AlignmentFeatureCollection> {
  const module = await import('../../../data/road-alignment.geojson?url')
  const response = await fetch(module.default)
  if (!response.ok) {
    throw new Error(`Failed to load road alignment data: ${response.status}`)
  }
  return response.json() as Promise<AlignmentFeatureCollection>
}
