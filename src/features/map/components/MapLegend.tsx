import type { CSSProperties } from 'react'
import { useI18n } from '../../../shared/i18n/I18nContext'
import { DISTANCE_BANDS, NOISE_COLOR_SCHEMES, type NoiseColorScheme } from '../constants/mapConfig'
import { OFFICIAL_NOISE_BANDS, isOfficialNoiseScenario, type NoiseMapMode } from '../constants/officialNoiseConfig'

interface MapLegendProps {
  colorScheme: NoiseColorScheme
  noiseMode: NoiseMapMode
  showScreens: boolean
  showOfficialDesign: boolean
}

export function MapLegend({ colorScheme, noiseMode, showScreens, showOfficialDesign }: MapLegendProps) {
  const { t } = useI18n()
  const bandColors = NOISE_COLOR_SCHEMES[colorScheme]

  return (
    <div className="map-legend">
      <h3>{t('legend.title')}</h3>
      {showOfficialDesign && <>
        <div className="map-legend__row"><span className="legend-swatch legend-swatch--official-design" /> {t('legend.officialDesign')}</div>
        <div className="map-legend__row"><span className="legend-swatch legend-swatch--permanent-land" /> {t('legend.permanentLand')}</div>
        <div className="map-legend__row"><span className="legend-swatch legend-swatch--temporary-land" /> {t('legend.temporaryLand')}</div>
      </>}
      {showScreens && <div className="map-legend__row">
        <span className="legend-swatch legend-swatch--noise-screen" /> {t('legend.noiseScreen')}
      </div>}
      {noiseMode === 'distance' && <><p className="map-legend__group-label">{t('legend.noiseBands')}</p>
      {DISTANCE_BANDS.map((band, index) => (
        <div className="map-legend__row" key={band.distanceLabel}>
          <span
            className="legend-swatch legend-swatch--noise-band"
            style={{ '--swatch-color': bandColors[index] } as CSSProperties}
          />
          {band.distanceLabel}
        </div>
      ))}</>}
      {isOfficialNoiseScenario(noiseMode) && <>
        <p className="map-legend__group-label">{t('officialNoise.legend')}</p>
        {OFFICIAL_NOISE_BANDS.map((band) => (
          <div className="map-legend__row" key={band.minDb}>
            <span className="legend-swatch legend-swatch--noise-band" style={{ '--swatch-color': band.color } as CSSProperties} />
            {band.label}
          </div>
        ))}
      </>}
      <p className="map-legend__note">{t('legend.plannedNote')}</p>
    </div>
  )
}
