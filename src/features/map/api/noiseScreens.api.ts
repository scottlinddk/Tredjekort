import type { NoiseScreenFeatureCollection } from '../types/noiseScreen.types'

// Bundled as a static asset, same pattern as localRoads.api.ts.
export async function fetchNoiseScreens(): Promise<NoiseScreenFeatureCollection> {
  const module = await import('../../../data/noise-screens.geojson?url')
  const response = await fetch(module.default)
  if (!response.ok) {
    throw new Error(`Failed to load noise screen data: ${response.status}`)
  }
  return response.json() as Promise<NoiseScreenFeatureCollection>
}
