import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'
import { useI18n } from '../i18n/I18nContext'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()
  const { t } = useI18n()

  const title = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : t('error.title')

  const message = isRouteErrorResponse(error)
    ? (error.data?.message ?? t('error.pageLoad'))
    : error instanceof Error
      ? error.message
      : t('error.unexpected')

  return (
    <div className="route-error">
      <h1 className="route-error__title">{title}</h1>
      <p className="route-error__message">{message}</p>
      <button type="button" className="route-error__action" onClick={() => navigate('/')}>
        {t('error.backToMap')}
      </button>
    </div>
  )
}
