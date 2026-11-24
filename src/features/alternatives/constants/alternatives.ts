import data from '../../../data/consolidation-2026-11.json'
import type { Consolidation, CrossingAlternativeId } from '../types/alternatives.types'

export const consolidation = data as Consolidation

export const CROSSING_ALTERNATIVE_IDS: readonly CrossingAlternativeId[] = [
  'immersed-tunnel',
  'cut-and-cover',
  'high-bridge',
  'bascule-bridge',
]

export function isCrossingAlternativeId(value: unknown): value is CrossingAlternativeId {
  return typeof value === 'string' && (CROSSING_ALTERNATIVE_IDS as readonly string[]).includes(value)
}

export const ALTERNATIVE_ALIGNMENT_COLOR = '#ea580c'
export const PFAS_DEPOSIT_COLOR = '#a16207'

// Validated with the dataviz palette check (CVD WARN is covered by the dash patterns
// and labels). Map styling of the Sønderdyb crossing per alternative. Tunnels are dashed (below
// ground), bridges solid (above water); the bascule bridge gets a gap for its leaf.
export const CROSSING_STYLE: Record<CrossingAlternativeId, { color: string; dash: [number, number] }> = {
  'immersed-tunnel': { color: '#4338ca', dash: [1, 1.2] },
  'cut-and-cover': { color: '#a855f7', dash: [3, 1.5] },
  // [1, 0] draws a solid line, so one layer can switch style without being rebuilt.
  'high-bridge': { color: '#0284c7', dash: [1, 0] },
  'bascule-bridge': { color: '#e11d48', dash: [6, 0.8] },
}

export function formatBn(value: number, language: 'da' | 'en'): string {
  return new Intl.NumberFormat(language === 'da' ? 'da-DK' : 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)
}

export function formatSaving(min: number, max: number, language: 'da' | 'en'): string {
  return min === max ? formatBn(min, language) : `${formatBn(min, language)}–${formatBn(max, language)}`
}
