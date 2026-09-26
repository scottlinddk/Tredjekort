import assert from 'node:assert/strict'
import test from 'node:test'
import { point } from '@turf/turf'
import { lookupLandRequirements, nearestOfficialDesign } from '../server/official-project.js'

const origin = point([9.85, 57])
const rectangle = (west, south, east, north) => [[west, south], [east, south], [east, north], [west, north], [west, south]]
const collection = (...features) => ({ type: 'FeatureCollection', features })

test('nearest official centreline considers every MultiLineString component without joining gaps', () => {
  const feature = {
    type: 'Feature', properties: { sourceFeatureId: 'official.centerlines', kind: 'design-centerlines', sourceUpdatedAt: '2025-06-11' },
    geometry: { type: 'MultiLineString', coordinates: [[[9, 56.9], [9, 57.1]], [[9.85, 56.99], [9.85, 57.01]]] },
  }
  const result = nearestOfficialDesign(origin, collection(feature))
  assert.equal(result.distanceMeters, 0)
  assert.equal(result.featureId, 'official.centerlines')
  assert.equal(result.includesRampsAndLocalRoads, true)
  assert.equal(result.geometryIncluded, false)
  assert.equal(result.geometry, undefined)
  assert.equal(result.properties.sourceUpdatedAt, '2025-06-11')
  assert.equal(nearestOfficialDesign(origin, collection()), null)
})

test('land lookup returns intersecting permanent and temporary source attributes, never expropriation', () => {
  const makeFeature = (kind) => ({ type: 'Feature', properties: { sourceFeatureId: kind, kind }, geometry: { type: 'MultiPolygon', coordinates: [[rectangle(9.8, 56.9, 9.9, 57.1)]] } })
  const result = lookupLandRequirements(origin, collection(makeFeature('permanent'), makeFeature('temporary')))
  assert.equal(result.status, 'within_mapped_area')
  assert.deepEqual(result.matches.map((match) => match.properties.kind), ['permanent', 'temporary'])
  assert.equal(result.establishesExpropriation, false)
  assert.equal(result.geometryIncluded, false)
})

test('land holes and edges remain distinct from interior matches', () => {
  const feature = { type: 'Feature', id: 'land', properties: {}, geometry: { type: 'Polygon', coordinates: [rectangle(9.8, 56.9, 9.9, 57.1), rectangle(9.84, 56.99, 9.86, 57.01)] } }
  assert.equal(lookupLandRequirements(origin, collection(feature)).status, 'outside_mapped_areas')
  assert.equal(lookupLandRequirements(point([9.8, 57]), collection(feature)).status, 'boundary')
  assert.equal(lookupLandRequirements(point([9.84, 57]), collection(feature)).status, 'boundary')
  assert.equal(lookupLandRequirements(point([9.81, 57]), collection(feature)).status, 'within_mapped_area')
})

test('zero-length official centreline components do not create a false nearest line', () => {
  const feature = { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: [[[9.85, 57], [9.85, 57]], [[9.85, 57.01], [9.85, 57.02]]] } }
  assert.ok(nearestOfficialDesign(origin, collection(feature)).distanceMeters > 1000)
  feature.geometry.coordinates = [[[9.85, 57], [9.85, 57]]]
  assert.equal(nearestOfficialDesign(origin, collection(feature)), null)
})

test('an invalid land component is uncertain locally while other components remain usable', () => {
  const feature = {
    type: 'Feature', properties: {
      sourceFeatureId: 'permanent', sourceGeometryValid: false,
      invalidGeometryComponents: [{ index: 0, bbox: [9, 57, 10, 58], reason: 'Self-intersection' }],
    },
    geometry: { type: 'MultiPolygon', coordinates: [[[[9, 57], [10, 58], [10, 57], [9, 58], [9, 57]]], [rectangle(11, 57, 12, 58)]] },
  }
  const uncertain = lookupLandRequirements(point([9.1, 57.5]), collection(feature))
  assert.equal(uncertain.status, 'source_geometry_invalid')
  assert.equal(uncertain.matches.length, 0)
  assert.equal(uncertain.sourceGeometryIssues[0].componentIndex, 0)
  assert.equal(uncertain.establishesExpropriation, false)
  const known = lookupLandRequirements(point([11.5, 57.5]), collection(feature))
  assert.equal(known.status, 'within_mapped_area')
  assert.deepEqual(known.sourceGeometryIssues, [])
  assert.equal(lookupLandRequirements(point([12.5, 57.5]), collection(feature)).status, 'outside_mapped_areas')
})
