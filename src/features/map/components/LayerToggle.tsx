import { useI18n } from '../../../shared/i18n/I18nContext'

interface LayerToggleProps {
  showNoise: boolean
  onToggleNoise: (next: boolean) => void
}

export function LayerToggle({ showNoise, onToggleNoise }: LayerToggleProps) {
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
    </div>
  )
}
