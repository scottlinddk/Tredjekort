import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import addresses from '../api/addresses.js'
import addressReport from '../api/address-report.js'
import changes from '../api/changes.js'

const root = fileURLToPath(new URL('../dist/', import.meta.url))
const routes = new Map([
  ['/api/addresses', addresses],
  ['/api/address-report', addressReport],
  ['/api/changes', changes],
])
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.pdf': 'application/pdf', '.gz': 'application/gzip', '.txt': 'text/plain; charset=utf-8',
}
const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  // Preserve the small Vercel response interface used by the change-feed handler.
  res.status = (code) => { res.statusCode = code; return res }
  res.json = (body) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(body))
  }
  try {
    let pathname
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname) }
    catch { res.status(400).end('Bad request'); return }
    if (pathname === '/healthz') {
      res.setHeader('Cache-Control', 'no-store')
      res.json({ status: 'ok' })
      return
    }
    const handler = routes.get(pathname)
    if (handler) { await handler(req, res); return }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD')
      res.status(405).end('Method not allowed')
      return
    }
    let file = resolve(root, '.' + pathname)
    if (file !== resolve(root) && !file.startsWith(root.endsWith(sep) ? root : root + sep)) {
      res.status(403).end('Forbidden')
      return
    }
    let info = await stat(file).catch(() => null)
    if (!info?.isFile()) {
      // API and asset misses must never return the SPA HTML.
      if (pathname.startsWith('/api/') || pathname.startsWith('/data/') ||
          pathname.startsWith('/assets/') || extname(pathname)) {
        res.status(404).end('Not found')
        return
      }
      file = resolve(root, 'index.html')
      info = await stat(file)
    }
    res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream')
    res.setHeader('Content-Length', info.size)
    res.setHeader('Cache-Control', pathname.startsWith('/assets/')
      ? 'public, max-age=31536000, immutable' : 'no-cache')
    if (req.method === 'HEAD') { res.end(); return }
    const stream = createReadStream(file)
    stream.on('error', () => res.destroy())
    stream.pipe(res)
  } catch {
    // Never disclose upstream errors or server-side credentials.
    if (res.headersSent) { res.destroy(); return }
    res.status(500).json({ error: 'Internal server error' })
  }
})
server.requestTimeout = 30_000
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => {
  console.log('Tredjekort listening on port ' + (process.env.PORT || 3000))
})
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 10_000).unref()
  })
}
