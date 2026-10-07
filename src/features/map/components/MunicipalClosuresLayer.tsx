import { useEffect } from 'react'
import type { ExpressionSpecification } from 'maplibre-gl'
import { useMapInstance } from './MapInstanceContext'
import { useMunicipalClosures } from '../hooks/useMunicipalProposal'
import { LAYER_IDS, MUNICIPAL_CLOSURE_COLOR } from '../constants/mapConfig'

const SOURCE_ID = 'municipal-closures'
const LAYERS = [LAYER_IDS.municipalClosureLine, LAYER_IDS.municipalClosureCasing] as const

// Red bars across side streets, as drawn in the municipality's visualisation.
// Shown with the municipal proposal toggle; the bars are approximately 14 m long.
export function MunicipalClosuresLayer({ visible }: { visible: boolean }) {
  const map = useMapInstance()
  const { data } = useMunicipalClosures(visible)

  useEffect(() => {
    if (!map || !data) return
    map.addSource(SOURCE_ID, { type: 'geojson', data, attribution: '© Aalborg Kommune · forslag 2026 · vejnavne © OpenStreetMap' })
    const width: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], 12, 3, 17, 9]
    map.addLayer({
      id: LAYER_IDS.municipalClosureCasing,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 6, 17, 12] },
    })
    map.addLayer({
      id: LAYER_IDS.municipalClosureLine,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round' },
      paint: { 'line-color': MUNICIPAL_CLOSURE_COLOR, 'line-width': width },
    })
    return () => {
      // A removed map's style is gone (see NoiseScreensLayer), so guard before cleanup.
      if (!map.style) return
      for (const layer of LAYERS) if (map.getLayer(layer)) map.removeLayer(layer)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, data])

  useEffect(() => {
    if (!map?.style) return
    for (const layer of LAYERS) {
      if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', visible ? 'visible' : 'none')
    }
  }, [map, data, visible])

  return null
}
