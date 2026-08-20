import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { requestPersistentStorage } from './services/storage/offlineStorage';

// Request persistent storage for PWAs on supported browsers
if (typeof window !== 'undefined') {
  requestPersistentStorage();
}

// Safe global localStorage override to handle QuotaExceededError and prevent unhandled exceptions
if (typeof window !== 'undefined' && window.localStorage) {
  const originalSetItem = window.localStorage.setItem;
  window.localStorage.setItem = (key, value) => {
    try {
      originalSetItem.call(window.localStorage, key, value);
    } catch (error: any) {
      console.warn(
        `[Storage] localStorage.setItem failed for key "${key}":`,
        error,
      );
    }
  };
}

const container = document.getElementById('root')!;

// If there is pre-rendered server HTML (not the static app-loading-screen spinner), hydrate it.
if (
  container.firstElementChild &&
  container.firstElementChild.id !== 'app-loading-screen'
) {
  hydrateRoot(
    container,
    <StrictMode>
      <App />
    </StrictMode>,
  );
} else {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
