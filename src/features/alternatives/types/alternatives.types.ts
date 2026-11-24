import type { Feature, FeatureCollection, LineString, Polygon } from 'geojson'

export type LocalizedText = { da: string; en: string }

export type CrossingAlternativeId = 'immersed-tunnel' | 'cut-and-cover' | 'high-bridge' | 'bascule-bridge'

export interface CrossingAlternative {
  id: CrossingAlternativeId
  isBaseline?: boolean
  sourcePage: number
  // Savings against the ~12.5 bn November 2026 estimate, in DKK billion. A single
  // figure is published as min === max.
  savingMinBn: number
  savingMaxBn: number
  title: LocalizedText
  summary: LocalizedText
  shipsPass: 'always' | 'when-open'
  trafficStopsForShips: boolean
}

export interface BudgetRow {
  id: string
  label: LocalizedText
  original: number
  november2026: number
  november2026Approximate?: boolean
  // Null where the source table shows "-" or leaves the cell empty; never a computed stand-in.
  increase: number | null
  increaseApproximate?: boolean
  isTotal?: boolean
}

export interface CostDriver {
  id: string
  sourcePage: number
  minBn: number
  maxBn: number
  title: LocalizedText
  summary: LocalizedText
}

export interface Consolidation {
  schemaVersion: number
  publisher: string
  title: LocalizedText
  sourceDate: string
  reviewedAt: string
  sourceUrl: string
  status: 'preliminary'
  priceLevel: string
  caveat: LocalizedText
  budget: { sourcePage: number; unit: string; rows: BudgetRow[]; reserveNote: LocalizedText }
  costDrivers: CostDriver[]
  immersedTunnelSavings: {
    sourcePage: number
    totalBn: number
    items: { id: string; mio: number; label: LocalizedText }[]
  }
  alignmentAlternative: {
    id: string
    sourcePage: number
    savingMinBn: number
    savingMaxBn: number
    title: LocalizedText
    summary: LocalizedText
  }
  crossingAlternatives: CrossingAlternative[]
  nextSteps: LocalizedText & { sourcePage: number }
}

interface AlternativeFeatureBase {
  id: string
  name: LocalizedText
  status: 'preliminary-alternative'
  confidence: 'schematic' | 'official-axis-approximate'
  sourceUrl: string
  sourcePage: number
  reviewedAt: string
  note?: string
}

export type AlternativeAlignmentFeature = Feature<LineString, AlternativeFeatureBase & {
  kind: 'alternative-alignment'
  structure: 'road' | 'tunnel'
}>
export type DepositFeature = Feature<Polygon, AlternativeFeatureBase & { kind: 'pfas-deposit' }>
export type CrossingFeature = Feature<LineString, AlternativeFeatureBase & { kind: 'fjord-crossing' }>

export type AlternativesFeatureCollection = FeatureCollection<
  LineString | Polygon,
  AlternativeFeatureBase & { kind: 'alternative-alignment' | 'pfas-deposit' | 'fjord-crossing'; structure?: 'road' | 'tunnel' }
> & {
  metadata: {
    publisher: string
    title: LocalizedText
    sourceUrl: string
    sourceDate: string
    reviewedAt: string
    positionalUncertaintyM: number
    method: string
  }
}
