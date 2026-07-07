import { create } from 'zustand';

interface UIState {
  isOnline: boolean;
  customOpenRouterKey: string;
  translationTargetLanguage: string | null;
  readerFontSize: number;
  readerUseSerif: boolean;
  readerTextAlignment: 'left' | 'center' | 'right' | 'justify';
  setIsOnline: (isOnline: boolean) => void;
  setCustomOpenRouterKey: (key: string) => void;
  setTranslationTargetLanguage: (lang: string | null) => void;
  setReaderFontSize: (size: number) => void;
  setReaderUseSerif: (useSerif: boolean) => void;
  setReaderTextAlignment: (
    alignment: 'left' | 'center' | 'right' | 'justify',
  ) => void;
  initializeClientState: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isOnline: true,
  customOpenRouterKey: '',
  translationTargetLanguage: null,
  readerFontSize: 18,
  readerUseSerif: true,
  readerTextAlignment: 'justify',
  setIsOnline: (isOnline) => set({ isOnline }),
  setCustomOpenRouterKey: (key) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('custom_openrouter_api_key', key);
    }
    set({ customOpenRouterKey: key });
  },
  setTranslationTargetLanguage: (lang) => {
    if (typeof localStorage !== 'undefined') {
      if (lang) {
        localStorage.setItem('translation_target_language', lang);
      } else {
        localStorage.removeItem('translation_target_language');
      }
    }
    set({ translationTargetLanguage: lang });
  },
  setReaderFontSize: (size) => {
    const validatedSize =
      typeof size === 'number' && size >= 14 && size <= 26 ? size : 18;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('reader-font-size', validatedSize.toString());
    }
    set({ readerFontSize: validatedSize });
  },
  setReaderUseSerif: (useSerif) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('reader-use-serif', useSerif.toString());
    }
    set({ readerUseSerif: useSerif });
  },
  setReaderTextAlignment: (alignment) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('reader-text-alignment', alignment);
    }
    set({ readerTextAlignment: alignment });
  },
  initializeClientState: () => {
    if (typeof localStorage !== 'undefined') {
      const key = localStorage.getItem('custom_openrouter_api_key') || '';
      const lang = localStorage.getItem('translation_target_language') || null;
      const sizeVal = localStorage.getItem('reader-font-size');
      let size = sizeVal ? Number.parseInt(sizeVal, 10) : 18;
      if (Number.isNaN(size) || size < 14 || size > 26) {
        size = 18;
      }
      const serifVal = localStorage.getItem('reader-use-serif');
      const serif = serifVal !== null ? serifVal === 'true' : true;
      const alignVal = localStorage.getItem('reader-text-alignment');
      const align =
        alignVal === 'left' ||
        alignVal === 'center' ||
        alignVal === 'right' ||
        alignVal === 'justify'
          ? alignVal
          : 'justify';
      set({
        customOpenRouterKey: key,
        translationTargetLanguage: lang,
        readerFontSize: size,
        readerUseSerif: serif,
        readerTextAlignment: align,
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
