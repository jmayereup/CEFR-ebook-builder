import { create } from 'zustand';

interface UIState {
  isOnline: boolean;
  customOpenRouterKey: string;
  translationTargetLanguage: string | null;
  defaultStoryModel: string;
  defaultGlossaryModel: string;
  defaultTranslationModel: string;
  readerFontSize: number;
  readerUseSerif: boolean;
  readerTextAlignment: 'left' | 'center' | 'right' | 'justify';
  readerColumnWidth: 'narrow' | 'medium' | 'wide' | 'full';
  setIsOnline: (isOnline: boolean) => void;
  setCustomOpenRouterKey: (key: string) => void;
  setTranslationTargetLanguage: (lang: string | null) => void;
  setDefaultStoryModel: (model: string) => void;
  setDefaultGlossaryModel: (model: string) => void;
  setDefaultTranslationModel: (model: string) => void;
  setReaderFontSize: (size: number) => void;
  setReaderUseSerif: (useSerif: boolean) => void;
  setReaderTextAlignment: (
    alignment: 'left' | 'center' | 'right' | 'justify',
  ) => void;
  setReaderColumnWidth: (
    columnWidth: 'narrow' | 'medium' | 'wide' | 'full',
  ) => void;
  initializeClientState: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isOnline: true,
  customOpenRouterKey: '',
  translationTargetLanguage: null,
  defaultStoryModel: 'deepseek/deepseek-v4-pro',
  defaultGlossaryModel: 'google/gemini-2.5-flash-lite',
  defaultTranslationModel: 'google/gemini-2.5-flash-lite',
  readerFontSize: 18,
  readerUseSerif: true,
  readerTextAlignment: 'justify',
  readerColumnWidth: 'medium',
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
  setDefaultStoryModel: (model) => {
    if (typeof localStorage !== 'undefined') {
      if (model) {
        localStorage.setItem('custom_default_story_model', model);
      } else {
        localStorage.removeItem('custom_default_story_model');
      }
    }
    set({ defaultStoryModel: model || 'deepseek/deepseek-v4-pro' });
  },
  setDefaultGlossaryModel: (model) => {
    if (typeof localStorage !== 'undefined') {
      if (model) {
        localStorage.setItem('custom_default_glossary_model', model);
      } else {
        localStorage.removeItem('custom_default_glossary_model');
      }
    }
    set({ defaultGlossaryModel: model || 'google/gemini-2.5-flash-lite' });
  },
  setDefaultTranslationModel: (model) => {
    if (typeof localStorage !== 'undefined') {
      if (model) {
        localStorage.setItem('custom_default_translation_model', model);
      } else {
        localStorage.removeItem('custom_default_translation_model');
      }
    }
    set({ defaultTranslationModel: model || 'google/gemini-2.5-flash-lite' });
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
  setReaderColumnWidth: (columnWidth) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('reader-column-width', columnWidth);
    }
    set({ readerColumnWidth: columnWidth });
  },
  initializeClientState: () => {
    if (typeof localStorage !== 'undefined') {
      const key = localStorage.getItem('custom_openrouter_api_key') || '';
      const lang = localStorage.getItem('translation_target_language') || null;
      const storyModel =
        localStorage.getItem('custom_default_story_model') ||
        'deepseek/deepseek-v4-pro';
      const glossaryModel =
        localStorage.getItem('custom_default_glossary_model') ||
        'google/gemini-2.5-flash-lite';
      const translationModel =
        localStorage.getItem('custom_default_translation_model') ||
        'google/gemini-2.5-flash-lite';
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
      const widthVal = localStorage.getItem('reader-column-width');
      const width =
        widthVal === 'narrow' ||
        widthVal === 'medium' ||
        widthVal === 'wide' ||
        widthVal === 'full'
          ? widthVal
          : 'medium';
      set({
        customOpenRouterKey: key,
        translationTargetLanguage: lang,
        defaultStoryModel: storyModel,
        defaultGlossaryModel: glossaryModel,
        defaultTranslationModel: translationModel,
        readerFontSize: size,
        readerUseSerif: serif,
        readerTextAlignment: align,
        readerColumnWidth: width,
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
