import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as maplibregl from 'maplibre-gl'
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, MAP_STYLE_URL } from '../constants/mapConfig'
import { MapInstanceContext } from './MapInstanceContext'
import { useI18n } from '../../../shared/i18n/I18nContext'
import { useRoadAlignment } from '../hooks/useRoadAlignment'

// MapLibre 6 ships an ES-module worker with shared imports. Let Vite bundle the
// whole worker graph so its URL remains valid in both development and production.
maplibregl.setWorkerUrl(mapWorkerUrl)

interface MapCanvasProps {
  children?: ReactNode
}

export function MapCanvas({ children }: MapCanvasProps) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const [loadingSlowly, setLoadingSlowly] = useState(false)
  const { data: alignment } = useRoadAlignment()
  const fittedInitially = useRef(false)
  const routeBounds = useMemo(() => {
    if (!alignment?.features.length) return null
    const bounds = new maplibregl.LngLatBounds()
    alignment.features.forEach((feature) => feature.geometry.coordinates.forEach((coordinate) => {
      bounds.extend([coordinate[0], coordinate[1]])
    }))
    return bounds.isEmpty() ? null : bounds
  }, [alignment])

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
      attributionControl: { compact: true },
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
    const loadingTimer = window.setTimeout(() => setLoadingSlowly(true), 15000)
    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(containerRef.current)

    map.on('load', () => {
      if (cancelled) return
      window.clearTimeout(loadingTimer)
      setMapInstance(map)
    })

    return () => {
      cancelled = true
      window.clearTimeout(loadingTimer)
      resizeObserver.disconnect()
      map.remove()
      setMapInstance(null)
    }
  }, [])

  useEffect(() => {
    if (!mapInstance || !routeBounds || fittedInitially.current) return
    fittedInitially.current = true
    // A bookmarked address has its own camera destination.
    if (new URLSearchParams(window.location.search).has('address.q')) return
    const padding = Math.min(48, mapInstance.getContainer().clientHeight / 5)
    mapInstance.fitBounds(routeBounds, { padding, maxZoom: 12, animate: false })
  }, [mapInstance, routeBounds])

  const resetView = () => {
    if (mapInstance && routeBounds) {
      const padding = Math.min(48, mapInstance.getContainer().clientHeight / 5)
      mapInstance.fitBounds(routeBounds, {
        padding, maxZoom: 12, bearing: 0, pitch: 0,
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      })
      return
    }
    mapInstance?.flyTo({
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      bearing: 0,
      pitch: 0,
      animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    })
  }

  return (
    <MapInstanceContext.Provider value={mapInstance}>
      <div className="map-viewport" role="region" aria-label={t('map.label')}>
        <div className="map-canvas" ref={containerRef} />
        {mapInstance ? (
          <button type="button" className="map-reset" onClick={resetView}>{t('map.reset')}</button>
        ) : (
          <div className="map-loading" role="status">
            {t(loadingSlowly ? 'map.loadingSlowly' : 'map.loading')}
            {loadingSlowly && <button type="button" onClick={() => window.location.reload()}>{t('map.retry')}</button>}
          </div>
        )}
      </div>
      {children}
    </MapInstanceContext.Provider>
  )
}
