import { useI18n } from '../shared/i18n/I18nContext'
import type { TranslationKey } from '../shared/i18n/translations'
import { DATA_SOURCES } from '../data/dataSources'

export function SourcesRoute() {
  const { t } = useI18n()

  return (
    <article className="sources-route">
      <h1>{t('sources.title')}</h1>
      <p>{t('sources.intro')}</p>
      <dl className="sources-route__list">
        {DATA_SOURCES.map((entry) => (
          <div key={entry.id} className="sources-route__entry">
            <dt>{t(`sources.dataset.${entry.datasetKey}` as TranslationKey)}</dt>
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
