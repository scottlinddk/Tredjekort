import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const proposal = JSON.parse(await readFile(new URL('../src/data/municipal-road-proposal.geojson', import.meta.url), 'utf8'))
const localRoads = JSON.parse(await readFile(new URL('../src/data/local-roads.geojson', import.meta.url), 'utf8'))

test('municipal proposal keeps its source, status and per-section traffic figures', () => {
  const { metadata, features } = proposal
  assert.equal(metadata.publisher, 'Aalborg Kommune')
  assert.equal(new URL(metadata.sourceUrl).hostname, 'www.aalborg.dk')
  assert.equal(metadata.status, 'preliminary-proposal')
  assert.match(metadata.reviewedAt, /^\d{4}-\d{2}-\d{2}$/)
  assert.equal(new Set(features.map(({ properties }) => properties.id)).size, features.length)

  const figures = Object.fromEntries(features.map(({ properties }) => [properties.id, [properties.aadtCurrent, properties.aadtForecast]]))
  assert.deepEqual(figures, {
    'molholmsvej-forlaengelse': [null, 6900],
    'molholmsvej-svalegaardsvej-skydebanevej': [5900, 9700],
    'annebergvej-skydebanevej-vestre-fjordvej': [4200, 8200],
  })
  for (const { properties } of features) {
    assert.equal(properties.forecastYear, 2034)
    assert.ok(properties.name.da && properties.name.en && properties.geometrySource)
    // Unknown current traffic stays null, never 0.
    assert.notEqual(properties.aadtCurrent, 0)
    if (properties.aadtCurrent !== null) assert.ok(properties.aadtForecast >= properties.aadtCurrent)
  }
})

test('only sections with verified geometry are drawn, in longitude-latitude order near Aalborg', () => {
  for (const { geometry, properties } of proposal.features) {
    if (geometry === null) {
      assert.equal(properties.confidence, null)
      continue
    }
    assert.equal(properties.confidence, 'schematic')
    assert.equal(geometry.type, 'LineString')
    for (const [longitude, latitude] of geometry.coordinates) {
      assert.ok(longitude > 9.8 && longitude < 10.0, `longitude ${longitude}`)
      assert.ok(latitude > 57.0 && latitude < 57.1, `latitude ${latitude}`)
    }
  }
  const extension = proposal.features.find(({ properties }) => properties.id === 'molholmsvej-forlaengelse')
  const traced = localRoads.features.find(({ properties }) => properties.id === 'molholmsvej-forlaengelse')
  assert.deepEqual(extension.geometry, traced.geometry)
})

test('closures are kept in their own file, not mixed into the traffic segments', () => {
  assert.equal(proposal.metadata.closures.mapped, true)
  assert.match(proposal.metadata.closures.reason, /municipal-road-closures\.geojson/)
  assert.ok(proposal.features.every(({ properties }) => properties.kind === 'segment'))
})
