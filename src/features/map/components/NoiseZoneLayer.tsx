import { useEffect, useMemo } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMapInstance } from './MapInstanceContext'
import { useRoadAlignment } from '../hooks/useRoadAlignment'
import { generateNoiseBuffers } from '../utils/generateNoiseBuffers'
import { LAYER_IDS } from '../constants/mapConfig'

const SOURCE_ID = 'noise-buffers'

interface NoiseZoneLayerProps {
  visible: boolean
}

export function NoiseZoneLayer({ visible }: NoiseZoneLayerProps) {
  const map = useMapInstance()
  const { data: alignment } = useRoadAlignment()

  const buffers = useMemo(() => (alignment ? generateNoiseBuffers(alignment) : null), [alignment])

  useEffect(() => {
    if (!map || !buffers) return

    if (map.getSource(SOURCE_ID)) {
      ;(map.getSource(SOURCE_ID) as GeoJSONSource).setData(buffers)
    } else {
      map.addSource(SOURCE_ID, { type: 'geojson', data: buffers })
      map.addLayer(
        {
          id: LAYER_IDS.noiseBufferFill,
          type: 'fill',
          source: SOURCE_ID,
          paint: {
            'fill-color': '#dc2626',
            'fill-opacity': ['get', 'opacity'],
          },
        },
        LAYER_IDS.roadAlignmentCasing,
      )
    }

    return () => {
      // On route unmount React runs MapCanvas's cleanup (map.remove()) before this one,
      // and getLayer/getSource throw on a removed map because its style is gone.
      if (!map.style) return
      if (map.getLayer(LAYER_IDS.noiseBufferFill)) map.removeLayer(LAYER_IDS.noiseBufferFill)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, buffers])

  useEffect(() => {
    if (!map || !map.getLayer(LAYER_IDS.noiseBufferFill)) return
    map.setLayoutProperty(LAYER_IDS.noiseBufferFill, 'visibility', visible ? 'visible' : 'none')
  }, [map, visible])

  return null
}
