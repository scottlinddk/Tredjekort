// ETRS89 / UTM zone 32N (EPSG:25832) to WGS84 longitude/latitude.
//
// DAR and Dataforsyningen serve Danish coordinates in EPSG:25832 unless told otherwise.
// ETRS89 and WGS84 differ by well under a metre in Denmark, which is irrelevant for the
// 10 m rounded distances this app reports, so no datum shift is applied. The projection
// is the standard Krüger n-series inverse transverse Mercator on the GRS80 ellipsoid.
const A = 6378137
const F = 1 / 298.257222101
const K0 = 0.9996
const FALSE_EASTING = 500000
const CENTRAL_MERIDIAN_DEGREES = 9

const n = F / (2 - F)
const rectifyingRadius = (A / (1 + n)) * (1 + n ** 2 / 4 + n ** 4 / 64)
const beta = [
  n / 2 - (2 * n ** 2) / 3 + (37 * n ** 3) / 96 - n ** 4 / 360,
  n ** 2 / 48 + n ** 3 / 15 - (437 * n ** 4) / 1440,
  (17 * n ** 3) / 480 - (37 * n ** 4) / 840,
  (4397 * n ** 4) / 161280,
]
const delta = [
  2 * n - (2 * n ** 2) / 3 - 2 * n ** 3,
  (7 * n ** 2) / 3 - (8 * n ** 3) / 5,
  (56 * n ** 3) / 15,
]
const alpha = [
  n / 2 - (2 * n ** 2) / 3 + (5 * n ** 3) / 16 + (41 * n ** 4) / 180,
  (13 * n ** 2) / 48 - (3 * n ** 3) / 5 + (557 * n ** 4) / 1440,
  (61 * n ** 3) / 240 - (103 * n ** 4) / 140,
  (49561 * n ** 4) / 161280,
]
const toDegrees = (radians) => (radians * 180) / Math.PI
const toRadians = (degrees) => (degrees * Math.PI) / 180

export function utm32ToWgs84(easting, northing) {
  const xi = northing / (K0 * rectifyingRadius)
  const eta = (easting - FALSE_EASTING) / (K0 * rectifyingRadius)
  let xiPrime = xi
  let etaPrime = eta
  beta.forEach((b, index) => {
    const j = 2 * (index + 1)
    xiPrime -= b * Math.sin(j * xi) * Math.cosh(j * eta)
    etaPrime -= b * Math.cos(j * xi) * Math.sinh(j * eta)
  })
  const chi = Math.asin(Math.sin(xiPrime) / Math.cosh(etaPrime))
  let latitude = chi
  delta.forEach((d, index) => { latitude += d * Math.sin(2 * (index + 1) * chi) })
  const longitude = toRadians(CENTRAL_MERIDIAN_DEGREES) + Math.atan2(Math.sinh(etaPrime), Math.cos(xiPrime))
  return { longitude: toDegrees(longitude), latitude: toDegrees(latitude) }
}

// Only used to verify the inverse in tests, via a round trip.
export function wgs84ToUtm32(longitude, latitude) {
  const phi = toRadians(latitude)
  const dLambda = toRadians(longitude - CENTRAL_MERIDIAN_DEGREES)
  const t = Math.sinh(Math.atanh(Math.sin(phi)) - ((2 * Math.sqrt(n)) / (1 + n)) * Math.atanh(((2 * Math.sqrt(n)) / (1 + n)) * Math.sin(phi)))
  const xiPrime = Math.atan2(t, Math.cos(dLambda))
  const etaPrime = Math.atanh(Math.sin(dLambda) / Math.sqrt(1 + t * t))
  let xi = xiPrime
  let eta = etaPrime
  alpha.forEach((a, index) => {
    const j = 2 * (index + 1)
    xi += a * Math.sin(j * xiPrime) * Math.cosh(j * etaPrime)
    eta += a * Math.cos(j * xiPrime) * Math.sinh(j * etaPrime)
  })
  return { easting: FALSE_EASTING + K0 * rectifyingRadius * eta, northing: K0 * rectifyingRadius * xi }
}
