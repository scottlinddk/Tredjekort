import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { gunzip } from 'node:zlib'
import { distance, point, pointToLineDistance } from '@turf/turf'
import { describeNoiseScenarios, lookupNoiseScenario, prepareNoiseScenarios } from './official-noise.js'
import { lookupLandRequirements, nearestOfficialDesign } from './official-project.js'

const DAWA_URL = 'https://api.dataforsyningen.dk/adgangsadresser'
const PROJECT_URL = 'https://www.vejdirektoratet.dk/vejprojekter/3-limfjordsforbindelse'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NEARBY_RADIUS_METERS = 2000
const MAX_CANDIDATES = 10
const decompress = promisify(gunzip)

class ApiError extends Error {
  constructor(status, code, message, details = {}) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

let dataPromise
export function loadMapData() {
  // Keep these paths literal so the serverless deployment can trace the data files.
  dataPromise ??= Promise.all([
    readFile(new URL('../src/data/road-alignment.geojson', import.meta.url), 'utf8'),
    readFile(new URL('../src/data/noise-screens.geojson', import.meta.url), 'utf8'),
    readFile(new URL('../src/data/local-roads.geojson', import.meta.url), 'utf8'),
    readFile(new URL('../src/data/junctions.json', import.meta.url), 'utf8'),
    readFile(new URL('../src/data/project-information.json', import.meta.url), 'utf8'),
    readFile(new URL('../src/data/official-noise.geojson.gz', import.meta.url)).then(decompress),
    readFile(new URL('../src/data/official-noise-metadata.json', import.meta.url), 'utf8'),
    readFile(new URL('../src/data/official-alignment.geojson', import.meta.url), 'utf8'),
    readFile(new URL('../src/data/official-land-requirements.geojson', import.meta.url), 'utf8'),
    readFile(new URL('../src/data/official-spatial-data.json', import.meta.url), 'utf8'),
  ]).then(([alignment, noiseScreens, localRoads, junctions, projectInformation, officialNoise, officialNoiseMetadata, officialAlignment, officialLandRequirements, officialSpatialData]) => {
    const metadata = JSON.parse(officialNoiseMetadata)
    return {
      alignment: JSON.parse(alignment),
      noiseScreens: JSON.parse(noiseScreens),
      localRoads: JSON.parse(localRoads),
      junctions: JSON.parse(junctions),
      projectInformation: JSON.parse(projectInformation),
      officialNoiseMetadata: metadata,
      officialNoiseScenarios: prepareNoiseScenarios(JSON.parse(officialNoise.toString('utf8')), metadata),
      officialAlignment: JSON.parse(officialAlignment),
      officialLandRequirements: JSON.parse(officialLandRequirements),
      officialSpatialData: JSON.parse(officialSpatialData),
    }
  }).catch((error) => {
    dataPromise = undefined
    throw error
  })
  return dataPromise
}

export function parseReportQuery(requestUrl) {
  const query = new URL(requestUrl, 'http://localhost').searchParams
  const supported = new Set(['address', 'id', 'lang'])
  for (const key of query.keys()) {
    if (!supported.has(key) || query.getAll(key).length !== 1) {
      throw new ApiError(400, 'invalid_query', 'Use each supported parameter (address, id, lang) at most once.')
    }
  }
  const address = query.get('address')?.trim()
  const id = query.get('id')?.trim()
  const language = query.get('lang') ?? 'da'
  if (query.has('address') === query.has('id')) {
    throw new ApiError(400, 'invalid_query', 'Provide exactly one of address or id.')
  }
  if (language !== 'da' && language !== 'en') {
    throw new ApiError(400, 'invalid_language', 'lang must be da or en.')
  }
  if (query.has('id') && !UUID.test(id ?? '')) {
    throw new ApiError(400, 'invalid_id', 'id must be a DAWA access-address UUID.')
  }
  if (query.has('address') && (!address || address.length < 3 || address.length > 200
    || address.includes('*') || [...address].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127))) {
    throw new ApiError(400, 'invalid_address', 'address must contain 3–200 characters, without control characters or wildcards.')
  }
  return { address, id, language }
}

