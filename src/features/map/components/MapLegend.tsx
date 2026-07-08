import type { CSSProperties } from 'react'
import { useI18n } from '../../../shared/i18n/I18nContext'
import { CollapsiblePanel } from '../../../shared/components/CollapsiblePanel'
import { NOISE_DB_BANDS, NOISE_COLOR_SCHEMES, type NoiseColorScheme } from '../constants/mapConfig'

interface MapLegendProps {
  colorScheme: NoiseColorScheme
}

export function MapLegend({ colorScheme }: MapLegendProps) {
  const { t } = useI18n()
  const bandColors = NOISE_COLOR_SCHEMES[colorScheme]

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
      <div className="map-legend__row">
        <span className="legend-swatch legend-swatch--noise-screen" /> {t('legend.noiseScreen')}
      </div>
      <p className="map-legend__group-label">{t('legend.noiseBands')}</p>
      {NOISE_DB_BANDS.map((band, index) => (
        <div className="map-legend__row" key={band.dbLabel}>
          <span
            className="legend-swatch legend-swatch--noise-band"
            style={{ '--swatch-color': bandColors[index] } as CSSProperties}
          />
          {band.dbLabel}
        </div>
      ))}
      <p className="map-legend__note">{t('legend.plannedNote')}</p>
      <p className="map-legend__note">{t('legend.noiseBandsNote')}</p>
    </CollapsiblePanel>
  )
}
