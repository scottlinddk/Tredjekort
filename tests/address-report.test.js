import assert from 'node:assert/strict'
import test from 'node:test'
import { buildAddressReport, createAddressReportHandler, parseReportQuery, resolveAddress } from '../server/address-report.js'
import { addressApiPlugin } from '../server/vite-api-plugin.js'

const addressId = '0a3f507a-b2e6-32b8-e044-0003ba298018'
const dawaAddress = {
  id: addressId,
  vejnavn: 'Nørholmsvej',
  husnr: '180',
  postnr: '9000',
  postnrnavn: 'Aalborg',
  x: 9.85,
  y: 57,
}
const address = {
  id: addressId, text: 'Nørholmsvej 180, 9000 Aalborg', longitude: 9.85, latitude: 57,
}
const line = (id, coordinates, properties = {}) => ({
  type: 'Feature',
  properties: { id, source: 'Published source', confidence: 'schematic', ...properties },
  geometry: { type: 'LineString', coordinates },
})
const data = {
  alignment: { type: 'FeatureCollection', features: [
    line('far', [[10, 56.99], [10, 57.01]]),
    line('near', [[9.85, 56.99], [9.85, 57.01]]),
  ] },
  noiseScreens: { type: 'FeatureCollection', features: [
    line('far-screen', [[10, 56.99], [10, 57.01]]),
    line('near-screen', [[9.8501, 56.99], [9.8501, 57.01]], { height_m: '6', length_m: null, group_length_m: 1400 }),
  ] },
  localRoads: { type: 'FeatureCollection', features: [line('local', [[9.85, 56.99], [9.85, 57.01]])] },
  junctions: [
    { id: 'far-junction', name: 'Far junction', latitude: 57, longitude: 10, sources: ['Source A'] },
    { id: 'near-junction', name: 'Near junction', latitude: 57.001, longitude: 9.85, sources: ['Source B'] },
  ],
  projectInformation: {
    schemaVersion: 1, reviewedAt: '2026-09-26', project: { expectedOpeningYear: 2034 },
    documents: [{ id: 'noise-map', category: 'noise', url: 'https://example.com/noise.pdf' }, { id: 'other', category: 'design' }],
  },
}
const jsonResponse = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

async function request(url, options = {}) {
  const headers = {}
  const res = { setHeader: (name, value) => { headers[name] = value }, end: (body) => { res.body = body ? JSON.parse(body) : null } }
  const handler = createAddressReportHandler({
    fetchImpl: async () => jsonResponse([dawaAddress]), loadData: async () => data, ...options,
  })
  await handler({ url, method: options.method ?? 'GET' }, res)
  return { status: res.statusCode, body: res.body, headers }
}

test('validates parameters before contacting upstream', async () => {
  for (const query of ['', '?address=', '?address=x', '?address=a*b', '?address=abc%00', '?id=no', '?id=', '?address=abc&id=' + addressId, '?address=abc&lang=de', '?address=abc&lang=', '?address=abc&address=def', '?address=abc&unknown=yes', '?address=' + 'a'.repeat(201)]) {
    const result = await request('/api/address-report' + query, { fetchImpl: () => assert.fail('Invalid queries must not trigger a lookup') })
    assert.equal(result.status, 400, query)
    assert.equal(result.headers['Cache-Control'], 'no-store')
  }
  assert.equal(parseReportQuery('/api/address-report?address=%20N%C3%B8rholmsvej%20180%20').address, 'Nørholmsvej 180')
  assert.equal(parseReportQuery('/api/address-report?id=' + addressId).language, 'da')
})

