import { useI18n } from '../shared/i18n/I18nContext'
import { useChanges } from '../features/changes/hooks/useChanges'
import type { ChangeFeedPage } from '../features/changes/types/changes.types'
import { EmptyChangesIllustration } from '../shared/components/illustrations/EmptyChangesIllustration'

function useDateFormatter() {
  const { language } = useI18n()
  return (iso: string) => {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return iso
    return new Intl.DateTimeFormat(language === 'da' ? 'da-DK' : 'en-GB', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(date)
  }
}

function PageChanges({ page }: { page: ChangeFeedPage }) {
  const { t } = useI18n()
  const isNoise = page.noiseHits.length > 0
  const isTimeline = page.dateChanges.length > 0

  const classes = ['changes-page']
  if (isNoise) classes.push('changes-page--noise')

  return (
    <section className={classes.join(' ')}>
      <header className="changes-page__head">
        <h3 className="changes-page__title">
          <a href={page.url} target="_blank" rel="noopener noreferrer">
            {page.label}
          </a>
        </h3>
        <span className="changes-page__tags">
          {page.priority === 'high' && (
            <span className="changes-tag changes-tag--priority">{t('changes.highPriority')}</span>
          )}
          {isNoise && <span className="changes-tag changes-tag--noise">{t('changes.noiseTag')}</span>}
          {isTimeline && (
            <span className="changes-tag changes-tag--timeline">{t('changes.timelineTag')}</span>
          )}
        </span>
      </header>

      {page.status === 'new' ? (
        <p className="changes-page__baseline">
          {t('changes.baseline', {
            paragraphs: page.addedParagraphs.length,
            pdfs: page.addedPdfs.length,
          })}
        </p>
      ) : (
        <ul className="changes-list">
          {page.changedParagraphs.map((c, i) => {
            const isDate = page.dateChanges.some(
              (d) => d.before === c.before && d.after === c.after,
            )
            return (
              <li key={`c${i}`} className="changes-item changes-item--changed">
                <span className="changes-item__label">
                  {isDate ? t('changes.timelineChanged') : t('changes.changed')}
                </span>
                <span className="changes-diff changes-diff--before">{c.before}</span>
                <span className="changes-diff changes-diff--after">{c.after}</span>
              </li>
            )
          })}
          {page.addedParagraphs.map((p, i) => (
            <li key={`a${i}`} className="changes-item changes-item--added">
              <span className="changes-item__label">{t('changes.added')}</span>
              <span>{p}</span>
            </li>
          ))}
          {page.removedParagraphs.map((p, i) => (
            <li key={`r${i}`} className="changes-item changes-item--removed">
              <span className="changes-item__label">{t('changes.removed')}</span>
              <span>{p}</span>
            </li>
          ))}
          {page.addedPdfs.map((pdf, i) => (
            <li key={`ap${i}`} className="changes-item changes-item--pdf">
              <span className="changes-item__label">{t('changes.newPdf')}</span>
              <a href={pdf.url} target="_blank" rel="noopener noreferrer">
                {pdf.text || pdf.url}
              </a>
              {pdf.section && <span className="changes-item__section"> — {pdf.section}</span>}
            </li>
          ))}
          {page.removedPdfs.map((pdf, i) => (
            <li key={`rp${i}`} className="changes-item changes-item--pdf">
              <span className="changes-item__label">{t('changes.removedPdf')}</span>
              <a href={pdf.url} target="_blank" rel="noopener noreferrer">
                {pdf.text || pdf.url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function ChangesRoute() {
  const { t } = useI18n()
  const formatDate = useDateFormatter()
  const { data, isLoading, isError } = useChanges()

  return (
    <article className="changes-route">
      <h1>{t('changes.title')}</h1>
      <p className="changes-route__intro">{t('changes.intro')}</p>

      {isLoading && <p className="route-status">{t('changes.loading')}</p>}
      {isError && <p className="route-status">{t('changes.error')}</p>}
      {!isLoading && !isError && data && data.entries.length === 0 && (
        <div className="route-empty">
          <EmptyChangesIllustration />
          <p className="route-empty__message">{t('changes.empty')}</p>
        </div>
      )}

      {data?.entries.map((entry) => (
        <section key={entry.runId} className="changes-run">
          <h2 className="changes-run__date">
            {t('changes.runHeading', { date: formatDate(entry.fetchedAt) })}
          </h2>
          {entry.pages.map((page) => (
            <PageChanges key={page.pageId} page={page} />
          ))}
        </section>
      ))}

      <p className="changes-route__note">{t('changes.note')}</p>
    </article>
  )
}
