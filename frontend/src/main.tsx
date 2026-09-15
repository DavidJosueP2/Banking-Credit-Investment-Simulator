import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/libre-baskerville/latin-400.css'

import { AppProviders } from '@/app/providers/app-providers'
import App from '@/App'
import '@/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
