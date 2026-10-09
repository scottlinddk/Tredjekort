import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { addressApiPlugin } from './server/vite-api-plugin.js'

// Server-side secrets read by server/dar.js. Vite only exposes VITE_* variables to the
// browser, so these are copied from .env files into process.env for the dev/preview API
// middleware only. They never reach the client bundle.
const SERVER_ENV_KEYS = ['DATAFORSYNINGEN_TOKEN', 'DATAFORDELER_API_KEY', 'DAR_GRAPHQL_URL']

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of SERVER_ENV_KEYS) {
    if (env[key]) process.env[key] ??= env[key]
  }
  return {
    plugins: [react(), addressApiPlugin()],
    server: {
      proxy: {
        // Mirrors the Vercel serverless function in api/changes.js so `npm run dev`
        // serves the same /api/changes endpoint (the monitor's change feed, read
        // live from the monitor-data branch).
        '/api/changes': {
          target: 'https://raw.githubusercontent.com',
          changeOrigin: true,
          rewrite: () => '/scottlinddk/Tredjekort/monitor-data/changes-feed.json',
        },
      },
    },
  }
})
