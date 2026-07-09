import { point, pointToLineDistance } from '@turf/turf'
import type { AlignmentFeatureCollection } from '../../map/types/road.types'
import { NOISE_DB_BANDS } from '../../map/constants/mapConfig'

export type NoiseLevel = 'high' | 'moderate' | 'low' | 'minimal'

export interface NoiseAssessment {
  distanceMeters: number
  level: NoiseLevel
}

// Beyond this distance open-country motorway noise is generally below ambient levels.
// Like the buffer bands, this is a rule-of-thumb threshold, not an acoustic result.
const FAINTLY_AUDIBLE_LIMIT_METERS = 1500

const bandDistances = NOISE_DB_BANDS.map((band) => band.distanceMeters)
const outerDistance = Math.max(...bandDistances)
const innerDistance = Math.min(...bandDistances)

/**
 * Estimates whether residents at a point will hear road noise from the planned
 * motorway, using straight-line distance to the nearest alignment segment.
 *
 * This is NOT an acoustic model: terrain, noise barriers, traffic volume and the
 * tunnel section (which emits little surface noise) are all ignored. The verdict
 * levels reuse the same distance bands as the map's noise overlay.
 */
export function assessRoadNoise(
  longitude: number,
  latitude: number,
  alignment: AlignmentFeatureCollection,
): NoiseAssessment | null {
  if (alignment.features.length === 0) return null

  const origin = point([longitude, latitude])
  const distanceMeters = Math.min(
    ...alignment.features.map((feature) =>
      pointToLineDistance(origin, feature, { units: 'meters' }),
    ),
  )

  const level: NoiseLevel =
    distanceMeters < innerDistance
      ? 'high'
      : distanceMeters < outerDistance
        ? 'moderate'
        : distanceMeters < FAINTLY_AUDIBLE_LIMIT_METERS
          ? 'low'
          : 'minimal'

  return { distanceMeters, level }
}

export function formatDistance(distanceMeters: number, locale: string): string {
  if (distanceMeters < 995) {
    return `${(Math.round(distanceMeters / 10) * 10).toLocaleString(locale)} m`
  }
  return `${(distanceMeters / 1000).toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`
}
