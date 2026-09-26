# Official project data review

Reviewed 26 September 2026. The primary entry point is
[Vejdirektoratet's project website](https://www.vejdirektoratet.dk/vejprojekter/3-limfjordsforbindelse).
The app does not claim to contain every document or every environmental theme.
It includes the map-relevant official spatial layers verified below and a curated
catalogue of current project, noise, land, design and environmental documents.

## Imported spatial data

The legacy [digital EIA noise page](https://www.vejdirektoratet.dk/vvm/limfjorden/miljoe/stoej)
embeds a Septima map. Its public configuration links to Vejdirektoratet's public
GeoServer. Both WMS and WFS capabilities were verified at
`https://geocloud.vd.dk/geo/vvm/ows`.

| Dataset | Official WFS layer | Complete response | Source date |
| --- | --- | --- | --- |
| Noise | `vvm_analysedata_e9095_stoej_polygon` | 696 features: 694 noise polygons, 2 study areas | Noise bands 2021-02-11 |
| Phase 3 design | `vvm_e9095_analysedata_linje_projekt_fase_3` | 2 features; retain the 1 centerline feature, 14,072 line segments | 2025-06-11 |
| Phase 3 land requirements | `vvm_e9095_analysedata_polygon_areal_fase_3` | 2 features: permanent and temporary | 2025-06-12 |

The data was requested in `CRS:84` (longitude, latitude) and the entire response was
checked: `numberMatched == numberReturned == features.length`. Source IDs, exact
query URLs, response hashes, counts and timestamps are recorded in
`src/data/official-spatial-data.json`. The centerline includes ramps and local
details, not just a single motorway axis. The excluded `Vej prj krop` feature is a
large collection of design-outline segments, not a motorway centerline.

`scripts/import-official-data.py` reproduces these imports with Python and
Shapely 2.1.2. It rejects unrecognized categories, partial responses and unexpected
coordinate order/extent. Install Shapely in a Python environment and run:

```text
python scripts/import-official-data.py
```

For a previously saved download, `--cache-dir <directory> --offline` avoids network
requests. Generated outputs are committed; application runtime does not require
Python or Shapely. Raw downloads and map configuration are temporary and must not
be committed. The map widget configuration includes unrelated third-party service
settings that are not needed by this app.

### Historical noise model, not the current detailed design

The official polygon layer belongs to the **2021 EIA**, with traffic forecast to
**2040**. The source website was last updated in November 2023, which is not the
calculation year. Scenario mapping was verified in the official embedded map:

| Source value | App ID | Meaning |
| --- | --- | --- |
| `Forslag 1` | `original` | Project with the original E45 interchange design |
| `Forslag x` | `reference` | Future reference without the project |
| `Forslag 3` | `variant` | Project with the alternative E45 interchange design |

The [2021 environmental report](https://api.vejdirektoratet.dk/sites/default/files/2021-02/Milj%C3%B8konsekvensrapport_Egholmlinjen.pdf),
printed pages 76–77 (PDF pages 79–80), verifies Nord2000 / SoundPLAN 8.1,
the Lden indicator, four weather classes, a 10 by 10 metre interpolated grid and
calculation height 1.5 metres above terrain. It includes the motorway plus selected
crossing and nearby existing roads; **not every road** is modelled. The report
therefore says the results are for scenario comparison. A band is not the isolated
noise contribution of the new motorway, a measurement, or an exact facade result.

The source field `bemaerkning` supplies the band labels: 53–58, 58–63, 63–68,
68–73, 73–78 and `78 dB`. The last label is retained exactly, with no invented
upper bound or decimal estimate. The WMS style supplies the first five colors;
the app supplies a darker purple for the otherwise unstyled `78 dB` category.
The bands are contour ranges, not cumulative thresholds. A geometric check found
small overlaps between neighboring ranges (largest about 3.26 square metres among
valid source geometries); multiple matches must remain ambiguous.

Two source polygons have self-intersecting rings:

- `vvm_analysedata_e9095_stoej_polygon.1916736` (variant, 73–78 dB).
- `vvm_analysedata_e9095_stoej_polygon.1916806` (reference, 58–63 dB).

These are flagged with `sourceGeometryValid: false`. Full API coordinates are
retained unchanged in `src/data/official-noise.geojson.gz`. The browser file
`public/data/official-noise-display.geojson` repairs those two geometries only for
display and uses approximately one metre topology-preserving simplification in a
local affine metre approximation at 57°N. The compressed API snapshot is about
19.5 MB; the browser display is about 3.9 MB and is fetched only when needed.
`invalidGeometryComponents` supplies the affected component indices and bounding
boxes so address lookup can limit its uncertainty to the relevant source component.
The official centerline also contains 231 degenerate zero-length components, and the
permanent land layer contains three invalid polygon components. These issues are
flagged separately without silently repairing the original coordinates. The
temporary land layer passed topology validation.

The two study-area features are duplicate geometries, both tagged `Forslag 3` by
the source. Both original IDs are retained. They must not silently be asserted to
define complete coverage of the other scenarios. No band match means no mapped
band result, not zero noise or proof of a value below 53 dB.

## Current project material

`src/data/project-information.json` records bilingual summaries with their source
URLs and page update dates. The document catalogue was checked against the
[official collection](https://www.vejdirektoratet.dk/vejprojekter/3-limfjordsforbindelse/dokumenter),
updated 15 September 2026. It includes six current Traffic 2035 PDFs:
with/without the project for Hobrovej–Nørholmsvej, the fjord crossing and Lindholm–E39.
Those PDFs are linked directly. They have **not** been converted into the historical
2040 polygons or into current address-specific predictions.

`publishedMonth` records the month directory in the official file URL, not a
verified calculation date. For example, the fjord with-project PDF was uploaded
under `2026-09`, but drawing 9095-29007 A is dated 23 February 2026 and revised
7 April 2026. It is a one-page drawing without PDF geographic registration fields
(`/VP` or `/LGIDict`); manually assigning geographic bounds would invent precision.

The current [noise page](https://www.vejdirektoratet.dk/vejprojekter/3-limfjordsforbindelse/stoej),
updated 9 June 2026, lists approximately 5.3 km of screens. It corrects the app's
Dall length from 900 to 1,000 metres. Drastrup's 1,400 metres covers both sides
combined: per-side `length_m` is now null, with one shared `group_id` and
`group_length_m`. Aggregate lengths once per group to avoid counting Drastrup twice.
Screen geometry remains schematic; published lengths cannot be inferred from it.

The [land page](https://www.vejdirektoratet.dk/vejprojekter/3-limfjordsforbindelse/arealbehov)
provides overall estimates only. Official land polygons are design snapshots, not
cadastral parcels or individual expropriation decisions. The [current work page](https://www.vejdirektoratet.dk/vejprojekter/3-limfjordsforbindelse/det-arbejder-vi-paa-lige-nu)
also documents the separate environmental review of the southern interchange;
neither the 2025 geometry nor historical noise model should be called the final
2026 design.

Other public spatial themes were discovered but not silently merged: the phase 3
point layer consists mainly of chainage labels and 36 rainwater-basin label anchors,
not verified footprints or structure positions. Older noise-screen layers use a
different design scenario. Environmental registrations likewise describe historical
investigations, not the present condition of every address.
