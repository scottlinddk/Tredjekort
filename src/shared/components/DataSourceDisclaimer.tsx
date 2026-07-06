import { useI18n } from '../i18n/I18nContext'

const CONFIDENCE_LEVELS = ['surveyed', 'provisional', 'schematic'] as const

export function DataSourceDisclaimer() {
  const { t } = useI18n()

  return (
    <aside className="data-disclaimer" role="note">
      <p className="data-disclaimer__heading">{t('disclaimer.heading')}</p>
      <p>{t('disclaimer.geometry')}</p>
      <p>{t('disclaimer.noise')}</p>
      <p>{t('disclaimer.localRoads')}</p>
      <ul>
        {CONFIDENCE_LEVELS.map((level) => (
          <li key={level}>
            <span className={`confidence-dot confidence-dot--${level}`} aria-hidden="true" />
            <strong>{t(`legend.${level}`)}:</strong> {t(`disclaimer.confidence.${level}`)}
          </li>
        ))}
      </ul>
    </aside>
  )
}
