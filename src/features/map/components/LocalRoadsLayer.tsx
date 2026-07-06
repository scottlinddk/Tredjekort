import { useEffect } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMapInstance } from './MapInstanceContext'
import { useLocalRoads } from '../hooks/useLocalRoads'
import { DOTTED_LINE_DASHARRAY, LAYER_IDS, LOCAL_ROAD_COLOR } from '../constants/mapConfig'

const SOURCE_ID = 'local-roads'

export function LocalRoadsLayer() {
  const map = useMapInstance()
  const { data: localRoads } = useLocalRoads()

  useEffect(() => {
    if (!map || !localRoads) return

    if (map.getSource(SOURCE_ID)) {
      ;(map.getSource(SOURCE_ID) as GeoJSONSource).setData(localRoads)
      return
    }

    map.addSource(SOURCE_ID, { type: 'geojson', data: localRoads })

    map.addLayer({
      id: LAYER_IDS.localRoadsCasing,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 4.5, 'line-opacity': 0.9 },
    })

    map.addLayer({
      id: LAYER_IDS.localRoadsLine,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': LOCAL_ROAD_COLOR,
        'line-width': 2.5,
        'line-dasharray': DOTTED_LINE_DASHARRAY,
      },
    })

    return () => {
      // On route unmount React runs MapCanvas's cleanup (map.remove()) before this one,
      // and getLayer/getSource throw on a removed map because its style is gone.
      if (!map.style) return
      if (map.getLayer(LAYER_IDS.localRoadsLine)) map.removeLayer(LAYER_IDS.localRoadsLine)
      if (map.getLayer(LAYER_IDS.localRoadsCasing)) map.removeLayer(LAYER_IDS.localRoadsCasing)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, localRoads])

  return null
}
