import addressReport from '../api/address-report.js'

export function addressApiPlugin() {
  const register = (server) => {
    server.middlewares.use((req, res, next) => {
      if (new URL(req.url, 'http://localhost').pathname !== '/api/address-report') {
        next()
        return
      }
      void addressReport(req, res)
    })
  }
  return {
    name: 'address-report-api',
    configureServer: register,
    configurePreviewServer: register,
  }
}
