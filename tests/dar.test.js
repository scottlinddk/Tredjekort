import assert from 'node:assert/strict'
import test from 'node:test'
import { createAddressesHandler } from '../server/addresses.js'
import { utm32ToWgs84, wgs84ToUtm32 } from '../server/crs.js'
import { darConfig, houseNumberQuery, parsePointWkt, suggestAddresses } from '../server/dar.js'
import { addressId, darFetch, env, searchHit } from './dar-fixtures.js'

// Independent reference: meridian arc length on GRS80 by numerical integration.
function meridianArc(latitudeDegrees) {
  const a = 6378137
  const e2 = 0.00669438002290
  const steps = 20000
  const end = (latitudeDegrees * Math.PI) / 180
  let sum = 0
  for (let i = 0; i <= steps; i++) {
    const phi = (end * i) / steps
    const weight = i === 0 || i === steps ? 1 : i % 2 ? 4 : 2
    sum += weight * (a * (1 - e2)) / (1 - e2 * Math.sin(phi) ** 2) ** 1.5
  }
  return (sum * end) / steps / 3
}

test('UTM32 inverse matches an independently integrated meridian arc on the central meridian', () => {
  for (const latitude of [55, 56.5, 57.05]) {
    const northing = 0.9996 * meridianArc(latitude)
    const { longitude, latitude: result } = utm32ToWgs84(500000, northing)
    assert.ok(Math.abs(longitude - 9) < 1e-9, `longitude ${longitude}`)
    assert.ok(Math.abs(result - latitude) < 1e-7, `latitude ${result} vs ${latitude}`)
  }
})

test('UTM32 round-trips away from the central meridian within a millimetre', () => {
  for (const [longitude, latitude] of [[9.9217, 57.0488], [12.5683, 55.6761], [8.1, 54.9], [10.2, 56.2]]) {
    const { easting, northing } = wgs84ToUtm32(longitude, latitude)
    const back = utm32ToWgs84(easting, northing)
    assert.ok(Math.abs(back.longitude - longitude) < 1e-8 && Math.abs(back.latitude - latitude) < 1e-8)
  }
  // Sanity check against the published false origin: central meridian on the equator.
  const origin = wgs84ToUtm32(9, 0)
  assert.ok(Math.abs(origin.easting - 500000) < 1e-6 && Math.abs(origin.northing) < 1e-6)
  // Aalborg lies in the expected UTM32 ranges.
  const aalborg = wgs84ToUtm32(9.9217, 57.0488)
  assert.ok(aalborg.easting > 540000 && aalborg.easting < 570000)
  assert.ok(aalborg.northing > 6320000 && aalborg.northing < 6326000)
})

test('parsePointWkt reads geographic and projected points and rejects bad input', () => {
  assert.deepEqual(parsePointWkt('POINT (9.85 57)', 'EPSG:4326'), { longitude: 9.85, latitude: 57 })
  const { easting, northing } = wgs84ToUtm32(9.9217, 57.0488)
  const projected = parsePointWkt(`POINT(${easting} ${northing})`, 'EPSG:25832')
  assert.ok(Math.abs(projected.longitude - 9.9217) < 1e-6 && Math.abs(projected.latitude - 57.0488) < 1e-6)
  for (const bad of [undefined, '', 'POINT EMPTY', 'LINESTRING (1 2, 3 4)', 'POINT (9.85 100)']) {
    assert.equal(parsePointWkt(bad, 'EPSG:4326'), null, String(bad))
  }
})

test('suggestions drop hits without usable coordinates and convert projected ones', async () => {
  const { easting, northing } = wgs84ToUtm32(9.9217, 57.0488)
  const other = '0a3f507a-b2e6-32b8-e044-0003ba298019'
  const suggestions = await suggestAddresses('nørholms', {
    env,
    fetchImpl: darFetch({ search: [
      searchHit,
      { id: other, visningstekst: 'Projected 1, 9000 Aalborg', geometri: { type: 'Point', coordinates: [easting, northing] } },
      { id: '0a3f507a-b2e6-32b8-e044-0003ba29801a', visningstekst: 'No position 2, 9000 Aalborg' },
      { id: 'not-a-uuid', visningstekst: 'Bad id', geometri: { coordinates: [9, 57] } },
    ] }),
  })
  assert.deepEqual(suggestions.map((item) => item.id), [addressId, other])
  assert.ok(Math.abs(suggestions[1].longitude - 9.9217) < 1e-6)
})

test('the register query is injection-safe: only validated UUIDs are inlined', () => {
  assert.match(houseNumberQuery(addressId, new Date('2026-10-09T12:00:00Z')), /virkningstid: "2026-10-09T12:00:00.000Z"/)
  assert.deepEqual(darConfig({ DATAFORSYNINGEN_TOKEN: ' a ', DATAFORDELER_API_KEY: '' }), {
    gsearchToken: 'a', graphqlKey: null, graphqlUrl: 'https://graphql.datafordeler.dk/DAR/v1',
  })
})

function call(handler, url, method = 'GET') {
  const headers = {}
  const res = { setHeader: (name, value) => { headers[name] = value }, end: (body) => { res.body = JSON.parse(body) } }
  return handler({ url, method }, res).then(() => ({ status: res.statusCode, body: res.body, headers }))
}

test('/api/addresses validates input, caches successes only, and hides failures', async () => {
  const ok = createAddressesHandler({ suggest: async () => [{ id: addressId, text: 'x', longitude: 1, latitude: 2 }] })
  const good = await call(ok, '/api/addresses?q=n%C3%B8r')
  assert.equal(good.status, 200)
  assert.match(good.headers['Cache-Control'], /s-maxage=86400/)
  assert.equal(good.body[0].id, addressId)

  for (const url of ['/api/addresses', '/api/addresses?q=a', '/api/addresses?q=' + 'a'.repeat(201)]) {
    const bad = await call(ok, url)
    assert.equal(bad.status, 400, url)
    assert.equal(bad.headers['Cache-Control'], 'no-store')
  }
  assert.equal((await call(ok, '/api/addresses?q=ab', 'POST')).status, 405)

  const broken = createAddressesHandler({ suggest: async () => { throw new Error('token=secret leaked') } })
  const failed = await call(broken, '/api/addresses?q=ab')
  assert.equal(failed.status, 502)
  assert.doesNotMatch(JSON.stringify(failed.body), /secret/)
  assert.equal(failed.headers['Cache-Control'], 'no-store')

  const unconfigured = createAddressesHandler({ suggest: (q) => suggestAddresses(q, { env: {}, fetchImpl: darFetch() }) })
  const missing = await call(unconfigured, '/api/addresses?q=ab')
  assert.equal(missing.status, 503)
  assert.equal(missing.body.error.code, 'address_service_not_configured')
})
