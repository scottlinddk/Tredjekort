import { useI18n } from '../../../shared/i18n/I18nContext'
import {
  NOISE_BAND_OPACITY_MAX,
  NOISE_BAND_OPACITY_MIN,
  NOISE_BAND_OPACITY_STEP,
  type NoiseColorScheme,
} from '../constants/mapConfig'
import { OFFICIAL_NOISE_SCENARIOS, isOfficialNoiseScenario, type NoiseMapMode } from '../constants/officialNoiseConfig'

interface LayerToggleProps {
  noiseMode: NoiseMapMode
  onNoiseModeChange: (next: NoiseMapMode) => void
  showScreens: boolean
  onToggleScreens: (next: boolean) => void
  showOfficialDesign: boolean
  onToggleOfficialDesign: (next: boolean) => void
  colorScheme: NoiseColorScheme
  onColorSchemeChange: (next: NoiseColorScheme) => void
  opacity: number
  onOpacityChange: (next: number) => void
}

export function LayerToggle({
  noiseMode,
  onNoiseModeChange,
  showScreens,
  onToggleScreens,
  showOfficialDesign,
  onToggleOfficialDesign,
  colorScheme,
  onColorSchemeChange,
  opacity,
  onOpacityChange,
}: LayerToggleProps) {
  const { t } = useI18n()

  return (
    <div className="layer-toggle">
      <label>
        <input type="checkbox" checked={showOfficialDesign} onChange={(event) => onToggleOfficialDesign(event.target.checked)} />
        {t('legend.officialDesign')}
      </label>
      <label className="layer-toggle__group">
        <span className="layer-toggle__group-label">{t('layers.overlay')}</span>
        <select value={noiseMode} onChange={(event) => onNoiseModeChange(event.target.value as NoiseMapMode)}>
          <option value="none">{t('layers.none')}</option>
          <option value="distance">{t('layers.distance')}</option>
          <optgroup label={t('officialNoise.title')}>
            {OFFICIAL_NOISE_SCENARIOS.map((scenario) => <option key={scenario} value={scenario}>{t(`officialNoise.scenario.${scenario}`)}</option>)}
          </optgroup>
        </select>
      </label>
      {isOfficialNoiseScenario(noiseMode) && <p className="layer-toggle__note">{t('officialNoise.caveat')}</p>}
      {noiseMode === 'distance' && <p className="layer-toggle__note">{t('legend.noiseBandsNote')}</p>}
      <label>
        <input
          type="checkbox"
          checked={showScreens}
          onChange={(event) => onToggleScreens(event.target.checked)}
        />
        {t('legend.noiseScreen')}
      </label>

      {noiseMode !== 'none' && (
        <div className="layer-toggle__noise-controls">
          {noiseMode === 'distance' && <label className="layer-toggle__group">
            <span className="layer-toggle__group-label">{t('layers.colorScheme')}</span>
            <select value={colorScheme} onChange={(event) => onColorSchemeChange(event.target.value as NoiseColorScheme)}>
              {(['warm', 'cool', 'red'] as const).map((scheme) => <option value={scheme} key={scheme}>{t(`layers.colorScheme.${scheme}`)}</option>)}
            </select>
          </label>}

          <label className="layer-toggle__group">
            <span className="layer-toggle__group-label">{t('layers.opacity')} · {Math.round(opacity * 100)}%</span>
            <input
              type="range"
              min={NOISE_BAND_OPACITY_MIN}
              max={NOISE_BAND_OPACITY_MAX}
              step={NOISE_BAND_OPACITY_STEP}
              value={opacity}
              onChange={(event) => onOpacityChange(Number(event.target.value))}
            />
          </label>
        </div>
      )}
    </div>
  )
}
