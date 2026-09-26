import { useEffect } from 'react'
import type { ExpressionSpecification } from 'maplibre-gl'
import { useQuery } from '@tanstack/react-query'
import type { FeatureCollection } from 'geojson'
import { useMapInstance } from './MapInstanceContext'
import alignmentUrl from '../../../data/official-alignment.geojson?url'
import landUrl from '../../../data/official-land-requirements.geojson?url'

const SOURCE_ALIGNMENT = 'official-design-centerlines'
const SOURCE_LAND = 'official-design-land'
const LINE = 'official-design-line'
const LAND = 'official-design-land-fill'
const OUTLINE = 'official-design-land-outline'

async function readGeoJSON(url: string, signal: AbortSignal): Promise<FeatureCollection> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Official design data unavailable')
  return response.json()
}

export function OfficialDesignLayer({ visible }: { visible: boolean }) {
  const map = useMapInstance()
  const { data } = useQuery({
    queryKey: ['official-design'],
    queryFn: async ({ signal }) => Promise.all([readGeoJSON(alignmentUrl, signal), readGeoJSON(landUrl, signal)]),
    staleTime: Infinity,
    enabled: visible,
  })

  useEffect(() => {
    if (!map || !data) return
    map.addSource(SOURCE_ALIGNMENT, { type: 'geojson', data: data[0], attribution: '© Vejdirektoratet · Fase 3, 2025' })
    map.addSource(SOURCE_LAND, { type: 'geojson', data: data[1] })
    const landColor: ExpressionSpecification = ['match', ['get', 'kind'], 'permanent', '#d97706', '#2563eb']
    map.addLayer({
      id: LAND, type: 'fill', source: SOURCE_LAND,
      paint: { 'fill-color': [...landColor], 'fill-opacity': 0.14 },
    })
    map.addLayer({
      id: OUTLINE, type: 'line', source: SOURCE_LAND,
      paint: { 'line-color': [...landColor], 'line-width': 1, 'line-opacity': 0.65 },
    })
    map.addLayer({
      id: LINE, type: 'line', source: SOURCE_ALIGNMENT,
      paint: { 'line-color': '#0f766e', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 15, 3] },
    })
    return () => {
      if (!map.style) return
      for (const layer of [LINE, OUTLINE, LAND]) if (map.getLayer(layer)) map.removeLayer(layer)
      for (const source of [SOURCE_ALIGNMENT, SOURCE_LAND]) if (map.getSource(source)) map.removeSource(source)
    }
  }, [map, data])

  useEffect(() => {
    if (!map?.style || !data) return
    for (const layer of [LINE, OUTLINE, LAND]) {
      if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', visible ? 'visible' : 'none')
    }
  }, [map, data, visible])

  return null
}
