import { Button, Notice } from '@scttlnd/ui'
import { useI18n } from '../../../shared/i18n/I18nContext'
import { useMunicipalClosures } from '../hooks/useMunicipalProposal'

// Named list of the proposed closures, so they can be read without finding each bar on the map.
export function MunicipalClosuresList() {
  const { t, language } = useI18n()
  const { data, isError, refetch } = useMunicipalClosures(true)

  if (isError) {
    return (
      <Notice
        tone="danger"
        action={<Button variant="secondary" onClick={() => { void refetch() }}>{t('map.retry')}</Button>}
      >
        {t('municipalProposal.closuresError')}
      </Notice>
    )
  }
  if (!data) return null

  return (
    <div className="municipal-closures">
      <p className="municipal-closures__heading">
        <span className="legend-swatch legend-swatch--municipal-closure" />
        {t('municipalProposal.closuresHeading', { count: String(data.features.length) })}
      </p>
      <ol className="municipal-closures__list">
        {data.features.map(({ properties }) => (
          <li key={properties.id}>
            {properties.description?.[language] ?? properties.street}
            <span className="municipal-closures__where">
              {t(`municipalProposal.side.${properties.side}`, { road: properties.corridorRoad })}
            </span>
          </li>
        ))}
      </ol>
      <p className="layer-toggle__note">{t('municipalProposal.closuresCaveat')}</p>
    </div>
  )
}
