import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import * as maplibregl from 'maplibre-gl'
import { useQuery } from '@tanstack/react-query'
import { useMapInstance } from '../../map/components/MapInstanceContext'
import { useRoadAlignment } from '../../map/hooks/useRoadAlignment'
import { useI18n } from '../../../shared/i18n/I18nContext'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'
import { searchAddresses, type AddressSuggestion } from '../api/addressSearch.api'
import { assessRoadNoise, formatDistance } from '../utils/assessRoadNoise'
import { useAddressQueryParams } from '../hooks/useAddressQueryParams'
import { AddressReport } from './AddressReport'

const MIN_QUERY_LENGTH = 2

export function AddressSearch() {
  const map = useMapInstance()
  const { t, language } = useI18n()
  const { data: alignment, isError: alignmentError } = useRoadAlignment()
  const { addressQuery, setAddressQuery } = useAddressQueryParams()

  const [query, setQuery] = useState(() => addressQuery)
  const [selected, setSelected] = useState<AddressSuggestion | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsId = useId()

  const debouncedQuery = useDebouncedValue(query.trim(), 250)

  const {
    data: suggestions,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ['address-search', debouncedQuery],
    queryFn: ({ signal }) => searchAddresses(debouncedQuery, signal),
    enabled: dropdownOpen && debouncedQuery.length >= MIN_QUERY_LENGTH,
    staleTime: 5 * 60 * 1000,
  })

  // Keep the input text in sync with the URL, e.g. hydrating from a shared
  // link or the browser's back/forward navigation.
  useEffect(() => {
    setQuery(addressQuery)
    setSelected((current) => current?.text === addressQuery ? current : null)
  }, [addressQuery])

  // Re-resolve the coordinates for an address restored from the URL: only
  // the display text is persisted there, so a shared/bookmarked link needs
  // one lookup to recover the marker position and noise assessment.
  const { data: resolvedSuggestions, isFetching: isResolving, isError: resolveError } = useQuery({
    queryKey: ['address-resolve', addressQuery],
    queryFn: ({ signal }) => searchAddresses(addressQuery, signal),
    enabled: addressQuery.length >= MIN_QUERY_LENGTH && !selected && query === addressQuery,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!resolvedSuggestions || selected || query !== addressQuery) return
    const match =
      resolvedSuggestions.find((suggestion) => suggestion.text === addressQuery) ??
      (resolvedSuggestions.length === 1 ? resolvedSuggestions[0] : null) ??
      null
    if (match) setSelected(match)
  }, [resolvedSuggestions, selected, addressQuery, query])

  useEffect(() => {
    if (activeIndex >= 0) document.getElementById(`${resultsId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, resultsId])

  // Marker + camera follow the selected address.
  useEffect(() => {
    if (!map || !selected) return

    const marker = new maplibregl.Marker({ color: '#dc2626' })
      .setLngLat([selected.longitude, selected.latitude])
      .addTo(map)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    map.flyTo({
      center: [selected.longitude, selected.latitude],
      zoom: 13.5,
      animate: !prefersReducedMotion,
    })

    return () => {
      marker.remove()
    }
  }, [map, selected])

  const assessment = useMemo(
    () =>
      selected && alignment
        ? assessRoadNoise(selected.longitude, selected.latitude, alignment)
        : null,
    [selected, alignment],
  )

  const locale = language === 'da' ? 'da-DK' : 'en-GB'

  const handleSelect = (suggestion: AddressSuggestion) => {
    setSelected(suggestion)
    setQuery(suggestion.text)
    setAddressQuery(suggestion.text)
    setDropdownOpen(false)
    setActiveIndex(-1)
    if (window.matchMedia('(max-width: 760px)').matches) inputRef.current?.blur()
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    setAddressQuery(null)
    setDropdownOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const showDropdown = dropdownOpen && query.trim().length >= MIN_QUERY_LENGTH
  const currentSuggestions = debouncedQuery === query.trim() ? suggestions ?? [] : []
  const searchPending = isFetching || debouncedQuery !== query.trim()

  return (
    <div className="address-search">
      {!selected && <p className="map-tools__intro">{t('search.intro')}</p>}
      <div className="address-search__input-row">
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          className="address-search__input"
          value={query}
          placeholder={t('search.placeholder')}
          aria-label={t('search.label')}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? resultsId : undefined}
          aria-activedescendant={showDropdown && currentSuggestions[activeIndex] ? `${resultsId}-${activeIndex}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setDropdownOpen(true)
              const direction = event.key === 'ArrowDown' ? 1 : -1
              setActiveIndex((current) => currentSuggestions.length
                ? current < 0 ? direction > 0 ? 0 : currentSuggestions.length - 1
                  : (current + direction + currentSuggestions.length) % currentSuggestions.length
                : -1)
            } else if (event.key === 'Enter' && showDropdown) {
              const suggestion = currentSuggestions[activeIndex] ?? (currentSuggestions.length === 1 ? currentSuggestions[0] : null)
              if (suggestion) {
                event.preventDefault()
                handleSelect(suggestion)
              }
            } else if (event.key === 'Escape' && showDropdown) {
              event.preventDefault()
              event.stopPropagation()
              setDropdownOpen(false)
            } else if (event.key === 'Tab') {
              setDropdownOpen(false)
            }
          }}
          onChange={(event) => {
            setQuery(event.target.value)
            setDropdownOpen(true)
            setActiveIndex(-1)
            if (selected) {
              setSelected(null)
            }
          }}
          onFocus={() => {
            if (query.trim().length >= MIN_QUERY_LENGTH && !selected) setDropdownOpen(true)
          }}
        />
        {(query || selected) && (
          <button
            type="button"
            className="address-search__clear"
            aria-label={t('search.clear')}
            onClick={handleClear}
          >
            ×
          </button>
        )}
      </div>

      {showDropdown && (
        <>
          <p className="address-search__status" role="status">
            {searchPending ? t('search.loading') : isError ? t('search.error') : currentSuggestions.length === 0 ? t('search.noResults') : t('search.results', { count: currentSuggestions.length })}
          </p>
          <ul id={resultsId} className="address-search__results" role="listbox" aria-label={t('search.label')}>
            {currentSuggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                id={`${resultsId}-${index}`}
                role="option"
                aria-selected={activeIndex === index}
                className="address-search__result"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(suggestion)}
              >
                {suggestion.text}
              </li>
            ))}
          </ul>
        </>
      )}

      {!selected && addressQuery && query === addressQuery && !showDropdown && (
        <p className="address-search__status" role="status">
          {isResolving ? t('search.loading') : resolveError ? t('search.error') : resolvedSuggestions ? t('search.chooseExact') : ''}
        </p>
      )}

      {selected && (
        <div className="address-search__verdict" role="status">
          <p className="address-search__address">{selected.text}</p>
          <AddressReport addressId={selected.id} />
          {assessment ? <details className="address-report__land">
          <summary>{t('noise.approximateDetails')}</summary>
          <p className="address-search__distance">
            {t('noise.distance', { distance: formatDistance(assessment.distanceMeters, locale) })}
          </p>
          <p className={`address-search__level address-search__level--${assessment.level}`}>
            {t(`noise.verdict.${assessment.level}`)}
          </p>
          <p className="address-search__disclaimer">{t('noise.disclaimer')}</p>
          </details> : <p>{t(alignmentError ? 'search.mapDataError' : 'search.mapDataLoading')}</p>}
          <div className="address-search__links">
            <Link to="/about">{t('map.officialDocuments')}</Link>
            <a href={`/api/address-report?id=${encodeURIComponent(selected.id)}&lang=${language}`} target="_blank" rel="noreferrer">{t('search.json')} ↗</a>
          </div>
        </div>
      )}
    </div>
  )
}
