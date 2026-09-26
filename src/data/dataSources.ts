// Central registry of where every dataset shown in the app comes from. Pulled together
// from the `source`/`sources` fields already sitting in the GeoJSON/JSON data files, the
// constants in mapConfig.ts, and the external services the app calls (see api/*.js).
// Rendered by the /sources route. Keep this in sync when a dataset's provenance changes.

import type { TranslationKey } from '../shared/i18n/translations'

type DatasetKey = Extract<TranslationKey, `sources.dataset.${string}`> extends `sources.dataset.${infer Key}` ? Key : never

export interface DataSourceEntry {
  id: string
  datasetKey: DatasetKey // Enforce a translated label for every registry entry.
  citations: string[] // citation strings, kept as published (not translated)
  url?: string
}

export const DATA_SOURCES: DataSourceEntry[] = [
  {
    id: 'official-noise-points',
    datasetKey: 'officialNoisePoints',
    citations: [
      'Vejdirektoratet public WFS stoej_punkt_9095; complete 2,641-record dwelling snapshot retrieved 2026-09-26, covering 2,364 road-code/house-number combinations',
      'VVM 2021, forecast traffic 2040, facade Lden values for reference, original proposal and variant. Scenario mapping verified against the published report’s dwelling-count tables.',
      'Matched by Aalborg municipality, road code, house number and geographic consistency. Multiple dwelling records produce a range; undocumented zero values are treated as unavailable. Includes selected surrounding roads.',
    ],
    url: 'https://www.vejdirektoratet.dk/vvm/limfjorden/miljoe/stoej',
  },
  {
    id: 'official-noise',
    datasetKey: 'officialNoise',
    citations: [
      'Vejdirektoratet public WFS vvm_analysedata_e9095_stoej_polygon; complete 696-feature snapshot retrieved 2026-09-26 (694 noise bands and two study-area features)',
      'Rambøll / VVM 2021, source timestamps 2021-02-11; traffic forecast 2040, original/reference/variant scenarios; Lden at 1.5 m, Nord2000, selected roads only',
      'API retains original coordinates. Browser display uses approximately 1 m topology-preserving simplification; two invalid source rings are flagged and repaired only for display.',
    ],
    url: 'https://www.vejdirektoratet.dk/vvm/limfjorden/miljoe/stoej',
  },
  {
    id: 'official-design',
    datasetKey: 'officialDesign',
    citations: [
      'Vejdirektoratet public WFS vvm_e9095_analysedata_linje_projekt_fase_3; Vej centerlinje feature, source timestamp 2025-06-11, 14,072 line segments',
      'Default project map with the new crossing: includes project road lines, ramps and local details. Dated design snapshot; not exclusively the motorway axis or the latest 2026 design.',
    ],
    url: 'https://geocloud.vd.dk/geo/vvm/ows?service=WFS&version=2.0.0&request=GetCapabilities',
  },
  {
    id: 'official-land',
    datasetKey: 'officialLand',
    citations: [
      'Vejdirektoratet public WFS vvm_e9095_analysedata_polygon_areal_fase_3; permanent and temporary land requirements, source timestamp 2025-06-12',
      'Original design polygons retained; not cadastral boundaries or a decision about expropriation of an individual property.',
    ],
    url: 'https://www.vejdirektoratet.dk/vejprojekter/3-limfjordsforbindelse/arealbehov',
  },
  {
    id: 'road-alignment',
    datasetKey: 'roadAlignment',
    citations: [
      'Vejdirektoratet deklarationsrids E9095, jnr. EMN-2024-618886',
      'Owner GPS trace 2026-07 against Vejdirektoratet detailbesigtigelse plan sheets (MVK E45/E39)',
      'Retained for optional distance zones, the older-route address comparison and API proximity results. This approximate trace is no longer drawn as a road layer; the default map uses the official 2025 project lines.',
    ],
    url: 'https://www.vejdirektoratet.dk/vejprojekter/3-limfjordsforbindelse/dokumenter',
  },
  {
    id: 'local-roads',
    datasetKey: 'localRoads',
    citations: [
      'Vejdirektoratet, Præsentation af Nørholmsvej og Mølholmsvejs forlængelse, detailbesigtigelse 15. april 2026',
      'Owner GPS trace 2026-07 cross-checked against the above presentation',
      'Retained for API nearby-local-road results. These approximate traces are no longer drawn as a separate map layer; local project roads are included in the official 2025 design.',
    ],
    url: 'https://api.vejdirektoratet.dk/sites/default/files/2026-04/Pr%C3%A6sentation%20af%20N%C3%B8rholmsvej%20og%20M%C3%B8lholmsvejs%20forl%C3%A6ngelse.pdf',
  },
  {
    id: 'noise-bands',
    datasetKey: 'noiseBands',
    citations: [
      'Optional app-generated distance buffers around the older traced road alignment, retained separately from the official 2025 project lines; these bands contain no measured or modeled dB values',
      'Official Trafik 2035 PDFs for south, fjord crossing and north, with/without project, are linked separately in the project information. These PDFs are not the colored map layer.',
    ],
    url: 'https://www.vejdirektoratet.dk/vejprojekter/3-limfjordsforbindelse/dokumenter',
  },
  {
    id: 'noise-screens',
    datasetKey: 'noiseScreens',
    citations: [
      'Vejdirektoratet, Støj, updated 2026-06-09: approximately 5.3 km in total (Dall 1.0 km, Dall Villaby 1.4 km, Drastrup 1.4 km across both sides combined, Nørholmsvej 1.5 km)',
      'Geometry remains schematic, originally digitized from Opdaterede støjberegninger, November 2023, Table 6; individual Drastrup side lengths are unknown',
    ],
    url: 'https://www.vejdirektoratet.dk/vejprojekter/3-limfjordsforbindelse/stoej',
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
    url: 'https://www.vejdirektoratet.dk/vejprojekter/3-limfjordsforbindelse/om-projektet',
  },
  {
    id: 'project-information',
    datasetKey: 'projectInformation',
    citations: [
      'Vejdirektoratet project overview, detailed description, noise, schedule, land requirements, current work and official document collection; reviewed 2026-09-26',
      'Each fact and document in src/data/project-information.json retains its source URL and source date; a file upload month is not a calculation date',
    ],
    url: 'https://www.vejdirektoratet.dk/vejprojekter/3-limfjordsforbindelse',
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
