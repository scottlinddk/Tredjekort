import { useI18n } from '../../../shared/i18n/I18nContext'

export function MapLegend() {
  const { t } = useI18n()

  return (
    <div className="map-legend">
      <p className="map-legend__title">{t('legend.title')}</p>
      <div className="map-legend__row">
        <span className="legend-swatch legend-swatch--surveyed" /> {t('legend.surveyed')}
      </div>
      <div className="map-legend__row">
        <span className="legend-swatch legend-swatch--provisional" /> {t('legend.provisional')}
      </div>
      <div className="map-legend__row">
        <span className="legend-swatch legend-swatch--schematic" /> {t('legend.schematic')}
      </div>
      <div className="map-legend__row">
        <span className="legend-swatch legend-swatch--local-road" /> {t('legend.localRoad')}
      </div>
      <p className="map-legend__note">{t('legend.plannedNote')}</p>
    </div>
  )
}
