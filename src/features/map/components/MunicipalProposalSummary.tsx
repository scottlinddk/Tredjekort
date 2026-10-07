import { useI18n } from '../../../shared/i18n/I18nContext'
import { useMunicipalProposal } from '../hooks/useMunicipalProposal'

const formatCount = (value: number, language: string) => value.toLocaleString(language === 'da' ? 'da-DK' : 'en-GB')

// Traffic figures per segment, including segments that are not drawn on the map yet.
export function MunicipalProposalSummary() {
  const { t, language } = useI18n()
  const { data, isError, refetch } = useMunicipalProposal(true)

  if (isError) return <button type="button" className="map-tools__close" onClick={() => { void refetch() }}>{t('municipalProposal.error')}</button>
  if (!data) return <p role="status" className="layer-toggle__note">{t('municipalProposal.loading')}</p>

  const { metadata } = data
  return (
    <div className="municipal-proposal">
      <p className="layer-toggle__note">{t('municipalProposal.caveat')}</p>
      <table className="municipal-proposal__table">
        <caption>{t('municipalProposal.tableCaption', { year: String(data.features[0]?.properties.forecastYear ?? '') })}</caption>
        <thead>
          <tr>
            <th scope="col">{t('municipalProposal.segment')}</th>
            <th scope="col">{t('municipalProposal.today')}</th>
            <th scope="col">{t('municipalProposal.forecast')}</th>
          </tr>
        </thead>
        <tbody>
          {data.features.map(({ properties, geometry }) => (
            <tr key={properties.id}>
              <th scope="row">
                {properties.name[language]}
                {!geometry && <span className="municipal-proposal__undrawn">{t('municipalProposal.notDrawn')}</span>}
              </th>
              <td>{properties.aadtCurrent === null ? t('municipalProposal.newRoad') : formatCount(properties.aadtCurrent, language)}</td>
              <td>{formatCount(properties.aadtForecast, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="layer-toggle__note">
        {t('municipalProposal.comparison', { road: metadata.comparison.road, count: formatCount(metadata.comparison.aadtCurrent, language) })}
      </p>
      {!metadata.closures.mapped && <p className="layer-toggle__note">{t('municipalProposal.closuresNotMapped')}</p>}
      <a className="map-tools__resource" href={metadata.sourceUrl} target="_blank" rel="noreferrer">{t('municipalProposal.source')} →</a>
    </div>
  )
}
