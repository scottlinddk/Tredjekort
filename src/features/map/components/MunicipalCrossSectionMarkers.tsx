import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import * as maplibregl from 'maplibre-gl'
import { useMapInstance } from './MapInstanceContext'
import { useMunicipalCrossSections } from '../hooks/useMunicipalProposal'
import { useI18n } from '../../../shared/i18n/I18nContext'

// Section markers (the blue "B" in the municipality's plan drawing). Clicking one opens the
// published visualisation of the redesigned road at that point. Shown with the municipal
// proposal toggle.
export function MunicipalCrossSectionMarkers({ visible }: { visible: boolean }) {
  const map = useMapInstance()
  const { t, language } = useI18n()
  const { data } = useMunicipalCrossSections(visible)
  const [openId, setOpenId] = useState<string | null>(null)
  // Stable DOM node the popup hosts; React renders the figure into it through a portal.
  const [popupContent] = useState(() => document.createElement('div'))

  const open = visible ? data?.features.find(({ properties }) => properties.id === openId) : undefined

  useEffect(() => {
    if (!map || !data || !visible) return
    const markers = data.features.map(({ properties, geometry }) => {
      const element = document.createElement('button')
      element.type = 'button'
      element.className = 'cross-section-marker'
      element.textContent = properties.section
      element.setAttribute('aria-label', t('municipalProposal.crossSectionOpen', { section: properties.section, road: properties.corridorRoad }))
      element.addEventListener('click', (event) => {
        // Keep the click from reaching the map, which would close the popup straight away.
        event.stopPropagation()
        setOpenId(properties.id)
      })
      return new maplibregl.Marker({ element })
        .setLngLat(geometry.coordinates as [number, number])
        .addTo(map)
    })
    return () => markers.forEach((marker) => marker.remove())
  }, [map, data, visible, t])

  useEffect(() => {
    if (!map || !open) return
    const popup = new maplibregl.Popup({ className: 'cross-section-popup', maxWidth: 'min(440px, calc(100vw - 32px))', offset: 22, focusAfterOpen: true })
      .setLngLat(open.geometry.coordinates as [number, number])
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
  const { properties } = open
  return createPortal(
    <figure className="cross-section-figure">
      <img
        src={properties.image.src}
        width={properties.image.widthPx}
        height={properties.image.heightPx}
        alt={properties.alt[language]}
        loading="lazy"
      />
      <figcaption>
        <strong>{t('municipalProposal.crossSectionTitle', { section: properties.section, road: properties.corridorRoad })}</strong>
        <span>{properties.caption[language]}</span>
        <span className="cross-section-figure__note">
          {t('municipalProposal.crossSectionCaveat', { from: properties.between[0], to: properties.between[1] })}
        </span>
        <a href={properties.sourceUrl} target="_blank" rel="noreferrer">{t('municipalProposal.source')} →</a>
      </figcaption>
    </figure>,
    popupContent,
  )
}
