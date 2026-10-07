import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
const sections = await read('../src/data/municipal-cross-sections.geojson')
const closures = await read('../src/data/municipal-road-closures.geojson')

// Approximate metres between two longitude/latitude points at Aalborg's latitude.
const metres = ([lon1, lat1], [lon2, lat2]) => Math.hypot((lon2 - lon1) * 111320 * Math.cos((57.05 * Math.PI) / 180), (lat2 - lat1) * 110540)

// Affine image-to-WGS84 transform reproduced from the closures' measured pixel/coordinate pairs.
function imageToLonLat() {
  const pairs = closures.features.flatMap(({ properties }) =>
    properties.sourceImagePx.map((px, index) => [px, properties.publishedBarCoordinates[index]]))
  const [[p0, c0], [p1, c1], [p2, c2]] = [pairs[0], pairs[11], pairs[pairs.length - 1]]
  const solve = (axis) => {
    const [dx1, dy1, dv1] = [p1[0] - p0[0], p1[1] - p0[1], c1[axis] - c0[axis]]
    const [dx2, dy2, dv2] = [p2[0] - p0[0], p2[1] - p0[1], c2[axis] - c0[axis]]
    const det = dx1 * dy2 - dx2 * dy1
    return [(dv1 * dy2 - dv2 * dy1) / det, (dx1 * dv2 - dx2 * dv1) / det]
  }
  const [lon, lat] = [solve(0), solve(1)]
  return ([x, y]) => [
    c0[0] + lon[0] * (x - p0[0]) + lon[1] * (y - p0[1]),
    c0[1] + lat[0] * (x - p0[0]) + lat[1] * (y - p0[1]),
  ]
}

test('cross sections keep the municipal source and status', () => {
  const { metadata } = sections
  assert.equal(metadata.publisher, 'Aalborg Kommune')
  assert.equal(new URL(metadata.sourceUrl).hostname, 'www.aalborg.dk')
  assert.equal(metadata.status, 'preliminary-proposal')
  assert.deepEqual(metadata.georeferencing.imageSizePx, closures.metadata.georeferencing.imageSizePx)
})

test('each cross section sits where its marker is drawn in the plan, with a bundled image', async () => {
  const toLonLat = imageToLonLat()
  assert.ok(sections.features.length > 0)
  for (const { geometry, properties } of sections.features) {
    assert.equal(geometry.type, 'Point')
    assert.equal(properties.kind, 'cross-section-illustration')
    assert.equal(properties.confidence, 'schematic')
    assert.ok(properties.caption.da && properties.caption.en)
    assert.ok(properties.alt.da && properties.alt.en)
    const offset = metres(toLonLat(properties.sourceImagePx), geometry.coordinates)
    assert.ok(offset < 3, `${properties.id} is ${offset.toFixed(1)} m from its plan position`)
    assert.match(properties.image.src, /^\/images\//)
    await access(new URL(`../public${properties.image.src}`, import.meta.url))
  }
})
