import { useI18n } from '../i18n/I18nContext'

export function DataSourceDisclaimer() {
  const { t } = useI18n()

  return (
    <div className="data-disclaimer">
      <h3>{t('disclaimer.heading')}</h3>
      <p>{t('disclaimer.geometry')}</p>
      <p>{t('disclaimer.noise')}</p>
    </div>
  )
}
