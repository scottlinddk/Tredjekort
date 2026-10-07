import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const closures = JSON.parse(await readFile(new URL('../src/data/municipal-road-closures.geojson', import.meta.url), 'utf8'))

// Approximate metres between two longitude/latitude points at Aalborg's latitude.
const metres = ([lon1, lat1], [lon2, lat2]) => Math.hypot((lon2 - lon1) * 111320 * Math.cos((57.05 * Math.PI) / 180), (lat2 - lat1) * 110540)

test('closures keep the municipal source, status and georeferencing provenance', () => {
  const { metadata } = closures
  assert.equal(metadata.publisher, 'Aalborg Kommune')
  assert.equal(new URL(metadata.sourceUrl).hostname, 'www.aalborg.dk')
  assert.equal(metadata.status, 'preliminary-proposal')
  assert.match(metadata.sourceCaption, /vejlukning med stiadgang/)
  assert.match(metadata.georeferencing.streetData, /OpenStreetMap/)
  assert.equal(metadata.georeferencing.controlPoints.length, 4)
  for (const { residualM } of metadata.georeferencing.controlPoints) assert.ok(residualM <= 8, `residual ${residualM}`)
})

test('every published red bar is one short closure line across a side street', () => {
  const { features } = closures
  assert.equal(features.length, 10)
  assert.equal(new Set(features.map(({ properties }) => properties.id)).size, features.length)
  for (const { geometry, properties } of features) {
    assert.equal(properties.kind, 'closure-with-path-access')
    assert.equal(properties.status, 'preliminary-proposal')
    assert.equal(properties.confidence, 'schematic')
    assert.ok(['Mølholmsvej', 'Annebergvej'].includes(properties.corridorRoad))
    assert.ok(['north', 'south'].includes(properties.side))
    assert.ok(properties.sideStreetDistanceM <= 12)
    // Unnamed ways get a positional description instead of an invented name.
    if (!properties.street) assert.ok(properties.description)
    if (properties.description) assert.ok(properties.description.da && properties.description.en)
    // Drawn across the side street, clear of the main road, near where the municipality drew it.
    assert.ok(Math.abs(properties.setBackFromCorridorM - 18) <= 2)
    const published = properties.publishedBarCoordinates
    assert.ok(metres(published[0], geometry.coordinates[0]) < 40 || metres(published[0], geometry.coordinates[1]) < 40)
    assert.equal(geometry.type, 'LineString')
    assert.equal(geometry.coordinates.length, 2)
    for (const [longitude, latitude] of geometry.coordinates) {
      assert.ok(longitude > 9.86 && longitude < 9.895, `longitude ${longitude}`)
      assert.ok(latitude > 57.04 && latitude < 57.055, `latitude ${latitude}`)
    }
    const length = metres(...geometry.coordinates)
    assert.ok(length > 8 && length < 35, `${properties.id} is ${length.toFixed(1)} m`)
  }
})

test('closures run west to east, Mølholmsvej before Annebergvej', () => {
  const longitudes = closures.features.map(({ geometry }) => geometry.coordinates[0][0])
  assert.deepEqual(longitudes, [...longitudes].sort((a, b) => a - b))
  const roads = closures.features.map(({ properties }) => properties.corridorRoad)
  assert.equal(roads.lastIndexOf('Mølholmsvej') + 1, roads.indexOf('Annebergvej'))
})
