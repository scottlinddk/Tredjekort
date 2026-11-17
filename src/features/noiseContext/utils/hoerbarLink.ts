// Dependency-free so the node test runner can load it directly.

/** Level range Hørbar accepts. Outside it Hørbar clamps, which would change the difference. */
const MIN_LEVEL_DB = 30
const MAX_LEVEL_DB = 85
/** Hørbar truncates labels to this length. */
const MAX_LABEL_LENGTH = 40

export interface HoerbarComparison {
  /** Level A in dB, e.g. the official value with the project. */
  levelA: number
  /** Level B in dB, e.g. the same value with more traffic. */
  levelB: number
  labelA: string
  labelB: string
  /** Where the numbers come from; shown as text in Hørbar. */
  source: string
}

const inRange = (level: number) =>
  Number.isFinite(level) && level >= MIN_LEVEL_DB && level <= MAX_LEVEL_DB

/**
 * Builds a link that opens the comparison in Hørbar (listen to the difference between
 * two levels). Returns null when Hørbar is not configured, the base URL is not http(s),
 * or a level is outside the range Hørbar can represent without altering the difference.
 */
export function hoerbarUrl(baseUrl: string | undefined, comparison: HoerbarComparison): string | null {
  if (!baseUrl || !inRange(comparison.levelA) || !inRange(comparison.levelB)) return null

  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  url.search = new URLSearchParams({
    a: String(comparison.levelA),
    b: String(comparison.levelB),
    la: comparison.labelA.slice(0, MAX_LABEL_LENGTH),
    lb: comparison.labelB.slice(0, MAX_LABEL_LENGTH),
    src: comparison.source,
  }).toString()
  url.hash = ''
  return url.toString()
}
