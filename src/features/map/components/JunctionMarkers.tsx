import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import * as maplibregl from 'maplibre-gl'
import { useMapInstance } from './MapInstanceContext'
import { useJunctions } from '../hooks/useJunctions'
import { useI18n } from '../../../shared/i18n/I18nContext'

export function JunctionMarkers() {
  const map = useMapInstance()
  const { t, language } = useI18n()
  const { data: junctions } = useJunctions()
  const [openId, setOpenId] = useState<string | null>(null)
  // Stable DOM node the popup hosts; React renders the details into it through a portal.
  const [popupContent] = useState(() => document.createElement('div'))

  const open = junctions?.find((junction) => junction.id === openId)

  useEffect(() => {
    if (!map || !junctions) return
    const markers = junctions.map((junction) => {
      const el = document.createElement('button')
      el.className = 'junction-marker'
      el.type = 'button'
      el.setAttribute('aria-label', junction.name)
      el.addEventListener('click', (event) => {
        // Keep the click from reaching the map, which would close the popup straight away.
        event.stopPropagation()
        setOpenId(junction.id)
      })

      return new maplibregl.Marker({ element: el })
        .setLngLat([junction.longitude, junction.latitude])
        .addTo(map)
    })
    return () => markers.forEach((marker) => marker.remove())
  }, [map, junctions])

  useEffect(() => {
    if (!map || !open) return
    const popup = new maplibregl.Popup({ className: 'junction-popup', maxWidth: 'min(380px, calc(100vw - 32px))', offset: 22, focusAfterOpen: true })
      .setLngLat([open.longitude, open.latitude])
      .setDOMContent(popupContent)
      .addTo(map)
    const handleClose = () => setOpenId(null)
    // MapLibre popups ignore Escape; close on it, since focus moves into the popup on open.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') popup.remove()
    }
    popup.on('close', handleClose)
    popup.getElement().addEventListener('keydown', handleKeyDown)
    return () => {
      // Detach first, so removing this popup in cleanup does not clear a newly opened one.
      popup.off('close', handleClose)
      popup.getElement()?.removeEventListener('keydown', handleKeyDown)
      popup.remove()
    }
  }, [map, open, popupContent])

  if (!open) return null
  return createPortal(
    <article className="junction-popover">
      <h2>{open.name}</h2>
      <p className="junction-popover__status">
        {t('junction.status')}: {t(`status.${open.status}`)}
      </p>
      <p>{open.description[language]}</p>
      <h3>{t('junction.sources')}</h3>
      <ul>
        {open.sources.map((source) => (
          <li key={source}>{source}</li>
        ))}
      </ul>
    </article>,
    popupContent,
  )
}
