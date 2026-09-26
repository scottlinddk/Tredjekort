import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { MapCanvas } from '../features/map/components/MapCanvas'
import { NoiseZoneLayer } from '../features/map/components/NoiseZoneLayer'
import { NoiseScreensLayer } from '../features/map/components/NoiseScreensLayer'
import { JunctionMarkers } from '../features/map/components/JunctionMarkers'
import { LayerToggle } from '../features/map/components/LayerToggle'
import { MapLegend } from '../features/map/components/MapLegend'
import { AddressSearch } from '../features/address/components/AddressSearch'
import { DataSourceDisclaimer } from '../shared/components/DataSourceDisclaimer'
import { NOISE_BAND_OPACITY_DEFAULT, type NoiseColorScheme } from '../features/map/constants/mapConfig'
import { useNoiseMapQueryParam } from '../features/map/hooks/useNoiseMapQueryParam'
import { useI18n } from '../shared/i18n/I18nContext'
import { OfficialNoiseLayer } from '../features/map/components/OfficialNoiseLayer'
import { OfficialDesignLayer } from '../features/map/components/OfficialDesignLayer'
import { useOfficialNoise } from '../features/map/hooks/useOfficialNoise'
import { isOfficialNoiseScenario, type NoiseMapMode } from '../features/map/constants/officialNoiseConfig'

type MapPanel = 'search' | 'layers' | 'info'

export function MapRoute() {
  const { t } = useI18n()
  const { noiseMode, setNoiseMode } = useNoiseMapQueryParam()
  const [colorScheme, setColorScheme] = useState<NoiseColorScheme>('warm')
  const [opacity, setOpacity] = useState(() => isOfficialNoiseScenario(noiseMode) ? 0.35 : NOISE_BAND_OPACITY_DEFAULT)
  const [showScreens, setShowScreens] = useState(true)
  const [showOfficialDesign, setShowOfficialDesign] = useState(true)
  const officialScenario = isOfficialNoiseScenario(noiseMode) ? noiseMode : null
  const officialNoise = useOfficialNoise(officialScenario !== null)
  const [activePanel, setActivePanel] = useState<MapPanel | null>(() =>
    window.matchMedia('(max-width: 760px)').matches ? null : 'search',
  )
  const panelButtons = useRef<Partial<Record<MapPanel, HTMLButtonElement | null>>>({})

  const closePanel = () => {
    if (activePanel) panelButtons.current[activePanel]?.focus()
    setActivePanel(null)
  }
  const changeNoiseMode = (mode: NoiseMapMode) => {
    setNoiseMode(mode)
    setOpacity(isOfficialNoiseScenario(mode) ? 0.35 : NOISE_BAND_OPACITY_DEFAULT)
  }

  return (
    <div className={`map-route${activePanel ? ' map-route--panel-open' : ''}`}>
      <MapCanvas>
        <OfficialDesignLayer visible={showOfficialDesign} />
        <NoiseZoneLayer visible={noiseMode === 'distance'} colorScheme={colorScheme} opacity={opacity} />
        <OfficialNoiseLayer data={officialNoise.data} scenario={officialScenario} opacity={opacity} />
        <NoiseScreensLayer visible={showScreens} />
        <JunctionMarkers />
        <aside className="map-tools" aria-label={t('map.tools')} onKeyDown={(event) => {
          if (event.key === 'Escape' && !event.defaultPrevented) closePanel()
        }}>
          <div className="map-tools__tabs">
            {(['search', 'layers', 'info'] as const).map((panel) => (
              <button
                key={panel}
                ref={(element) => { panelButtons.current[panel] = element }}
                type="button"
                className={`map-tools__tab${activePanel === panel ? ' map-tools__tab--active' : ''}`}
                aria-expanded={activePanel === panel}
                aria-controls={`map-panel-${panel}`}
                onClick={() => setActivePanel((current) => current === panel ? null : panel)}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  {panel === 'search' && <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>}
                  {panel === 'layers' && <><path d="m12 3 10 5-10 5L2 8Z" /><path d="m2 12 10 5 10-5M2 16l10 5 10-5" /></>}
                  {panel === 'info' && <><circle cx="12" cy="12" r="9" /><path d="M12 11v7M12 6v2" /></>}
                </svg>
                {t(`map.panel.${panel}`)}
              </button>
            ))}
          </div>
          {officialScenario && !activePanel && (
            <div className="map-tools__active-layer" role="status">
              <strong>{t('officialNoise.title')}</strong>
              <span>{t(`officialNoise.scenario.${officialScenario}`)}</span>
              {officialNoise.isFetching && <span>{t('officialNoise.loading')}</span>}
              {officialNoise.isError && <button type="button" onClick={() => { void officialNoise.refetch() }}>{t('officialNoise.error')}</button>}
            </div>
          )}
          {activePanel && (
            <div className="map-tools__heading">
              <h2>{t(`map.panel.${activePanel}`)}</h2>
              <button type="button" className="map-tools__close" onClick={closePanel}>
                {t('map.closePanel')} <span aria-hidden="true">×</span>
              </button>
            </div>
          )}
          <div className="map-tools__content" hidden={!activePanel}>
            {/* Keep search mounted when its section is hidden, preserving its map marker. */}
            <section id="map-panel-search" hidden={activePanel !== 'search'} aria-label={t('search.label')}>
              <AddressSearch />
            </section>
            <section id="map-panel-layers" hidden={activePanel !== 'layers'} aria-label={t('map.panel.layers')}>
              <LayerToggle
                noiseMode={noiseMode}
                onNoiseModeChange={changeNoiseMode}
                showScreens={showScreens}
                onToggleScreens={setShowScreens}
                showOfficialDesign={showOfficialDesign}
                onToggleOfficialDesign={setShowOfficialDesign}
                colorScheme={colorScheme}
                onColorSchemeChange={setColorScheme}
                opacity={opacity}
                onOpacityChange={setOpacity}
              />
              {officialScenario && officialNoise.isFetching && <p role="status">{t('officialNoise.loading')}</p>}
              {officialScenario && officialNoise.isError && <button type="button" className="map-tools__close" onClick={() => { void officialNoise.refetch() }}>{t('officialNoise.error')}</button>}
              <MapLegend colorScheme={colorScheme} noiseMode={noiseMode} showScreens={showScreens} showOfficialDesign={showOfficialDesign} />
            </section>
            <section id="map-panel-info" hidden={activePanel !== 'info'} aria-label={t('map.panel.info')}>
              <p className="map-tools__intro">{t('map.approximation')}</p>
              <Link className="map-tools__resource" to="/about">{t('map.officialDocuments')} →</Link>
              <DataSourceDisclaimer />
            </section>
          </div>
        </aside>
      </MapCanvas>
    </div>
  )
}
