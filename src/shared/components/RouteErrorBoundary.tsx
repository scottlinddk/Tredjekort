import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()

  const title = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : 'Something went wrong'

  const message = isRouteErrorResponse(error)
    ? (error.data?.message ?? 'This page could not be loaded.')
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.'

  return (
    <div className="route-error">
      <h1 className="route-error__title">{title}</h1>
      <p className="route-error__message">{message}</p>
      <button type="button" className="route-error__action" onClick={() => navigate('/')}>
        Back to map
      </button>
    </div>
  )
}
