import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { AppQueryClientProvider } from './app/providers/query-client-provider'
import { router } from './app/router'
import { I18nProvider } from './shared/i18n/I18nContext'
import { ThemeProvider } from './shared/theme/ThemeContext'
import './shared/styles/tokens.css'
import './shared/styles/global.css'
import './shared/styles/illustrations.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <AppQueryClientProvider>
          <RouterProvider router={router} />
        </AppQueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)
