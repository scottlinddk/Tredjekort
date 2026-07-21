import { useEffect, useMemo, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { useQuery } from '@tanstack/react-query'
import { useMapInstance } from '../../map/components/MapInstanceContext'
import { useRoadAlignment } from '../../map/hooks/useRoadAlignment'
import { useI18n } from '../../../shared/i18n/I18nContext'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'
import { searchAddresses, type AddressSuggestion } from '../api/addressSearch.api'
import { assessRoadNoise, formatDistance } from '../utils/assessRoadNoise'
import { useAddressQueryParams } from '../hooks/useAddressQueryParams'

const MIN_QUERY_LENGTH = 2

export interface AddressSearchProps {
  // Called once a search result is selected, so the map can reveal the
  // noise band overlay for it.
  onAddressSelected?: () => void
}

export function AddressSearch({ onAddressSelected }: AddressSearchProps = {}) {
  const map = useMapInstance()
  const { t, language } = useI18n()
  const { data: alignment } = useRoadAlignment()
  const { selected, setSelected } = useAddressQueryParams()

  const [query, setQuery] = useState(() => selected?.text ?? '')
  const [dropdownOpen, setDropdownOpen] = useState(false)

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

  // Keep the input text in sync when the selection changes from outside a
  // click in this component, e.g. hydrating from a shared URL or the
  // browser's back/forward navigation.
  useEffect(() => {
    if (selected) setQuery(selected.text)
  }, [selected])

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
    setDropdownOpen(false)
    onAddressSelected?.()
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    setDropdownOpen(false)
  }

  const showDropdown = dropdownOpen && debouncedQuery.length >= MIN_QUERY_LENGTH

  return (
    <div className="address-search">
      <div className="address-search__input-row">
        <input
          type="search"
          className="address-search__input"
          value={query}
          placeholder={t('search.placeholder')}
          aria-label={t('search.label')}
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value)
            setDropdownOpen(true)
            if (selected) setSelected(null)
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
        <ul className="address-search__results" aria-label={t('search.label')}>
          {isFetching && !suggestions && (
            <li className="address-search__status" role="status">
              {t('search.loading')}
            </li>
          )}
          {isError && (
            <li className="address-search__status" role="status">
              {t('search.error')}
            </li>
          )}
          {suggestions && suggestions.length === 0 && (
            <li className="address-search__status" role="status">
              {t('search.noResults')}
            </li>
          )}
          {suggestions?.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                type="button"
                className="address-search__result"
                onClick={() => handleSelect(suggestion)}
              >
                {suggestion.text}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && assessment && (
        <div className="address-search__verdict" role="status">
          <p className="address-search__address">{selected.text}</p>
          <p className="address-search__distance">
            {t('noise.distance', { distance: formatDistance(assessment.distanceMeters, locale) })}
          </p>
          <p className={`address-search__level address-search__level--${assessment.level}`}>
            {t(`noise.verdict.${assessment.level}`)}
          </p>
          <p className="address-search__disclaimer">{t('noise.disclaimer')}</p>
        </div>
      )}
    </div>
  )
}
