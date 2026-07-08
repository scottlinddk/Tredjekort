import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Mirrors the Vercel serverless function in api/addresses.js so `npm run dev`
      // serves the same /api/addresses endpoint (raw DAWA autocomplete JSON).
      '/api/addresses': {
        target: 'https://api.dataforsyningen.dk',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/api\/addresses/, '/adgangsadresser/autocomplete') +
          (path.includes('?') ? '&' : '?') +
          'per_side=8&fuzzy=',
      },
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
})
