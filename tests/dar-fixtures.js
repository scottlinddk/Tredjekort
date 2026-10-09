// Fake Adressevælger. The search hit shape follows its published "Fonetisk søgning" output
// attributes; the id-lookup payload mirrors server/dar.js's assumptions about "Opslag med ID"
// (nested adgangspunkt.koordinater.x/y in EPSG:25832), not a verified live payload.
import { wgs84ToUtm32 } from '../server/crs.js'

export const addressId = '0a3f507a-b2e6-32b8-e044-0003ba298018'
export const env = { ADRESSEVAELGER_TOKEN: 'search-secret' }

export const searchHit = { type: 'husnummer', id: addressId, titel: 'Nørholmsvej 180, 9000 Aalborg' }

const { easting, northing } = wgs84ToUtm32(9.85, 57)
export const lookupRecord = {
  status: 'ok',
  husnummer: {
    id_lokalId: addressId,
    husnummertekst: '180',
    adgangsadressebetegnelse: 'Nørholmsvej 180, 9000 Aalborg',
    adgangspunkt: { id_lokalId: '11111111-1111-4111-8111-111111111111', koordinater: { x: easting, y: northing, crs: { properties: { name: 'EPSG:25832' } } } },
    postnummer: { postnr: '9000', navn: 'Aalborg' },
    navngivenvej: { vejnavn: 'Nørholmsvej' },
    navngivenvejkommunedel: { kommune: '0851', vejkode: '6090' },
  },
}

export const jsonResponse = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

/** Routes by URL path. Pass overrides to change what the service returns. */
export function darFetch({ search = [searchHit], lookup = lookupRecord, onRequest } = {}) {
  return async (url, init = {}) => {
    onRequest?.(url, init)
    if (url.hostname !== 'adressevaelger.dk') throw new Error(`Unexpected host ${url.hostname}`)
    return jsonResponse(url.pathname === '/husnumre/soeg' ? search : lookup)
  }
}
