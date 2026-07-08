export type Language = 'da' | 'en'

export const DEFAULT_LANGUAGE: Language = 'da'

// Flat key -> per-language string map. Interpolation uses {placeholder} tokens,
// replaced by I18nProvider's t() at render time.
const translations = {
  'app.title': {
    da: '3. Limfjordsforbindelse',
    en: '3. Limfjordsforbindelse',
  },
  'app.skipToContent': { da: 'Spring til indhold', en: 'Skip to content' },
  'theme.switchToDark': { da: 'Skift til mørkt tema', en: 'Switch to dark theme' },
  'theme.switchToLight': { da: 'Skift til lyst tema', en: 'Switch to light theme' },
  'nav.map': { da: 'Kort', en: 'Map' },
  'nav.about': { da: 'Om projektet', en: 'Project overview' },
  'nav.changes': { da: 'Ændringer', en: 'Changes' },

  'legend.title': { da: 'Signaturforklaring', en: 'Legend' },
  'legend.surveyed': { da: 'Opmålt (motorvej)', en: 'Surveyed (motorway)' },
  'legend.provisional': { da: 'Foreløbig (motorvej)', en: 'Provisional (motorway)' },
  'legend.schematic': { da: 'Skitse (motorvej)', en: 'Schematic (motorway)' },
  'legend.localRoad': { da: 'Planlagt lokalvej', en: 'Planned local road' },
  'legend.noiseScreen': { da: 'Planlagt støjskærm', en: 'Planned noise screen' },
  'legend.plannedNote': {
    da: 'Alle linjer er planlagte anlæg, vist punkteret.',
    en: 'All lines are planned works, drawn dotted.',
  },

  'layers.noise': { da: 'Omtrentlige støjbånd', en: 'Approximate noise bands' },

  'search.placeholder': {
    da: 'Søg dansk adresse …',
    en: 'Search Danish address…',
  },
  'search.label': { da: 'Adressesøgning', en: 'Address search' },
  'search.noResults': { da: 'Ingen adresser fundet', en: 'No addresses found' },
  'search.error': {
    da: 'Adresseopslag fejlede. Prøv igen.',
    en: 'Address lookup failed. Try again.',
  },
  'search.loading': { da: 'Søger …', en: 'Searching…' },
  'search.clear': { da: 'Ryd søgning', en: 'Clear search' },

  'noise.distance': {
    da: 'Afstand til den planlagte motorvej: ca. {distance}',
    en: 'Distance to the planned motorway: approx. {distance}',
  },
  'noise.verdict.high': {
    da: 'Beboere på denne adresse vil med stor sandsynlighed kunne høre tydelig vejstøj fra motorvejen.',
    en: 'Residents at this address will very likely hear clear road noise from the motorway.',
  },
  'noise.verdict.moderate': {
    da: 'Beboere på denne adresse vil sandsynligvis kunne høre vejstøj, især udendørs og i stille vejr.',
    en: 'Residents at this address will likely hear road noise, especially outdoors and in calm weather.',
  },
  'noise.verdict.low': {
    da: 'Beboere på denne adresse vil muligvis kunne høre svag vejstøj under visse vejr- og vindforhold.',
    en: 'Residents at this address may hear faint road noise under certain weather and wind conditions.',
  },
  'noise.verdict.minimal': {
    da: 'Beboere på denne adresse vil næppe kunne høre motorvejen.',
    en: 'Residents at this address are unlikely to hear the motorway.',
  },
  'noise.disclaimer': {
    da: 'Afstandsbaseret skøn, ikke en akustisk beregning. Terræn, støjskærme og tunnelstrækningen ved fjorden er ikke medregnet.',
    en: 'Distance-based estimate, not an acoustic calculation. Terrain, noise barriers and the tunnel section at the fjord are not taken into account.',
  },

  'disclaimer.heading': { da: 'Om dette kort', en: 'About this map' },
  'disclaimer.geometry': {
    da: 'Vejgeometrien er tilnærmet ud fra Vejdirektoratets offentlige plandokumenter. Det er ikke officielle opmålingsdata og bør kun bruges til generel orientering.',
    en: 'Road geometry is approximated from Vejdirektoratet’s public planning documents. It is not official survey data and should not be used for anything beyond general orientation.',
  },
  'disclaimer.noise': {
    da: 'Støjlaget er en forenklet afstandsbaseret tilnærmelse, ikke en rigtig akustisk model. Vejdirektoratet har offentliggjort et egentligt Lden-støjkort (dB-bånd, tegning 9095-29011) for en del af strækningen, men det er et rasterkort, som endnu ikke er pålideligt georefereret ind i denne app. Vejdirektoratets opdaterede støjberegninger fra november 2023 anslår 682 støjbelastede boliger med anlægget mod 671 i referencescenariet uden, og et støjbelastningstal på 87 mod 102. De planlagte støjskærme fra samme rapport (i alt ca. 5,2 km, ved Dall, Dall Villaby, Nibevej og Nørholmsvej) er vist som en omtrentlig, ikke-georefereret linje.',
    en: 'The noise overlay is a simplified distance-based approximation, not a real acoustic model. Vejdirektoratet has published an actual Lden noise study (dB bands, drawing 9095-29011) for part of this route, but it is a raster map that has not yet been reliably georeferenced into this app. Vejdirektoratet’s updated noise calculations from November 2023 estimate 682 noise-affected homes with the project versus 671 in the reference scenario without it, and a noise burden index of 87 versus 102. The planned noise screens from the same report (about 5.2 km total, at Dall, Dall Villaby, Nibevej and Nørholmsvej) are shown as an approximate, non-georeferenced line.',
  },
  'disclaimer.confidence.surveyed': {
    da: 'Optegnet efter Vejdirektoratets officielle deklarationsrids (E9095), georefereret til rigtige koordinater.',
    en: 'Traced from Vejdirektoratet’s official registration drawings (E9095), georeferenced to real coordinates.',
  },
  'disclaimer.confidence.provisional': {
    da: 'Optegnet efter officielle tegninger, men endnu ikke visuelt kontrolleret mod rampegeometrien. Betragt som omtrentlig.',
    en: 'Traced from official drawings but not yet visually cross-checked against ramp geometry, treat as approximate.',
  },
  'disclaimer.confidence.schematic': {
    da: 'Der findes ingen kildegeometri for denne strækning. Linjen er en omtrentlig pladsholder, ikke en præcis linjeføring.',
    en: 'No source geometry exists for this stretch. The line is an approximate placeholder, not a precise alignment.',
  },
  'disclaimer.localRoads': {
    da: 'De planlagte lokalveje (forlagt Nørholmsvej og Mølholmsvej/Nørholmsvejs forlængelse) er tegnet efter Vejdirektoratets præsentation til detailbesigtigelsen 15. april 2026. Formen følger præsentationens kort, men den absolutte placering er omtrentlig (forvent afvigelser på nogle hundrede meter).',
    en: 'The planned local roads (the relocated Nørholmsvej and the Mølholmsvej/Nørholmsvej extension) are drawn from Vejdirektoratet’s detailed-inspection presentation of 15 April 2026. The shape follows the presentation maps, but absolute placement is approximate (expect offsets of a few hundred metres).',
  },

  'about.title': { da: 'Om 3. Limfjordsforbindelse', en: 'About the 3. Limfjordsforbindelse' },
  'about.intro': {
    da: 'En planlagt 20 km lang firesporet motorvej vest om Aalborg via øen Egholm, der forbinder en sydlig forlængelse af E39 med E45 ved et nyt tilslutningsanlæg syd for Dall. Ruten går fra Aalborg til Egholm gennem en tunnel og fra Egholm til Lindholm via en lavbro.',
    en: 'A planned 20 km, four-lane motorway running west of Aalborg via the island Egholm, connecting a southern extension of the E39 to the E45 at a new interchange south of Dall. The route runs from Aalborg to Egholm through a tunnel, and from Egholm to Lindholm via a low bridge.',
  },
  'about.facts.length': { da: 'Længde', en: 'Length' },
  'about.facts.lengthValue': { da: 'Ca. 20 km', en: 'Approximately 20 km' },
  'about.facts.tunnel': { da: 'Tunnel', en: 'Tunnel' },
  'about.facts.tunnelValue': {
    da: 'Ca. 1,1 km med 450 m rampestrækninger på hver side',
    en: 'Approximately 1.1 km, with 450 m ramp sections on each side',
  },
  'about.facts.decided': { da: 'Besluttet', en: 'Decided' },
  'about.facts.decidedValue': {
    da: '28. juni 2021 (Infrastrukturplan 2035)',
    en: '28 June 2021 (Infrastrukturplan 2035)',
  },
  'about.facts.law': { da: 'Anlægslov', en: 'Construction act' },
  'about.facts.lawValue': { da: '1. juli 2024', en: '1 July 2024' },
  'about.facts.budget': { da: 'Budget', en: 'Budget' },
  'about.facts.budgetValue': {
    da: '8,9 mia. kr. (2024-priser)',
    en: '8.9 billion DKK (2024 prices)',
  },
  'about.facts.expropriation': { da: 'Ekspropriation', en: 'Expropriation' },
  'about.facts.expropriationValue': {
    da: '4. kvartal 2026 – 2. kvartal 2028',
    en: 'Q4 2026 – Q2 2028',
  },
  'about.facts.construction': { da: 'Anlæg af motorvej', en: 'Motorway construction' },
  'about.facts.constructionValue': { da: 'Fra primo 2028', en: 'From early 2028' },
  'about.facts.completion': { da: 'Forventet åbning', en: 'Expected completion' },
  'about.facts.completionValue': { da: '4. kvartal 2034', en: 'Q4 2034' },
  'about.note': {
    da: 'Projektet udvikler sig stadig. Ekspropriationsforretninger og designændringer (fx det sydlige tilslutningsanlæg ved Dall) er i gang medio 2026. Tallene her afspejler de senest offentliggjorte oplysninger og kan være forældede.',
    en: 'This project is still evolving, expropriation reviews and design changes (such as the southern interchange near Dall) are ongoing as of mid-2026. Figures here reflect the most recent public information at the time this was built and may be superseded.',
  },

  'changes.title': { da: 'Ændringer på projektsiderne', en: 'Changes to the project pages' },
  'changes.intro': {
    da: 'Automatisk overvågning af Vejdirektoratets sider om 3. Limfjordsforbindelse. Listen viser de seneste kørsler, hvor der blev fundet ændringer — nyeste øverst. Støj- og tidsplansændringer er fremhævet.',
    en: 'Automated monitoring of Vejdirektoratet’s pages about the 3. Limfjordsforbindelse. The list shows the most recent runs where changes were found — newest first. Noise and timeline changes are highlighted.',
  },
  'changes.loading': { da: 'Henter ændringer …', en: 'Loading changes…' },
  'changes.error': {
    da: 'Kunne ikke hente ændringer. Prøv igen senere.',
    en: 'Could not load changes. Please try again later.',
  },
  'changes.empty': {
    da: 'Ingen ændringer registreret endnu. Siderne overvåges dagligt.',
    en: 'No changes recorded yet. The pages are monitored daily.',
  },
  'changes.runHeading': { da: 'Registreret {date}', en: 'Detected {date}' },
  'changes.highPriority': { da: 'Høj prioritet', en: 'High priority' },
  'changes.noiseTag': { da: 'Støj', en: 'Noise' },
  'changes.timelineTag': { da: 'Tidsplan', en: 'Timeline' },
  'changes.baseline': {
    da: 'Første registrering af denne side ({paragraphs} afsnit, {pdfs} dokumentlink). Fremtidige kørsler viser kun ændringer.',
    en: 'First capture of this page ({paragraphs} paragraphs, {pdfs} document links). Future runs show only changes.',
  },
  'changes.added': { da: 'Nyt', en: 'Added' },
  'changes.removed': { da: 'Fjernet', en: 'Removed' },
  'changes.changed': { da: 'Ændret', en: 'Changed' },
  'changes.timelineChanged': { da: 'Tidsplan ændret', en: 'Timeline changed' },
  'changes.newPdf': { da: 'Nyt dokument', en: 'New document' },
  'changes.removedPdf': { da: 'Dokument fjernet', en: 'Document removed' },
  'changes.note': {
    da: 'Indholdet er skrabet automatisk fra vejdirektoratet.dk og kan indeholde tekniske uddrag. Kildeteksten er på dansk. Klik på en sidetitel for at åbne den originale side.',
    en: 'Content is scraped automatically from vejdirektoratet.dk and may contain technical excerpts. The source text is in Danish. Click a page title to open the original page.',
  },

  'junction.back': { da: 'Tilbage til kortet', en: 'Back to map' },
  'junction.status': { da: 'Status', en: 'Status' },
  'junction.sources': { da: 'Kilder', en: 'Sources' },
  'junction.notFound': {
    da: 'Ingen tilslutning fundet med id "{id}".',
    en: 'No junction found with id "{id}".',
  },
  'junction.loading': { da: 'Indlæser …', en: 'Loading…' },

  'status.planned': { da: 'planlagt', en: 'planned' },
  'status.design under revision': { da: 'design under revision', en: 'design under revision' },
  'status.planned realignment': { da: 'planlagt omlægning', en: 'planned realignment' },
  'status.expropriation review ongoing': {
    da: 'ekspropriationsforretning i gang',
    en: 'expropriation review ongoing',
  },
  'status.conditional on municipal decision': {
    da: 'afhænger af kommunal beslutning',
    en: 'conditional on municipal decision',
  },

  'error.title': { da: 'Noget gik galt', en: 'Something went wrong' },
  'error.pageLoad': { da: 'Siden kunne ikke indlæses.', en: 'This page could not be loaded.' },
  'error.unexpected': { da: 'Der opstod en uventet fejl.', en: 'An unexpected error occurred.' },
  'error.backToMap': { da: 'Tilbage til kortet', en: 'Back to map' },
} as const

export type TranslationKey = keyof typeof translations

export function getTranslation(
  key: TranslationKey,
  language: Language,
  vars?: Record<string, string | number>,
): string {
  let text: string = translations[key][language]
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}
