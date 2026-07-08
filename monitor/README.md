# Tredjekort Monitor

Overvågningsværktøj til Vejdirektoratets sider om **3. Limfjordsforbindelse** —
nyheder, planlægning/anlæg og især alt støj-relateret. Hver kørsel gemmer et
tidsstemplet snapshot pr. side, sammenligner med forrige snapshot og skriver en
kort Markdown-rapport over hvad der er ændret. Støj-relaterede ændringer
fremhæves altid i deres egen sektion.

## Hvordan det henter indhold

Siderne er client-side renderede, så et almindeligt HTTP GET returnerer ikke
artikelteksten. Værktøjet bruger **Playwright (headless Chromium)** til at
rendere hver side og udtrække overskrifter, afsnit, links og PDF-links fra
DOM'en. (Sitets Drupal JSON:API blev tidligere brugt som en billigere
struktureret kilde, men er ikke længere tilgængeligt — `/api/drupal/jsonapi`
svarer nu 403 — så browser-rendering er den eneste hentemetode.)

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

npm run discover   # 1) verificér robots.txt og sidestruktur live
npm run monitor    # 2) første kørsel = baseline-snapshots
npm run monitor    # 3) anden kørsel bør rapportere "ingen ændringer"
```

**Kør `discover` først.** URL-slugs i `src/config.ts` er kortlagt via websøgning
(juli 2026) og skal bekræftes mod det live site — discover-kommandoen udskriver
robots.txt-reglerne ordret, tjekker hver konfigureret side mod dem og lister de
faktiske menu-links på projektsiden, med en advarsel for hver konfigureret URL
der ikke længere findes i menuen.

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

## Automatisk kørsel

**GitHub Actions** (sat op): `.github/workflows/monitor.yml` kører værktøjet
dagligt kl. 05:00 UTC (~07:00 dansk tid), eller manuelt via "Run workflow" i
Actions-fanen. Da schedulerede workflows kun trigges fra default branch,
aktiveres den først når filen er merget til `main`.

Snapshots og rapporter kan ikke ligge på runneren mellem kørsler (den er
engangsbrug), så workflowen bruger `monitor/ci-config.json`
(`{ "dataDir": "../monitor-data" }`) til at gemme data på en dedikeret
`monitor-data`-branch i stedet — den bootstrappes automatisk som en orphan
branch ved første kørsel og committes/pushes efter hver kørsel. Historikken
kan browses direkte på GitHub under den branch.

Når en kørsel finder ændringer, åbnes et GitHub issue med rapporten som
indhold (titlen præfikses med 🔊 hvis ændringen er støj-relateret) — det er
notifikationen, da GitHub sender dig en mail for nye issues i dit eget repo.
Ingen ændringer ⇒ intet issue. Rapporten lægges desuden altid i kørslens
"step summary" i Actions-fanen.

Bemærk: robots.txt-fejl afbryder kørslen med det samme (tool'et fejler
"closed") — det viser sig som en rød/fejlet workflow-kørsel, med det samme
som lokalt.

Vil du hellere køre det selv lokalt med **cron** (macOS/Linux), fx hver
morgen kl. 8:

```cron
0 8 * * * cd /sti/til/Tredjekort/monitor && npm run monitor >> data/cron.log 2>&1
```

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
- Diffen er afsnitsbaseret med simpel lighedsparring — omfattende redesign af
  en side vil støje i rapporten én gang, hvorefter den nye baseline gælder.
