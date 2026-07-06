import { useI18n } from '../../../shared/i18n/I18nContext'
import { CollapsiblePanel } from '../../../shared/components/CollapsiblePanel'

export function MapLegend() {
  const { t } = useI18n()

  return (
    <CollapsiblePanel title={t('legend.title')} className="map-legend">
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
    </CollapsiblePanel>
  )
}
