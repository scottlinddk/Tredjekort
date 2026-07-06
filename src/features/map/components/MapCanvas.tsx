import { useEffect, useRef, useState, type ReactNode } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, MAP_STYLE_URL } from '../constants/mapConfig'
import { MapInstanceContext } from './MapInstanceContext'

interface MapCanvasProps {
  children?: ReactNode
}

export function MapCanvas({ children }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    map.on('load', () => {
      mapRef.current = map
      setMapInstance(map)
    })

    return () => {
      map.remove()
      mapRef.current = null
      setMapInstance(null)
    }
  }, [])

  return (
    <div className="map-canvas" ref={containerRef}>
      <MapInstanceContext.Provider value={mapInstance}>
        {mapInstance ? children : null}
      </MapInstanceContext.Provider>
    </div>
  )
}