function toAddress(record) {
  const longitude = record?.x
  const latitude = record?.y
  if (!UUID.test(record?.id ?? '') || !Number.isFinite(longitude) || !Number.isFinite(latitude)
    || Math.abs(longitude) > 180 || Math.abs(latitude) > 90
    || typeof record.vejnavn !== 'string' || !record.vejnavn || !record.husnr || !record.postnr) {
    throw new ApiError(502, 'invalid_upstream_response', 'The address service returned an incomplete address.')
  }
  return {
    id: record.id,
    text: typeof record.betegnelse === 'string' && record.betegnelse.trim()
      ? record.betegnelse
      : [`${record.vejnavn} ${record.husnr}`, record.supplerendebynavn, `${record.postnr} ${record.postnrnavn ?? ''}`.trim()].filter(Boolean).join(', '),
    longitude,
    latitude,
    coordinateReferenceSystem: 'EPSG:4326',
    precision: 'access_address',
    sourceUrl: `${DAWA_URL}/${record.id}`,
  }
}

export async function resolveAddress(query, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  const url = new URL(query.id ? `${DAWA_URL}/${query.id}` : DAWA_URL)
  url.searchParams.set('struktur', 'mini')
  if (!query.id) {
    // Deliberately do not use autocomplete or fuzzy search for address reports.
    url.searchParams.set('q', query.address)
    url.searchParams.set('per_side', String(MAX_CANDIDATES + 1))
  }
  let body
  try {
    const response = await fetchImpl(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (response.status === 404) throw new ApiError(404, 'address_not_found', 'No matching access address was found.')
    if (!response.ok) throw new ApiError(502, 'address_service_unavailable', 'The address service could not complete this request. Try again later.')
    body = await response.json()
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new ApiError(504, 'address_service_timeout', 'The address service timed out. Try again later.')
    }
    throw new ApiError(502, 'address_service_unavailable', 'The address service is unavailable or returned invalid JSON.')
  }
  if (query.id) {
    const result = toAddress(body)
    if (result.id.toLowerCase() !== query.id.toLowerCase()) {
      throw new ApiError(502, 'invalid_upstream_response', 'The address service returned an unexpected address ID.')
    }
    return result
  }
  if (!Array.isArray(body)) throw new ApiError(502, 'invalid_upstream_response', 'The address service returned an unexpected response.')
  if (body.length === 0) throw new ApiError(404, 'address_not_found', 'No matching access address was found. Include street, house number and postcode; omit floor and door.')
  if (body.length > 1) {
    throw new ApiError(409, 'ambiguous_address', 'Several addresses match. Repeat the request with a candidate id or a more specific address.', {
      candidates: body.slice(0, MAX_CANDIDATES).map(toAddress),
      moreCandidates: body.length > MAX_CANDIDATES,
    })
  }
  return toAddress(body[0])
}

function rankedLines(origin, collection) {
  return collection.features.map((feature) => ({
    distanceMeters: pointToLineDistance(origin, feature, { units: 'meters', method: 'geodesic' }),
    feature,
  })).sort((a, b) => a.distanceMeters - b.distanceMeters)
}

// Rounded to ten metres: source geometry is approximate even where it carries a
// legacy "surveyed" confidence tag. Do not imply survey accuracy from the output.
function roundedEntry(entry) {
  return entry ? { ...entry, distanceMeters: Math.round(entry.distanceMeters / 10) * 10 } : null
}

