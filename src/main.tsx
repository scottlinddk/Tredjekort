import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { AppQueryClientProvider } from './app/providers/query-client-provider'
import { router } from './app/router'
import './shared/styles/tokens.css'
import './shared/styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppQueryClientProvider>
      <RouterProvider router={router} />
    </AppQueryClientProvider>
  </StrictMode>,
)
