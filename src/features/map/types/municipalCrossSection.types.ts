import type { Feature, FeatureCollection, Point } from 'geojson'

type LocalizedText = { da: string; en: string }

export interface MunicipalCrossSectionProperties {
  id: string
  kind: 'cross-section-illustration'
  // Label of the blue section marker in the municipality's plan drawing.
  section: string
  corridorRoad: 'Mølholmsvej' | 'Annebergvej'
  between: [string, string]
  // Served from public/, so the path is root-relative.
  image: { src: string; widthPx: number; heightPx: number }
  caption: LocalizedText
  alt: LocalizedText
  status: 'preliminary-proposal'
  confidence: 'schematic'
  sourceImagePx: [number, number]
  sourceUrl: string
  reviewedAt: string
}

export interface MunicipalCrossSectionsMetadata {
  publisher: string
  title: LocalizedText
  sourceUrl: string
  status: 'preliminary-proposal'
  reviewedAt: string
  georeferencing: { method: string; imageSizePx: [number, number] }
  note: string
}

export type MunicipalCrossSection = Feature<Point, MunicipalCrossSectionProperties>

export type MunicipalCrossSectionFeatureCollection = FeatureCollection<Point, MunicipalCrossSectionProperties> & {
  metadata: MunicipalCrossSectionsMetadata
}
