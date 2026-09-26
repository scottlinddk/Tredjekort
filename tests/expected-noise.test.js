import assert from 'node:assert/strict'
import test from 'node:test'
import { expectedWithProject } from '../server/official-noise.js'

const metadata = { modelYear: 2021, forecastYear: 2040, sourceUrl: 'https://example.com/contours' }
const pointMetadata = { ...metadata, municipalityCode: '0851', sourceUrl: 'https://example.com/receivers' }
const address = { municipalityCode: '0851', roadCode: '1043', houseNumber: '14', longitude: 9.86306589, latitude: 57.02913167 }
const band = { lowerDb: 53, upperDb: 58, label: '53 - 58 dB' }
const original = { ...metadata, scenario: 'original', status: 'band_found', band }
const different = (scenario) => ({ ...metadata, scenario, status: 'band_found', band: { lowerDb: 63, upperDb: 68, label: '63 - 68 dB' } })
const receiver = (id, value, overrides = {}, coordinates = [9.86306592, 57.02913174]) => ({
  type: 'Feature', id: `dynamic.${id}`,
  properties: {
    sourceRecordId: id, roadCode: '1043', houseNumber: '14', sourceFloor: 1, sourceFloorCode: 1, sourceDoor: null,
    valuesDb: { reference: 40.546, original: value, variant: 71.9 }, ...overrides,
  },
  geometry: { type: 'Point', coordinates },
})
const collection = (...features) => ({ type: 'FeatureCollection', features })
const summary = (overrides = {}) => expectedWithProject({ scenarios: [different('reference'), original, different('variant')], metadata, language: 'en', address, pointMetadata, ...overrides })

test('headline selects original with-project contour, never a differing reference or variant', () => {
  const result = summary()
  assert.equal(result.status, 'band_found')
  assert.equal(result.basis, 'contour_band')
  assert.deepEqual(result.band, band)
  assert.equal(result.valueDb, null)
  assert.equal(result.exactDb, null)
  assert.equal(result.motorwayOnlyDb, null)
  assert.match(result.description, /^Expected road noise with the motorway: 53 - 58 dB Lden/)
  assert.match(result.description, /2021 model.*2040/)
  assert.match(result.description, /selected surrounding roads/)
  assert.doesNotMatch(result.description, /63 - 68/)
})

test('a missing original scenario never falls back to reference or variant', () => {
  const result = summary({ scenarios: [different('reference'), different('variant')] })
  assert.equal(result.status, 'model_unavailable')
  assert.equal(result.band, null)
  assert.equal(result.valueDb, null)
})

test('uncertain contour results retain null band without midpoint or below-threshold inference', () => {
  for (const status of ['boundary', 'overlapping_bands', 'source_geometry_invalid', 'no_matching_contour']) {
    const result = summary({ scenarios: [{ ...original, status, band: null }, different('variant')] })
    assert.equal(result.status, status)
    assert.equal(result.band, null)
    assert.equal(result.valueDb, null)
    assert.equal(result.receiverRange, null)
    assert.match(result.description, /Missing data does not establish noise below 53 dB/)
  }
})

test('top contour band preserves the source label and unknown upper bound', () => {
  const result = summary({ scenarios: [{ ...original, band: { lowerDb: 78, upperDb: null, label: '78 dB' } }] })
  assert.deepEqual(result.band, { lowerDb: 78, upperDb: null, label: '78 dB' })
  assert.equal(result.valueDb, null)
  assert.match(result.description, /published category 78 dB \(upper bound unspecified\)/)
})

test('a verified address receiver exposes original model output and rounds only the description', () => {
  const result = summary({ pointCollection: collection(receiver(2, 55.867)), language: 'da' })
  assert.equal(result.status, 'point_value_found')
  assert.equal(result.basis, 'address_receivers')
  assert.equal(result.valueDb, 55.867)
  assert.deepEqual(result.receiverRange, { minDb: 55.867, maxDb: 55.867, receiverCount: 1 })
  assert.equal(result.band, null)
  assert.equal(result.scenario, 'original')
  assert.equal(result.sourceUrl, pointMetadata.sourceUrl)
  assert.equal(result.exactDb, null)
  assert.equal(result.motorwayOnlyDb, null)
  assert.match(result.description, /^Forventet vejstøj med motorvejen: 55,9 dB\(A\) Lden/)
  assert.equal(result.receivers[0].sourceRecordId, 2)
  assert.equal(result.receivers[0].sourceFloor, 1)
  assert.equal(result.receivers[0].sourceFloorCode, 1)
  assert.equal(result.receivers[0].valueDb, 55.867)
  assert.equal(result.receiverDataStatus, 'matched')
})

test('all matched dwelling records contribute to a range without selecting a floor', () => {
  const result = summary({ pointCollection: collection(receiver(1, 52.111), receiver(2, 61.777, { sourceFloor: 3, sourceFloorCode: 3, sourceDoor: 'tv' })) })
  assert.equal(result.status, 'point_range_found')
  assert.equal(result.valueDb, null)
  assert.deepEqual(result.receiverRange, { minDb: 52.111, maxDb: 61.777, receiverCount: 2 })
  assert.equal(result.receivers.length, 2)
  assert.match(result.description, /52.1–61.8 dB\(A\)/)
  assert.match(result.description, /2 registered dwelling\/receiver records/)
  const equal = summary({ pointCollection: collection(receiver(1, 55.12), receiver(2, 55.12)) })
  assert.equal(equal.status, 'point_value_found')
  assert.equal(equal.valueDb, 55.12)
  assert.equal(equal.receiverRange.receiverCount, 2)
})

test('address keys and the coordinate guard prevent nearest-point or cross-municipality transfer', () => {
  const cases = [
    { address: { ...address, municipalityCode: '0101' }, status: 'outside_municipality' },
    { address: { ...address, municipalityCode: null }, status: 'address_keys_unavailable' },
    { address: { ...address, roadCode: '1044' }, status: 'not_matched' },
    { address: { ...address, houseNumber: '16' }, status: 'not_matched' },
    { address: { ...address, latitude: 57.03013167 }, status: 'coordinate_mismatch' },
  ]
  for (const sample of cases) {
    const result = summary({ address: sample.address, pointCollection: collection(receiver(2, 55.867)) })
    assert.equal(result.receiverDataStatus, sample.status)
    assert.equal(result.status, 'band_found')
    assert.equal(result.valueDb, null)
    assert.deepEqual(result.receivers, [])
  }
  const normalized = summary({ address: { ...address, municipalityCode: 851, roadCode: 1043, houseNumber: '14a' }, pointCollection: collection(receiver(2, 55.867, { houseNumber: '014 A' })) })
  assert.equal(normalized.status, 'point_value_found')
})

test('zero or missing original values cannot be replaced by another scenario or a partial range', () => {
  for (const missing of [0, null, undefined]) {
    const result = summary({ pointCollection: collection(receiver(1, 55.867), receiver(2, missing)) })
    assert.equal(result.receiverDataStatus, 'incomplete')
    assert.equal(result.status, 'band_found')
    assert.equal(result.valueDb, null)
    assert.equal(result.receiverRange, null)
    assert.equal(result.receivers[1].valueDb, null)
    assert.deepEqual(result.band, band)
  }
})

test('valid receiver results may exist below the polygon threshold or without any contour model', () => {
  const result = summary({ scenarios: [], pointCollection: collection(receiver(1, 42.789)) })
  assert.equal(result.status, 'point_value_found')
  assert.equal(result.valueDb, 42.789)
  assert.equal(result.band, null)
  assert.equal(result.modelYear, 2021)
  assert.equal(result.forecastYear, 2040)
})
