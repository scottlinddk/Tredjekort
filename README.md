# 3. Limfjordsforbindelse — interaktivt kort

Danish-first interactive map of the planned motorway west of Aalborg via Egholm.
React, TypeScript, Vite and MapLibre GL; Vercel functions serve the JSON APIs.

## What is included

- A mobile map with a collapsible tool dock in its own layout area. Search,
  layers and information share one panel; controls never cover the map.
- Danish/English address search, keyboard navigation, shareable address/scenario
  links, a route overview button and direct address-report JSON links.
- Expected road noise with the motorway at a searched address: official modeled
  dwelling values, a range across matched dwelling records, or an original-proposal
  contour band. Model year, forecast year and the included surrounding roads stay
  visible; no motorway-only decibel contribution is invented.
- Official geographic noise scenarios from the **2021 environmental assessment,
  with 2040 traffic forecasts**. Original proposal, reference and variant remain
  distinct from the newer design and newer noise maps.
- Official **2025 phase 3** design centerlines and permanent/temporary land
  requirement areas, kept distinct from the existing approximate road traces.
- All six published **2035 noise PDFs**, paired by region and with/without project,
  plus project facts, dated updates, the published schedule, inspection documents,
  environmental material and landowner information.
- Corrected published noise-screen lengths: approximately **5.3 km**. The two
  Drastrup geometries share one 1.4 km published total; unknown individual side
  lengths are null, so they are not accidentally counted twice.

The source review is dated **26 September 2026**. Each project fact and document
retains its official source. File upload months and drawing/revision dates are
separate. See the in-app Project overview and Data sources pages.
The [source review and import guide](docs/DATA_SOURCES.md) records source queries,
model assumptions, geometry defects, checksums and the reproducible importer.

## Address report API

`GET /api/address-report?address=<street, house number, postcode>&lang=da`

Or use the access-address UUID returned by autocomplete or an ambiguity response:

`GET /api/address-report?id=<DAWA-access-address-UUID>&lang=en`

```sh
curl --get 'http://localhost:5173/api/address-report' \
  --data-urlencode 'address=Nørholmsvej 180, 9000 Aalborg' \
  --data-urlencode 'lang=da'
```

The response contains the resolved address and coordinates, a prose description,
map proximity results, official historic noise-model results, sources and data
limitations. `lang` supports `da` (default) and `en`. Access addresses do not
distinguish apartment floors or doors. No API key is required; GET supports CORS.

The additive `noise.expectedWithProject` field prioritizes verified **modeled
dwelling/facade values** from the original proposal. `valueDb` holds a single or
identical value; `receiverRange` contains the minimum, maximum and number of all
matched dwelling records and is present for both `point_value_found` and
`point_range_found`. Raw source decimals are retained; the prose and UI use one
decimal. Floor codes are preserved without guessing their meaning.

Matching requires DAWA municipality `0851`, road code and normalized house number,
then a 50-metre coordinate-consistency guard. It never transfers a nearest
address's result. Missing/zero source values cannot create a partial receiver range.
If a complete receiver result is unavailable, the API uses the **original** contour
band, never the reference or variant. It does not invent a midpoint. Boundaries,
overlaps, invalid geometry and missing contours give an explicit unknown result.
The top `78 dB` source category retains its unspecified upper bound.

These are the **2021 model's 2040 forecasts**, including the motorway and selected
surrounding roads. They do not establish a current measured sound level, the
current 2035 design's impact or the motorway's isolated contribution. Therefore
`expectedWithProject.exactDb`, `motorwayOnlyDb`, and the existing `noise.ldenDb`,
audibility and compliance fields remain null. Existing scenario results and
response `schemaVersion: "1.0"` remain compatible. An unmapped contour is not proof
of low noise; a verified dwelling model value may be below the contour's 53 dB
threshold.

Text search is non-fuzzy. Multiple matches return `409` with candidates instead of
silently choosing an address. Other responses include `400` invalid input, `404`
not found, `405` unsupported method, `502` upstream failure and `504` timeout.

- Human-readable documentation and a request form: `/api-docs.html`
- Machine-readable specification: `/openapi.json`
- Autocomplete remains available at `/api/addresses?q=<query>`.

The report uses the same implementation in Vercel, `npm run dev`, and
`npm run preview`. A static-file-only host cannot run the API. Vercel bundles the
source datasets through `vercel.json`; address queries and responses are not cached.
The app's general project data are a versioned snapshot, while DAWA lookups are live.
The full-precision snapshot is about 19.5 MB compressed; local cold-start validation
observed roughly 625 MB peak process memory and 1.6 seconds to load/index it.
The browser loads a separate 3.9 MB display file only when an official noise layer
is selected.

## Development and checks

Use Node 24, or a version matching `package.json`'s engines.

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
npm run preview
```

Tests cover address validation/ambiguity/upstream failures, geographic lookups,
noise-model boundaries and holes, scenario coverage, provenance and grouped screen
lengths. GitHub Actions runs tests, lint and a production build on pull requests.
The existing context-provider fast-refresh lint warnings are non-fatal.

## Data interpretation

Official geographic layers retain their documented vintage and semantics.
Phase 3 centerlines include ramps and local-road details, so their distance is not
necessarily a distance to the motorway's main carriageway. Published land polygons
are planning information, not a determination of an individual property's legal
expropriation status.

The original app's motorway/local-road traces and screen geometry remain approximate
manual digitizations. Even the legacy `surveyed` confidence value is not official
survey certification. Distances are rounded to 10 metres but the approximate traces
can be misplaced by hundreds of metres. Distance zones are geometric buffers only;
**they are never labeled as decibel bands or used to predict audibility**.

The latest 2035 PDF noise maps are linked in full; they have not been converted into
reliable address-level contours. The separately identified 2021/2040 polygons are
an older official model and must not be treated as updated 2035 calculations.
