import data from '../../data/project-information.json'

type Localized = { da: string; en: string }
interface SourcedItem {
  id: string
  title: Localized
  summary: Localized
  sourceUrl: string
  sourceUpdatedAt?: string
  period?: Localized
}
export interface ProjectDocument {
  id: string
  category: string
  title: Localized
  url: string
  date?: string
  publishedMonth?: string
  scenario?: string
  forecastYear?: number
  region?: string
}
interface ProjectInformation {
  schemaVersion: number
  reviewedAt: string
  project: {
    title: string
    phase: Localized
    expectedOpeningYear: number
    lengthKm: number
    lanes: number
    sourceUrl: string
    sourceUpdatedAt: string
  }
  facts: SourcedItem[]
  timeline: SourcedItem[]
  updates: SourcedItem[]
  documents: ProjectDocument[]
  limitations: Localized[]
}

export const projectInformation: ProjectInformation = data
