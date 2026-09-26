import { point, pointToLineDistance } from '@turf/turf'
import type { AlignmentFeatureCollection } from '../../map/types/road.types'
import { DISTANCE_BANDS } from '../../map/constants/mapConfig'

export type NoiseLevel = 'high' | 'moderate' | 'low' | 'minimal'

export interface NoiseAssessment {
  distanceMeters: number
  level: NoiseLevel
}

// Proximity categories only: this threshold makes no claim about audibility.
const OUTER_PROXIMITY_LIMIT_METERS = 1500

const bandDistances = DISTANCE_BANDS.map((band) => band.distanceMeters)
const outerDistance = Math.max(...bandDistances)
const innerDistance = Math.min(...bandDistances)

/**
 * Measures straight-line distance to the app's approximate alignment.
 * The legacy level names are proximity categories, not predicted noise levels.
 * No acoustic result or audibility verdict can be inferred from this calculation.
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
        : distanceMeters < OUTER_PROXIMITY_LIMIT_METERS
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