test('uses non-fuzzy DAWA search and preserves Danish characters and ampersands', async () => {
  const result = await resolveAddress({ address: 'Nørholmsvej 180 & 9000' }, { fetchImpl: async (url, init) => {
    assert.equal(url.hostname, 'api.dataforsyningen.dk')
    assert.equal(url.searchParams.get('q'), 'Nørholmsvej 180 & 9000')
    assert.equal(url.searchParams.get('struktur'), 'mini')
    assert.equal(url.searchParams.get('per_side'), '11')
    assert.equal(url.searchParams.has('fuzzy'), false)
    assert.ok(init.signal instanceof AbortSignal)
    return jsonResponse([dawaAddress])
  } })
  assert.equal(result.text, 'Nørholmsvej 180, 9000 Aalborg')
  assert.equal(result.precision, 'access_address')
  assert.equal(result.longitude, 9.85)
})

test('resolves a chosen UUID with a direct DAWA lookup', async () => {
  const result = await request('/api/address-report?id=' + addressId + '&lang=en', {
    fetchImpl: async (url) => {
      assert.equal(url.pathname, '/adgangsadresser/' + addressId)
      assert.equal(url.searchParams.has('q'), false)
      return jsonResponse(dawaAddress)
    },
  })
  assert.equal(result.status, 200)
  assert.equal(result.body.language, 'en')
  assert.equal(result.body.address.id, addressId)
  assert.match(result.body.description, /approximately/)
})

test('rejects ambiguous addresses and gives candidates instead of selecting one', async () => {
  const result = await request('/api/address-report?address=N%C3%B8rholmsvej', {
    fetchImpl: async () => jsonResponse(Array.from({ length: 11 }, (_, i) => ({ ...dawaAddress, husnr: String(i + 1) }))),
    loadData: () => assert.fail('An ambiguous address must not generate a report'),
  })
  assert.equal(result.status, 409)
  assert.equal(result.body.error.code, 'ambiguous_address')
  assert.equal(result.body.error.candidates.length, 10)
  assert.equal(result.body.error.moreCandidates, true)
  assert.equal(result.body.address, undefined)
})

test('distinguishes no results, malformed data, upstream failure and timeouts', async () => {
  const cases = [
    { fetchImpl: async () => jsonResponse([]), status: 404, code: 'address_not_found' },
    { fetchImpl: async () => jsonResponse(null, 404), status: 404, code: 'address_not_found' },
    { fetchImpl: async () => jsonResponse(null, 503), status: 502, code: 'address_service_unavailable' },
    { fetchImpl: async () => jsonResponse({}), status: 502, code: 'invalid_upstream_response' },
    { fetchImpl: async () => jsonResponse([{ ...dawaAddress, x: null }]), status: 502, code: 'invalid_upstream_response' },
    { fetchImpl: async () => jsonResponse([{ ...dawaAddress, y: 100 }]), status: 502, code: 'invalid_upstream_response' },
    { fetchImpl: async () => { throw new Error('private infrastructure details') }, status: 502, code: 'address_service_unavailable' },
    { fetchImpl: async () => { throw new DOMException('late', 'TimeoutError') }, status: 504, code: 'address_service_timeout' },
    { fetchImpl: async () => ({ ok: true, json: async () => { throw new SyntaxError('bad JSON') } }), status: 502, code: 'address_service_unavailable' },
  ]
  for (const expected of cases) {
    const result = await request('/api/address-report?address=N%C3%B8rholmsvej%20180', expected)
    assert.equal(result.status, expected.status)
    assert.equal(result.body.error.code, expected.code)
    assert.doesNotMatch(JSON.stringify(result.body), /private infrastructure/)
  }
})

test('reports closest geometry, filters nearby objects, and retains provenance', () => {
  const report = buildAddressReport(address, 'da', data)
  assert.equal(report.proximity.nearestAlignment.feature.properties.id, 'near')
  assert.equal(report.proximity.nearestAlignment.distanceMeters, 0)
  assert.equal(report.proximity.nearestJunction.id, 'near-junction')
  assert.equal(report.proximity.nearestJunction.distanceMeters, 110)
  assert.equal(report.proximity.nearbyNoiseScreens.length, 1)
  assert.equal(report.proximity.nearbyNoiseScreens[0].feature.properties.source, 'Published source')
  assert.equal(report.proximity.nearbyNoiseScreens[0].feature.properties.length_m, null)
  assert.equal(report.proximity.nearbyLocalRoads.length, 1)
  assert.equal(report.provenance.geometryIsOfficialSurvey, false)
  assert.equal(report.provenance.datasetReviewedAt, '2026-09-26')
  assert.equal(report.proximity.withinMappedCorridor, true)
})

