// Checks the upstream response shapes server/dar.js assumes, against the live Adressevælger.
//
//   ADRESSEVAELGER_TOKEN=... node scripts/verify-dar.mjs ["Nørholmsvej 180, 9000 Aalborg"]
//
// Exit code 1 if any step fails. The token is never printed.
import { fetchAccessAddress, searchAddresses } from '../server/dar.js'

const query = process.argv[2] ?? 'Nørholmsvej 180, 9000 Aalborg'
let failed = false
const step = (ok, message) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`)
  if (!ok) failed = true
}

try {
  const hits = await searchAddresses(query, { limit: 100 })
  const addresses = hits.filter((hit) => hit.type === 'husnummer')
  step(hits.length > 0, `search returned ${hits.length} usable hit(s) for "${query}" (${addresses.length} husnummer)`)
  console.log('     types seen:', [...new Set(hits.map((hit) => hit.type))].join(', ') || '-')
  if (addresses[0]) {
    console.log('     first husnummer:', JSON.stringify(addresses[0]))
    const record = await fetchAccessAddress(addresses[0].id)
    console.log('     resolved record:', JSON.stringify(record))
    step(Boolean(record.municipalityCode && record.roadCode), 'municipality code and road code resolved (needed for noise-receiver matching)')
    step(record.longitude > 7 && record.longitude < 16 && record.latitude > 54 && record.latitude < 58, 'position falls inside Denmark')
  } else if (hits[0]) {
    console.log('     first hit:', JSON.stringify(hits[0]), '(refine the query to reach a husnummer)')
  }
} catch (error) {
  step(false, `${error.code ?? error.name}: ${error.message}`)
}
process.exit(failed ? 1 : 0)
