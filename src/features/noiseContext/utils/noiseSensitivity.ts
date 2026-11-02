// Dependency-free so the node test runner can load it directly.
const GUIDELINE_LIMIT_DB = 58 // Miljøstyrelsen guideline for housing, Lden

export interface NoiseRange {
  /** Lowest published value or band floor, dB Lden. */
  minDb: number
  /** Highest published value or band ceiling. Null for an open-ended top band. */
  maxDb: number | null
}

export interface TrafficSensitivityRow {
  trafficRatio: number
  /** Added noise in dB when only traffic volume changes (10·log10 rule). */
  deltaDb: number
  minDb: number
  maxDb: number | null
  /** True when the shift moves the upper end of the range past the guideline limit. */
  crossesGuidelineLimit: boolean
}

const round1 = (value: number) => Math.round(value * 10) / 10

/**
 * Standard acoustics: with speed and vehicle mix unchanged, noise energy scales with
 * traffic volume, so +25 % traffic is +1.0 dB, +50 % is +1.8 dB and +100 % is +3.0 dB.
 * This is an illustration, not an official or validated forecast.
 */
export function trafficDeltaDb(trafficRatio: number): number {
  if (!Number.isFinite(trafficRatio) || trafficRatio <= 0) throw new RangeError('trafficRatio must be positive')
  return round1(10 * Math.log10(trafficRatio))
}

export function trafficSensitivity(range: NoiseRange, ratios: readonly number[]): TrafficSensitivityRow[] {
  return ratios.map((trafficRatio) => {
    const deltaDb = trafficDeltaDb(trafficRatio)
    const top = range.maxDb ?? range.minDb
    return {
      trafficRatio,
      deltaDb,
      minDb: round1(range.minDb + deltaDb),
      maxDb: range.maxDb === null ? null : round1(range.maxDb + deltaDb),
      crossesGuidelineLimit: top <= GUIDELINE_LIMIT_DB && top + deltaDb > GUIDELINE_LIMIT_DB,
    }
  })
}
