import { buffer, featureCollection, lineString } from '@turf/turf'
import type { FeatureCollection, Polygon } from 'geojson'
import type { AlignmentFeatureCollection } from '../types/road.types'
import { NOISE_DB_BANDS } from '../constants/mapConfig'

export interface NoiseBufferProperties {
  distanceMeters: number
  dbLabel: string
  bandIndex: number
}

/**
 * Generates concentric distance-buffer polygons around the road alignment, one per
 * dB band in `NOISE_DB_BANDS`.
 *
 * This is NOT an acoustic noise model. Real noise propagation depends on traffic volume,
 * speed, barriers, terrain, and building density, none of which are modeled here. This is
 * a deliberately simplified stand-in until (or unless) real noise contour data becomes
 * available, and the UI must make that distinction clear to anyone viewing it.
 */
export function generateNoiseBuffers(
  alignment: AlignmentFeatureCollection,
): FeatureCollection<Polygon, NoiseBufferProperties> {
  // Largest radius first so smaller (higher dB) rings paint on top of it.
  const bands = NOISE_DB_BANDS.map((band, bandIndex) => ({ ...band, bandIndex })).sort(
    (a, b) => b.distanceMeters - a.distanceMeters,
  )

  const polygons = bands.map((band) => {
    const merged = alignment.features.map((feature) =>
      buffer(lineString(feature.geometry.coordinates), band.distanceMeters, { units: 'meters' }),
    )

    // Combine all segment buffers for this band into a single feature set entry.
    // (Segments are joined visually by overlapping buffers rather than a boolean union,
    // which keeps this dependency-light; overlaps do not affect the rendered result.)
    return merged
      .filter((f): f is NonNullable<typeof f> => f != null)
      .map((f) => ({
        ...f,
        properties: {
          distanceMeters: band.distanceMeters,
          dbLabel: band.dbLabel,
          bandIndex: band.bandIndex,
        },
      }))
  })

  return featureCollection(polygons.flat()) as FeatureCollection<Polygon, NoiseBufferProperties>
}
