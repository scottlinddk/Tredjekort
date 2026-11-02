import { Link } from 'react-router'
import { useI18n } from '../../../shared/i18n/I18nContext'
import {
  CITY_ROAD_ANNOYANCE_AT_58_PCT_BELOW,
  E45_MODEL_ERROR,
  GUIDELINE_LIMIT_DB,
  MOTORWAY_ANNOYANCE_ANCHORS,
  SILKEBORG_PRECEDENT,
  TRAFFIC_SCENARIOS,
  WHO_RECOMMENDATION_DB,
} from '../data/noiseEvidence'
import { trafficSensitivity, type NoiseRange } from '../utils/noiseSensitivity'

/**
 * Puts the official figure in context: how far it could move, and how the guideline
 * limit relates to annoyance. Independent evidence only; it never replaces the official value.
 */
export function NoiseContext({ range }: { range: NoiseRange }) {
  const { t, language } = useI18n()
  const locale = language === 'da' ? 'da-DK' : 'en-GB'
  const fmt = (value: number) => value.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const fmtRange = (min: number, max: number | null) =>
    max === null ? `${fmt(min)}+` : min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`
  const rows = trafficSensitivity(range, TRAFFIC_SCENARIOS)
  const top = range.maxDb ?? range.minDb

  return (
    <details className="address-report__details noise-context">
      <summary>{t('noiseContext.summary')}</summary>

      <h3>{t('noiseContext.traffic.title')}</h3>
      <p className="address-search__disclaimer">
        {t('noiseContext.traffic.intro', {
          min: SILKEBORG_PRECEDENT.trafficAboveForecastMinPct,
          max: SILKEBORG_PRECEDENT.trafficAboveForecastMaxPct,
          db: SILKEBORG_PRECEDENT.extraNoiseDb,
        })}
      </p>
      <table className="noise-context__table">
        <thead>
          <tr>
            <th scope="col">{t('noiseContext.traffic.scenario')}</th>
            <th scope="col">{t('noiseContext.traffic.result')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{t('noiseContext.traffic.forecast')}</th>
            <td>{fmtRange(range.minDb, range.maxDb)} dB</td>
          </tr>
          {rows.map((row) => (
            <tr key={row.trafficRatio}>
              <th scope="row">{t('noiseContext.traffic.plus', { pct: Math.round((row.trafficRatio - 1) * 100) })}</th>
              <td>
                {fmtRange(row.minDb, row.maxDb)} dB <span className="noise-context__delta">(+{fmt(row.deltaDb)})</span>
                {row.crossesGuidelineLimit && <strong className="noise-context__flag"> {t('noiseContext.traffic.crosses', { limit: GUIDELINE_LIMIT_DB })}</strong>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="address-search__disclaimer">{t('noiseContext.traffic.caveat')}</p>

      <h3>{t('noiseContext.model.title')}</h3>
      <p className="address-search__disclaimer">
        {t('noiseContext.model.body', { min: fmt(E45_MODEL_ERROR.calculatedAboveMeasuredMinDb), max: fmt(E45_MODEL_ERROR.calculatedAboveMeasuredMaxDb) })}
      </p>
      <p className="address-search__disclaimer">{t('noiseContext.model.gap')}</p>

      <h3>{t('noiseContext.annoyance.title')}</h3>
      <ul className="noise-context__list">
        {MOTORWAY_ANNOYANCE_ANCHORS.map((anchor) => (
          <li key={anchor.aboveDb}>
            {t('noiseContext.annoyance.anchor', { pct: anchor.sharePct, db: anchor.aboveDb })}
            {top >= anchor.aboveDb && <strong className="noise-context__flag"> {t('noiseContext.annoyance.applies')}</strong>}
          </li>
        ))}
        <li>{t('noiseContext.annoyance.city', { pct: CITY_ROAD_ANNOYANCE_AT_58_PCT_BELOW, db: GUIDELINE_LIMIT_DB })}</li>
      </ul>
      <p className="address-search__disclaimer">
        {t('noiseContext.annoyance.who', { who: WHO_RECOMMENDATION_DB, limit: GUIDELINE_LIMIT_DB })}
      </p>
      <p className="address-search__disclaimer">{t('noiseContext.annoyance.caveat')}</p>

      <h3>{t('noiseContext.gaps.title')}</h3>
      <ul className="noise-context__list">
        <li>{t('noiseContext.gaps.fjord')}</li>
        <li>{t('noiseContext.gaps.screens')}</li>
        <li>{t('noiseContext.gaps.lnight')}</li>
      </ul>
      <p className="address-search__disclaimer"><Link to="/sources">{t('noiseContext.sources')}</Link></p>
    </details>
  )
}
