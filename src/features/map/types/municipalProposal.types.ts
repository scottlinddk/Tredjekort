import type { Feature, FeatureCollection, LineString } from 'geojson'

type LocalizedText = { da: string; en: string }

export interface MunicipalProposalSegmentProperties {
  id: string
  kind: 'segment'
  name: LocalizedText
  // Annual average daily traffic. Null when the municipality publishes no current count,
  // e.g. for a road that does not exist yet. Never 0 as a stand-in for unknown.
  aadtCurrent: number | null
  aadtForecast: number
  forecastYear: number
  status: 'preliminary-proposal'
  confidence: 'schematic' | null
  geometrySource: string
  sourceUrl: string
  reviewedAt: string
}

export interface MunicipalProposalMetadata {
  publisher: string
  title: LocalizedText
  sourceUrl: string
  reviewedAt: string
  sourceUpdatedAt: string | null
  status: 'preliminary-proposal'
  comparison: { road: string; aadtCurrent: number }
  closures: { mapped: boolean; reason: string }
  crossings: { mapped: boolean; reason: string }
}

// Segments without verified street geometry keep a null geometry, so their traffic
// figures can still be listed without a line being drawn in the wrong place.
export type MunicipalProposalSegment = Feature<LineString | null, MunicipalProposalSegmentProperties>

export type MunicipalProposalFeatureCollection = FeatureCollection<LineString | null, MunicipalProposalSegmentProperties> & {
  metadata: MunicipalProposalMetadata
}
