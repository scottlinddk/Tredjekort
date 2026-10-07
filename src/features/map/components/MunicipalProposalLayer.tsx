import { useEffect } from 'react'
import type { FeatureCollection, LineString } from 'geojson'
import { useMapInstance } from './MapInstanceContext'
import { useMunicipalProposal } from '../hooks/useMunicipalProposal'
import { LAYER_IDS, MUNICIPAL_PROPOSAL_COLOR } from '../constants/mapConfig'

const SOURCE_ID = 'municipal-proposal'

export function MunicipalProposalLayer({ visible }: { visible: boolean }) {
  const map = useMapInstance()
  const { data } = useMunicipalProposal(visible)

  useEffect(() => {
    if (!map || !data) return
    // Only segments with verified geometry are drawn; the rest are listed in the layers panel.
    const drawable: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: data.features.flatMap((feature) => feature.geometry ? [{ ...feature, geometry: feature.geometry }] : []),
    }
    map.addSource(SOURCE_ID, { type: 'geojson', data: drawable, attribution: '© Aalborg Kommune · forslag 2026' })
    map.addLayer({
      id: LAYER_IDS.municipalProposalLine,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': MUNICIPAL_PROPOSAL_COLOR,
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 2, 16, 5],
        'line-dasharray': [2, 1.5],
      },
    })
    return () => {
      // A removed map's style is gone (see NoiseScreensLayer), so guard before cleanup.
      if (!map.style) return
      if (map.getLayer(LAYER_IDS.municipalProposalLine)) map.removeLayer(LAYER_IDS.municipalProposalLine)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, data])

  useEffect(() => {
    if (!map?.style || !map.getLayer(LAYER_IDS.municipalProposalLine)) return
    map.setLayoutProperty(LAYER_IDS.municipalProposalLine, 'visibility', visible ? 'visible' : 'none')
  }, [map, data, visible])

  return null
}
