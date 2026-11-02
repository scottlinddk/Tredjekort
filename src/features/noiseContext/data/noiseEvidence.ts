// Independent evidence used to put the official Egholmlinjen noise figures in context.
// Everything here is a published figure with its source; nothing is derived for a
// specific address. Keep claims at the strength of the source (see `strength`).

export type EvidenceStrength = 'peer_reviewed' | 'authority' | 'consultancy'

/** The Miljøstyrelsen guideline limit for housing, and the WHO 2018 recommendation (Lden). */
export const GUIDELINE_LIMIT_DB = 58
export const WHO_RECOMMENDATION_DB = 53

/**
 * Model error measured on the E45 (flat motorway, four sites, Randers-Vejle).
 * Calculated Lden was higher than measured by 0.1 to 4.0 dB at every site.
 * Valid for a flat ordinary motorway only. No Danish validation exists for fjord
 * crossings, embankments or low bridges, so this must never be applied to those.
 */
export const E45_MODEL_ERROR = {
  calculatedAboveMeasuredMinDb: 0.1,
  calculatedAboveMeasuredMaxDb: 4.0,
  strength: 'peer_reviewed' as EvidenceStrength,
  source: 'Kragh, Backalarz & Finne, FORCE Technology TC-101703 (2021); J. Acoust. Soc. Am. 154:547-555 (2023). Co-authors include Vejdirektoratet staff.',
}

/** Traffic scenarios shown as a sensitivity, relative to the forecast traffic. */
export const TRAFFIC_SCENARIOS = [1.25, 1.5, 2] as const

/**
 * Silkeborg motorway precedent: traffic about 40-70 % above the VVM assumption gave
 * about 2 dB more noise than assumed. Not evidence that Egholmlinjen will be the same.
 */
export const SILKEBORG_PRECEDENT = {
  trafficAboveForecastMinPct: 40,
  trafficAboveForecastMaxPct: 70,
  extraNoiseDb: 2,
  source: 'Transportministeren, TRU Alm.del 2017-18 bilag 78',
}

/**
 * Share strongly annoyed, as quoted by Vejdirektoratet from Rapport 551 (2016) in its
 * Motorring 3 MKV material (TRU Alm.del 2022-23 bilag 290). Published anchor points
 * only: the underlying curve is not reproduced, so nothing is interpolated.
 * A Greve Kommune summary gives 24 % at 58 dB instead of 22 %; check the original report.
 */
export const MOTORWAY_ANNOYANCE_ANCHORS = [
  { aboveDb: 53, sharePct: 12 },
  { aboveDb: 58, sharePct: 22 },
] as const
export const CITY_ROAD_ANNOYANCE_AT_58_PCT_BELOW = 10

export const ANNOYANCE_SOURCE =
  'Vejdirektoratet, Rapport 551: Støjgener fra byveje og motorveje (2016), as quoted in TRU Alm.del 2022-23 bilag 290'
