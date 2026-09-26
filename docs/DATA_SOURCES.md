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

### Address and dwelling noise predictions

The same official WFS additionally exposes `stoej_punkt_9095`, a separate
**2,641-record facade/dwelling calculation dataset** covering **2,364 unique
road-code and house-number addresses**. This layer was discovered separately from
the `e9095`-named contour layers. Its capabilities describe calculations before
the project and with the original and variant Egholm designs; they also state
that the EIA data is generally not kept up to date.

`src/data/official-noise-points.geojson` retains every source coordinate and raw
property, alongside normalized road/house keys and scenario values.
`src/data/official-noise-points-metadata.json` records the complete-response count,
query URL, retrieval time, raw-response and output hashes, matching policy and
scenario verification. The source's integer `id` is the stable record identity;
its generated WFS `fid` changes between requests and is retained only as provenance.

The scenario fields were verified against **all four noise-bin counts** in each
of the 2021 report's three dwelling tables, not assigned from field names alone:

| Point field | Scenario | Counts in 58–63 / 63–68 / 68–73 / >73 dB bins | Total above 58 dB | Report table / printed page |
| --- | --- | --- | --- | --- |
| `lden_sce01` | Reference, without project | 346 / 218 / 38 / 8 | 610 | 5-7 / 81 |
| `lden_sce02` | Original project design | 538 / 83 / 28 / 2 | 651 | 5-9 / 88 |
| `lden_sce03` | Variant project design | 539 / 77 / 28 / 2 | 646 | 5-10 / 91 |

The importer refuses to import a changed count fingerprint without renewed source
verification. Run `python scripts/import-official-data.py --points-only` to refresh
this dataset alone, or `--cache-dir <directory> --offline --points-only` to rebuild
from a downloaded response. A normal full import includes the point dataset.

The values are **modelled facade Lden dB(A)**, using the 2021 EIA design and 2040
traffic, with planned noise mitigation included in the project scenarios.
They are not measurements and not the current 2035 design. Unlike the landscape
contours, these dwelling/floor results are not all at 1.5 metres above terrain.
They model the motorway and selected nearby/crossing roads, so a with-project
value cannot be described as the isolated contribution of the new motorway.
Subtracting scenario dB values describes a change in modelled noise; it does not
give a standalone motorway noise level.

The layer has no municipality, calculation-date or update-date field. Model year
is supported by the exact report-table match. `sourceUpdatedAt` is therefore null;
the contour layer's update timestamp must not be copied onto the point dataset.
Address matching is restricted to Aalborg municipality (`0851`), then requires
the exact road code and normalized house number, with an additional 50-metre
coordinate-consistency guard. The guard is not a nearest-address lookup.
A source sample at road `1043`, house `1`, matches DAWA's Carlo Wognsens Vej 1,
9000 Aalborg and its coordinates to approximately one centimetre.

All rows for each source road/house address share the same geographic point, but
several addresses contain multiple dwelling/floor/door records. The source floor
codes range from 1 to 4 and are preserved without assuming they equal DAWA floor
labels. Show the range across all matching dwelling records, not one arbitrarily
selected floor. A single matched record can supply its rounded model value, with
the model year and scope still visible. Existing-address or coordinate-only
lookups without verified address keys must not borrow a nearby home's prediction.

Raw zero values occur in 6 reference, 18 original and 20 variant records. Their
meaning is undocumented, so the normalized `valuesDb` maps them to null while
retaining `rawValuesDb` and the complete original properties. Never present these
zeros as silence or use them to calculate a scenario difference. If any matched
unit lacks a scenario value, a partial range must not be presented as complete;
use the labelled contour fallback or state that the address prediction is
unavailable. Model decimals do not establish measurement accuracy; UI rounding
must not imply greater precision than the source supports.

### Current documents

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
