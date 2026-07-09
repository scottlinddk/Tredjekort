import { NOISE_COLOR_SCHEMES, type NoiseColorScheme } from '../constants/mapConfig'

/**
 * Builds a MapLibre `match` expression mapping a feature's `bandIndex` to a scheme color.
 * Returned as `any`: MapLibre's generated expression types don't expose a public type for
 * an arbitrary-length `match` expression, and the paint property setters accept this shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildNoiseFillColorExpression(scheme: NoiseColorScheme): any {
  const colors = NOISE_COLOR_SCHEMES[scheme]
  const lastColor = colors[colors.length - 1]

  return ['match', ['get', 'bandIndex'], ...colors.flatMap((color, index) => [index, color]), lastColor]
}
