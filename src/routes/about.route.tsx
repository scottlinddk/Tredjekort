import { Link } from 'react-router'
import { useI18n } from '../shared/i18n/I18nContext'
import { projectInformation as information } from '../features/project/projectInformation'
import '../shared/styles/project.css'

export function AboutRoute() {
  const { language, t } = useI18n()
  const da = language === 'da'
  const sourceLabel = da ? 'Kilde: Vejdirektoratet' : 'Source: Danish Road Directorate'
  const noiseDocuments = information.documents.filter((document) => document.category === 'noise')
  const otherDocuments = information.documents.filter((document) => document.category !== 'noise')

  return (
    <article className="about-route project-overview">
      <p className="project-eyebrow">{information.project.phase[language]} · {da ? 'Gennemgået' : 'Reviewed'} {information.reviewedAt}</p>
      <h1>{t('about.title')}</h1>
      <p className="project-lead">{da
        ? 'Se projektets aktuelle oplysninger og sammenlign de officielle støjkort for 2035 med og uden den nye forbindelse.'
        : 'Explore the current project information and compare official 2035 noise maps with and without the new connection.'}</p>
      <div className="project-stats">
        <div><strong>{information.project.lengthKm} km</strong><span>{da ? 'Motorvej' : 'Motorway'}</span></div>
        <div><strong>{information.project.lanes}</strong><span>{da ? 'Spor' : 'Lanes'}</span></div>
        <div><strong>{information.project.expectedOpeningYear}</strong><span>{da ? 'Forventet åbning' : 'Expected opening'}</span></div>
      </div>
      <nav className="project-shortcuts" aria-label={da ? 'På denne side' : 'On this page'}>
        <a href="#noise-maps">{da ? 'Officielle støjkort' : 'Official noise maps'}</a>
        <a href="#timeline">{da ? 'Tidsplan' : 'Schedule'}</a>
        <a href="#documents">{da ? 'Dokumenter' : 'Documents'}</a>
        <Link to="/">{da ? 'Tilbage til kortet' : 'Back to map'}</Link>
      </nav>
      <section className="project-limitations">
        <h2>{da ? 'Officielle data på det interaktive kort' : 'Official data on the interactive map'}</h2>
        <p>{da
          ? 'Ved adresseopslag vises forventet vejstøj i dB(A) med den nye motorvej. Resultatet kommer fra officielle boligberegninger eller kortets støjinterval, hvis der ikke er en matchende boligberegning. Flere registrerede boliger vises som et spænd. Grundlaget er VVM 2021 med trafik i 2040 og omfatter også udvalgte omkringliggende veje.'
          : 'Address lookup shows expected road noise in dB(A) with the new motorway. Results use official dwelling calculations, or the mapped noise band when no dwelling calculation matches. Multiple registered dwellings are shown as a range. The source is the 2021 assessment with 2040 traffic and also includes selected surrounding roads.'}</p>
        <p>{da
          ? 'Du kan nu se støjpolygonerne fra VVM 2021 med trafikprognose 2040: oprindeligt forslag, reference uden projekt og variant. De er en ældre beregningsmodel og er adskilt fra de nyere 2035-kort nedenfor.'
          : 'Explore noise polygons from the 2021 assessment with a 2040 traffic forecast: original design, reference without the project, and variant. This is an older model, kept separate from the newer 2035 maps below.'}</p>
        <p>{da
          ? 'Kortet indeholder også officielle centerlinjer og permanente/midlertidige arealbehov fra fase 3 i 2025. Centerlinjerne omfatter ramper og lokale veje. Arealbehov er planoplysninger og fastslår ikke en ejendoms ekspropriationsstatus.'
          : 'The map also includes official centerlines and permanent/temporary land requirements from phase 3 in 2025. Centerlines include ramps and local roads. Land requirements are planning information, not a determination of a property’s expropriation status.'}</p>
        <Link to="/?noiseScenario=original">{da ? 'Åbn de officielle støjlag' : 'Open the official noise layers'} →</Link>
      </section>
      <section id="noise-maps">
        <h2>{da ? 'Støj i 2035: sammenlign scenarier' : 'Noise in 2035: compare scenarios'}</h2>
        <p>{da
          ? 'Åbn Vejdirektoratets kort for dit område. Sammenlign samme område med og uden projektet; afstandsbåndene i vores interaktive kort angiver ikke decibel.'
          : 'Open the official maps for your area. Compare the same area with and without the project; distance bands on our interactive map do not indicate decibels.'}</p>
        <div className="project-document-grid">
          {noiseDocuments.map((document) => (
            <a className="project-document" key={document.id} href={document.url} target="_blank" rel="noreferrer">
              <span className="project-document__format">PDF · {document.forecastYear ?? 2035}</span>
              <strong>{document.title[language]}</strong>
              {document.date && <span>{da ? 'Tegningsdato / revision' : 'Drawing / revision date'} {document.date}</span>}
              {document.publishedMonth && <span>{da ? 'Offentliggjort' : 'Published'} {document.publishedMonth}</span>}
              <span>{da ? 'Åbn officielt kort ↗' : 'Open official map ↗'}</span>
            </a>
          ))}
        </div>
      </section>
      <section>
        <h2>{da ? 'Projektet og lokalområdet' : 'The project and local area'}</h2>
        <div className="project-facts">
          {information.facts.map((fact) => (
            <section className="project-fact" key={fact.id}>
              <h3>{fact.title[language]}</h3>
              <p>{fact.summary[language]}</p>
              {fact.sourceUpdatedAt && <p className="project-eyebrow">{da ? 'Kildeside opdateret' : 'Source page updated'} {fact.sourceUpdatedAt}</p>}
              <a href={fact.sourceUrl} target="_blank" rel="noreferrer">{sourceLabel} ↗</a>
            </section>
          ))}
        </div>
      </section>
      <section id="timeline">
        <h2>{da ? 'Vejledende tidsplan' : 'Indicative schedule'}</h2>
        <ol className="project-timeline">
          {information.timeline.map((item) => (
            <li key={item.id}>
              {item.period && <span className="project-eyebrow">{item.period[language]}</span>}
              <h3>{item.title[language]}</h3>
              <p>{item.summary[language]}</p>
              <a href={item.sourceUrl} target="_blank" rel="noreferrer">{sourceLabel} ↗</a>
            </li>
          ))}
        </ol>
      </section>
      {information.updates.length > 0 && <section>
        <h2>{da ? 'Aktuelt fra projektet' : 'Project updates'}</h2>
        {information.updates.map((item) => (
          <section className="project-fact" key={item.id}>
            <h3>{item.title[language]}</h3><p>{item.summary[language]}</p>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">{sourceLabel} ↗</a>
          </section>
        ))}
      </section>}
      <section id="documents">
        <h2>{da ? 'Tegninger, miljø og lodsejere' : 'Drawings, environment and landowners'}</h2>
        <ul className="project-links">
          {otherDocuments.map((document) => <li key={document.id}>
            <a href={document.url} target="_blank" rel="noreferrer">{document.title[language]} ↗</a>
          </li>)}
        </ul>
      </section>
      <section className="project-limitations">
        <h2>{da ? 'Hvad kan kortet fortælle?' : 'What can the map tell you?'}</h2>
        {information.limitations.map((item) => <p key={item.en}>{item[language]}</p>)}
        <Link to="/sources">{da ? 'Se alle datakilder' : 'See all data sources'} →</Link>
      </section>
      <section>
        <h2>{da ? 'Hent oplysninger som JSON' : 'Get the data as JSON'}</h2>
        <p>{da
          ? 'Vælg en adresse på kortet og åbn JSON-linket for afstande, kortdata, kilder og en beskrivelse i almindeligt sprog.'
          : 'Select an address on the map and open its JSON link for distances, map data, sources and a plain-language description.'}</p>
        <a href="/api-docs.html" target="_blank" rel="noreferrer">{da ? 'API-dokumentation og eksempler' : 'API documentation and examples'} ↗</a>
      </section>
    </article>
  )
}
