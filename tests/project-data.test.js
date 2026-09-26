import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const information = JSON.parse(await readFile(new URL('../src/data/project-information.json', import.meta.url), 'utf8'))
const screens = JSON.parse(await readFile(new URL('../src/data/noise-screens.geojson', import.meta.url), 'utf8'))

test('official noise comparisons cover each region with both matching 2035 scenarios', () => {
  const maps = information.documents.filter((document) => document.category === 'noise')
  assert.equal(maps.length, 6)
  const regions = new Map()
  for (const document of maps) {
    assert.equal(document.forecastYear, 2035)
    assert.ok(document.title.da && document.title.en)
    assert.equal(new URL(document.url).hostname, 'api.vejdirektoratet.dk')
    const scenarios = regions.get(document.region) ?? new Set()
    scenarios.add(document.scenario)
    regions.set(document.region, scenarios)
  }
  assert.equal(regions.size, 3)
  for (const scenarios of regions.values()) {
    assert.deepEqual([...scenarios].sort(), ['with-project', 'without-project'])
  }
})

test('screen lengths total 5.3 km without double-counting the two Drastrup geometries', () => {
  const groups = new Map()
  for (const { properties } of screens.features) {
    if (groups.has(properties.group_id)) assert.equal(groups.get(properties.group_id), properties.group_length_m)
    groups.set(properties.group_id, properties.group_length_m)
    assert.ok(properties.source_url && properties.source_updated_at)
  }
  assert.equal([...groups.values()].reduce((sum, length) => sum + length, 0), 5300)
  const drastrup = screens.features.filter(({ properties }) => properties.group_id === 'drastrup')
  assert.equal(drastrup.length, 2)
  for (const { properties } of drastrup) assert.equal(properties.length_m, null)
})

test('project facts, updates and schedule retain bilingual text and dated official provenance', () => {
  for (const group of ['facts', 'updates', 'timeline']) {
    assert.ok(information[group].length > 0)
    assert.equal(new Set(information[group].map((item) => item.id)).size, information[group].length)
    for (const item of information[group]) {
      assert.ok(item.title.da && item.title.en && item.summary.da && item.summary.en)
      assert.ok(['www.vejdirektoratet.dk', 'geocloud.vd.dk'].includes(new URL(item.sourceUrl).hostname))
      assert.match(item.sourceUpdatedAt, /^\d{4}-\d{2}-\d{2}$/)
    }
  }
})
