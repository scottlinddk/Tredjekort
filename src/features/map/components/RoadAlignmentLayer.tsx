import { useEffect } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMapInstance } from './MapInstanceContext'
import { useRoadAlignment } from '../hooks/useRoadAlignment'
import { LAYER_IDS } from '../constants/mapConfig'

const SOURCE_ID = 'road-alignment'

export function RoadAlignmentLayer() {
  const map = useMapInstance()
  const { data: alignment } = useRoadAlignment()

  useEffect(() => {
    if (!map || !alignment) return

    if (map.getSource(SOURCE_ID)) {
      ;(map.getSource(SOURCE_ID) as GeoJSONSource).setData(alignment)
      return
    }

    map.addSource(SOURCE_ID, { type: 'geojson', data: alignment })

    // White casing underneath so the line reads clearly over any basemap.
    map.addLayer({
      id: LAYER_IDS.roadAlignmentCasing,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 6, 'line-opacity': 0.9 },
    })

    map.addLayer({
      id: LAYER_IDS.roadAlignmentLine,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': [
          'match',
          ['get', 'confidence'],
          'surveyed', '#1d4ed8',
          'provisional', '#a16207',
          'schematic', '#6b7280',
          /* other */ '#1d4ed8',
        ],
        'line-width': 3.5,
        'line-dasharray': ['case', ['==', ['get', 'confidence'], 'schematic'], ['literal', [2, 2]], ['literal', [1, 0]]],
      },
    })

    return () => {
      // On route unmount React runs MapCanvas's cleanup (map.remove()) before this one,
      // and getLayer/getSource throw on a removed map because its style is gone.
      if (!map.style) return
      if (map.getLayer(LAYER_IDS.roadAlignmentLine)) map.removeLayer(LAYER_IDS.roadAlignmentLine)
      if (map.getLayer(LAYER_IDS.roadAlignmentCasing)) map.removeLayer(LAYER_IDS.roadAlignmentCasing)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, alignment])

  return null
}
