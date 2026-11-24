import type { CSSProperties } from 'react'
import { useI18n } from '../../../shared/i18n/I18nContext'
import { DISTANCE_BANDS, NOISE_COLOR_SCHEMES, type NoiseColorScheme } from '../constants/mapConfig'
import { OFFICIAL_NOISE_BANDS, isOfficialNoiseScenario, type NoiseMapMode } from '../constants/officialNoiseConfig'
import { CROSSING_STYLE, consolidation } from '../../alternatives/constants/alternatives'
import type { CrossingAlternativeId } from '../../alternatives/types/alternatives.types'

interface MapLegendProps {
  colorScheme: NoiseColorScheme
  noiseMode: NoiseMapMode
  showScreens: boolean
  showOfficialDesign: boolean
  showMunicipalProposal: boolean
  showAlternatives: boolean
  crossing: CrossingAlternativeId
}

export function MapLegend({ colorScheme, noiseMode, showScreens, showOfficialDesign, showMunicipalProposal, showAlternatives, crossing }: MapLegendProps) {
  const { t, language } = useI18n()
  const crossingAlternative = consolidation.crossingAlternatives.find(({ id }) => id === crossing)
  const bandColors = NOISE_COLOR_SCHEMES[colorScheme]

  return (
    <div className="map-legend">
      <h3>{t('legend.title')}</h3>
      {showOfficialDesign && <>
        <div className="map-legend__row"><span className="legend-swatch legend-swatch--official-design" /> {t('legend.officialDesign')}</div>
        <div className="map-legend__row"><span className="legend-swatch legend-swatch--permanent-land" /> {t('legend.permanentLand')}</div>
        <div className="map-legend__row"><span className="legend-swatch legend-swatch--temporary-land" /> {t('legend.temporaryLand')}</div>
      </>}
      {showMunicipalProposal && <div className="map-legend__row">
        <span className="legend-swatch legend-swatch--municipal-proposal" /> {t('legend.municipalProposal')}
      </div>}
      {showMunicipalProposal && <div className="map-legend__row">
        <span className="legend-swatch legend-swatch--municipal-closure" /> {t('legend.municipalClosure')}
      </div>}
      {showMunicipalProposal && <div className="map-legend__row">
        <span className="legend-swatch legend-swatch--cross-section" aria-hidden="true">B</span> {t('legend.municipalCrossSection')}
      </div>}
      {showAlternatives && <>
        <div className="map-legend__row"><span className="legend-swatch legend-swatch--alternative-alignment" /> {t('legend.alternativeAlignment')}</div>
        <div className="map-legend__row"><span className="legend-swatch legend-swatch--pfas-deposit" /> {t('legend.pfasDeposit')}</div>
        <div className="map-legend__row">
          <span className="legend-swatch legend-swatch--crossing" style={{ '--swatch-color': CROSSING_STYLE[crossing].color } as CSSProperties} data-crossing={crossing} />
          {t('legend.crossing', { name: crossingAlternative?.title[language] ?? crossing })}
        </div>
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
