import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const bytes = await readFile(new URL('../src/data/official-noise-points.geojson', import.meta.url))
const snapshot = JSON.parse(bytes.toString('utf8'))
const metadata = JSON.parse(await readFile(new URL('../src/data/official-noise-points-metadata.json', import.meta.url), 'utf8'))
const features = snapshot.features

// Independent published fingerprints: EIA 2021 tables 5-7, 5-9 and 5-10,
// printed pages 81, 88 and 91. An updated source model requires new verification.
const report = {
  reference: { field: 'lden_sce01', bins: [346, 218, 38, 8], above58: 610 },
  original: { field: 'lden_sce02', bins: [538, 83, 28, 2], above58: 651 },
  variant: { field: 'lden_sce03', bins: [539, 77, 28, 2], above58: 646 },
}

test('address-noise snapshot is complete and tied to its official source and output hash', () => {
  assert.equal(snapshot.type, 'FeatureCollection')
  assert.equal(features.length, 2641)
  assert.equal(metadata.numberMatched, 2641)
  assert.equal(metadata.numberReturned, 2641)
  assert.equal(metadata.counts.records, 2641)
  assert.equal(new Set(features.map(({ properties }) => properties.sourceRecordId)).size, 2641)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), metadata.sha256)
  assert.match(metadata.rawSha256, /^[a-f0-9]{64}$/)

  const service = new URL(metadata.serviceUrl)
  assert.equal(service.origin, 'https://geocloud.vd.dk')
  assert.equal(service.searchParams.get('typeNames'), 'vvm:stoej_punkt_9095')
  assert.equal(service.searchParams.get('srsName'), 'CRS:84')
  assert.equal(metadata.modelYear, 2021)
  assert.equal(metadata.forecastYear, 2040)
  assert.equal(metadata.indicator, 'Lden')
  assert.equal(metadata.measurementType, 'modelled-facade-noise')
  assert.equal(metadata.sourceUpdatedAt, null, 'the point service does not publish an update timestamp')
  assert.deepEqual(metadata.scenarioSourceTables, ['5-7', '5-9', '5-10'])
})

test('point coordinates and address/unit identities remain usable without transferring predictions between addresses', () => {
  const addresses = new Map()
  for (const feature of features) {
    const p = feature.properties
    const raw = p.rawSourceProperties
    assert.equal(feature.geometry.type, 'Point')
    assert.equal(feature.geometry.coordinates.length, 2)
    const [longitude, latitude] = feature.geometry.coordinates
    assert.ok(Number.isFinite(longitude) && longitude > 9.83 && longitude < 9.96)
    assert.ok(Number.isFinite(latitude) && latitude > 56.96 && latitude < 57.14)
    assert.deepEqual(feature.bbox, [longitude, latitude, longitude, latitude])
    assert.equal(p.sourceRecordId, raw.id)
    assert.match(p.roadCode, /^\d{4}$/)
    assert.equal(Number(p.roadCode), raw.vej_kode)
    assert.equal(p.houseNumber, raw.hus_nr.trim().toUpperCase())
    assert.equal(p.sourceFloor, raw.etage)
    assert.equal(p.sourceFloorCode, raw.sp_etage)
    assert.equal(p.sourceDoor, raw.side_doernr)
    const key = `${p.roadCode}:${p.houseNumber}`
    if (addresses.has(key)) assert.deepEqual(feature.geometry.coordinates, addresses.get(key))
    else addresses.set(key, feature.geometry.coordinates)
  }
  assert.equal(addresses.size, 2364)
  assert.equal(metadata.counts.addresses, addresses.size)
  // The service's advertised capabilities extent is smaller than its returned
  // data. Keep the northern records instead of clipping to that stale extent.
  const longitudes = features.map((feature) => feature.geometry.coordinates[0])
  const latitudes = features.map((feature) => feature.geometry.coordinates[1])
  assert.deepEqual(
    [Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)],
    [9.83471282, 56.96209458, 9.95162968, 57.13178519],
  )

  // Independently checked against DAWA: Carlo Wognsens Vej 1, 9000 Aalborg.
  const sample = features.find(({ properties }) => properties.sourceRecordId === 1)
  assert.equal(sample.properties.roadCode, '1043')
  assert.equal(sample.properties.houseNumber, '1')
  assert.deepEqual(sample.geometry.coordinates, [9.86578302, 57.02935505])
  assert.deepEqual(sample.properties.valuesDb, { reference: 41.337, original: 55.126, variant: 55.126 })
})

test('scenario fields reproduce every published dwelling-bin total, not merely a guessed scenario order', () => {
  const ranges = [[58, 63], [63, 68], [68, 73], [73, Infinity]]
  for (const [scenario, expected] of Object.entries(report)) {
    assert.equal(metadata.scenarioFields[scenario], expected.field)
    const rawValues = features.map(({ properties }) => properties.rawSourceProperties[expected.field])
    const actualBins = ranges.map(([lower, upper]) => rawValues.filter((value) => value >= lower && value < upper).length)
    assert.deepEqual(actualBins, expected.bins)
    assert.equal(rawValues.filter((value) => value > 58).length, expected.above58)
    assert.equal(metadata.scenarioVerification[scenario].sourceField, expected.field)
    assert.deepEqual(metadata.scenarioVerification[scenario].binCounts, expected.bins)
    assert.equal(metadata.scenarioVerification[scenario].above58Db, expected.above58)
  }
})

test('undocumented raw zeros remain preserved but are never normalized to a zero-dB prediction', () => {
  const observedZeros = { reference: 6, original: 18, variant: 20 }
  for (const [scenario, { field }] of Object.entries(report)) {
    let zeros = 0
    for (const { properties } of features) {
      const raw = properties.rawSourceProperties[field]
      assert.ok(Number.isFinite(raw) && raw >= 0)
      assert.equal(properties.rawValuesDb[scenario], raw)
      if (raw === 0) {
        zeros += 1
        assert.equal(properties.valuesDb[scenario], null)
      } else {
        assert.equal(properties.valuesDb[scenario], raw, 'valid model values retain their original decimals')
      }
    }
    assert.equal(zeros, observedZeros[scenario])
    assert.equal(metadata.counts.zeroValuesByScenario[scenario], observedZeros[scenario])
  }
  assert.match(metadata.matching.zeroValuePolicy, /meaning is not documented/)
})

test('multiple dwelling records are retained rather than collapsed to an arbitrary floor prediction', () => {
  const units = features.filter(({ properties }) => properties.roadCode === '2886' && properties.houseNumber === '10')
  assert.equal(units.length, 6)
  assert.deepEqual(units.map(({ properties }) => properties.sourceRecordId), [529, 530, 531, 532, 533, 534])
  assert.deepEqual(units.map(({ properties }) => properties.valuesDb.original), [53.825, 53.825, 54.881, 54.881, 54.67, 54.67])
  assert.deepEqual([...new Set(units.map(({ properties }) => properties.sourceFloor))], [1, 2, 3])
})
