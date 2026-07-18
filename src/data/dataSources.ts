// Central registry of where every dataset shown in the app comes from. Pulled together
// from the `source`/`sources` fields already sitting in the GeoJSON/JSON data files, the
// constants in mapConfig.ts, and the external services the app calls (see api/*.js).
// Rendered by the /sources route. Keep this in sync when a dataset's provenance changes.

export interface DataSourceEntry {
  id: string
  datasetKey: string // i18n key under `sources.dataset.*`, translated dataset label
  citations: string[] // citation strings, kept as published (not translated)
  url?: string
}

export const DATA_SOURCES: DataSourceEntry[] = [
  {
    id: 'road-alignment',
    datasetKey: 'roadAlignment',
    citations: [
      'Vejdirektoratet deklarationsrids E9095, jnr. EMN-2024-618886',
      'Owner GPS trace 2026-07 against Vejdirektoratet detailbesigtigelse plan sheets (MVK E45/E39)',
    ],
  },
  {
    id: 'local-roads',
    datasetKey: 'localRoads',
    citations: [
      'Vejdirektoratet, Præsentation af Nørholmsvej og Mølholmsvejs forlængelse, detailbesigtigelse 15. april 2026',
      'Owner GPS trace 2026-07 cross-checked against the above presentation',
    ],
  },
  {
    id: 'noise-bands',
    datasetKey: 'noiseBands',
    citations: [
      'Vejdirektoratet, Detailbesigtigelse - Støjkort, tegning 9095-29011 (2026-04-10) — source of the Lden dB-band labels (52-68+ dB, station 102+200-110+800)',
      'Band geometry is a distance-based approximation (concentric buffers around the road alignment), not a modeled acoustic contour from the study above',
    ],
  },
  {
    id: 'noise-screens',
    datasetKey: 'noiseScreens',
    citations: [
      'Vejdirektoratet, Opdaterede støjberegninger for den 3. Limfjordsforbindelse, november 2023, Tabel 6',
    ],
  },
  {
    id: 'junctions',
    datasetKey: 'junctions',
    citations: [
      'Vejdirektoratet project page',
      'Trafikstyrelsen VVM screening decision, 2025-04',
      'Vejdirektoratet, Præsentation af Nørholmsvej og Mølholmsvejs forlængelse, detailbesigtigelse 15. april 2026',
      'Vejdirektoratet, Detailbesigtigelse - Støjkort, tegning 9095-29011 (10-04-2026)',
      'Aalborg Kommune, Trafikmodel HDT 2035 (Nørholmsvej - Mølholmsvej)',
      'Lov om anlæg af en 3. Limfjordsforbindelse, §1 stk. 2',
    ],
  },
  {
    id: 'address-search',
    datasetKey: 'addressSearch',
    citations: ['Danmarks Adressers Web API (DAWA) / Dataforsyningen, adgangsadresser/autocomplete'],
    url: 'https://dawadocs.dataforsyningen.dk/dok/api/adgangsadresse#autocomplete',
  },
  {
    id: 'basemap',
    datasetKey: 'basemap',
    citations: ['OpenFreeMap, "Liberty" vector style (© OpenStreetMap contributors)'],
    url: 'https://openfreemap.org',
  },
  {
    id: 'changes-feed',
    datasetKey: 'changesFeed',
    citations: [
      'Automated scraper (monitor/) polling Vejdirektoratet project pages, published to this repository’s monitor-data branch',
    ],
    url: 'https://github.com/scottlinddk/Tredjekort/tree/monitor-data',
  },
]
