import type { Feature, FeatureCollection, LineString } from 'geojson'

export interface NoiseScreenProperties {
  id: string
  name: string
  length_m: number
  height_m: string
  confidence: 'schematic'
  source: string
  note?: string
}

export type NoiseScreenFeature = Feature<LineString, NoiseScreenProperties>
export type NoiseScreenFeatureCollection = FeatureCollection<LineString, NoiseScreenProperties>