test('noise is explicitly unavailable at every distance, with official document links', () => {
  for (const longitude of [9.85, 9.86, 12.5]) {
    const report = buildAddressReport({ ...address, longitude }, 'en', data)
    assert.equal(report.noise.ldenDb, null)
    assert.equal(report.noise.audible, null)
    assert.equal(report.noise.exceedsGuideline, null)
    assert.equal(report.noise.status, 'official_address_level_data_unavailable')
    assert.equal(report.noise.officialDocuments.length, 1)
    assert.match(report.description, /distance cannot establish/)
    assert.doesNotMatch(report.description, /likely audible|unlikely|safe|high noise|low noise/)
  }
})

test('an address far from the project returns empty nearby lists without claiming no impact', () => {
  const report = buildAddressReport({ ...address, longitude: 12.5, latitude: 55.7 }, 'da', data)
  assert.equal(report.proximity.withinMappedCorridor, false)
  assert.deepEqual(report.proximity.nearbyNoiseScreens, [])
  assert.deepEqual(report.proximity.nearbyLocalRoads, [])
  assert.ok(report.proximity.nearestAlignment.distanceMeters > 100000)
  assert.match(report.description, /kan ikke afgøre/)
})

test('empty geometry returns explicit null nearest objects', () => {
  const empty = { type: 'FeatureCollection', features: [] }
  const report = buildAddressReport(address, 'en', { ...data, alignment: empty, localRoads: empty, noiseScreens: empty, junctions: [] })
  assert.equal(report.proximity.nearestAlignment, null)
  assert.equal(report.proximity.nearestJunction, null)
  assert.equal(report.proximity.withinMappedCorridor, false)
  assert.match(report.description, /without an available/)
})

test('GET returns JSON and CORS headers; OPTIONS is empty and writes are rejected', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'HEAD']) {
    const result = await request('/api/address-report?address=N%C3%B8rholmsvej%20180', { method, fetchImpl: () => assert.fail('Must not fetch') })
    assert.equal(result.status, 405)
    assert.equal(result.headers.Allow, 'GET, OPTIONS')
  }
  const options = await request('/api/address-report', { method: 'OPTIONS', fetchImpl: () => assert.fail('Must not fetch') })
  assert.equal(options.status, 204)
  assert.equal(options.body, null)
  assert.equal(options.headers['Access-Control-Allow-Origin'], '*')
  const get = await request('/api/address-report?address=N%C3%B8rholmsvej%20180')
  assert.equal(get.status, 200)
  assert.equal(get.headers['Content-Type'], 'application/json; charset=utf-8')
  assert.equal(get.headers['X-Content-Type-Options'], 'nosniff')
})

test('data-loading failure produces a JSON 500 without leaking server internals', async () => {
  const result = await request('/api/address-report?address=N%C3%B8rholmsvej%20180', { loadData: async () => { throw new Error('C:/private/path') } })
  assert.equal(result.status, 500)
  assert.equal(result.body.error.code, 'report_unavailable')
  assert.doesNotMatch(JSON.stringify(result.body), /private/)
})

test('Vite registers the API for development and preview without consuming other routes', () => {
  const plugin = addressApiPlugin()
  for (const register of [plugin.configureServer, plugin.configurePreviewServer]) {
    let middleware
    register({ middlewares: { use: (handler) => { middleware = handler } } })
    let nextCalled = false
    middleware({ url: '/sources' }, {}, () => { nextCalled = true })
    assert.equal(nextCalled, true)
    const res = { setHeader: () => {}, end: () => {} }
    middleware({ url: '/api/address-report', method: 'OPTIONS' }, res, () => assert.fail('API should be handled'))
    assert.equal(res.statusCode, 204)
  }
})
