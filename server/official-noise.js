import { bbox, booleanPointInPolygon, distance, point } from '@turf/turf'

const RECEIVER_COORDINATE_LIMIT_METERS = 50

function normaliseCode(value) {
  const text = String(value ?? '').trim()
  return /^\d{1,4}$/.test(text) ? text.padStart(4, '0') : null
}

function normaliseHouseNumber(value) {
  const text = String(value ?? '').trim().replace(/\s+/g, '').toUpperCase()
  const house = /^(\d+)([A-ZÆØÅ]?)$/.exec(text)
  return house ? `${Number(house[1])}${house[2]}` : text
}

function matchAddressReceivers(address, collection, metadata) {
  const empty = (status) => ({ status, receivers: [] })
  if (!collection || !metadata) return empty('dataset_unavailable')
  const municipality = normaliseCode(address?.municipalityCode)
  const road = normaliseCode(address?.roadCode)
  const house = normaliseHouseNumber(address?.houseNumber)
  if (!municipality || !road || !house) return empty('address_keys_unavailable')
  // The source has no municipality column. Its verified Aalborg scope is an
  // essential part of the key; a road code alone is not unique across Denmark.
  if (municipality !== '0851' || normaliseCode(metadata.municipalityCode) !== '0851') return empty('outside_municipality')
  const matches = collection.features.filter((feature) => normaliseCode(feature.properties.roadCode) === road
    && normaliseHouseNumber(feature.properties.houseNumber) === house)
  if (!matches.length) return empty('not_matched')
  const origin = point([address.longitude, address.latitude])
  const receivers = []
  for (const feature of matches) {
    if (feature.geometry?.type !== 'Point' || feature.geometry.coordinates.length < 2
      || !feature.geometry.coordinates.slice(0, 2).every(Number.isFinite)) return empty('coordinate_mismatch')
    const coordinateDistanceMeters = distance(origin, feature, { units: 'meters' })
    // Do not transfer a historical house number's data to a relocated or reused
    // current address, or choose the nearest source receiver instead of its key.
    if (coordinateDistanceMeters > RECEIVER_COORDINATE_LIMIT_METERS) return empty('coordinate_mismatch')
    const properties = feature.properties
    const value = properties.valuesDb?.original
    receivers.push({
      sourceRecordId: properties.sourceRecordId,
      sourceFeatureId: properties.sourceFeatureId ?? feature.id ?? null,
      valueDb: Number.isFinite(value) && value > 0 ? value : null,
      sourceFloor: properties.sourceFloor ?? null,
      sourceFloorCode: properties.sourceFloorCode ?? properties.rawSourceProperties?.sp_etage ?? null,
      sourceDoor: properties.sourceDoor ?? null,
      coordinateDistanceMeters: Math.round(coordinateDistanceMeters * 10) / 10,
    })
  }
  // An incomplete address group must not become a falsely complete min/max.
  return { status: receivers.every((receiver) => receiver.valueDb !== null) ? 'matched' : 'incomplete', receivers }
}

