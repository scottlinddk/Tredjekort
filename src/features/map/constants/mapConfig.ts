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
  junctionPoints: 'junction-points',
} as const

export const CONFIDENCE_COLORS = {
  surveyed: '#1d4ed8',
  provisional: '#a16207',
  schematic: '#6b7280',
} as const

// Matches the --color-fjord design token in tokens.css.
export const LOCAL_ROAD_COLOR = '#0e7490'

// Everything on this map is a planned road, none of it exists yet, so all alignments
// render dotted. Zero-length dashes with a round line-cap produce true dots.
export const DOTTED_LINE_DASHARRAY: [number, number] = [0, 2.2]
export const DOTTED_LINE_DASHARRAY_SPARSE: [number, number] = [0, 3.2]

export const NOISE_BUFFER_BANDS_METERS = [
  { distance: 600, opacity: 0.06 },
  { distance: 300, opacity: 0.12 },
] as const

// Vejdirektoratet has published a real Lden noise study (dB bands: 52-54, 54-56, 56-58,
// 58-60, 60-62, 62-64, 64-66, 66-68, 68+) for station 102+200-110+800, "Detailbesigtigelse -
// Stojkort", drawing 9095-29011, dated 2026-04-10, modeled for 2035 traffic with the project
// built. That document is raster (not vector) and has not been georeferenced into this app,
// an attempt to cross-reference it against the deklarationsrids station calibration produced
// inconsistent results (~90-100m disagreement at shared chainage points) and was abandoned
// rather than shipped. The buffers below remain a simplified distance-based approximation,
// not derived from that real data. Revisit if a reliable georeferencing approach turns up.
export const OFFICIAL_NOISE_STUDY_REFERENCE = {
  title: 'Detailbesigtigelse - Stojkort, 9095 3. Limfjordsforbindelse',
  drawingNumber: '9095-29011',
  date: '2026-04-10',
  stationRange: '102+200 to 110+800',
  dbBandsLden: [52, 54, 56, 58, 60, 62, 64, 66, 68],
} as const

