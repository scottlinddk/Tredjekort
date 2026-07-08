# Tredjekort Monitor

Overvågningsværktøj til Vejdirektoratets sider om **3. Limfjordsforbindelse** —
nyheder, planlægning/anlæg og især alt støj-relateret. Hver kørsel gemmer et
tidsstemplet snapshot pr. side, sammenligner med forrige snapshot og skriver en
kort Markdown-rapport over hvad der er ændret. Støj-relaterede ændringer
fremhæves altid i deres egen sektion.

## Hvordan det henter indhold

Siderne er client-side renderede, så et almindeligt HTTP GET returnerer ikke
artikelteksten. Værktøjet prøver i denne rækkefølge:

1. **Drupal JSON:API** (`/api/drupal/jsonapi` + router `translate-path`) —
   struktureret kilde, billigst for begge parter. Tilgængeligheden probes ved
   hver kørsel; virker den ikke, falder værktøjet tilbage til:
2. **Playwright (headless Chromium)** — renderer siden og udtrækker
   overskrifter, afsnit, links og PDF-links fra DOM'en.

Værktøjet henter og respekterer `robots.txt` før hver kørsel (fejler den at
hente, afbrydes kørslen — "fail closed"), venter ~4 s (± jitter) mellem sider,
respekterer et evt. `Crawl-delay`, og sender en beskrivende User-Agent:
`TredjekortMonitor/1.0 (personal project-page monitor; +…)`. Sæt evt.
miljøvariablen `MONITOR_CONTACT` til din e-mail for at få den med i UA-strengen.

Har du allerede en Chromium/Chrome installeret, kan du springe browser-download
over og pege på den med `MONITOR_CHROMIUM_PATH=/sti/til/chrome`.

## Kom i gang

```sh
cd monitor
npm install
npx playwright install chromium   # kun første gang

npm run discover   # 1) verificér robots.txt, sidestruktur og JSON:API live
npm run monitor    # 2) første kørsel = baseline-snapshots
npm run monitor    # 3) anden kørsel bør rapportere "ingen ændringer"
```

**Kør `discover` først.** URL-slugs i `src/config.ts` er kortlagt via websøgning
(juli 2026) og skal bekræftes mod det live site — discover-kommandoen udskriver
robots.txt-reglerne ordret, tjekker hver konfigureret side mod dem, prober
JSON:API'et og lister de faktiske menu-links på projektsiden, med en advarsel
for hver konfigureret URL der ikke længere findes i menuen.

## Overvågede sider

Defineret i `src/config.ts`. Støj, Tidsplan og "Det arbejder vi på lige nu" er
førsteklasses sider (prioritet `high`, markeret ⭐ i rapporter). Derudover
følges forsiden, Dokumenter, VVM-siden, de to ekstra støjsider (planlagte
støjskærme, støj under anlægsarbejde) og høringsarkivet. En sammensat
"Om projektet"-beskrivelse bygges af alle sider markeret `aboutSource` med
kildeangivelse pr. afsnit og diffes som en almindelig side.

## Output

Alt ligger i `monitor/data/` (gitignoreret):

- `data/snapshots/<kørsels-id>/<side-id>.json` — fuldt struktureret snapshot
  (titel, sektioner, afsnit, PDF-links, sha256-hash af teksten). Der gemmes kun
  et nyt snapshot når indholdet faktisk er ændret, så mappehistorikken er en
  ændringshistorik.
- `data/reports/<kørsels-id>.md` — rapporten: opsummering, **støj-sektion
  (altid til stede, også når den er tom)**, ændringer pr. side (nye/ændrede/
  fjernede afsnit, dato-/tidsplansændringer markeret, nye/fjernede PDF'er) og
  sider der ikke kunne hentes.
- `data/state.json` — seneste hash pr. side, så "ingen ændringer"-kørsler er
  billige.
- `data/discovery.json` — resultatet af seneste `discover`.

## Automatisk kørsel (ikke sat op — gør det selv hvis ønsket)

**cron** (macOS/Linux), fx hver morgen kl. 8:

```cron
0 8 * * * cd /sti/til/Tredjekort/monitor && npm run monitor >> data/cron.log 2>&1
```

**GitHub Actions**: en workflow med `on: schedule` kan køre værktøjet og fx
committe rapporten eller åbne et issue ved ændringer. Kræver at Actions-runneren
må nå vejdirektoratet.dk. Ingen workflow er oprettet — sig til hvis du vil have
en.

En gang om dagen er rigeligt; siderne opdateres typisk uger imellem.

## Fixtures / offline-test

`fixtures/` indeholder en lille fake udgave af sitet i to versioner (v1 → v2
med ændret tidsplansdato, nyt støj-afsnit og nyt PDF-link) plus config-filer,
så hele pipelinen kan afprøves uden netværk:

```sh
npx tsx src/index.ts run --config fixtures/config-v1.json   # baseline
npx tsx src/index.ts run --config fixtures/config-v2.json   # ændringer rapporteres
npx tsx src/index.ts run --config fixtures/config-v2.json   # "ingen ændringer"
```

Fixture-kørsler skriver til `data-fixture/` (også gitignoreret) og rører ikke
rigtige data.

## Kendte forbehold

- URL-slugs er websøgnings-kortlagte; kør `discover` og ret `src/config.ts`
  hvis noget er flyttet. Støj-siderne ligger under et separat `/vvm/limfjorden/`-
  hierarki og kan være ældre VVM-sider snarere end aktive nyhedssider.
- JSON:API-stien er uverificeret gæt baseret på at sitet er decoupled Drupal;
  al JSON:API-kode er defensiv og falder tilbage til browseren.
- Diffen er afsnitsbaseret med simpel lighedsparring — omfattende redesign af
  en side vil støje i rapporten én gang, hvorefter den nye baseline gælder.
