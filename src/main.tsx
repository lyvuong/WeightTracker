import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Only register the service worker in production builds. Its fetch handler
// caches every same-origin GET request (stale-while-revalidate), which in
// dev mode would serve stale cached JS modules instead of Vite's live code.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
      .catch(err => console.log('[PWA] Service Worker registration failed:', err));
  });
}
