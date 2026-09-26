import assert from 'node:assert/strict'
import test from 'node:test'
import { point } from '@turf/turf'
import { lookupNoiseScenario, prepareNoiseScenarios } from '../server/official-noise.js'

const ring = (west, south, east, north) => [[west, south], [east, south], [east, north], [west, north], [west, south]]
const polygon = (id, coordinates, lowerDb = 58, upperDb = 63) => ({
  type: 'Feature', id,
  properties: { lowerDb, upperDb, label: upperDb === null ? `>${lowerDb} dB` : `${lowerDb}–${upperDb} dB` },
  geometry: { type: 'Polygon', coordinates },
})
const collection = (...features) => ({ type: 'FeatureCollection', features })
const metadata = { scenario: 'with-project', forecastYear: 2040, units: 'dB', metric: 'Lden', sourceUrl: 'https://example.com/official' }

test('returns the published band and model provenance for a point inside a polygon', () => {
  const result = lookupNoiseScenario(point([9.5, 57.5]), collection(polygon('one', [ring(9, 57, 10, 58)])), metadata)
  assert.equal(result.status, 'band_found')
  assert.deepEqual(result.band, { lowerDb: 58, upperDb: 63, label: '58–63 dB' })
  assert.deepEqual(result.matchedFeatureIds, ['one'])
  assert.equal(result.forecastYear, 2040)
  assert.equal(result.sourceUrl, metadata.sourceUrl)
  assert.equal(result.belowMappedThreshold, null)
})

test('polygon holes are unmapped and must not imply noise below the threshold', () => {
  const withHole = polygon('hole', [ring(9, 57, 10, 58), ring(9.4, 57.4, 9.6, 57.6)])
  const result = lookupNoiseScenario(point([9.5, 57.5]), collection(withHole), metadata)
  assert.equal(result.status, 'no_matching_contour')
  assert.equal(result.band, null)
  assert.equal(result.belowMappedThreshold, null)
  assert.deepEqual(result.candidateBands, [])
})

test('exterior, hole and shared band boundaries remain ambiguous', () => {
  const withHole = polygon('hole', [ring(9, 57, 10, 58), ring(9.4, 57.4, 9.6, 57.6)])
  for (const coordinate of [[9, 57.5], [9.4, 57.5], [9, 57]]) {
    const result = lookupNoiseScenario(point(coordinate), collection(withHole), metadata)
    assert.equal(result.status, 'boundary', JSON.stringify(coordinate))
    assert.equal(result.band, null)
    assert.equal(result.onBoundary, true)
  }
  const adjacent = collection(polygon('left', [ring(9, 57, 10, 58)], 58, 63), polygon('right', [ring(10, 57, 11, 58)], 63, 68))
  const result = lookupNoiseScenario(point([10, 57.5]), adjacent, metadata)
  assert.equal(result.status, 'boundary')
  assert.equal(result.band, null)
  assert.equal(result.candidateBands.length, 2)
})

test('conflicting interior overlaps never silently choose the loudest or first band', () => {
  const overlapping = collection(polygon('one', [ring(9, 57, 10, 58)], 58, 63), polygon('two', [ring(9.2, 57.2, 10.2, 58.2)], 63, 68))
  const result = lookupNoiseScenario(point([9.5, 57.5]), overlapping, metadata)
  assert.equal(result.status, 'overlapping_bands')
  assert.equal(result.band, null)
  assert.equal(result.candidateBands.length, 2)
  assert.equal(result.onBoundary, false)
})

test('duplicate tiles with the same band are not a false conflict', () => {
  const overlapping = collection(polygon('one', [ring(9, 57, 10, 58)]), polygon('two', [ring(9.2, 57.2, 10.2, 58.2)]))
  const result = lookupNoiseScenario(point([9.5, 57.5]), overlapping, metadata)
  assert.equal(result.status, 'band_found')
  assert.equal(result.candidateBands.length, 1)
  assert.equal(result.matchedFeatureIds.length, 2)
})

test('MultiPolygon components and open-ended top bands preserve their meaning', () => {
  const feature = polygon('multi', [], 73, null)
  feature.geometry = { type: 'MultiPolygon', coordinates: [[ring(9, 57, 10, 58)], [ring(11, 57, 12, 58)]] }
  const result = lookupNoiseScenario(point([11.5, 57.5]), collection(feature), metadata)
  assert.equal(result.status, 'band_found')
  assert.equal(result.band.lowerDb, 73)
  assert.equal(result.band.upperDb, null)
  assert.equal(result.band.label, '>73 dB')
})

