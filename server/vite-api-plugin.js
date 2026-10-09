import addresses from '../api/addresses.js'
import addressReport from '../api/address-report.js'

const routes = new Map([
  ['/api/addresses', addresses],
  ['/api/address-report', addressReport],
])

export function addressApiPlugin() {
  const register = (server) => {
    server.middlewares.use((req, res, next) => {
      const handler = routes.get(new URL(req.url, 'http://localhost').pathname)
      if (!handler) {
        next()
        return
      }
      void handler(req, res)
    })
  }
  return {
    name: 'address-report-api',
    configureServer: register,
    configurePreviewServer: register,
  }
}