export function buildAddressReport(address, language, data) {
  const origin = point([address.longitude, address.latitude])
  const alignment = rankedLines(origin, data.alignment)
  const screens = rankedLines(origin, data.noiseScreens)
  const roads = rankedLines(origin, data.localRoads)
  const junctions = data.junctions.map((junction) => ({
    distanceMeters: distance(origin, point([junction.longitude, junction.latitude]), { units: 'meters' }),
    ...junction,
  })).sort((a, b) => a.distanceMeters - b.distanceMeters)
  const nearby = (items) => items.filter((item) => item.distanceMeters <= NEARBY_RADIUS_METERS).map(roundedEntry)
  const nearestAlignment = roundedEntry(alignment[0])
  const nearestJunction = roundedEntry(junctions[0])
  const nearbyScreens = nearby(screens)
  const distanceText = nearestAlignment?.distanceMeters.toLocaleString(language === 'da' ? 'da-DK' : 'en-GB')
  const noiseResults = (data.officialNoiseScenarios ?? []).map(({ collection, metadata }) => lookupNoiseScenario(origin, collection, metadata))
  const noiseDescription = describeNoiseScenarios(noiseResults, data.officialNoiseMetadata, language)
  const officialDesign = nearestOfficialDesign(origin, data.officialAlignment)
  const landRequirements = lookupLandRequirements(origin, data.officialLandRequirements)
  if (landRequirements) {
    landRequirements.source = data.officialSpatialData?.landRequirements ?? null
    landRequirements.description = language === 'da'
      ? `${landRequirements.status === 'within_mapped_area' ? 'Adressepunktet ligger inden for mindst ét kortlagt permanent eller midlertidigt arealbehov.' : landRequirements.status === 'boundary' ? 'Adressepunktet ligger på kanten af et kortlagt arealbehov.' : landRequirements.status === 'source_geometry_invalid' ? 'En fejl i kildens arealgeometri gør opslaget ved adressepunktet usikkert.' : 'Adressepunktet ligger uden for de kortlagte arealbehov i dette datasæt.'} Dette er et geografisk opslag i planmaterialet og fastslår ikke, om en ejendom skal eksproprieres. Adressepunktet er ikke en matrikelgrænse.`
      : `${landRequirements.status === 'within_mapped_area' ? 'The address point falls within at least one mapped permanent or temporary land requirement.' : landRequirements.status === 'boundary' ? 'The address point lies on a mapped land-requirement boundary.' : landRequirements.status === 'source_geometry_invalid' ? 'Invalid source land geometry makes the lookup at the address point uncertain.' : 'The address point lies outside the mapped land requirements in this dataset.'} This is a geographic lookup in planning material and does not establish whether a property will be expropriated. The address point is not a property boundary.`
  }
  const officialDesignDescription = officialDesign ? language === 'da'
    ? ` Den nærmeste officielle projekterede centerlinje ligger cirka ${officialDesign.distanceMeters.toLocaleString('da-DK')} meter væk; disse linjer omfatter også ramper og lokalveje.`
    : ` The nearest official design centreline is approximately ${officialDesign.distanceMeters.toLocaleString('en-GB')} metres away; these lines also include ramps and local roads.` : ''
  const description = language === 'da'
    ? `${address.text} ligger ${nearestAlignment ? `cirka ${distanceText} meter fra den nærmeste tegnede motorvejslinje` : 'i et område uden en tilgængelig motorvejslinje i datasættet'}. Afstanden er målt i fugleflugtslinje til kortets omtrentlige geometri.${officialDesignDescription} ${nearbyScreens.length ? `Der er ${nearbyScreens.length} tegnede støjskærmsstrækninger inden for 2 km af adressen.` : 'Kortet viser ingen støjskærmsstrækninger inden for 2 km af adressen.'} Dette siger ikke, om en skærm beskytter adressen. ${noiseDescription} Afstanden kan ikke afgøre, om vejstøjen kan høres. ${landRequirements?.description ?? ''} Se de officielle støjkort og projektmaterialer for dokumentation.`
    : `${address.text} is ${nearestAlignment ? `approximately ${distanceText} metres from the nearest mapped motorway alignment` : 'in an area without an available motorway alignment in this dataset'}. This is a straight-line distance to approximate map geometry.${officialDesignDescription} ${nearbyScreens.length ? `There are ${nearbyScreens.length} mapped noise-barrier sections within 2 km of the address.` : 'The map contains no noise-barrier sections within 2 km of the address.'} This does not establish whether a barrier protects the address. ${noiseDescription} The distance cannot establish whether road noise will be audible. ${landRequirements?.description ?? ''} Consult the official noise maps and project documents.`
  const limitations = language === 'da' ? [
    'Vejlinjer og støjskærme er digitaliseret og omtrentlige. Afstande er afrundet til 10 meter, men placeringen kan afvige med flere hundrede meter.',
    'Afstande er til kortets linjer og punkter, ikke til matrikelgrænser, vejkant eller tilkørselsruter.',
    'Støjskærme og lokalveje er udvalgte registrerede strækninger. En tom liste betyder ikke, at der ikke findes andre tiltag.',
    'Skærmstrækningers angivne længder kan dække flere geometrier og må ikke summeres ukritisk.',
    'Rapporten bruger adgangsadressen og skelner ikke mellem etager eller døre. Appen laver ingen ny støjberegning af terræn, trafik, tunnel, vind eller skærmenes virkning.',
    'Officielle polygoner er et ældre støjmodelresultat for 2040. De er ikke støjmålinger, præcise punktværdier eller det aktuelle projektmateriales 2035-kort.',
  ] : [
    'Road and barrier geometry is manually digitised and approximate. Distances are rounded to 10 metres, but positions may differ by several hundred metres.',
    'Distances are to mapped lines and points, not property boundaries, carriageway edges or driving routes.',
    'Noise barriers and local roads are selected recorded sections. An empty list does not establish the absence of other measures.',
    'Published barrier lengths may cover multiple geometries and must not be added together without checking their source.',
    'The report uses the access address, without floor or door distinctions. The app performs no new acoustic calculation of terrain, traffic, tunnels, wind or barrier effectiveness.',
    'Official polygons are an older model result for 2040. They are not noise measurements, exact point values or the current project documents’ 2035 maps.',
  ]
  return {
    schemaVersion: '1.0',
    language,
    address,
    description,
    proximity: {
      method: 'geodesic_distance_to_approximate_map_geometry',
      distanceRoundingMeters: 10,
      nearbyRadiusMeters: NEARBY_RADIUS_METERS,
      withinMappedCorridor: Boolean(alignment[0] && alignment[0].distanceMeters <= NEARBY_RADIUS_METERS),
      nearestAlignment,
      nearestOfficialDesign: officialDesign ? { ...officialDesign, source: data.officialSpatialData?.alignment ?? null } : null,
      nearestJunction,
      nearbyLocalRoads: nearby(roads),
      nearbyNoiseScreens: nearbyScreens,
    },
    landRequirements,
    noise: {
      status: noiseResults.length ? 'legacy_model_available' : 'official_address_level_data_unavailable',
      ldenDb: null,
      audible: null,
      exceedsGuideline: null,
      reason: language === 'da'
        ? 'Appen kan slå ældre officielle støjintervaller op, men har ikke præcise dB-værdier eller georefererede støjkonturer for det aktuelle 2035-materiale. Afstandszoner er ikke støjniveauer.'
        : 'The app can look up older official noise bands, but has no exact dB values or georeferenced contours for the current 2035 documents. Distance zones are not noise levels.',
      current2035: { status: 'address_level_contours_unavailable', band: null },
      legacyModel: noiseResults.length ? { metadata: data.officialNoiseMetadata, scenarios: noiseResults } : null,
      officialDocuments: (data.projectInformation.documents ?? []).filter((document) => document.category === 'noise'),
    },
    projectInformation: data.projectInformation,
    provenance: {
      projectUrl: PROJECT_URL,
      addressProvider: 'DAWA / Dataforsyningen',
      addressDocumentationUrl: 'https://dawadocs.dataforsyningen.dk/dok/api/adgangsadresse',
      datasetReviewedAt: data.projectInformation.reviewedAt,
      geometryIsOfficialSurvey: false,
      featureSources: 'Each returned feature retains its source, confidence and notes from the map dataset.',
    },
    limitations,
  }
}

export function createAddressReportHandler({ fetchImpl = fetch, loadData = loadMapData, timeoutMs = 8000 } = {}) {
  return async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }
    const send = (status, body) => {
      res.statusCode = status
      res.end(JSON.stringify(body))
    }
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, OPTIONS')
      send(405, { error: { code: 'method_not_allowed', message: 'Use GET to read an address report.' } })
      return
    }
    try {
      const query = parseReportQuery(req.url)
      const address = await resolveAddress(query, { fetchImpl, timeoutMs })
      const data = await loadData()
      send(200, buildAddressReport(address, query.language, data))
    } catch (error) {
      if (error instanceof ApiError) {
        send(error.status, { error: { code: error.code, message: error.message, ...error.details } })
      } else {
        send(500, { error: { code: 'report_unavailable', message: 'The map report could not be generated. Try again later.' } })
      }
    }
  }
}
