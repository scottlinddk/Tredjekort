import type { Feature, FeatureCollection, LineString } from 'geojson'

type LocalizedText = { da: string; en: string }

export interface MunicipalClosureProperties {
  id: string
  kind: 'closure-with-path-access'
  // OpenStreetMap name of the side street; null when the crossed way has no name.
  street: string | null
  // Positional description: always set for unnamed ways, and where the name alone is ambiguous.
  description: LocalizedText | null
  corridorRoad: 'Mølholmsvej' | 'Annebergvej'
  side: 'north' | 'south'
  status: 'preliminary-proposal'
  confidence: 'schematic'
  crossedWayClass: string
  sideStreetDistanceM: number
  setBackFromCorridorM: number
  sourceImagePx: [[number, number], [number, number]]
  // Where the municipality drew the bar, along its redesigned road edge. The feature geometry
  // is drawn across the side street instead, so it cannot be mistaken for a main-road closure.
  publishedBarCoordinates: [[number, number], [number, number]]
  sourceUrl: string
  reviewedAt: string
}

export interface MunicipalClosuresMetadata {
  publisher: string
  title: LocalizedText
  sourceUrl: string
  sourceCaption: string
  status: 'preliminary-proposal'
  reviewedAt: string
  georeferencing: {
    method: string
    imageSizePx: [number, number]
    controlPoints: { street: string; imagePx: [number, number]; residualM: number }[]
    streetData: string
    tileTemplate: string
    zoom: number
  }
  note: string
}

export type MunicipalClosure = Feature<LineString, MunicipalClosureProperties>

export type MunicipalClosureFeatureCollection = FeatureCollection<LineString, MunicipalClosureProperties> & {
  metadata: MunicipalClosuresMetadata
}
