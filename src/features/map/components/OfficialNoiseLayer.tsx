import { useEffect } from 'react'
import { useMapInstance } from './MapInstanceContext'
import { LAYER_IDS } from '../constants/mapConfig'
import type { OfficialNoiseScenario } from '../constants/officialNoiseConfig'
import type { OfficialNoiseData } from '../hooks/useOfficialNoise'

const SOURCE_ID = 'official-noise-2021'
const LAYER_ID = 'official-noise-2021-fill'

interface OfficialNoiseLayerProps {
  data: OfficialNoiseData | undefined
  scenario: OfficialNoiseScenario | null
  opacity: number
}

export function OfficialNoiseLayer({ data, scenario, opacity }: OfficialNoiseLayerProps) {
  const map = useMapInstance()

  useEffect(() => {
    if (!map || !data) return
    map.addSource(SOURCE_ID, { type: 'geojson', data, attribution: 'Vejdirektoratet · VVM 2021 / 2040' })
    const beforeId = map.getLayer(LAYER_IDS.roadAlignmentCasing) ? LAYER_IDS.roadAlignmentCasing
      : map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id
    map.addLayer({
      id: LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      layout: { visibility: 'none' },
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.35 },
    }, beforeId)

    return () => {
      if (!map.style) return
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, data])

  useEffect(() => {
    if (!map?.style || !map.getLayer(LAYER_ID)) return
    map.setFilter(LAYER_ID, ['all', ['==', ['get', 'kind'], 'noise-band'], ['==', ['get', 'scenario'], scenario ?? 'none']])
    map.setLayoutProperty(LAYER_ID, 'visibility', scenario ? 'visible' : 'none')
    map.setPaintProperty(LAYER_ID, 'fill-opacity', opacity)
  }, [map, data, scenario, opacity])

  return null
}
