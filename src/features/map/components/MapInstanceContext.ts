import { createContext, useContext } from 'react'
import type maplibregl from 'maplibre-gl'

export const MapInstanceContext = createContext<maplibregl.Map | null>(null)

export function useMapInstance(): maplibregl.Map | null {
  return useContext(MapInstanceContext)
}
