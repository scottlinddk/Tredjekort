import type { CSSProperties } from 'react'
import { useI18n } from '../../../shared/i18n/I18nContext'
import { CROSSING_STYLE, consolidation, formatBn } from '../constants/alternatives'
import type { CrossingAlternativeId } from '../types/alternatives.types'

const SCALE_MAX_BN = 13

// Estimated total per crossing solution: the ~12.5 bn November 2026 total minus the
// published saving. This subtraction is ours, not an official total estimate, and the
// savings of different measures are not shown as combinable because the source does not
// say they are.
export function CostComparison({ selected, onSelect }: { selected: CrossingAlternativeId; onSelect: (id: CrossingAlternativeId) => void }) {
  const { t, language } = useI18n()
  const total = consolidation.budget.rows.find((row) => row.id === 'total')!
  const totalBn = total.november2026 / 1000
  const originalBn = total.original / 1000
  const percent = (value: number) => `${(value / SCALE_MAX_BN) * 100}%`

  return (
    <figure className="cost-comparison">
      <figcaption className="cost-comparison__title">{t('alternatives.cost.title')}</figcaption>
      <div className="cost-comparison__plot" style={{ '--original-fraction': originalBn / SCALE_MAX_BN } as CSSProperties}>
        <span className="cost-comparison__reference" aria-hidden="true">
          <span>{t('alternatives.cost.original', { value: formatBn(originalBn, language) })}</span>
        </span>
        {consolidation.crossingAlternatives.map((alternative) => {
          const low = totalBn - alternative.savingMaxBn
          const high = totalBn - alternative.savingMinBn
          const value = low === high ? formatBn(low, language) : `${formatBn(low, language)}–${formatBn(high, language)}`
          return (
            <button
              type="button"
              key={alternative.id}
              className={`cost-row${selected === alternative.id ? ' cost-row--selected' : ''}`}
              aria-pressed={selected === alternative.id}
              onClick={() => onSelect(alternative.id)}
              style={{ '--alternative-color': CROSSING_STYLE[alternative.id].color } as CSSProperties}
              title={t('alternatives.cost.tooltip', { value })}
            >
              <span className="cost-row__label">{alternative.title[language]}</span>
              <span className="cost-row__track">
                <span className="cost-row__bar" style={{ width: percent(low) }} />
                {high > low && <span className="cost-row__range" style={{ left: percent(low), width: percent(high - low) }} />}
              </span>
              <span className="cost-row__value">≈ {value} {t('alternatives.bn')}</span>
            </button>
          )
        })}
      </div>
      <p className="cost-comparison__note">{t('alternatives.cost.note', { total: formatBn(totalBn, language) })}</p>
    </figure>
  )
}
