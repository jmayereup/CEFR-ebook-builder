import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Volume2,
  X,
} from 'lucide-react';
import type { SelectedWordData } from './types';

interface ToastCollapsedBarProps {
  selectedWord: SelectedWordData;
  languageCode: string;
  hasPrev?: boolean;
  hasNext?: boolean;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  onExpand: () => void;
  onDismiss: () => void;
  onPlayWord: (word: string) => void;
  onUserActivity?: () => void;
}

export default function ToastCollapsedBar({
  selectedWord,
  languageCode,
  hasPrev,
  hasNext,
  onNavigatePrev,
  onNavigateNext,
  onExpand,
  onDismiss,
  onPlayWord,
  onUserActivity,
}: ToastCollapsedBarProps) {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Click expands sheet
    // biome-ignore lint/a11y/noStaticElementInteractions: Click expands sheet
    <div
      onClick={onExpand}
      className="w-full max-w-7xl mx-auto flex items-center justify-between px-3.5 sm:px-6 py-2 cursor-pointer select-none group transition-colors"
    >
      {/* Left: Word, pronunciation & preview */}
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUserActivity?.();
            onPlayWord(selectedWord.word);
          }}
          className="p-1.5 rounded-full bg-tj-primary/10 hover:bg-tj-primary/20 dark:bg-tj-primary/15 dark:hover:bg-tj-primary/30 text-tj-primary dark:text-tj-primary-hover border border-tj-primary/20 hover:border-tj-primary/40 cursor-pointer transition-all shadow-2xs active:scale-90 flex items-center justify-center shrink-0"
          title="Replay pronunciation"
        >
          <Volume2 className="w-4 h-4" />
        </button>
        <span
          lang={languageCode}
          translate="no"
          className="text-base sm:text-lg font-serif font-black text-tj-primary dark:text-tj-primary-hover tracking-tight truncate"
          title={selectedWord.word}
        >
          {selectedWord.word}
        </span>
        {selectedWord.translation && (
          <span className="hidden sm:inline text-xs text-tj-text-muted truncate max-w-[220px] border-l border-tj-border-main/70 pl-2">
            {selectedWord.translation}
          </span>
        )}
      </div>

      {/* Right: Word navigation, ChevronUp only & Quick Dismiss */}
      <div className="flex items-center gap-1 shrink-0">
        {onNavigatePrev && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUserActivity?.();
              onNavigatePrev();
            }}
            disabled={!hasPrev}
            className="p-1.5 text-slate-400 hover:text-tj-primary hover:bg-tj-primary/10 dark:hover:bg-tj-primary/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded-xl transition-all cursor-pointer hover:scale-110 active:scale-95"
            title="Previous word (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.25]" />
          </button>
        )}

        {onNavigateNext && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUserActivity?.();
              onNavigateNext();
            }}
            disabled={!hasNext}
            className="p-1.5 text-slate-400 hover:text-tj-primary hover:bg-tj-primary/10 dark:hover:bg-tj-primary/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded-xl transition-all cursor-pointer hover:scale-110 active:scale-95"
            title="Next word (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.25]" />
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          className="p-1.5 text-slate-400 hover:text-tj-primary hover:bg-tj-primary/10 dark:hover:bg-tj-primary/20 rounded-xl transition-all cursor-pointer hover:scale-110 active:scale-95"
          title="Expand details"
        >
          <ChevronUp className="w-4 h-4 stroke-[2.25]" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-xl transition-all cursor-pointer active:scale-95"
          title="Dismiss"
        >
          <X className="w-4 h-4 stroke-[2]" />
        </button>
      </div>
    </div>
  );
}
