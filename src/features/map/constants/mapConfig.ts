// Free, no-API-key vector basemap. Swap for MapTiler/Stadia/self-hosted tiles if usage grows.
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

// Centered roughly on the Egholm fjord crossing, framing the full Dall-to-Vadum corridor.
export const DEFAULT_MAP_CENTER: [number, number] = [9.89, 57.02]
export const DEFAULT_MAP_ZOOM = 11.5

export const LAYER_IDS = {
  roadAlignmentLine: 'road-alignment-line',
  roadAlignmentCasing: 'road-alignment-casing',
  localRoadsLine: 'local-roads-line',
  localRoadsCasing: 'local-roads-casing',
  noiseBufferFill: 'noise-buffer-fill',
  noiseScreensLine: 'noise-screens-line',
  junctionPoints: 'junction-points',
} as const

export const CONFIDENCE_COLORS = {
  surveyed: '#1d4ed8',
  provisional: '#a16207',
  schematic: '#6b7280',
} as const

// Matches the --color-fjord design token in tokens.css.
export const LOCAL_ROAD_COLOR = '#0e7490'

// Planned noise barriers (Table 6, Nov 2023 updated noise study), rendered as a solid
// (not dotted) line since these are physical mitigation structures, not road alignment.
export const NOISE_SCREEN_COLOR = '#7c2d12'

// Everything on this map is a planned road, none of it exists yet, so all alignments
// render dotted. Zero-length dashes with a round line-cap produce true dots.
export const DOTTED_LINE_DASHARRAY: [number, number] = [0, 2.2]
export const DOTTED_LINE_DASHARRAY_SPARSE: [number, number] = [0, 3.2]

// Vejdirektoratet has published a real Lden noise study (dB bands: 52-54, 54-56, 56-58,
// 58-60, 60-62, 62-64, 64-66, 66-68, 68+) for station 102+200-110+800, "Detailbesigtigelse -
// Stojkort", drawing 9095-29011, dated 2026-04-10, modeled for 2035 traffic with the project
// built. That document is raster (not vector) and has not been georeferenced into this app,
// an attempt to cross-reference it against the deklarationsrids station calibration produced
// inconsistent results (~90-100m disagreement at shared chainage points) and was abandoned
// rather than shipped. Revisit if a reliable georeferencing approach turns up.
//
// The bands below are still the same distance-based approximation as before (concentric
// buffers around the road alignment, NOT a real acoustic propagation model), just labelled
// with real dB ranges lifted from `OFFICIAL_NOISE_STUDY_REFERENCE.dbBandsLden` below. The dB
// label on a given ring is illustrative (higher published bands placed closer to the road),
// not a claim that the real contour for that dB range actually sits at that distance.
// Ordered lowest to highest dB; index into this array is the band's `bandIndex` in the
// generated GeoJSON, used to look up a color from `NOISE_COLOR_SCHEMES` below.
export const NOISE_DB_BANDS = [
  { distanceMeters: 700, dbLabel: '52-56 dB' },
  { distanceMeters: 550, dbLabel: '56-58 dB' },
  { distanceMeters: 425, dbLabel: '58-60 dB' },
  { distanceMeters: 325, dbLabel: '60-62 dB' },
  { distanceMeters: 225, dbLabel: '62-64 dB' },
  { distanceMeters: 125, dbLabel: '64-68+ dB' },
] as const

// Two alternative color ramps users can toggle between for the noise bands, both running
// from lowest dB (index 0) to highest (index 5). "warm" mirrors the yellow-to-red styling
// common on official Danish noise maps; "cool" is a blue-to-purple alternative for anyone
// who finds the red end of "warm" reads as more alarming than intended.
export const NOISE_COLOR_SCHEMES = {
  warm: ['#ffffb2', '#fed976', '#feb24c', '#fd8d3c', '#f03b20', '#bd0026'],
  cool: ['#f7fcfd', '#bfd3e6', '#9ebcda', '#8c96c6', '#8c6bb1', '#88419d'],
} as const

export type NoiseColorScheme = keyof typeof NOISE_COLOR_SCHEMES

export const NOISE_BAND_OPACITY_DEFAULT = 0.18
export const NOISE_BAND_OPACITY_MIN = 0.05
export const NOISE_BAND_OPACITY_MAX = 0.6
export const NOISE_BAND_OPACITY_STEP = 0.05

export const OFFICIAL_NOISE_STUDY_REFERENCE = {
  title: 'Detailbesigtigelse - Stojkort, 9095 3. Limfjordsforbindelse',
  drawingNumber: '9095-29011',
  date: '2026-04-10',
  stationRange: '102+200 to 110+800',
  dbBandsLden: [52, 54, 56, 58, 60, 62, 64, 66, 68],
} as const

// A separate, earlier Vejdirektoratet noise study, covering the whole route (not just
// one station range) with aggregate impact figures and the planned noise-screen
// stretches now in noise-screens.geojson. Also not the source for the buffers below.
export const UPDATED_NOISE_CALCULATIONS_REFERENCE = {
  title: 'Opdaterede stojberegninger for den 3. Limfjordsforbindelse',
  date: '2023-11',
  noiseAffectedHomes: { reference: 671, withProject: 682 },
  noiseBurdenIndex: { reference: 102, withProject: 87 },
  totalScreenLengthMeters: 5200,
} as const

