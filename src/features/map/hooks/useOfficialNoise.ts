import { useQuery } from '@tanstack/react-query'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import type { OfficialNoiseScenario } from '../constants/officialNoiseConfig'

export type OfficialNoiseData = FeatureCollection<Polygon | MultiPolygon, {
  scenario: OfficialNoiseScenario
  kind: 'noise-band' | 'study-area'
  bandLabel: string | null
  minDb: number | null
  maxDb: number | null
  color: string
}>

export function useOfficialNoise(enabled: boolean) {
  return useQuery({
    queryKey: ['official-noise-display'],
    enabled,
    staleTime: Infinity,
    queryFn: async ({ signal }): Promise<OfficialNoiseData> => {
      const response = await fetch('/data/official-noise-display.geojson', { signal })
      if (!response.ok) throw new Error(`Could not load official noise polygons: ${response.status}`)
      return response.json() as Promise<OfficialNoiseData>
    },
  })
}
