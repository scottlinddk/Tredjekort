import { Link, useParams } from 'react-router'
import { useJunctions } from '../features/map/hooks/useJunctions'
import { useI18n } from '../shared/i18n/I18nContext'

export function JunctionRoute() {
  const { junctionId } = useParams()
  const { data: junctions, isLoading } = useJunctions()
  const { t, language } = useI18n()

  if (isLoading) return <p className="route-status">{t('junction.loading')}</p>

  const junction = junctions?.find((item) => item.id === junctionId)

  if (!junction) {
    return (
      <div className="junction-detail">
        <p>{t('junction.notFound', { id: junctionId ?? '' })}</p>
        <Link to="/">{t('junction.back')}</Link>
      </div>
    )
  }

  return (
    <article className="junction-detail">
      <Link to="/" className="junction-detail__back">
        &larr; {t('junction.back')}
      </Link>
      <h1>{junction.name}</h1>
      <p className="junction-detail__status">
        {t('junction.status')}: {t(`status.${junction.status}`)}
      </p>
      <p>{junction.description[language]}</p>
      <h2>{t('junction.sources')}</h2>
      <ul>
        {junction.sources.map((source) => (
          <li key={source}>{source}</li>
        ))}
      </ul>
    </article>
  )
}
