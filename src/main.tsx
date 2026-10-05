import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Bundled with the site rather than loaded from Google Fonts, so visitors' IPs aren't sent to Google.
import '@fontsource-variable/plus-jakarta-sans'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
