import { useEffect } from 'react'
import type { FeatureCollection } from 'geojson'
import { useMapInstance } from '../../map/components/MapInstanceContext'
import { useAlternativesGeometry } from '../hooks/useAlternatives'
import { ALTERNATIVE_ALIGNMENT_COLOR, CROSSING_STYLE, PFAS_DEPOSIT_COLOR } from '../constants/alternatives'
import type { CrossingAlternativeId } from '../types/alternatives.types'

const SOURCE_ID = 'alternatives-2026-11'
const LAYER = {
  depositFill: 'alternatives-deposit-fill',
  depositOutline: 'alternatives-deposit-outline',
  crossingCasing: 'alternatives-crossing-casing',
  crossingLine: 'alternatives-crossing-line',
  alignmentCasing: 'alternatives-alignment-casing',
  alignmentLine: 'alternatives-alignment-line',
} as const
const ALL_LAYERS = Object.values(LAYER)

interface AlternativesLayerProps {
  visible: boolean
  crossing: CrossingAlternativeId
}

// Vejdirektoratet's November 2026 alternatives: the schematic alignment west of the
// Mølholm sludge deposit, the deposit itself, and the Sønderdyb crossing styled by the
// selected solution (tunnel dashed, bridges solid). Opt-in; nothing loads until shown.
export function AlternativesLayer({ visible, crossing }: AlternativesLayerProps) {
  const map = useMapInstance()
  const { data } = useAlternativesGeometry(visible)

  useEffect(() => {
    if (!map || !data) return
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: data as FeatureCollection,
      attribution: '© Vejdirektoratet · foreløbig status 24.11.2026 (skematisk)',
    })
    map.addLayer({
      id: LAYER.depositFill, type: 'fill', source: SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'pfas-deposit'],
      paint: { 'fill-color': PFAS_DEPOSIT_COLOR, 'fill-opacity': 0.22 },
    })
    map.addLayer({
      id: LAYER.depositOutline, type: 'line', source: SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'pfas-deposit'],
      paint: { 'line-color': PFAS_DEPOSIT_COLOR, 'line-width': 1.5, 'line-dasharray': [2, 1] },
    })
    map.addLayer({
      id: LAYER.crossingCasing, type: 'line', source: SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'fjord-crossing'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 6, 16, 14], 'line-opacity': 0.9 },
    })
    map.addLayer({
      id: LAYER.crossingLine, type: 'line', source: SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'fjord-crossing'],
      layout: { 'line-join': 'round' },
      paint: { 'line-color': CROSSING_STYLE['immersed-tunnel'].color, 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 3, 16, 8] },
    })
    map.addLayer({
      id: LAYER.alignmentCasing, type: 'line', source: SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'alternative-alignment'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 11, 5, 16, 10], 'line-opacity': 0.85 },
    })
    map.addLayer({
      id: LAYER.alignmentLine, type: 'line', source: SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'alternative-alignment'],
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': ALTERNATIVE_ALIGNMENT_COLOR,
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 6],
        // Road section dashed, tunnel section dotted: both schematic.
        'line-dasharray': [2, 1.2],
        'line-opacity': ['match', ['get', 'structure'], 'tunnel', 0.7, 1],
      },
    })
    return () => {
      // A removed map's style is gone (see NoiseScreensLayer), so guard before cleanup.
      if (!map.style) return
      for (const layer of [...ALL_LAYERS].reverse()) if (map.getLayer(layer)) map.removeLayer(layer)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, data])

  useEffect(() => {
    if (!map?.style || !map.getLayer(LAYER.crossingLine)) return
    const style = CROSSING_STYLE[crossing]
    map.setPaintProperty(LAYER.crossingLine, 'line-color', style.color)
    map.setPaintProperty(LAYER.crossingLine, 'line-dasharray', style.dash)
  }, [map, data, crossing])

  useEffect(() => {
    if (!map?.style) return
    for (const layer of ALL_LAYERS) {
      if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', visible ? 'visible' : 'none')
    }
  }, [map, data, visible])

  return null
}
