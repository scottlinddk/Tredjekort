import { useState, type CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useI18n } from '../shared/i18n/I18nContext'
import { CrossingProfile } from '../features/alternatives/components/CrossingProfile'
import { CostComparison } from '../features/alternatives/components/CostComparison'
import {
  CROSSING_STYLE,
  consolidation,
  formatBn,
  formatSaving,
  isCrossingAlternativeId,
} from '../features/alternatives/constants/alternatives'
import type { CrossingAlternativeId } from '../features/alternatives/types/alternatives.types'
import '../shared/styles/project.css'
import '../shared/styles/alternatives.css'

function formatMio(value: number, language: 'da' | 'en', approximate = false) {
  const text = new Intl.NumberFormat(language === 'da' ? 'da-DK' : 'en-GB', { maximumFractionDigits: 1 }).format(value)
  return approximate ? `~${text}` : text
}

export function AlternativesRoute() {
  const { t, language } = useI18n()
  const [searchParams] = useSearchParams()
  const initial = searchParams.get('crossing')
  const [selected, setSelected] = useState<CrossingAlternativeId>(isCrossingAlternativeId(initial) ? initial : 'cut-and-cover')
  const alternative = consolidation.crossingAlternatives.find((item) => item.id === selected)!
  const { budget, costDrivers, immersedTunnelSavings, alignmentAlternative, nextSteps } = consolidation
  const pdf = (page: number) => `${consolidation.sourceUrl}#page=${page}`
  const mapLink = (crossing: CrossingAlternativeId) =>
    `/?alternatives=1&noiseScenario=none${crossing === 'immersed-tunnel' ? '' : `&crossing=${crossing}`}`

  return (
    <article className="project-overview alternatives-route">
      <p className="project-eyebrow">{t('alternatives.eyebrow', { date: consolidation.sourceDate })}</p>
      <h1>{t('alternatives.title')}</h1>
      <p className="project-lead">{t('alternatives.lead')}</p>
      <p className="alternatives-caveat" role="note">{consolidation.caveat[language]}</p>

      <div className="project-stats">
        <div><strong>{formatBn(9.0565, language)} → ~{formatBn(12.5, language)}</strong><span>{t('alternatives.stat.total')}</span></div>
        <div><strong>~{formatBn(3.5, language)}</strong><span>{t('alternatives.stat.increase')}</span></div>
        <div><strong>{t('alternatives.stat.decisionValue')}</strong><span>{t('alternatives.stat.decision')}</span></div>
      </div>

      <nav className="project-shortcuts" aria-label={t('alternatives.onThisPage')}>
        <a href="#crossing">{t('alternatives.section.crossing')}</a>
        <a href="#alignment">{t('alternatives.section.alignment')}</a>
        <a href="#budget">{t('alternatives.section.budget')}</a>
        <a href={consolidation.sourceUrl} target="_blank" rel="noreferrer">{t('alternatives.sourcePdf')} ↗</a>
      </nav>

      <section id="crossing">
        <h2>{t('alternatives.section.crossing')}</h2>
        <p>{t('alternatives.crossing.intro')}</p>
        <div className="alternatives-tabs" role="tablist" aria-label={t('alternatives.section.crossing')}>
          {consolidation.crossingAlternatives.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={selected === item.id}
              aria-controls="crossing-panel"
              className="alternatives-tab"
              style={{ '--alternative-color': CROSSING_STYLE[item.id].color } as CSSProperties}
              onClick={() => setSelected(item.id)}
            >
              <span className="alternatives-tab__swatch" aria-hidden="true" />
              <span className="alternatives-tab__title">{item.title[language]}</span>
              <span className="alternatives-tab__saving">
                {item.isBaseline ? t('alternatives.baseline') : t('alternatives.saving', { value: formatSaving(item.savingMinBn, item.savingMaxBn, language) })}
              </span>
            </button>
          ))}
        </div>
        <div className="alternatives-panel" role="tabpanel" id="crossing-panel" aria-labelledby={`tab-${selected}`}>
          <CrossingProfile alternative={selected} />
          <div className="alternatives-panel__facts">
            <h3>{alternative.title[language]}</h3>
            <p>{alternative.summary[language]}</p>
            <dl className="alternatives-facts">
              <dt>{t('alternatives.fact.saving')}</dt>
              <dd>{alternative.isBaseline ? t('alternatives.baselineLong') : `${formatSaving(alternative.savingMinBn, alternative.savingMaxBn, language)} ${t('alternatives.bn')}`}</dd>
              <dt>{t('alternatives.fact.ships')}</dt>
              <dd>{t(alternative.shipsPass === 'always' ? 'alternatives.ships.always' : 'alternatives.ships.whenOpen')}</dd>
              <dt>{t('alternatives.fact.traffic')}</dt>
              <dd>{t(alternative.trafficStopsForShips ? 'alternatives.traffic.stops' : 'alternatives.traffic.continuous')}</dd>
            </dl>
            <p className="project-eyebrow">
              <a href={pdf(alternative.sourcePage)} target="_blank" rel="noreferrer">{t('alternatives.sourcePage', { page: alternative.sourcePage })} ↗</a>
              {' · '}
              <Link to={mapLink(selected)}>{t('alternatives.showOnMap')} →</Link>
            </p>
          </div>
        </div>
        <CostComparison selected={selected} onSelect={setSelected} />
        <details className="alternatives-details">
          <summary>{t('alternatives.tunnelSavings.title', { value: formatBn(immersedTunnelSavings.totalBn, language) })}</summary>
          <p>{t('alternatives.tunnelSavings.intro')}</p>
          <ul>
            {immersedTunnelSavings.items.map((item) => (
              <li key={item.id}><span>{item.label[language]}</span><strong>−{formatMio(item.mio, language)} {t('alternatives.mio')}</strong></li>
            ))}
          </ul>
          <a href={pdf(immersedTunnelSavings.sourcePage)} target="_blank" rel="noreferrer">{t('alternatives.sourcePage', { page: immersedTunnelSavings.sourcePage })} ↗</a>
        </details>
      </section>

      <section id="alignment">
        <h2>{alignmentAlternative.title[language]}</h2>
        <p>{alignmentAlternative.summary[language]}</p>
        <dl className="alternatives-facts">
          <dt>{t('alternatives.fact.saving')}</dt>
          <dd>{formatSaving(alignmentAlternative.savingMinBn, alignmentAlternative.savingMaxBn, language)} {t('alternatives.bn')}</dd>
        </dl>
        <p className="layer-toggle__note">{t('alternatives.alignment.caveat')}</p>
        <p>
          <Link className="alternatives-cta" to={mapLink('immersed-tunnel')}>{t('alternatives.alignment.openMap')} →</Link>
          {' '}
          <a href={pdf(alignmentAlternative.sourcePage)} target="_blank" rel="noreferrer">{t('alternatives.sourcePage', { page: alignmentAlternative.sourcePage })} ↗</a>
        </p>
      </section>

      <section id="budget">
        <h2>{t('alternatives.section.budget')}</h2>
        <div className="alternatives-table-wrap">
          <table className="alternatives-table">
            <caption>{t('alternatives.budget.caption', { priceLevel: consolidation.priceLevel })}</caption>
            <thead>
              <tr>
                <th scope="col">{t('alternatives.budget.item')}</th>
                <th scope="col">{t('alternatives.budget.original')}</th>
                <th scope="col">{t('alternatives.budget.november')}</th>
                <th scope="col">{t('alternatives.budget.increase')}</th>
              </tr>
            </thead>
            <tbody>
              {budget.rows.map((row) => (
                <tr key={row.id} className={row.isTotal ? 'alternatives-table__total' : undefined}>
                  <th scope="row">{row.label[language]}</th>
                  <td>{formatMio(row.original, language)}</td>
                  <td>{formatMio(row.november2026, language, row.november2026Approximate)}</td>
                  <td>{row.increase === null ? '–' : formatMio(row.increase, language, row.increaseApproximate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="layer-toggle__note">{budget.reserveNote[language]} {t('alternatives.budget.reserveObservation')}</p>
        <h3>{t('alternatives.drivers.title')}</h3>
        <div className="project-facts">
          {costDrivers.map((driver) => (
            <section className="project-fact" key={driver.id}>
              <p className="project-eyebrow">{t('alternatives.drivers.amount', { value: formatSaving(driver.minBn, driver.maxBn, language) })}</p>
              <h3>{driver.title[language]}</h3>
              <p>{driver.summary[language]}</p>
              <a href={pdf(driver.sourcePage)} target="_blank" rel="noreferrer">{t('alternatives.sourcePage', { page: driver.sourcePage })} ↗</a>
            </section>
          ))}
        </div>
        <a href={pdf(budget.sourcePage)} target="_blank" rel="noreferrer">{t('alternatives.sourcePage', { page: budget.sourcePage })} ↗</a>
      </section>

      <section className="project-limitations">
        <h2>{t('alternatives.next.title')}</h2>
        <p>{nextSteps[language]}</p>
        <p>{t('alternatives.next.limitations')}</p>
      </section>
    </article>
  )
}
