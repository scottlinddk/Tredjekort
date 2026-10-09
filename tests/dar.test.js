import assert from 'node:assert/strict'
import test from 'node:test'
import { createAddressesHandler } from '../server/addresses.js'
import { utm32ToWgs84, wgs84ToUtm32 } from '../server/crs.js'
import { darConfig, houseNumberQuery, lookupAddress, parsePointWkt, suggestAddresses } from '../server/dar.js'
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

test('suggestions keep refinement hints, drop unusable hits and tolerate an enveloped array', async () => {
  const other = '0a3f507a-b2e6-32b8-e044-0003ba298019'
  const hits = [
    searchHit,
    { type: 'vejnavn', titel: 'Nørholmsvej', vejnavn: 'Nørholmsvej' },
    { type: 'navngivenvejpostnummer', id: other, titel: 'Nørholmsvej, 9000 Aalborg', antal_husnumre: 40 },
    { type: 'HUSNUMMER', id: other, titel: 'Upper-case type 2, 9000 Aalborg' },
    { type: 'husnummer', id: 'not-a-uuid', titel: 'Bad id' },
    { type: 'husnummer', id: other },
    { id: other, titel: 'No type' },
  ]
  for (const search of [hits, { resultater: hits }]) {
    const suggestions = await suggestAddresses('nørholms', { env, fetchImpl: darFetch({ search }) })
    assert.deepEqual(suggestions, [
      { type: 'husnummer', id: addressId, text: 'Nørholmsvej 180, 9000 Aalborg' },
      { type: 'vejnavn', id: null, text: 'Nørholmsvej' },
      { type: 'navngivenvejpostnummer', id: null, text: 'Nørholmsvej, 9000 Aalborg' },
      { type: 'husnummer', id: other, text: 'Upper-case type 2, 9000 Aalborg' },
    ])
  }
  await assert.rejects(suggestAddresses('x', { env, fetchImpl: darFetch({ search: 'nope' }) }), { code: 'invalid_upstream_response' })
})

test('at most eight suggestions are returned', async () => {
  const many = Array.from({ length: 30 }, (_, i) => ({ type: 'husnummer', id: `0a3f507a-b2e6-32b8-e044-0003ba2981${String(i).padStart(2, '0')}`, titel: `Vej ${i}` }))
  assert.equal((await suggestAddresses('vej', { env, fetchImpl: darFetch({ search: many }) })).length, 8)
})

test('the register query is injection-safe: only validated UUIDs are inlined', () => {
  assert.match(houseNumberQuery(addressId, new Date('2026-10-09T12:00:00Z')), /virkningstid: "2026-10-09T12:00:00.000Z"/)
  assert.deepEqual(darConfig({ ADRESSEVAELGER_TOKEN: ' a ', DATAFORDELER_API_KEY: '' }), {
    adressevaelgerToken: 'a', graphqlKey: null, graphqlUrl: 'https://graphql.datafordeler.dk/DAR/v1',
  })
})

function call(handler, url, method = 'GET') {
  const headers = {}
  const res = { setHeader: (name, value) => { headers[name] = value }, end: (body) => { res.body = JSON.parse(body) } }
  return handler({ url, method }, res).then(() => ({ status: res.statusCode, body: res.body, headers }))
}

test('/api/addresses validates input, caches successes only, and hides failures', async () => {
  const hit = { type: 'husnummer', id: addressId, text: 'x' }
  const position = { id: addressId, text: 'x', longitude: 9.85, latitude: 57 }
  const ok = createAddressesHandler({ suggest: async () => [hit], lookup: async () => position })

  const search = await call(ok, '/api/addresses?q=n%C3%B8r')
  assert.equal(search.status, 200)
  assert.match(search.headers['Cache-Control'], /s-maxage=86400/)
  assert.deepEqual(search.body, [hit])

  const lookup = await call(ok, '/api/addresses?id=' + addressId)
  assert.equal(lookup.status, 200)
  assert.deepEqual(lookup.body, position)

  for (const url of [
    '/api/addresses', '/api/addresses?q=a', '/api/addresses?q=' + 'a'.repeat(74),
    '/api/addresses?id=nope', `/api/addresses?q=ab&id=${addressId}`, '/api/addresses?id=',
  ]) {
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
  assert.match(missing.body.error.message, /ADRESSEVAELGER_TOKEN/)
})

test('lookupAddress returns the position from the register and nothing else', async () => {
  const position = await lookupAddress(addressId, { env, fetchImpl: darFetch() })
  assert.deepEqual(position, { id: addressId, text: 'Nørholmsvej 180, 9000 Aalborg', longitude: 9.85, latitude: 57 })
  await assert.rejects(lookupAddress(addressId, { env: { ADRESSEVAELGER_TOKEN: 'x' }, fetchImpl: darFetch() }), { code: 'address_service_not_configured' })
})

test('upstream rejections name the service and status but never the URL, key or body', async () => {
  const logged = []
  const original = console.error
  console.error = (...args) => logged.push(args.join(' '))
  try {
    const handler = createAddressesHandler({ suggest: (q) => suggestAddresses(q, {
      env,
      fetchImpl: async () => ({ ok: false, status: 401, text: async () => '{"message":"User not authorized"}' }),
    }) })
    const result = await call(handler, '/api/addresses?q=ab')
    assert.equal(result.status, 502)
    assert.equal(result.body.error.service, 'adressevaelger')
    assert.equal(result.body.error.upstreamStatus, 401)
    assert.doesNotMatch(JSON.stringify(result.body), /secret|token=/)
    assert.match(logged.join('\n'), /adressevaelger answered HTTP 401: .*not authorized/)
    assert.doesNotMatch(logged.join('\n'), /secret/)
  } finally {
    console.error = original
  }
})
