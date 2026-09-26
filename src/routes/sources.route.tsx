import { useI18n } from '../shared/i18n/I18nContext'
import { DATA_SOURCES } from '../data/dataSources'
import { Link } from 'react-router'
import { projectInformation } from '../features/project/projectInformation'

export function SourcesRoute() {
  const { t, language } = useI18n()

  return (
    <article className="sources-route">
      <h1>{t('sources.title')}</h1>
      <p>{t('sources.intro')}</p>
      <p>
        {language === 'da' ? 'Officielle kilder gennemgået' : 'Official sources reviewed'}: {projectInformation.reviewedAt}.{' '}
        <Link to="/about#noise-maps">{language === 'da' ? 'Sammenlign de officielle støjkort' : 'Compare official noise maps'}</Link>
      </p>
      <p>
        <a href="/api-docs.html">{language === 'da' ? 'Adresse-API: JSON, beskrivelse og eksempler' : 'Address API: JSON, description and examples'}</a>
      </p>
      <dl className="sources-route__list">
        {DATA_SOURCES.map((entry) => (
          <div key={entry.id} className="sources-route__entry">
            <dt>{t(`sources.dataset.${entry.datasetKey}`)}</dt>
            <dd>
              <ul>
                {entry.citations.map((citation) => (
                  <li key={citation}>{citation}</li>
                ))}
              </ul>
              {entry.url && (
                <a href={entry.url} target="_blank" rel="noreferrer">
                  {t('sources.viewSource')} &rarr;
                </a>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
