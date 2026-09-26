import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useI18n } from '../../../shared/i18n/I18nContext'
import { OFFICIAL_NOISE_SCENARIOS, type OfficialNoiseScenario } from '../../map/constants/officialNoiseConfig'
import { formatDistance } from '../utils/assessRoadNoise'

interface ScenarioResult {
  scenario: OfficialNoiseScenario
  status: 'band_found' | 'no_matching_contour' | 'boundary' | 'overlapping_bands' | 'source_geometry_invalid'
  band: { label: string } | null
  candidateBands: { label: string }[]
}

interface AddressReportData {
  proximity: { nearestOfficialDesign: { distanceMeters: number } | null }
  noise: {
    expectedWithProject: {
      status: ScenarioResult['status'] | 'point_value_found' | 'point_range_found' | 'model_unavailable'
      valueDb: number | null
      receiverRange: { minDb: number; maxDb: number; receiverCount: number } | null
      band: { lowerDb: number; upperDb: number | null; label: string } | null
      modelYear: number | null
      forecastYear: number | null
      description: string
    }
    legacyModel: {
      metadata: { modelYear: number; forecastYear: number }
      scenarios: ScenarioResult[]
    } | null
  }
  landRequirements: { status: 'within_mapped_area' | 'boundary' | 'outside_mapped_areas' | 'source_geometry_invalid' } | null
}

export function AddressReport({ addressId }: { addressId: string }) {
  const { t, language } = useI18n()
  const report = useQuery({
    queryKey: ['address-report', addressId, language],
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async ({ signal }): Promise<AddressReportData> => {
      const response = await fetch(`/api/address-report?id=${encodeURIComponent(addressId)}&lang=${language}`, { signal })
      if (!response.ok) throw new Error(`Address report unavailable: ${response.status}`)
      return response.json() as Promise<AddressReportData>
    },
  })

  if (report.isPending) return <p className="address-search__disclaimer">{t('report.loading')}</p>
  if (report.isError) return <p className="address-search__disclaimer">{t('report.error')} <button type="button" className="address-report__retry" onClick={() => { void report.refetch() }}>{t('map.retry')}</button></p>
  const historicalModel = report.data.noise?.legacyModel
  const expected = report.data.noise?.expectedWithProject
  const officialDesign = report.data.proximity?.nearestOfficialDesign
  const formatDb = (value: number) => value.toLocaleString(language === 'da' ? 'da-DK' : 'en-GB', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const receiverRange = expected?.receiverRange
  const pointEstimate = expected?.status === 'point_value_found' || expected?.status === 'point_range_found'
  const noiseValue = pointEstimate && receiverRange
    ? formatDb(receiverRange.minDb) === formatDb(receiverRange.maxDb)
      ? formatDb(receiverRange.minDb)
      : `${formatDb(receiverRange.minDb)}–${formatDb(receiverRange.maxDb)}`
    : expected?.status === 'band_found' && expected.band
      ? expected.band.upperDb === null
        ? expected.band.label.replace(/\s*dB(?:\(A\))?\s*$/i, '')
        : `${expected.band.lowerDb}–${expected.band.upperDb}`
      : null
  const scenarios = [...historicalModel?.scenarios ?? []].sort((left, right) =>
    OFFICIAL_NOISE_SCENARIOS.indexOf(left.scenario) - OFFICIAL_NOISE_SCENARIOS.indexOf(right.scenario),
  )

  return (
    <section className="address-report" aria-label={t('report.officialData')}>
      <div className="address-report__expected">
        <h3>{t('report.expectedNoise')}</h3>
        {expected?.modelYear && expected.forecastYear && <p className="address-report__noise-model">
          {t('report.expectedNoiseModel', { modelYear: expected.modelYear, forecastYear: expected.forecastYear })}
        </p>}
        {noiseValue ? <>
          <p className="address-report__noise-value"><strong>{noiseValue}</strong> <span>dB(A) · Lden</span></p>
          <p className="address-search__disclaimer">{pointEstimate && receiverRange
            ? receiverRange.receiverCount > 1
              ? t('report.expectedNoiseRange', { count: receiverRange.receiverCount })
              : t('report.expectedNoisePoint')
            : t(expected?.band?.upperDb === null ? 'report.expectedNoiseTopBand' : 'report.expectedNoiseBand')}</p>
        </> : <>
          <p><strong>{t('report.expectedNoiseUnavailable')}</strong></p>
          <p className="address-search__disclaimer">{t('report.expectedNoiseMissing')}</p>
        </>}
        <p className="address-search__disclaimer">{t('report.expectedNoiseScope')}</p>
        <p className="address-search__disclaimer">{t('report.expectedNoiseHistorical')} <Link to="/about#noise-maps">{t('report.expectedNoiseCurrent')}</Link>.</p>
      </div>
      <details className="address-report__details">
        <summary>{t('report.expectedNoiseDetails')}</summary>
        <p>{t('report.expectedNoiseMetric')}</p>
        {expected && <p>{expected.description}</p>}
        <h3>{t('report.title')}</h3>
        {historicalModel ? <>
          <p className="address-search__disclaimer">{t('report.model', { modelYear: historicalModel.metadata.modelYear, forecastYear: historicalModel.metadata.forecastYear })}</p>
          <dl className="address-report__bands">
            {scenarios.map((scenario) => (
              <div key={scenario.scenario}>
                <dt>{t(`officialNoise.short.${scenario.scenario}`)}</dt>
                <dd>
                  {scenario.status === 'band_found' && scenario.band ? <strong>{scenario.band.label}</strong> : t(`report.status.${scenario.status}`)}
                  {(scenario.status === 'boundary' || scenario.status === 'overlapping_bands') && scenario.candidateBands.length > 0 && (
                    <span className="address-report__candidates">{scenario.candidateBands.map((band) => band.label).join(' / ')}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </> : <p>{t('report.noModel')}</p>}
        <p className="address-search__disclaimer">{t('report.caveat')}</p>
      </details>
      {officialDesign && <div className="address-report__design">
        <p><strong>{t('report.designDistance', { distance: formatDistance(officialDesign.distanceMeters, language === 'da' ? 'da-DK' : 'en-GB') })}</strong></p>
        <p className="address-search__disclaimer">{t('report.designDistanceNote')}</p>
      </div>}
      {report.data.landRequirements && <details className="address-report__land">
        <summary>{t('report.land')}</summary>
        <p>{t(`report.land.${report.data.landRequirements.status}`)}</p>
        <p className="address-search__disclaimer">{t('report.land.caveat')}</p>
      </details>}
    </section>
  )
}
