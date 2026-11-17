import assert from 'node:assert/strict'
import test from 'node:test'
import { hoerbarUrl } from '../src/features/noiseContext/utils/hoerbarLink.ts'

const comparison = {
  levelA: 57.5,
  levelB: 58.5,
  labelA: 'Som prognosticeret',
  labelB: '+25 % trafik',
  source: 'Tredjekort',
}

test('builds a Hørbar link with levels, labels and source', () => {
  const url = new URL(hoerbarUrl('https://hoerbar.example/', comparison))
  assert.equal(url.origin + url.pathname, 'https://hoerbar.example/')
  assert.equal(url.searchParams.get('a'), '57.5')
  assert.equal(url.searchParams.get('b'), '58.5')
  assert.equal(url.searchParams.get('la'), 'Som prognosticeret')
  assert.equal(url.searchParams.get('lb'), '+25 % trafik')
  assert.equal(url.searchParams.get('src'), 'Tredjekort')
})

test('replaces any query or hash on the configured base URL', () => {
  const url = new URL(hoerbarUrl('https://hoerbar.example/app?a=1#x', comparison))
  assert.equal(url.pathname, '/app')
  assert.equal(url.searchParams.get('a'), '57.5')
  assert.equal(url.hash, '')
})

test('returns null when Hørbar is not configured or the URL is unusable', () => {
  assert.equal(hoerbarUrl(undefined, comparison), null)
  assert.equal(hoerbarUrl('', comparison), null)
  assert.equal(hoerbarUrl('not a url', comparison), null)
  assert.equal(hoerbarUrl('javascript:alert(1)', comparison), null)
})

test('returns null when a level is outside the range Hørbar can represent', () => {
  assert.equal(hoerbarUrl('https://hoerbar.example/', { ...comparison, levelA: 29.9 }), null)
  assert.equal(hoerbarUrl('https://hoerbar.example/', { ...comparison, levelB: 85.1 }), null)
  assert.equal(hoerbarUrl('https://hoerbar.example/', { ...comparison, levelB: Number.NaN }), null)
})

test('truncates labels to the length Hørbar keeps', () => {
  const url = new URL(hoerbarUrl('https://hoerbar.example/', { ...comparison, labelA: 'x'.repeat(60) }))
  assert.equal(url.searchParams.get('la').length, 40)
})
