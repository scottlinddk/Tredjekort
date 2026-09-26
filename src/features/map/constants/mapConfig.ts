// Free, no-API-key vector basemap. Swap for MapTiler/Stadia/self-hosted tiles if usage grows.
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

// Centered roughly on the Egholm fjord crossing, framing the full Dall-to-Vadum corridor.
export const DEFAULT_MAP_CENTER: [number, number] = [9.89, 57.02]
export const DEFAULT_MAP_ZOOM = 11.5

export const LAYER_IDS = {
  noiseBufferFill: 'noise-buffer-fill',
  noiseScreensLine: 'noise-screens-line',
  junctionPoints: 'junction-points',
} as const

// Planned noise barriers (current official project page, June 2026), rendered as a solid
// (not dotted) line since these are physical mitigation structures, not road alignment.
export const NOISE_SCREEN_COLOR = '#7c2d12'

// Geometric proximity zones only. No acoustic measurement or modeled Lden value can
// be inferred from a distance to the alignment. Official scenario maps are linked
// from project-information.json and are not represented by these buffers.
export const DISTANCE_BANDS = [
  { distanceMeters: 700, distanceLabel: '550–700 m' },
  { distanceMeters: 550, distanceLabel: '425–550 m' },
  { distanceMeters: 425, distanceLabel: '325–425 m' },
  { distanceMeters: 325, distanceLabel: '225–325 m' },
  { distanceMeters: 225, distanceLabel: '125–225 m' },
  { distanceMeters: 125, distanceLabel: '0–125 m' },
] as const

// Three alternative color ramps users can toggle between for the noise bands, all running
// from outermost (index 0) to innermost (index 5). "warm" mirrors the yellow-to-red styling
// common on official Danish noise maps; "cool" is a blue-to-purple alternative for anyone
// who finds the red end of "warm" reads as more alarming than intended; "red" is a
// single-hue pale-to-dark-red ramp, matching the flat red fill this layer used before the
// multi-band redesign.
export const NOISE_COLOR_SCHEMES = {
  warm: ['#ffffb2', '#fed976', '#feb24c', '#fd8d3c', '#f03b20', '#bd0026'],
  cool: ['#f7fcfd', '#bfd3e6', '#9ebcda', '#8c96c6', '#8c6bb1', '#88419d'],
  red: ['#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#de2d26', '#a50f15'],
} as const

export type NoiseColorScheme = keyof typeof NOISE_COLOR_SCHEMES

export const NOISE_BAND_OPACITY_DEFAULT = 0.18
export const NOISE_BAND_OPACITY_MIN = 0.05
export const NOISE_BAND_OPACITY_MAX = 0.6
export const NOISE_BAND_OPACITY_STEP = 0.05
