import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { useNavigate } from 'react-router'
import { useMapInstance } from './MapInstanceContext'
import { useJunctions } from '../hooks/useJunctions'

export function JunctionMarkers() {
  const map = useMapInstance()
  const navigate = useNavigate()
  const { data: junctions } = useJunctions()
  const markersRef = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!map || !junctions) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = junctions.map((junction) => {
      const el = document.createElement('button')
      el.className = 'junction-marker'
      el.type = 'button'
      el.setAttribute('aria-label', junction.name)
      el.addEventListener('click', () => navigate(`/junctions/${junction.id}`))

      return new maplibregl.Marker({ element: el })
        .setLngLat([junction.longitude, junction.latitude])
        .addTo(map)
    })

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
    }
  }, [map, junctions, navigate])

  return null
}
