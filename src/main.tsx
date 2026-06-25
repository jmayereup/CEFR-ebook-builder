import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe global localStorage override to handle QuotaExceededError and prevent app crashes
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
      const isQuotaError =
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22 ||
        error.number === -2147024882;

      if (isQuotaError) {
        console.log(
          '[Storage] Attempting to free space by evicting cached stories...',
        );
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k?.startsWith('cefr_story_cache_')) {
              keysToRemove.push(k);
            }
          }
          for (const k of keysToRemove) {
            window.localStorage.removeItem(k);
          }
          // Try again after eviction
          originalSetItem.call(window.localStorage, key, value);
          console.log(
            '[Storage] Successfully saved item after evicting cached stories.',
          );
        } catch (retryError) {
          console.error(
            '[Storage] Failed to save even after evicting cached stories:',
            retryError,
          );
        }
      }
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
