import { useI18n } from '../../../shared/i18n/I18nContext'
import {
  NOISE_BAND_OPACITY_MAX,
  NOISE_BAND_OPACITY_MIN,
  NOISE_BAND_OPACITY_STEP,
  type NoiseColorScheme,
} from '../constants/mapConfig'

interface LayerToggleProps {
  showNoise: boolean
  onToggleNoise: (next: boolean) => void
  colorScheme: NoiseColorScheme
  onColorSchemeChange: (next: NoiseColorScheme) => void
  opacity: number
  onOpacityChange: (next: number) => void
}

export function LayerToggle({
  showNoise,
  onToggleNoise,
  colorScheme,
  onColorSchemeChange,
  opacity,
  onOpacityChange,
}: LayerToggleProps) {
  const { t } = useI18n()

  return (
    <div className="layer-toggle">
      <label>
        <input
          type="checkbox"
          checked={showNoise}
          onChange={(event) => onToggleNoise(event.target.checked)}
        />
        {t('layers.noise')}
      </label>

      {showNoise && (
        <div className="layer-toggle__noise-controls">
          <div className="layer-toggle__group">
            <span className="layer-toggle__group-label">{t('layers.colorScheme')}</span>
            <label>
              <input
                type="radio"
                name="noise-color-scheme"
                value="warm"
                checked={colorScheme === 'warm'}
                onChange={() => onColorSchemeChange('warm')}
              />
              {t('layers.colorScheme.warm')}
            </label>
            <label>
              <input
                type="radio"
                name="noise-color-scheme"
                value="cool"
                checked={colorScheme === 'cool'}
                onChange={() => onColorSchemeChange('cool')}
              />
              {t('layers.colorScheme.cool')}
            </label>
          </div>

          <label className="layer-toggle__group">
            <span className="layer-toggle__group-label">{t('layers.opacity')}</span>
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
