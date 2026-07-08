import { useEffect, useMemo } from 'react'
import type { GeoJSONSource } from 'maplibre-gl'
import { useMapInstance } from './MapInstanceContext'
import { useRoadAlignment } from '../hooks/useRoadAlignment'
import { generateNoiseBuffers } from '../utils/generateNoiseBuffers'
import { buildNoiseFillColorExpression } from '../utils/noiseColorExpression'
import { LAYER_IDS, type NoiseColorScheme } from '../constants/mapConfig'

const SOURCE_ID = 'noise-buffers'

interface NoiseZoneLayerProps {
  visible: boolean
  colorScheme: NoiseColorScheme
  opacity: number
}

export function NoiseZoneLayer({ visible, colorScheme, opacity }: NoiseZoneLayerProps) {
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
            // Initial values only; the effects below keep these in sync with the
            // color scheme / opacity controls without recreating the layer.
            'fill-color': buildNoiseFillColorExpression(colorScheme),
            'fill-opacity': opacity,
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
    // colorScheme/opacity intentionally omitted: they only seed the layer's initial paint
    // values here; the effects below keep them in sync via setPaintProperty afterwards.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [map, buffers])

  useEffect(() => {
    // Same rationale as the cleanup above: a removed map's style is gone, and this effect
    // can still fire with a stale `map` reference (e.g. a pending visibility toggle racing
    // a route unmount), so getLayer must be guarded here too.
    if (!map || !map.style || !map.getLayer(LAYER_IDS.noiseBufferFill)) return
    map.setLayoutProperty(LAYER_IDS.noiseBufferFill, 'visibility', visible ? 'visible' : 'none')
  }, [map, visible])

  useEffect(() => {
    if (!map || !map.style || !map.getLayer(LAYER_IDS.noiseBufferFill)) return
    map.setPaintProperty(LAYER_IDS.noiseBufferFill, 'fill-color', buildNoiseFillColorExpression(colorScheme))
  }, [map, colorScheme])

  useEffect(() => {
    if (!map || !map.style || !map.getLayer(LAYER_IDS.noiseBufferFill)) return
    map.setPaintProperty(LAYER_IDS.noiseBufferFill, 'fill-opacity', opacity)
  }, [map, opacity])

  return null
}
