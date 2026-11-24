import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
const consolidation = await read('../src/data/consolidation-2026-11.json')
const geometry = await read('../src/data/alternatives-2026-11.geojson')

const sum = (values) => values.reduce((total, value) => total + value, 0)

test('the November 2026 budget table adds up as published', () => {
  const rows = Object.fromEntries(consolidation.budget.rows.map((row) => [row.id, row]))
  const parts = ['land-works', 'fjord-crossing', 'other']
  assert.equal(Math.round(sum(parts.map((id) => rows[id].original)) * 10) / 10, rows['physical-total'].original)
  assert.equal(sum(parts.map((id) => rows[id].november2026)), rows['physical-total'].november2026)
  assert.equal(rows['land-works'].increase + rows['fjord-crossing'].increase, rows['physical-total'].increase)
  assert.equal(Math.round((rows['physical-total'].original + rows.reserves.original) * 10) / 10, rows.total.original)
  // The source shows "-" for Øvrigt; never fill it with a computed value.
  assert.equal(rows.other.increase, null)
})

test('savings with the immersed tunnel total the published 0.9 bn', () => {
  assert.equal(sum(consolidation.immersedTunnelSavings.items.map((item) => item.mio)), 930)
  // Page 7 rounds the items (930 m) to "0,9 mia. kr."
  assert.equal(consolidation.immersedTunnelSavings.totalBn, 0.9)
})

test('crossing alternatives carry the published saving ranges and a single baseline', () => {
  const byId = Object.fromEntries(consolidation.crossingAlternatives.map((item) => [item.id, item]))
  assert.deepEqual(Object.keys(byId).sort(), ['bascule-bridge', 'cut-and-cover', 'high-bridge', 'immersed-tunnel'])
  assert.equal(consolidation.crossingAlternatives.filter((item) => item.isBaseline).length, 1)
  assert.deepEqual([byId['cut-and-cover'].savingMinBn, byId['cut-and-cover'].savingMaxBn], [0.2, 0.2])
  assert.deepEqual([byId['high-bridge'].savingMinBn, byId['high-bridge'].savingMaxBn], [2.5, 2.6])
  assert.deepEqual([byId['bascule-bridge'].savingMinBn, byId['bascule-bridge'].savingMaxBn], [2.5, 2.7])
  assert.equal(byId['bascule-bridge'].trafficStopsForShips, true)
  for (const item of consolidation.crossingAlternatives) {
    assert.ok(item.title.da && item.title.en && item.summary.da && item.summary.en)
    assert.ok(item.savingMinBn <= item.savingMaxBn)
  }
  assert.equal(new URL(consolidation.sourceUrl).hostname, 'api.vejdirektoratet.dk')
})

test('alternative geometry is schematic, sourced and keeps the alignment west of the deposit', () => {
  const byId = Object.fromEntries(geometry.features.map((feature) => [feature.properties.id, feature]))
  for (const feature of geometry.features) {
    assert.equal(feature.properties.status, 'preliminary-alternative')
    assert.equal(feature.properties.sourceUrl, consolidation.sourceUrl)
    for (const [lon, lat] of feature.geometry.type === 'Polygon' ? feature.geometry.coordinates[0] : feature.geometry.coordinates) {
      assert.ok(lon > 9.8 && lon < 9.9 && lat > 57.0 && lat < 57.07, `${feature.properties.id} out of area`)
    }
  }
  const ring = byId['molholm-sludge-deposit'].geometry.coordinates[0]
  assert.deepEqual(ring[0], ring.at(-1))
  const depositWestEdge = Math.min(...ring.map(([lon]) => lon))
  // Every alternative vertex within the deposit's latitude span lies west of the deposit.
  const [south, north] = [Math.min(...ring.map(([, lat]) => lat)), Math.max(...ring.map(([, lat]) => lat))]
  const alternative = [...byId['west-of-deposit-land'].geometry.coordinates, ...byId['west-of-deposit-tunnel'].geometry.coordinates]
  const alongside = alternative.filter(([, lat]) => lat >= south && lat <= north)
  assert.ok(alongside.length > 3)
  for (const [lon] of alongside) assert.ok(lon < depositWestEdge, `alternative vertex at ${lon} is not west of ${depositWestEdge}`)
  // The land section and the tunnel section share their hand-over vertex.
  assert.deepEqual(byId['west-of-deposit-land'].geometry.coordinates.at(-1), byId['west-of-deposit-tunnel'].geometry.coordinates[0])
})
