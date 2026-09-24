import {
  ChevronLeft,
  ChevronRight,
  Play,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { SelectedWordData } from './types';

interface ToastWordControlsProps {
  selectedWord: SelectedWordData;
  languageCode: string;
  hasPrev: boolean;
  hasNext: boolean;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onPlayWord: (word: string) => void;
  onClose: () => void;
  onResumeChapterFromWord?: () => void;
  autoPlayWord?: boolean;
  setAutoPlayWord?: (enabled: boolean) => void;
  selectedWordRange?: [number, number] | null;
  canShrinkRight?: boolean;
  canExtendRight?: boolean;
  onShrinkRight?: () => void;
  onExtendRight?: () => void;
}

export default function ToastWordControls({
  selectedWord,
  languageCode,
  hasPrev,
  hasNext,
  onNavigatePrev,
  onNavigateNext,
  onPlayWord,
  onClose,
  onResumeChapterFromWord,
  autoPlayWord = true,
  setAutoPlayWord,
  selectedWordRange = null,
  canShrinkRight = false,
  canExtendRight = false,
  onShrinkRight,
  onExtendRight,
}: ToastWordControlsProps) {
  return (
    <>
      {/* Row 1: Word Heading + Pronounce & Word Navigation + Collapse & Close */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlayWord(selectedWord.word);
            }}
            className="p-1.5 rounded-full bg-tj-primary/10 hover:bg-tj-primary/20 dark:bg-tj-primary/15 dark:hover:bg-tj-primary/30 text-tj-primary dark:text-tj-primary-hover border border-tj-primary/20 hover:border-tj-primary/40 cursor-pointer transition-all shadow-2xs active:scale-90 flex items-center justify-center shrink-0"
            title="Pronounce word"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <h4
            lang={languageCode}
            translate="no"
            className="text-lg md:text-xl font-serif font-black text-tj-primary dark:text-tj-primary-hover tracking-tight truncate"
            title={selectedWord.word}
          >
            {selectedWord.word}
          </h4>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onNavigatePrev}
            disabled={!hasPrev}
            className="p-1.5 bg-tj-bg-card hover:bg-tj-bg-recessed disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-tj-text-main border border-tj-border-main cursor-pointer shadow-2xs flex items-center justify-center"
            title="Previous word (Left Arrow)"
          >
            <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
          <button
            type="button"
            onClick={onNavigateNext}
            disabled={!hasNext}
            className="p-1.5 bg-tj-bg-card hover:bg-tj-bg-recessed disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-tj-text-main border border-tj-border-main cursor-pointer shadow-2xs flex items-center justify-center"
            title="Next word (Right Arrow)"
          >
            <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-tj-bg-card hover:bg-tj-bg-recessed rounded-xl text-slate-400 hover:text-rose-500 border border-tj-border-main cursor-pointer shadow-2xs flex items-center justify-center ml-1"
            title="Close toast"
          >
            <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        </div>
      </div>

      {/* Row 2: Chapter Audio Resumption, Auto Toggle, and Phrase Stepper */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 shrink-0">
          {onResumeChapterFromWord && (
            <button
              type="button"
              onClick={onResumeChapterFromWord}
              className="h-6 md:h-7 flex items-center gap-1 px-2 md:px-2.5 bg-tj-primary-light hover:bg-tj-primary-light/80 dark:bg-tj-primary-light/10 dark:hover:bg-tj-primary-light/20 text-tj-primary dark:text-tj-primary-hover border border-tj-primary-border rounded-xl text-[11px] md:text-xs font-bold cursor-pointer shadow-2xs transition-all shrink-0"
              title="Resume chapter narration from this word"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Listen from here</span>
            </button>
          )}
          {setAutoPlayWord && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAutoPlayWord(!autoPlayWord);
              }}
              className={`h-6 md:h-7 px-1.5 md:px-2 rounded-xl border cursor-pointer shadow-2xs flex items-center justify-center shrink-0 transition-colors text-[11px] md:text-xs gap-1 ${
                autoPlayWord
                  ? 'bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover border-tj-primary-border'
                  : 'bg-tj-bg-card hover:bg-tj-bg-recessed text-slate-400 dark:text-slate-500 border-tj-border-main hover:text-tj-text-main'
              }`}
              title={
                autoPlayWord
                  ? 'Auto-pronounce on word click: ON (Click to toggle OFF)'
                  : 'Auto-pronounce on word click: OFF (Click to toggle ON)'
              }
            >
              {autoPlayWord ? (
                <Volume2 className="w-3 h-3" />
              ) : (
                <VolumeX className="w-3 h-3" />
              )}
              <span className="text-[10px] md:text-[11px] font-bold tracking-tight">
                AP
              </span>
            </button>
          )}
        </div>

        {/* Range adjustment controls: intuitive 2-button stepper (+ More / - Less) */}
        {selectedWordRange && (
          <div className="flex items-center gap-1 bg-tj-bg-recessed p-0.5 rounded-lg border border-tj-border-main/60 shrink-0">
            <span className="text-[10px] md:text-[11px] text-slate-500 dark:text-slate-400 font-medium px-1 select-none">
              Phrase:{' '}
              <strong className="text-tj-text-main font-bold font-mono">
                {selectedWordRange[1] - selectedWordRange[0] + 1 === 1
                  ? '1 word'
                  : `${selectedWordRange[1] - selectedWordRange[0] + 1} words`}
              </strong>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShrinkRight?.();
              }}
              disabled={!canShrinkRight}
              className="px-1.5 py-0.5 bg-tj-bg-card hover:bg-tj-bg-recessed disabled:opacity-30 disabled:cursor-not-allowed text-tj-text-main border border-tj-border-main/50 rounded-md cursor-pointer transition-colors shadow-2xs text-[10px] md:text-[11px] font-semibold select-none flex items-center gap-0.5"
              title="Remove last word (- Less)"
            >
              <span>− Less</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExtendRight?.();
              }}
              disabled={!canExtendRight}
              className="px-1.5 py-0.5 bg-tj-bg-card hover:bg-tj-bg-recessed disabled:opacity-30 disabled:cursor-not-allowed text-tj-text-main border border-tj-border-main/50 rounded-md cursor-pointer transition-colors shadow-2xs text-[10px] md:text-[11px] font-semibold select-none flex items-center gap-0.5"
              title="Add next word (+ More)"
            >
              <span>+ More</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
