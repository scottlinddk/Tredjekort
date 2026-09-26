import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import test from 'node:test'

test('API and display snapshots retain the verified source scenarios and band identities', async () => {
  const metadata = JSON.parse(await readFile(new URL('../src/data/official-noise-metadata.json', import.meta.url), 'utf8'))
  const fullBytes = gunzipSync(await readFile(new URL('../src/data/official-noise.geojson.gz', import.meta.url)))
  assert.equal(createHash('sha256').update(fullBytes).digest('hex'), metadata.apiSha256)
  const api = JSON.parse(fullBytes.toString('utf8'))
  const display = JSON.parse(await readFile(new URL('../public/data/official-noise-display.geojson', import.meta.url), 'utf8'))
  assert.equal(api.features.length, metadata.numberMatched)
  assert.equal(metadata.numberReturned, metadata.numberMatched)
  assert.equal(display.features.length, metadata.counts.noiseBands)
  const bands = api.features.filter((feature) => feature.properties.kind === 'noise-band')
  const canonical = new Map(bands.map((feature) => [feature.properties.sourceFeatureId, feature.properties]))
  assert.equal(canonical.size, metadata.counts.noiseBands)
  for (const feature of display.features) {
    const original = canonical.get(feature.properties.sourceFeatureId)
    assert.ok(original)
    for (const key of ['scenario', 'minDb', 'maxDb', 'bandLabel', 'forecastYear', 'modelYear']) {
      assert.equal(feature.properties[key], original[key])
    }
  }
  for (const [scenario, count] of Object.entries(metadata.counts.bandsByScenario)) {
    assert.equal(bands.filter((feature) => feature.properties.scenario === scenario).length, count)
  }
  for (const id of metadata.sourceInvalidGeometryIds) assert.ok(canonical.has(id))
})

test('phase 3 layers contain documented centerlines and both types of land requirement', async () => {
  const read = async (file) => JSON.parse(await readFile(new URL(`../src/data/${file}`, import.meta.url), 'utf8'))
  const [alignment, land, metadata] = await Promise.all([
    read('official-alignment.geojson'), read('official-land-requirements.geojson'), read('official-spatial-data.json'),
  ])
  assert.equal(alignment.features.length, metadata.alignment.retainedFeatures)
  assert.equal(alignment.features[0].geometry.type, 'MultiLineString')
  assert.equal(alignment.features[0].geometry.coordinates.length, metadata.alignment.lineSegments)
  assert.deepEqual(land.features.map((feature) => feature.properties.kind).sort(), ['permanent', 'temporary'])
  for (const feature of [...alignment.features, ...land.features]) {
    assert.ok(feature.properties.sourceFeatureId && feature.properties.sourceUpdatedAt && feature.properties.sourceUrl)
  }
})
