import { bbox, booleanPointInPolygon } from '@turf/turf'

export function prepareNoiseScenarios(collection, metadata) {
  const grouped = new Map()
  for (const feature of collection.features) {
    if (!Number.isFinite(feature.properties?.minDb)) continue
    const { scenario, minDb, maxDb, bandLabel, sourceFeatureId } = feature.properties
    if (!['original', 'reference', 'variant'].includes(scenario)) {
      throw new Error('Unknown official noise model scenario')
    }
    const normalised = {
      ...feature,
      id: sourceFeatureId,
      bbox: feature.bbox ?? bbox(feature),
      properties: { ...feature.properties, lowerDb: minDb, upperDb: maxDb, label: bandLabel },
    }
    if (!grouped.has(scenario)) grouped.set(scenario, [])
    grouped.get(scenario).push(normalised)
  }
  return [...grouped.entries()].map(([scenario, features]) => ({
    collection: { type: 'FeatureCollection', features },
    metadata: {
      scenario,
      scenarioLabel: metadata.scenarios?.find((item) => item.id === scenario)?.label ?? null,
      forecastYear: metadata.forecastYear,
      modelYear: metadata.modelYear,
      sourceUpdatedAt: metadata.sourceUpdatedAt,
      reviewedAt: metadata.reviewedAt,
      sourceUrl: metadata.sourceUrl,
      serviceUrl: metadata.serviceUrl,
      metric: metadata.indicator ?? 'Lden',
      units: metadata.units ?? 'dB',
      geometrySimplified: false,
    },
  }))
}

export function describeNoiseScenarios(results, metadata, language) {
  if (!results.length) return language === 'da'
    ? 'Et officielt støjniveau ved adressen er ikke tilgængeligt i appens data.'
    : 'An official address-level noise value is unavailable in the app data.'
  const scenarioNames = language === 'da'
    ? { original: 'oprindeligt forslag', reference: 'reference', variant: 'variant' }
    : { original: 'original proposal', reference: 'reference', variant: 'variant' }
  const matches = results.filter((result) => result.status === 'band_found')
    .map((result) => `${result.scenarioLabel?.[language] ?? scenarioNames[result.scenario]}: ${result.band.label}`)
  const uncertain = results.some((result) => ['boundary', 'overlapping_bands', 'source_geometry_invalid'].includes(result.status))
  if (language === 'da') {
    return `Det ældre officielle støjmodelmateriale fra ${metadata.modelYear} med prognoseår ${metadata.forecastYear} ${matches.length ? `viser følgende intervaller ved adressepunktet: ${matches.join('; ')}.` : 'giver ikke et entydigt støjinterval ved adressepunktet.'} ${uncertain ? 'En polygonkant, overlappende intervaller eller en fejl i kildegeometrien giver et usikkert opslag i mindst ét scenarie. ' : ''}Manglende polygoner betyder ikke, at støjen er under kortets laveste interval. Intervallerne beskriver modelleret vejtrafikstøj fra motorvejen og udvalgte omgivende veje, ikke alene motorvejens bidrag eller den samlede støj fra alle veje. De er ikke målinger eller det aktuelle 2035-projektmateriale. Der beregnes ikke en præcis forskel mellem scenarierne.`
  }
  return `The older official noise model from ${metadata.modelYear}, forecasting ${metadata.forecastYear}, ${matches.length ? `maps these bands at the address point: ${matches.join('; ')}.` : 'does not give an unambiguous noise band at the address point.'} ${uncertain ? 'A polygon boundary, conflicting overlaps or invalid source geometry makes at least one scenario ambiguous. ' : ''}Missing polygons do not establish noise below the lowest mapped band. Bands describe modelled road-traffic noise from the motorway and selected surrounding roads, not solely the motorway’s contribution or complete exposure from all roads. They are not measurements or the current 2035 project documents. No exact difference between scenarios is calculated.`
}

function bandKey(band) {
  return `${band.lowerDb}:${band.upperDb}`
}

function readBand(feature) {
  const { lowerDb, upperDb, label } = feature.properties
  if (!Number.isFinite(lowerDb) || (upperDb !== null && (!Number.isFinite(upperDb) || upperDb <= lowerDb))) {
    throw new Error('Invalid official noise band metadata')
  }
  return { lowerDb, upperDb, label }
}

/**
 * Finds a band in one documented model/scenario. Boundaries and conflicting
 * overlaps are explicit rather than silently choosing a band. Polygon holes
 * remain unmapped; an absent contour is never interpreted as low noise.
 *
 * The caller normalises documented source attributes to lowerDb/upperDb/label
 * without estimating values. A null upperDb represents an open-ended top band.
 */
export function lookupNoiseScenario(origin, collection, metadata) {
  const matches = []
  for (const feature of collection.features) {
    if (feature.geometry?.type !== 'Polygon' && feature.geometry?.type !== 'MultiPolygon') {
      throw new Error('Official noise geometry must be Polygon or MultiPolygon')
    }
    let lookupFeature = feature
    const invalidComponents = feature.properties.invalidGeometryComponents ?? []
    if (feature.properties.sourceGeometryValid === false || invalidComponents.length) {
      const [longitude, latitude] = origin.geometry.coordinates
      // A self-intersecting source polygon has no reliable interior. Avoid
      // claiming a band within an affected component's box, while retaining
      // valid components from the same source feature for lookups elsewhere.
      const invalidBoxes = invalidComponents.length
        ? invalidComponents.map((component) => component.bbox)
        : [feature.bbox ?? bbox(feature)]
      if (invalidBoxes.some(([west, south, east, north]) => longitude >= west && longitude <= east && latitude >= south && latitude <= north)) {
        matches.push({ featureId: feature.id ?? feature.properties.id ?? null, band: readBand(feature), onBoundary: false, invalidGeometry: true })
      }
      if (!invalidComponents.length) continue
      const polygons = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates]
      const validPolygons = polygons.filter((_, index) => !invalidComponents.some((component) => component.index === index))
      if (!validPolygons.length) continue
      lookupFeature = { ...feature, geometry: { type: 'MultiPolygon', coordinates: validPolygons } }
    }
    if (!booleanPointInPolygon(origin, lookupFeature)) continue
    matches.push({
      featureId: feature.id ?? feature.properties.id ?? null,
      band: readBand(feature),
      onBoundary: !booleanPointInPolygon(origin, lookupFeature, { ignoreBoundary: true }),
    })
  }
  const bands = [...new Map(matches.map((match) => [bandKey(match.band), match.band])).values()]
    .sort((a, b) => a.lowerDb - b.lowerDb)
  const onBoundary = matches.some((match) => match.onBoundary)
  const invalidGeometry = matches.some((match) => match.invalidGeometry)
  const status = matches.length === 0 ? 'no_matching_contour'
    : invalidGeometry ? 'source_geometry_invalid'
      : onBoundary ? 'boundary'
      : bands.length > 1 ? 'overlapping_bands' : 'band_found'
  return {
    ...metadata,
    status,
    band: status === 'band_found' ? bands[0] : null,
    candidateBands: bands,
    matchedFeatureIds: matches.filter((match) => !match.invalidGeometry).map((match) => match.featureId),
    sourceGeometryIssueFeatureIds: matches.filter((match) => match.invalidGeometry).map((match) => match.featureId),
    onBoundary,
    belowMappedThreshold: null,
  }
}
