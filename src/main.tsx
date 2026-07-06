import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { AppQueryClientProvider } from './app/providers/query-client-provider'
import { router } from './app/router'
import { I18nProvider } from './shared/i18n/I18nContext'
import './shared/styles/tokens.css'
import './shared/styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <AppQueryClientProvider>
        <RouterProvider router={router} />
      </AppQueryClientProvider>
    </I18nProvider>
  </StrictMode>,
)
