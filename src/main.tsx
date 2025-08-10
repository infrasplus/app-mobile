import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

if ('serviceWorker' in navigator) {
  const isUIPreview = () =>
    window.location.pathname.startsWith('/ui-preview') ||
    new URLSearchParams(window.location.search).has('uiPreview');

  if (!isUIPreview()) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.error('Service Worker registration failed:', err));
    });
  }
}

