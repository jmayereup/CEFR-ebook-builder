import { Bookmark, Check, Languages, Loader2 } from 'lucide-react';

import type { IUser } from '../../../services/types';

interface ToastActionButtonsProps {
  currentUser: IUser | null;
  isOnline?: boolean;
  isFetching: boolean;
  translation: string;
  isSaved?: boolean;
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
  onFetchTranslation,
  onSaveWordRecord,
  onRemoveWordRecord,
}: ToastActionButtonsProps) {
  return (
    <div className="flex flex-col justify-center items-center shrink-0">
      <div className="flex flex-row lg:flex-col items-center gap-2 w-full lg:pt-4">
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
