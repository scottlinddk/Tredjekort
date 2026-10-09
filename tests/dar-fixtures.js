// Fake Adressevælger + Datafordeler GraphQL. The Adressevælger hit shape follows its
// published "Fonetisk søgning" output attributes; the GraphQL part mirrors server/dar.js's
// assumptions, not a verified payload.
export const addressId = '0a3f507a-b2e6-32b8-e044-0003ba298018'
export const env = { ADRESSEVAELGER_TOKEN: 'search-secret', DATAFORDELER_API_KEY: 'register-secret' }

export const searchHit = { type: 'husnummer', id: addressId, titel: 'Nørholmsvej 180, 9000 Aalborg' }

const refs = {
  point: '11111111-1111-4111-8111-111111111111',
  road: '22222222-2222-4222-8222-222222222222',
  postcode: '33333333-3333-4333-8333-333333333333',
}
export const house = {
  id_lokalId: addressId, husnummertekst: '180', adgangspunkt: refs.point, navngivenVej: refs.road, postnummer: refs.postcode,
}
export const related = {
  point: { nodes: [{ id_lokalId: refs.point, position: { wkt: 'POINT (9.85 57)', crs: 'EPSG:4326' } }] },
  road: { nodes: [{ id_lokalId: refs.road, vejnavn: 'Nørholmsvej' }] },
  roadPart: { nodes: [{ kommune: '0851', vejkode: '6090' }] },
  postcode: { nodes: [{ postnr: '9000', navn: 'Aalborg' }] },
}

export const jsonResponse = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

/** Routes by host. Pass overrides to change what either service returns. */
export function darFetch({ search = [searchHit], husnummer = { nodes: [house] }, relatedData = related, onRequest } = {}) {
  return async (url, init = {}) => {
    onRequest?.(url, init)
    if (url.hostname === 'adressevaelger.dk') return jsonResponse(search)
    if (url.hostname === 'graphql.datafordeler.dk') {
      const { query } = JSON.parse(init.body)
      return jsonResponse({ data: query.includes('DAR_Adressepunkt') ? relatedData : { DAR_Husnummer: husnummer } })
    }
    throw new Error(`Unexpected host ${url.hostname}`)
  }
}
