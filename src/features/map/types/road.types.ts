import type { Feature, FeatureCollection, LineString } from 'geojson'

export type AlignmentConfidence = 'surveyed' | 'provisional' | 'schematic'

export interface AlignmentProperties {
  segment: string
  confidence: AlignmentConfidence
  source: string
  note?: string
}

export type AlignmentFeature = Feature<LineString, AlignmentProperties>
export type AlignmentFeatureCollection = FeatureCollection<LineString, AlignmentProperties>
