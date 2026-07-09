import { useState } from 'react'
import { MapCanvas } from '../features/map/components/MapCanvas'
import { RoadAlignmentLayer } from '../features/map/components/RoadAlignmentLayer'
import { LocalRoadsLayer } from '../features/map/components/LocalRoadsLayer'
import { NoiseZoneLayer } from '../features/map/components/NoiseZoneLayer'
import { NoiseScreensLayer } from '../features/map/components/NoiseScreensLayer'
import { JunctionMarkers } from '../features/map/components/JunctionMarkers'
import { LayerToggle } from '../features/map/components/LayerToggle'
import { MapLegend } from '../features/map/components/MapLegend'
import { AddressSearch } from '../features/address/components/AddressSearch'
import { DataSourceDisclaimer } from '../shared/components/DataSourceDisclaimer'
import { NOISE_BAND_OPACITY_DEFAULT, type NoiseColorScheme } from '../features/map/constants/mapConfig'

export function MapRoute() {
  const [showNoise, setShowNoise] = useState(false)
  const [colorScheme, setColorScheme] = useState<NoiseColorScheme>('warm')
  const [opacity, setOpacity] = useState(NOISE_BAND_OPACITY_DEFAULT)

  return (
    <div className="map-route">
      <MapCanvas>
        <RoadAlignmentLayer />
        <LocalRoadsLayer />
        <NoiseZoneLayer visible={showNoise} colorScheme={colorScheme} opacity={opacity} />
        <NoiseScreensLayer visible={showNoise} />
        <JunctionMarkers />
        {/* Overlays that need the map instance (search places a marker) live inside
            MapCanvas; purely informational overlays stay outside it. */}
        <div className="map-overlays-left">
          <AddressSearch />
          <LayerToggle
            showNoise={showNoise}
            onToggleNoise={setShowNoise}
            colorScheme={colorScheme}
            onColorSchemeChange={setColorScheme}
            opacity={opacity}
            onOpacityChange={setOpacity}
          />
        </div>
      </MapCanvas>
      <div className="map-overlays-bottom">
        <DataSourceDisclaimer />
        <MapLegend colorScheme={colorScheme} />
      </div>
    </div>
  )
}
