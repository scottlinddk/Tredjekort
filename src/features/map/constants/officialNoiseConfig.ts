export const OFFICIAL_NOISE_SCENARIOS = ['original', 'reference', 'variant'] as const
export type OfficialNoiseScenario = typeof OFFICIAL_NOISE_SCENARIOS[number]
export type NoiseMapMode = 'none' | 'distance' | OfficialNoiseScenario

// Published 5 dB intervals from the VVM 2021 WFS (forecast traffic year 2040).
// Preserve the source service's palette and the literal label of its top band.
export const OFFICIAL_NOISE_BANDS = [
  { minDb: 53, label: '53–58 dB', color: '#99ff00' },
  { minDb: 58, label: '58–63 dB', color: '#ffff00' },
  { minDb: 63, label: '63–68 dB', color: '#ff9900' },
  { minDb: 68, label: '68–73 dB', color: '#ff3300' },
  { minDb: 73, label: '73–78 dB', color: '#9933cc' },
  { minDb: 78, label: '78 dB', color: '#6b238e' },
] as const

export function isOfficialNoiseScenario(value: string | null): value is OfficialNoiseScenario {
  return OFFICIAL_NOISE_SCENARIOS.some((scenario) => scenario === value)
}
