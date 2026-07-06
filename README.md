# 3. Limfjordsforbindelse — interaktivt kort

Interactive map of the planned 3. Limfjordsforbindelse motorway (Egholmlinjen) west of
Aalborg. React + TypeScript + Vite + MapLibre GL.

## Features

- **Dotted planned alignments** — the motorway (surveyed / provisional / schematic
  confidence tiers) and the planned local roads from Vejdirektoratet's
  *Præsentation af Nørholmsvej og Mølholmsvejs forlængelse* (detailbesigtigelse,
  April 2026) all render as dotted lines, since none of them exist yet.
- **Danish-first UI** — Danish is the default language with an English toggle in the
  header (persisted in `localStorage`, see `src/shared/i18n/`).
- **Address search with road-noise verdict** — look up any Danish address
  (autocomplete via DAWA), the map marks it and reports whether residents are likely
  to hear road noise, based on straight-line distance to the planned alignment.
  This is a distance-based estimate, not an acoustic model.

## Address API

`GET /api/addresses?q=<query>` — a Vercel serverless function
([api/addresses.js](api/addresses.js)) proxying
[DAWA / Dataforsyningen](https://dawadocs.dataforsyningen.dk/dok/api/adgangsadresse#autocomplete)
address autocomplete. In development the Vite dev server proxies the same path
directly to DAWA (see `vite.config.ts`), and the frontend also falls back to calling
DAWA directly if the endpoint is unavailable.

## Development

```sh
npm install
npm run dev     # dev server with /api/addresses proxy
npm run build   # type-check + production build
npm run lint    # oxlint
```

## Data caveats

Road geometry is approximated from Vejdirektoratet's public planning documents; it is
not official survey data. The local-road lines (relocated Nørholmsvej over the
motorway at interchange TSA 12 – Mølholm, and the Mølholmsvej/Nørholmsvej extension
north-east to the Løvstikkevej area) follow the maps in the detailed-inspection
presentation of 15 April 2026, but the source is a raster PDF without a coordinate
grid, so absolute placement is anchored to known reference points (Egholm, the
motorway station ladder) and may be off by a few hundred metres. The noise bands and
the address verdict are simplified distance-based approximations, not the official
Lden noise study (drawing 9095-29011). See the in-app disclaimer for details.
