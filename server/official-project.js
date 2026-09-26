import { bbox, booleanPointInPolygon, lineString, pointToLineDistance } from '@turf/turf'

export function nearestOfficialDesign(origin, collection) {
  let nearest = null
  for (const feature of collection?.features ?? []) {
    const lines = feature.geometry.type === 'MultiLineString' ? feature.geometry.coordinates : [feature.geometry.coordinates]
    for (const coordinates of lines) {
      if (coordinates.length < 2 || coordinates.every((coordinate) => coordinate[0] === coordinates[0][0] && coordinate[1] === coordinates[0][1])) continue
      const distanceMeters = pointToLineDistance(origin, lineString(coordinates), { units: 'meters', method: 'geodesic' })
      if (!nearest || distanceMeters < nearest.distanceMeters) {
        nearest = { distanceMeters, featureId: feature.id ?? feature.properties?.sourceFeatureId ?? null, properties: feature.properties }
      }
    }
  }
  return nearest ? {
    ...nearest,
    distanceMeters: Math.round(nearest.distanceMeters / 10) * 10,
    includesRampsAndLocalRoads: true,
    geometryIncluded: false,
  } : null
}

export function lookupLandRequirements(origin, collection) {
  if (!collection) return null
  const matches = []
  const sourceGeometryIssues = []
  const [longitude, latitude] = origin.geometry.coordinates
  const insideBox = ([west, south, east, north]) => longitude >= west && longitude <= east && latitude >= south && latitude <= north
  for (const feature of collection.features) {
    const featureId = feature.id ?? feature.properties?.sourceFeatureId ?? null
    const invalidComponents = feature.properties.invalidGeometryComponents ?? []
    if (feature.properties.sourceGeometryValid === false && !invalidComponents.length) {
      if (insideBox(feature.bbox ?? bbox(feature))) {
        sourceGeometryIssues.push({ featureId, componentIndex: null, reason: 'Source geometry is invalid; affected components are not identified.' })
      }
      continue
    }
    for (const component of invalidComponents) {
      if (insideBox(component.bbox)) sourceGeometryIssues.push({ featureId, componentIndex: component.index, reason: component.reason })
    }
    const polygons = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates]
    let matched = false
    let onBoundary = false
    for (const [index, coordinates] of polygons.entries()) {
      if (invalidComponents.some((component) => component.index === index)) continue
      const polygon = { type: 'Polygon', coordinates }
      if (booleanPointInPolygon(origin, polygon)) {
        matched = true
        onBoundary ||= !booleanPointInPolygon(origin, polygon, { ignoreBoundary: true })
      }
    }
    if (matched) matches.push({ featureId, properties: feature.properties, onBoundary })
  }
  return {
    status: sourceGeometryIssues.length ? 'source_geometry_invalid' : matches.some((match) => match.onBoundary) ? 'boundary' : matches.length ? 'within_mapped_area' : 'outside_mapped_areas',
    matches,
    sourceGeometryIssues,
    establishesExpropriation: false,
    geometryIncluded: false,
  }
}
