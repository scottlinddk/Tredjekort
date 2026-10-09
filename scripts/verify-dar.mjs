// Checks the upstream response shapes server/dar.js assumes, against the live services.
//
//   DATAFORSYNINGEN_TOKEN=... DATAFORDELER_API_KEY=... node scripts/verify-dar.mjs ["Nørholmsvej 180, 9000 Aalborg"]
//
// Exit code 1 if any step fails. Secrets are never printed.
import { darConfig, fetchAccessAddress, searchAccessAddresses } from '../server/dar.js'

const query = process.argv[2] ?? 'Nørholmsvej 180, 9000 Aalborg'
const { graphqlKey, graphqlUrl } = darConfig()
const entities = ['DAR_Husnummer', 'DAR_Adressepunkt', 'DAR_NavngivenVej', 'DAR_NavngivenVejKommunedel', 'DAR_Postnummer']
// Fields server/dar.js reads, per entity.
const expected = {
  DAR_Husnummer: ['id_lokalId', 'husnummertekst', 'adgangspunkt', 'navngivenVej', 'postnummer'],
  DAR_Adressepunkt: ['id_lokalId', 'position'],
  DAR_NavngivenVej: ['id_lokalId', 'vejnavn'],
  DAR_NavngivenVejKommunedel: ['navngivenVej', 'kommune', 'vejkode'],
  DAR_Postnummer: ['id_lokalId', 'postnr', 'navn'],
}
let failed = false
const step = (ok, message) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`)
  if (!ok) failed = true
}

async function introspect() {
  if (!graphqlKey) return step(false, 'DATAFORDELER_API_KEY is not set, skipping schema check')
  const url = new URL(graphqlUrl)
  url.searchParams.set('apikey', graphqlKey)
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ __schema { types { name fields { name } } } }' }),
  })
  step(response.ok, `GraphQL endpoint ${graphqlUrl} answered HTTP ${response.status}`)
  if (!response.ok) return
  const types = new Map(((await response.json()).data?.__schema?.types ?? []).map((type) => [type.name, type.fields?.map((field) => field.name) ?? []]))
  for (const entity of entities) {
    const fields = types.get(entity)
    if (!fields) { step(false, `${entity}: type not found (is DAR_GRAPHQL_URL the right version?)`); continue }
    const missing = expected[entity].filter((name) => !fields.includes(name))
    step(missing.length === 0, `${entity}: ${missing.length ? `missing fields ${missing.join(', ')}; available: ${fields.join(', ')}` : 'all assumed fields present'}`)
  }
}

try {
  const hits = await searchAccessAddresses(query, { limit: 3 })
  step(hits.length > 0, `GSearch husnummer returned ${hits.length} usable hit(s) for "${query}"`)
  if (hits[0]) console.log('     first hit:', JSON.stringify(hits[0]))
  await introspect()
  if (hits[0]) {
    const record = await fetchAccessAddress(hits[0].id)
    console.log('     resolved record:', JSON.stringify(record))
    step(Boolean(record.municipalityCode && record.roadCode), 'municipality code and road code resolved (needed for noise-receiver matching)')
    const drift = hits[0].position ? Math.hypot(record.longitude - hits[0].position.longitude, record.latitude - hits[0].position.latitude) : null
    step(drift === null || drift < 0.001, `search and register positions agree (${drift === null ? 'search hit had no position' : `${(drift * 111000).toFixed(1)} m apart`})`)
  }
} catch (error) {
  step(false, `${error.code ?? error.name}: ${error.message}`)
}
process.exit(failed ? 1 : 0)
