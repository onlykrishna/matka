import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Capture the install prompt AS EARLY AS POSSIBLE - before React mounts.
// This ensures we never miss the event regardless of component load timing.
window.__pwaPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__pwaPrompt = e;
  console.log('PWA: Install prompt captured globally in main.jsx');
  // Dispatch a custom event so any mounted component can react to it
  window.dispatchEvent(new Event('pwaPromptReady'));
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