test('outside coverage and empty datasets provide no noise estimate', () => {
  for (const features of [collection(), collection(polygon('one', [ring(9, 57, 10, 58)]))]) {
    const result = lookupNoiseScenario(point([12.5, 55.7]), features, metadata)
    assert.equal(result.status, 'no_matching_contour')
    assert.equal(result.band, null)
    assert.equal(result.belowMappedThreshold, null)
  }
})

test('normalises verified source attributes, caches bounds and keeps scenarios separate', () => {
  const original = polygon('original', [ring(9, 57, 10, 58)])
  original.properties = { scenario: 'original', minDb: 53, maxDb: 58, bandLabel: '53 - 58 dB', sourceFeatureId: 'source.123' }
  const reference = polygon('reference', [ring(9, 57, 10, 58)])
  reference.properties = { scenario: 'reference', minDb: 58, maxDb: 63, bandLabel: '58 - 63 dB', sourceFeatureId: 'source.456' }
  const studyArea = polygon('study-area', [ring(8, 56, 11, 59)])
  studyArea.properties = { kind: 'study-area', scenario: 'original' }
  const prepared = prepareNoiseScenarios(collection(original, reference, studyArea), metadata)
  assert.equal(prepared.length, 2)
  assert.equal(prepared[0].collection.features.length, 1)
  assert.deepEqual(prepared[0].collection.features[0].bbox, [9, 57, 10, 58])
  const originalResult = lookupNoiseScenario(point([9.5, 57.5]), prepared[0].collection, prepared[0].metadata)
  const referenceResult = lookupNoiseScenario(point([9.5, 57.5]), prepared[1].collection, prepared[1].metadata)
  assert.equal(originalResult.scenario, 'original')
  assert.equal(originalResult.band.lowerDb, 53)
  assert.equal(referenceResult.scenario, 'reference')
  assert.equal(referenceResult.band.lowerDb, 58)
  assert.deepEqual(originalResult.matchedFeatureIds, ['source.123'])
})

test('invalid source geometry produces no band throughout its bounding box', () => {
  const invalid = polygon('self-intersection', [[[9, 57], [10, 58], [10, 57], [9, 58], [9, 57]]])
  invalid.properties.sourceGeometryValid = false
  const result = lookupNoiseScenario(point([9.1, 57.5]), collection(invalid), metadata)
  assert.equal(result.status, 'source_geometry_invalid')
  assert.equal(result.band, null)
  assert.deepEqual(result.sourceGeometryIssueFeatureIds, ['self-intersection'])
  assert.deepEqual(result.matchedFeatureIds, [])
  assert.equal(lookupNoiseScenario(point([11, 57.5]), collection(invalid), metadata).status, 'no_matching_contour')
})

test('invalid noise components are uncertain locally while valid components remain queryable', () => {
  const feature = polygon('mixed-source-feature', [])
  feature.properties.sourceGeometryValid = false
  feature.properties.invalidGeometryComponents = [{ index: 0, bbox: [9, 57, 10, 58], reason: 'Self-intersection' }]
  feature.geometry = { type: 'MultiPolygon', coordinates: [
    [[[9, 57], [10, 58], [10, 57], [9, 58], [9, 57]]],
    [ring(11, 57, 12, 58)],
    [ring(9.05, 57.45, 9.15, 57.55)],
  ] }
  const uncertain = lookupNoiseScenario(point([9.1, 57.5]), collection(feature), metadata)
  assert.equal(uncertain.status, 'source_geometry_invalid')
  assert.equal(uncertain.band, null)
  assert.equal(uncertain.candidateBands.length, 1)
  assert.deepEqual(uncertain.sourceGeometryIssueFeatureIds, ['mixed-source-feature'])
  // An otherwise valid polygon at this point cannot override the nearby source defect.
  assert.deepEqual(uncertain.matchedFeatureIds, ['mixed-source-feature'])
  const known = lookupNoiseScenario(point([11.5, 57.5]), collection(feature), metadata)
  assert.equal(known.status, 'band_found')
  assert.equal(known.band.lowerDb, 58)
  assert.deepEqual(known.matchedFeatureIds, ['mixed-source-feature'])
  assert.deepEqual(known.sourceGeometryIssueFeatureIds, [])
  assert.equal(lookupNoiseScenario(point([10.5, 57.5]), collection(feature), metadata).status, 'no_matching_contour')
  assert.equal(lookupNoiseScenario(point([11, 57.5]), collection(feature), metadata).status, 'boundary')
})
