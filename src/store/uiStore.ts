import { create } from 'zustand';

interface UIState {
  isOnline: boolean;
  customOpenRouterKey: string;
  translationTargetLanguage: string;
  setIsOnline: (isOnline: boolean) => void;
  setCustomOpenRouterKey: (key: string) => void;
  setTranslationTargetLanguage: (lang: string) => void;
  initializeClientState: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isOnline: true,
  customOpenRouterKey: '',
  translationTargetLanguage: 'English',
  setIsOnline: (isOnline) => set({ isOnline }),
  setCustomOpenRouterKey: (key) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('custom_openrouter_api_key', key);
    }
    set({ customOpenRouterKey: key });
  },
  setTranslationTargetLanguage: (lang) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('translation_target_language', lang);
    }
    set({ translationTargetLanguage: lang });
  },
  initializeClientState: () => {
    if (typeof localStorage !== 'undefined') {
      const key = localStorage.getItem('custom_openrouter_api_key') || '';
      const lang =
        localStorage.getItem('translation_target_language') || 'English';
      set({
        customOpenRouterKey: key,
        translationTargetLanguage: lang,
      });
    }
    if (typeof navigator !== 'undefined') {
      set({ isOnline: navigator.onLine });
    }
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('online', () =>
    useUIStore.getState().setIsOnline(true),
  );
  window.addEventListener('offline', () =>
    useUIStore.getState().setIsOnline(false),
  );
}
