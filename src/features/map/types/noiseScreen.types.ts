import type { Feature, FeatureCollection, LineString } from 'geojson'

export interface NoiseScreenProperties {
  id: string
  name: string
  length_m: number | null
  group_id?: string
  group_length_m?: number
  source_url?: string
  source_updated_at?: string
  reviewed_at?: string
  length_is_approximate?: boolean
  length_scope?: string
  height_m: string
  confidence: 'schematic'
  source: string
  note?: string
}

export type NoiseScreenFeature = Feature<LineString, NoiseScreenProperties>
export type NoiseScreenFeatureCollection = FeatureCollection<LineString, NoiseScreenProperties>
