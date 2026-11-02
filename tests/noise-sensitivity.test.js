import assert from 'node:assert/strict'
import test from 'node:test'
import { trafficDeltaDb, trafficSensitivity } from '../src/features/noiseContext/utils/noiseSensitivity.ts'

test('traffic volume changes follow the 10·log10 rule', () => {
  assert.equal(trafficDeltaDb(1), 0)
  assert.equal(trafficDeltaDb(1.25), 1)
  assert.equal(trafficDeltaDb(1.5), 1.8)
  assert.equal(trafficDeltaDb(2), 3)
  assert.throws(() => trafficDeltaDb(0), RangeError)
})

test('sensitivity shifts both ends and flags crossing the 58 dB limit', () => {
  const [plus25, , plus100] = trafficSensitivity({ minDb: 53, maxDb: 58 }, [1.25, 1.5, 2])
  assert.deepEqual([plus25.minDb, plus25.maxDb, plus25.crossesGuidelineLimit], [54, 59, true])
  assert.deepEqual([plus100.minDb, plus100.maxDb], [56, 61])
})

test('open top band and values already above the limit do not report a new crossing', () => {
  const [row] = trafficSensitivity({ minDb: 68, maxDb: null }, [1.5])
  assert.equal(row.maxDb, null)
  assert.equal(row.minDb, 69.8)
  assert.equal(row.crossesGuidelineLimit, false)
  const [point] = trafficSensitivity({ minDb: 52.4, maxDb: 52.4 }, [1.25])
  assert.equal(point.crossesGuidelineLimit, false)
  const [near] = trafficSensitivity({ minDb: 57.5, maxDb: 57.5 }, [1.25])
  assert.equal(near.crossesGuidelineLimit, true)
})
