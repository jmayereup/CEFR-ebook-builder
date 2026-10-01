import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Languages,
  Loader2,
  X,
} from 'lucide-react';

import type { IUser } from '../../../services/types';

interface ToastActionButtonsProps {
  currentUser: IUser | null;
  isOnline?: boolean;
  isFetching: boolean;
  translation: string;
  isSaved?: boolean;
  hasPrev?: boolean;
  hasNext?: boolean;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  onClose?: () => void;
  onFetchTranslation: () => void;
  onSaveWordRecord: () => void;
  onRemoveWordRecord?: () => void;
}

export default function ToastActionButtons({
  currentUser,
  isOnline = true,
  isFetching,
  translation,
  isSaved = false,
  hasPrev,
  hasNext,
  onNavigatePrev,
  onNavigateNext,
  onClose,
  onFetchTranslation,
  onSaveWordRecord,
  onRemoveWordRecord,
}: ToastActionButtonsProps) {
  return (
    <div className="flex flex-col justify-center lg:justify-start items-center lg:items-end shrink-0 min-w-[110px]">
      {/* On wider screens, render the nav arrows and close button in the upper right corner */}
      {onClose && (
        <div className="hidden lg:flex items-center justify-end gap-1 w-full pb-2.5">
          <button
            type="button"
            onClick={onNavigatePrev}
            disabled={!hasPrev}
            className="p-1.5 bg-tj-bg-card hover:bg-tj-bg-recessed disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-tj-text-main border border-tj-border-main cursor-pointer shadow-2xs flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            title="Previous word (Left Arrow)"
          >
            <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
          <button
            type="button"
            onClick={onNavigateNext}
            disabled={!hasNext}
            className="p-1.5 bg-tj-bg-card hover:bg-tj-bg-recessed disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-tj-text-main border border-tj-border-main cursor-pointer shadow-2xs flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            title="Next word (Right Arrow)"
          >
            <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-tj-bg-card hover:bg-tj-bg-recessed rounded-xl text-slate-400 hover:text-rose-500 border border-tj-border-main cursor-pointer shadow-2xs flex items-center justify-center ml-1 transition-all hover:scale-110 active:scale-95"
            title="Close toast"
          >
            <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-row lg:flex-col items-center gap-2 w-full">
        {currentUser && (
          <button
            type="button"
            onClick={onFetchTranslation}
            disabled={isFetching || !isOnline}
            className="flex-1 lg:w-full py-2.5 px-3 bg-tj-primary hover:bg-tj-primary-hover text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
          >
            {isFetching ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Translating...</span>
              </>
            ) : (
              <>
                <Languages className="w-3.5 h-3.5" />
                <span>Translate</span>
              </>
            )}
          </button>
        )}
        {isSaved ? (
          <button
            type="button"
            disabled
            className="flex-1 lg:w-full py-2.5 px-3 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl select-none flex items-center justify-center gap-1.5 border border-emerald-500/20 min-w-[100px]"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Saved</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onSaveWordRecord}
            disabled={!translation.trim()}
            className="flex-1 lg:w-full py-2.5 px-3 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-bold text-xs rounded-xl cursor-pointer disabled:bg-slate-300 disabled:dark:bg-slate-850 disabled:text-slate-400 transition-colors select-none flex items-center justify-center gap-1.5 min-w-[100px]"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        )}
      </div>
      {isSaved && onRemoveWordRecord && (
        <button
          type="button"
          onClick={onRemoveWordRecord}
          className="text-[10px] text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 hover:underline cursor-pointer select-none border-0 bg-transparent block text-center mt-1 font-sans"
        >
          Remove from list
        </button>
      )}
    </div>
  );
}
