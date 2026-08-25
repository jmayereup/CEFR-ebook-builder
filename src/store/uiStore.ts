import { create } from 'zustand';
import {
  getGuestCompletedStoryIds,
  migrateFromLocalStorage,
  saveGuestCompletedStoryIds,
} from '../services/storage/offlineStorage';

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
  guestCompletedStoryIds: string[];
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
  setGuestCompletedStoryIds: (ids: string[]) => void;
  addGuestCompletedStoryId: (id: string) => void;
  removeGuestCompletedStoryId: (id: string) => void;
  initializeClientState: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  isOnline:
    typeof window !== 'undefined' && typeof navigator !== 'undefined'
      ? navigator.onLine
      : true,
  customOpenRouterKey: '',
  translationTargetLanguage: null,
  defaultStoryModel: 'deepseek/deepseek-v4-pro',
  defaultGlossaryModel: 'google/gemini-2.5-flash-lite',
  defaultTranslationModel: 'google/gemini-2.5-flash-lite',
  readerFontSize: 18,
  readerUseSerif: true,
  readerTextAlignment: 'justify',
  readerColumnWidth: 'medium',
  guestCompletedStoryIds: [],
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
  setGuestCompletedStoryIds: (ids) => {
    set({ guestCompletedStoryIds: ids });
    saveGuestCompletedStoryIds(ids);
  },
  addGuestCompletedStoryId: (id) => {
    const current = get().guestCompletedStoryIds;
    if (!current.includes(id)) {
      const updated = [...current, id];
      set({ guestCompletedStoryIds: updated });
      saveGuestCompletedStoryIds(updated);
    }
  },
  removeGuestCompletedStoryId: (id) => {
    const current = get().guestCompletedStoryIds;
    const updated = current.filter((item) => item !== id);
    set({ guestCompletedStoryIds: updated });
    saveGuestCompletedStoryIds(updated);
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

      // Background migration and guest completed story IDs load
      (async () => {
        try {
          await migrateFromLocalStorage();
          const ids = await getGuestCompletedStoryIds();
          set({ guestCompletedStoryIds: ids });
        } catch (e) {
          console.error(
            '[uiStore] Failed to initialize offline storage/migration:',
            e,
          );
        }
      })();
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
