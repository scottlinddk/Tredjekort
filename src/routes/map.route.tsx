import { useState } from 'react'
import { MapCanvas } from '../features/map/components/MapCanvas'
import { RoadAlignmentLayer } from '../features/map/components/RoadAlignmentLayer'
import { NoiseZoneLayer } from '../features/map/components/NoiseZoneLayer'
import { JunctionMarkers } from '../features/map/components/JunctionMarkers'
import { LayerToggle } from '../features/map/components/LayerToggle'
import { MapLegend } from '../features/map/components/MapLegend'
import { DataSourceDisclaimer } from '../shared/components/DataSourceDisclaimer'

export function MapRoute() {
  const [showNoise, setShowNoise] = useState(false)

  return (
    <div className="map-route">
      <MapCanvas>
        <RoadAlignmentLayer />
        <NoiseZoneLayer visible={showNoise} />
        <JunctionMarkers />
      </MapCanvas>
      <LayerToggle showNoise={showNoise} onToggleNoise={setShowNoise} />
      <MapLegend />
      <DataSourceDisclaimer />
    </div>
  )
}
