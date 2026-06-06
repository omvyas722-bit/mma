import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initFrontendMonitoring, SentryErrorBoundary, initConsoleCapture } from './lib/monitoring.jsx'

initFrontendMonitoring()
initConsoleCapture()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SentryErrorBoundary>
      <App />
    </SentryErrorBoundary>
  </StrictMode>,
)