export function expectedWithProject({ scenarios, metadata, language, address, pointCollection, pointMetadata }) {
  const original = scenarios.find((scenario) => scenario.scenario === 'original')
  const receiverMatch = matchAddressReceivers(address, pointCollection, pointMetadata)
  const useReceivers = receiverMatch.status === 'matched'
  const values = receiverMatch.receivers.map((receiver) => receiver.valueDb)
  const receiverRange = useReceivers ? { minDb: Math.min(...values), maxDb: Math.max(...values), receiverCount: values.length } : null
  const valueDb = receiverRange && receiverRange.minDb === receiverRange.maxDb ? receiverRange.minDb : null
  const status = useReceivers ? (valueDb === null ? 'point_range_found' : 'point_value_found') : original?.status ?? 'model_unavailable'
  const band = !useReceivers && status === 'band_found' ? original.band : null
  const source = useReceivers ? pointMetadata : original ?? metadata
  const modelYear = source?.modelYear ?? null
  const forecastYear = source?.forecastYear ?? null
  const format = (value) => value.toLocaleString(language === 'da' ? 'da-DK' : 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const rangeText = receiverRange && `${format(receiverRange.minDb)}${format(receiverRange.minDb) === format(receiverRange.maxDb) ? '' : `–${format(receiverRange.maxDb)}`}`
  const estimate = useReceivers ? `${rangeText} dB(A)` : band?.upperDb === null ? language === 'da'
    ? `offentliggjort kategori ${band.label} (øverste grænse ikke oplyst)`
    : `published category ${band.label} (upper bound unspecified)` : band?.label
  const vintage = modelYear && forecastYear ? language === 'da'
    ? `Det er det oprindelige forslag fra modellen fra ${modelYear} med trafikprognose for ${forecastYear}.`
    : `This is the original proposal in the ${modelYear} model, forecasting traffic in ${forecastYear}.` : ''
  const missingReasons = language === 'da' ? {
    model_unavailable: 'Det oprindelige scenarie er ikke tilgængeligt.',
    no_matching_contour: 'Der er hverken en sikkert matchet modelværdi for adressen eller en støjkontur ved adressepunktet.',
    boundary: 'Adressepunktet ligger på en støjkonturgrænse, så der kan ikke vælges ét interval.',
    overlapping_bands: 'Modstridende støjintervaller overlapper ved adressepunktet.',
    source_geometry_invalid: 'En fejl i kildens støjgeometri gør opslaget ved adressepunktet usikkert.',
  } : {
    model_unavailable: 'The original scenario is unavailable.',
    no_matching_contour: 'There is neither a safely matched address model value nor a noise contour at the address point.',
    boundary: 'The address point lies on a noise-contour boundary, so a single band cannot be selected.',
    overlapping_bands: 'Conflicting noise bands overlap at the address point.',
    source_geometry_invalid: 'Invalid source noise geometry makes the address-point lookup uncertain.',
  }
  const description = language === 'da'
    ? `${estimate ? `Forventet vejstøj med motorvejen: ${estimate} Lden.` : `Forventet vejstøj med motorvejen kan ikke angives sikkert. ${missingReasons[status] ?? ''}`} ${useReceivers ? receiverRange.receiverCount > 1 ? `Værdierne dækker ${receiverRange.receiverCount} registrerede bolig-/modtagerposter ved adressen og er afrundet til én decimal.` : 'Værdien er en offentliggjort modelberegning for en registreret bolig-/modtagerpost, afrundet til én decimal.' : band ? 'Intervallet kommer fra den officielle støjkontur ved adressepunktet; der beregnes ingen middelværdi.' : 'Manglende data betyder ikke støj under 53 dB.'} ${vintage} Beregningen omfatter motorvejen og udvalgte omgivende veje; motorvejens isolerede bidrag kan ikke angives. Det er ikke en måling eller det aktuelle 2035-materiale.`
    : `${estimate ? `Expected road noise with the motorway: ${estimate} Lden.` : `Expected road noise with the motorway cannot be stated reliably. ${missingReasons[status] ?? ''}`} ${useReceivers ? receiverRange.receiverCount > 1 ? `The values cover ${receiverRange.receiverCount} registered dwelling/receiver records at the address and are rounded to one decimal place.` : 'The value is a published model calculation for one registered dwelling/receiver record, rounded to one decimal place.' : band ? 'The range comes from the official noise contour at the address point; no midpoint is calculated.' : 'Missing data does not establish noise below 53 dB.'} ${vintage} The calculation includes the motorway and selected surrounding roads; the motorway-only contribution is unavailable. This is not a measurement or the current 2035 material.`
  return {
    status,
    basis: useReceivers ? 'address_receivers' : band ? 'contour_band' : 'unavailable',
    valueDb,
    receiverRange,
    receivers: receiverMatch.receivers,
    receiverDataStatus: receiverMatch.status,
    receiverCoordinateLimitMeters: RECEIVER_COORDINATE_LIMIT_METERS,
    band,
    exactDb: null,
    motorwayOnlyDb: null,
    metric: 'Lden',
    units: 'dB(A)',
    scenario: 'original',
    modelYear,
    forecastYear,
    sourceUrl: source?.sourceUrl ?? null,
    description,
  }
}

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
