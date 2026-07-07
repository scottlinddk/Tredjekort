import { useEffect } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMapInstance } from './MapInstanceContext'
import { useNoiseScreens } from '../hooks/useNoiseScreens'
import { LAYER_IDS, NOISE_SCREEN_COLOR } from '../constants/mapConfig'

const SOURCE_ID = 'noise-screens'

interface NoiseScreensLayerProps {
  visible: boolean
}

export function NoiseScreensLayer({ visible }: NoiseScreensLayerProps) {
  const map = useMapInstance()
  const { data: noiseScreens } = useNoiseScreens()

  useEffect(() => {
    if (!map || !noiseScreens) return

    if (map.getSource(SOURCE_ID)) {
      ;(map.getSource(SOURCE_ID) as GeoJSONSource).setData(noiseScreens)
    } else {
      map.addSource(SOURCE_ID, { type: 'geojson', data: noiseScreens })
      map.addLayer({
        id: LAYER_IDS.noiseScreensLine,
        type: 'line',
        source: SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': NOISE_SCREEN_COLOR, 'line-width': 3 },
      })
    }

    return () => {
      // On route unmount React runs MapCanvas's cleanup (map.remove()) before this one,
      // and getLayer/getSource throw on a removed map because its style is gone.
      if (!map.style) return
      if (map.getLayer(LAYER_IDS.noiseScreensLine)) map.removeLayer(LAYER_IDS.noiseScreensLine)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, noiseScreens])

  useEffect(() => {
    // Same rationale as the cleanup above: a removed map's style is gone, and this effect
    // can still fire with a stale `map` reference (e.g. a pending visibility toggle racing
    // a route unmount), so getLayer must be guarded here too.
    if (!map || !map.style || !map.getLayer(LAYER_IDS.noiseScreensLine)) return
    map.setLayoutProperty(LAYER_IDS.noiseScreensLine, 'visibility', visible ? 'visible' : 'none')
  }, [map, visible])

  return null
}
