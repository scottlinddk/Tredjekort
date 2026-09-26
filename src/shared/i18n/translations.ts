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

  'map.tools': { da: 'Kortværktøjer', en: 'Map tools' },
  'map.label': { da: 'Interaktivt kort over den planlagte forbindelse', en: 'Interactive map of the planned crossing' },
  'map.panel.search': { da: 'Adresse', en: 'Address' },
  'map.panel.layers': { da: 'Kortlag', en: 'Layers' },
  'map.panel.info': { da: 'Om kortet', en: 'Map info' },
  'map.closePanel': { da: 'Vis kort', en: 'Show map' },
  'map.reset': { da: 'Vis hele ruten', en: 'Show full route' },
  'map.loading': { da: 'Indlæser kort …', en: 'Loading map…' },
  'map.loadingSlowly': { da: 'Kortet tager længere tid end forventet. Kontrollér forbindelsen, eller prøv igen.', en: 'The map is taking longer than expected. Check your connection or try again.' },
  'map.retry': { da: 'Prøv igen', en: 'Try again' },
  'map.approximation': { da: 'Vælg mellem officielle historiske støjkonturer og omtrentlige afstandszoner under Kortlag. Se altid scenarie og årstal: VVM 2021-kortet bruger trafik 2040, mens de nyere støjkort er PDF-filer for trafik 2035.', en: 'Choose official historical noise contours or approximate distance zones in Layers. Check the scenario and year: the VVM 2021 map uses 2040 traffic, while newer noise maps are PDFs for 2035 traffic.' },
  'map.officialDocuments': { da: 'Officielle kort og støjdokumenter', en: 'Official maps and noise documents' },

  'legend.title': { da: 'Signaturforklaring', en: 'Legend' },
  'legend.noiseScreen': { da: 'Planlagt støjskærm', en: 'Planned noise screen' },
  'legend.officialDesign': { da: 'Officielt projektkort (2025) · med projekt', en: 'Official project map (2025) · with project' },
  'legend.permanentLand': { da: 'Permanent arealbehov', en: 'Permanent land requirements' },
  'legend.temporaryLand': { da: 'Midlertidigt arealbehov', en: 'Temporary land requirements' },
  'legend.plannedNote': {
    da: 'Projektkortet fra 2025 viser planlagte vejlinjer, inklusive ramper og lokalveje, samt permanente og midlertidige arealbehov.',
    en: 'The 2025 project map shows planned road lines, including ramps and local roads, plus permanent and temporary land requirements.',
  },
  'legend.noiseBands': { da: 'Afstand fra vejlinjen', en: 'Distance from the alignment' },
  'legend.noiseBandsNote': {
    da: 'Zonerne viser kun afstand til appens ældre optegnede vejlinje. De viser ikke dB, støjgrænser eller sandsynligheden for at høre motorvejen. Se de officielle støjkort under Om projektet.',
    en: 'Zones show only distance to the app’s older traced road alignment. They do not show decibels, noise limits or the likelihood of hearing the motorway. Find official noise maps in Project overview.',
  },

  'layers.noise': { da: 'Afstandszoner og støjskærme', en: 'Distance zones and noise barriers' },
  'layers.overlay': { da: 'Farvelag på kortet', en: 'Map overlay' },
  'layers.none': { da: 'Intet farvelag', en: 'No overlay' },
  'layers.distance': { da: 'Afstandszoner · ikke støj', en: 'Distance zones · not noise' },
  'officialNoise.title': { da: 'Officiel støj · VVM 2021 / trafik 2040', en: 'Official noise · VVM 2021 / 2040 traffic' },
  'officialNoise.scenario.original': { da: 'Med projekt · oprindeligt E45-kryds', en: 'With project · original E45 interchange' },
  'officialNoise.scenario.reference': { da: 'Uden projekt · reference', en: 'Without project · reference' },
  'officialNoise.scenario.variant': { da: 'Med projekt · alternativt E45-kryds', en: 'With project · alternative E45 interchange' },
  'officialNoise.short.original': { da: 'Med projekt · oprindeligt', en: 'With project · original' },
  'officialNoise.short.reference': { da: 'Uden projekt', en: 'Without project' },
  'officialNoise.short.variant': { da: 'Med projekt · variant', en: 'With project · variant' },
  'officialNoise.legend': { da: 'Modelleret Lden · dB(A) · 2040', en: 'Modelled Lden · dB(A) · 2040' },
  'officialNoise.caveat': { da: 'Historisk VVM-model fra 2021 med trafik i 2040, ikke de nyeste projektændringer eller 2035-beregninger. Omfatter motorvejen og udvalgte omkringliggende veje. Områder uden farve er ikke nødvendigvis støjfri. Displaygeometrien er let forenklet; se nyere PDF-kort under Om projektet.', en: 'Historical 2021 environmental-assessment model using 2040 traffic, not the latest project changes or 2035 calculations. Includes the motorway and selected surrounding roads. Uncoloured areas are not necessarily free from noise. Display geometry is slightly simplified; find newer PDF maps in Project overview.' },
  'officialNoise.loading': { da: 'Henter officielle støjkonturer …', en: 'Loading official noise contours…' },
  'officialNoise.error': { da: 'Støjlaget kunne ikke hentes. Prøv igen', en: 'Could not load noise contours. Try again' },
  'layers.colorScheme': { da: 'Farveskema', en: 'Color scheme' },
  'layers.colorScheme.warm': { da: 'Varmt (gul-rød)', en: 'Warm (yellow-red)' },
  'layers.colorScheme.cool': { da: 'Køligt (blå-lilla)', en: 'Cool (blue-purple)' },
  'layers.colorScheme.red': { da: 'Rødt (lys-mørk)', en: 'Red (light-dark)' },
  'layers.opacity': { da: 'Farvestyrke', en: 'Overlay opacity' },

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
  'search.intro': { da: 'Find en adresse, og se forventet vejstøj i dB med den nye motorvej samt afstanden til vejen.', en: 'Find an address to see expected road noise in dB with the new motorway and the distance to the road.' },
  'search.results': { da: '{count} adresser. Brug piletasterne til at vælge.', en: '{count} addresses. Use the arrow keys to choose.' },
  'search.chooseExact': { da: 'Vælg en præcis adresse fra søgeresultaterne for at placere den på kortet.', en: 'Choose an exact address from the search results to place it on the map.' },
  'search.mapDataLoading': { da: 'Henter vejdata …', en: 'Loading road data…' },
  'search.mapDataError': { da: 'Vejdata kunne ikke indlæses. Prøv at genindlæse siden.', en: 'Road data could not be loaded. Try reloading the page.' },
  'search.json': { da: 'Hent adresserapport som JSON', en: 'Get address report as JSON' },
  'report.title': { da: 'Officielle historiske støjintervaller', en: 'Official historical noise bands' },
  'report.officialData': { da: 'Officielle oplysninger ved adressen', en: 'Official data at the address' },
  'report.expectedNoise': { da: 'Forventet vejstøj med den nye motorvej', en: 'Expected road noise with the new motorway' },
  'report.expectedNoiseModel': { da: 'Historisk VVM {modelYear} · oprindeligt forslag · trafik {forecastYear}', en: 'Historical {modelYear} assessment · original proposal · {forecastYear} traffic' },
  'report.expectedNoiseScope': { da: 'Omfatter motorvejen og udvalgte omkringliggende veje.', en: 'Includes the motorway and selected surrounding roads.' },
  'report.expectedNoiseHistorical': { da: 'Historisk beregning; de nyeste projektændringer indgår ikke.', en: 'Historical calculation; excludes the latest project changes.' },
  'report.expectedNoiseMetric': { da: 'Lden · vægtet gennemsnit over døgnet', en: 'Lden · weighted day-evening-night average' },
  'report.expectedNoiseBand': { da: 'Officielt støjinterval ved adressepunktet', en: 'Official noise band at the address point' },
  'report.expectedNoiseTopBand': { da: 'Kildens øverste støjkategori; øvre grænse er ikke oplyst', en: 'Highest published noise category; upper bound unspecified' },
  'report.expectedNoisePoint': { da: 'Officiel beregning for en registreret bolig', en: 'Official calculation for a registered dwelling' },
  'report.expectedNoiseRange': { da: 'Spænd for {count} registrerede boliger på adressen', en: 'Range across {count} registered dwellings at this address' },
  'report.expectedNoiseUnavailable': { da: 'Intet entydigt dB-estimat', en: 'No unambiguous dB estimate' },
  'report.expectedNoiseMissing': { da: 'Der er ikke et entydigt officielt støjresultat ved adressen. Det betyder ikke, at der er støjfrit.', en: 'There is no unambiguous official noise result at this address. This does not mean the address is free from noise.' },
  'report.expectedNoiseDetails': { da: 'Beregningsgrundlag og andre scenarier', en: 'Calculation details and other scenarios' },
  'report.expectedNoiseCurrent': { da: 'Se nyere støjkort for 2035', en: 'View newer noise maps for 2035' },
  'report.designDistance': { da: 'Ca. {distance} til nærmeste officielle vejlinje (2025)', en: 'Approx. {distance} to the nearest official design line (2025)' },
  'report.designDistanceNote': { da: 'Omfatter også ramper og lokalveje. Afstanden er målt fra adressepunktet og siger ikke i sig selv noget om støj.', en: 'Includes ramps and local roads. Distance is measured from the address point and does not determine noise exposure.' },
  'report.loading': { da: 'Henter officielle adresseoplysninger …', en: 'Loading official address information…' },
  'report.error': { da: 'Adresserapporten kunne ikke hentes.', en: 'Could not load the address report.' },
  'report.model': { da: 'VVM {modelYear} · trafik {forecastYear}', en: 'Environmental assessment {modelYear} · {forecastYear} traffic' },
  'report.status.band_found': { da: 'Støjinterval fundet', en: 'Noise band found' },
  'report.status.no_matching_contour': { da: 'Intet kortlagt interval', en: 'No mapped band' },
  'report.status.boundary': { da: 'På konturgrænse', en: 'On a contour boundary' },
  'report.status.overlapping_bands': { da: 'Overlappende intervaller', en: 'Overlapping bands' },
  'report.status.source_geometry_invalid': { da: 'Usikker kildegeometri', en: 'Unreliable source geometry' },
  'report.noModel': { da: 'Der er ingen historisk støjmodel tilgængelig for opslaget.', en: 'No historical noise model is available for this lookup.' },
  'report.caveat': { da: 'Historiske Lden-modelresultater for motorvejen og udvalgte omkringliggende veje, ikke målinger eller præcise dB-værdier. Intet interval betyder ikke støjfri. De nyere 2035-kort kan ses som PDF; deres adresseværdier er ukendte her.', en: 'Historical Lden model results for the motorway and selected surrounding roads, not measurements or exact decibel values. No mapped band does not mean no noise. Newer 2035 maps are available as PDFs; their address-specific values are unknown here.' },
  'report.land': { da: 'Arealbehov ved adressen · 2025', en: 'Land requirements at the address · 2025' },
  'report.land.within_mapped_area': { da: 'Adressepunktet ligger inden for et kortlagt arealbehov.', en: 'The address point lies inside a mapped land-requirement area.' },
  'report.land.boundary': { da: 'Adressepunktet ligger på grænsen af et kortlagt arealbehov.', en: 'The address point lies on the boundary of a mapped land-requirement area.' },
  'report.land.outside_mapped_areas': { da: 'Adressepunktet ligger uden for de kortlagte arealbehov.', en: 'The address point lies outside the mapped land-requirement areas.' },
  'report.land.source_geometry_invalid': { da: 'Kildegeometrien ved adressepunktet er usikker. Opslaget kan ikke afgøre, om punktet ligger i et arealbehov.', en: 'Source geometry near the address point is unreliable. This lookup cannot determine whether the point lies inside a land-requirement area.' },
  'report.land.caveat': { da: 'Opslaget gælder kun adressepunktet, ikke hele ejendommen. Det afgør ikke, om en ejendom berøres eller skal eksproprieres.', en: 'This lookup concerns the address point, not the entire property. It does not establish whether a property is affected or will be expropriated.' },

  'noise.distance': {
    da: 'Afstand til ældre, omtrentlig motorvejslinje: ca. {distance}',
    en: 'Distance to the older approximate motorway trace: approx. {distance}',
  },
  'noise.approximateDetails': { da: 'Sammenlign med den ældre optegnede rute', en: 'Compare with the older route trace' },
  'noise.verdict.high': {
    da: 'Adressen ligger tæt på den omtrentlige linjeføring. Afstanden alene kan ikke afgøre støjniveauet eller om motorvejen vil kunne høres.',
    en: 'The address is close to the approximate alignment. Distance alone cannot determine the noise level or whether the motorway will be audible.',
  },
  'noise.verdict.moderate': {
    da: 'Adressen ligger i nærheden af den omtrentlige linjeføring. Afstanden alene kan ikke afgøre støjniveauet eller om motorvejen vil kunne høres.',
    en: 'The address is near the approximate alignment. Distance alone cannot determine the noise level or whether the motorway will be audible.',
  },
  'noise.verdict.low': {
    da: 'Adressen ligger længere fra den omtrentlige linjeføring. Afstanden alene kan ikke afgøre støjniveauet eller om motorvejen vil kunne høres.',
    en: 'The address is farther from the approximate alignment. Distance alone cannot determine the noise level or whether the motorway will be audible.',
  },
  'noise.verdict.minimal': {
    da: 'Adressen ligger uden for kortets nærmeste afstandszoner. Det betyder ikke, at adressen er støjfri. Afstand alene kan ikke afgøre støjniveauet.',
    en: 'The address is outside the map’s nearest distance zones. This does not mean it is free from noise. Distance alone cannot determine the noise level.',
  },
  'noise.disclaimer': {
    da: 'Afstanden er beregnet til en omtrentlig vejlinje uden terræn, trafik, vejr, støjskærme eller tunnel. Den er uafhængig af de historiske officielle støjkonturer. Se de nyeste støjkort for projektets aktuelle beregningsgrundlag.',
    en: 'Distance is measured to an approximate road line without accounting for terrain, traffic, weather, barriers or the tunnel. It is independent of the historical official noise contours. Consult the newest noise maps for the project’s current calculation assumptions.',
  },

  'disclaimer.heading': { da: 'Om dette kort', en: 'About this map' },
  'disclaimer.geometry': {
    da: 'Det officielle projektkort viser Vejdirektoratets projektlinjer fra 2025 med den nye forbindelse, inklusive ramper og lokalveje, samt permanente og midlertidige arealbehov. Det er en dateret projektversion; nyere ændringer kan mangle. Arealerne er ikke matrikelgrænser eller afgørelser om ekspropriation.',
    en: 'The official project map shows Vejdirektoratet’s 2025 design with the new crossing, including ramps and local roads, plus permanent and temporary land requirements. It is a dated design snapshot; newer changes may be absent. The areas are not property boundaries or expropriation decisions.',
  },
  'disclaimer.noise': {
    da: 'Kortet adskiller afstandsringe fra officielle støjkonturer. Afstandsringene er ikke en akustisk model. De officielle konturer er fra VVM 2021 med trafik 2040 og må ikke forveksles med de nyere 2035-støjkort under Om projektet. Støjskærmenes offentliggjorte længder og højder er opdateret fra projektsiden i juni 2026 (ca. 5,3 km samlet); deres placering på kortet er stadig omtrentlig.',
    en: 'The map separates distance rings from official noise contours. Distance rings are not an acoustic model. Official contours come from the 2021 environmental assessment with 2040 traffic and must not be confused with the newer 2035 noise maps in Project overview. Published noise-barrier lengths and heights were updated from the June 2026 project page (about 5.3 km total); their positions on the map remain approximate.',
  },

  'about.title': { da: 'Om 3. Limfjordsforbindelse', en: 'About the 3. Limfjordsforbindelse' },

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

  'nav.sources': { da: 'Datakilder', en: 'Data sources' },
  'sources.title': { da: 'Datakilder', en: 'Data sources' },
  'sources.intro': {
    da: 'Alt data på dette site er hentet eller afledt fra de kilder, der er angivet nedenfor. Hvor geometri er tilnærmet eller afledt (fx GPS-spor eller afstandsringe), er det angivet.',
    en: 'Every dataset on this site is drawn or derived from the sources listed below. Where geometry is approximated or derived (e.g. GPS traces or distance rings), that is noted.',
  },
  'sources.dataset.roadAlignment': { da: 'Ældre optegnet motorvejslinje', en: 'Older traced motorway alignment' },
  'sources.dataset.officialNoise': { da: 'Officielle støjpolygoner · VVM 2021 / trafik 2040', en: 'Official noise polygons · EIA 2021 / traffic 2040' },
  'sources.dataset.officialNoisePoints': { da: 'Officielle støjberegninger ved boliger · VVM 2021 / trafik 2040', en: 'Official dwelling noise calculations · EIA 2021 / traffic 2040' },
  'sources.dataset.officialDesign': { da: 'Officielle projektlinjer · 2025', en: 'Official design centerlines · 2025' },
  'sources.dataset.officialLand': { da: 'Officielle arealbehov · 2025', en: 'Official land requirements · 2025' },
  'sources.dataset.localRoads': { da: 'Ældre optegnede lokalveje', en: 'Older traced local roads' },
  'sources.dataset.noiseBands': { da: 'Afstandszoner (ikke støjberegninger)', en: 'Distance zones (not noise calculations)' },
  'sources.dataset.noiseScreens': { da: 'Planlagte støjskærme', en: 'Planned noise screens' },
  'sources.dataset.junctions': { da: 'Tilslutningsanlæg', en: 'Junctions / interchanges' },
  'sources.dataset.addressSearch': { da: 'Adressesøgning', en: 'Address search' },
  'sources.dataset.basemap': { da: 'Kortgrundlag', en: 'Basemap' },
  'sources.dataset.changesFeed': { da: 'Ændringsovervågning', en: 'Change monitoring feed' },
  'sources.dataset.projectInformation': { da: 'Projektoplysninger og officielle dokumenter', en: 'Project information and official documents' },
  'sources.viewSource': { da: 'Se kilde', en: 'View source' },
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
