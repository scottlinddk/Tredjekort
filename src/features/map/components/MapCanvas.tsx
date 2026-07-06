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
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // The style loads asynchronously over the network, so the component can unmount
    // (route change, StrictMode's mount-cleanup-mount cycle) before "load" fires. Without
    // this flag, the late "load" callback would call setMapInstance with a map that has
    // already been torn down by the cleanup below, and every consumer's map.getLayer /
    // map.addSource call would throw because a removed map's `this.style` is undefined.
    let cancelled = false

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    map.on('load', () => {
      if (cancelled) return
      setMapInstance(map)
    })

    return () => {
      cancelled = true
      map.remove()
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
