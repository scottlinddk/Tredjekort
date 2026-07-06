import type { Feature, FeatureCollection, LineString } from 'geojson'

export type LocalRoadKind = 'realignment' | 'new-road'

export interface LocalRoadProperties {
  id: string
  name: string
  kind: LocalRoadKind
  confidence: 'schematic'
  source: string
  note?: string
}

export type LocalRoadFeature = Feature<LineString, LocalRoadProperties>
export type LocalRoadFeatureCollection = FeatureCollection<LineString, LocalRoadProperties>
