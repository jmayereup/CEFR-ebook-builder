import {
  AlertCircle,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Languages,
  Loader2,
  Volume2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { getLanguageCodeFromName, type Story } from '../../types';

interface TranslationToastProps {
  selectedWord: {
    word: string;
    context: string;
    translation: string;
    partOfSpeech: string;
    definition: string;
    isFetching: boolean;
    saveSuccess: boolean;
  } | null;
  setSelectedWord: (word: any) => void;
  story: Story;
  currentUser: any;
  isPaid: boolean;
  isAdmin: boolean;
  customOpenRouterKey: string;
  lookupLimitData?: { count: number; date: string };
  translationTargetLanguage?: string;
  handleFetchTranslation: () => void;
  handleSaveWordRecord: () => void;
  handlePlayWord: (word: string) => void;
  isOnline?: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  selectedWordRange?: [number, number] | null;
  canExtendLeft?: boolean;
  canShrinkLeft?: boolean;
  canShrinkRight?: boolean;
  canExtendRight?: boolean;
  onExtendLeft?: () => void;
  onShrinkLeft?: () => void;
  onShrinkRight?: () => void;
  onExtendRight?: () => void;
}

export default function TranslationToast({
  selectedWord,
  setSelectedWord,
  story,
  currentUser,
  isPaid,
  isAdmin,
  customOpenRouterKey,
  lookupLimitData,
  translationTargetLanguage,
  handleFetchTranslation,
  handleSaveWordRecord,
  handlePlayWord,
  isOnline = true,
  hasPrev,
  hasNext,
  onNavigatePrev,
  onNavigateNext,
  selectedWordRange = null,
  canExtendLeft = false,
  canShrinkLeft = false,
  canShrinkRight = false,
  canExtendRight = false,
  onExtendLeft,
  onShrinkLeft,
  onShrinkRight,
  onExtendRight,
}: TranslationToastProps) {
  useEffect(() => {
    if (!selectedWord) return;

    const handleDocumentClick = (e: MouseEvent) => {
      setSelectedWord(null);
    };

    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [selectedWord, setSelectedWord]);

  return (
    <AnimatePresence>
      {selectedWord && (
        <motion.div
          initial={{ opacity: 0, y: 150 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 150 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="fixed bottom-0 left-0 right-0 z-50 w-full bg-tj-bg-card border-t border-tj-border-main shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1),0_-8px_10px_-6px_rgba(0,0,0,0.1)] p-4 md:p-6 select-text"
        >
          <button
            onClick={() => setSelectedWord(null)}
            className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full cursor-pointer transition-colors z-10"
            title="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>

          {selectedWord.saveSuccess ? (
            <div className="py-6 flex flex-col items-center justify-center space-y-2">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                Word Added Successfully!
              </p>
              <p className="text-xs text-slate-400">
                Saved to your vocabulary practices collection.
              </p>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-center gap-6 pr-8">
              {/* SECTION 1: WORD INFO */}
              <div className="flex flex-col gap-2 min-w-[220px] lg:max-w-[320px]">
                <div className="flex items-center gap-3">
                  <h4
                    lang={getLanguageCodeFromName(story.language)}
                    className="text-xl font-serif font-black text-tj-primary dark:text-tj-primary-hover tracking-tight"
                  >
                    {selectedWord.word}
                  </h4>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handlePlayWord(selectedWord.word)}
                      className="p-1.5 bg-tj-bg-card hover:bg-tj-bg-recessed rounded-xl text-tj-text-main border border-tj-border-main cursor-pointer shadow-sm flex items-center justify-center"
                      title="Pronounce again"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={onNavigatePrev}
                      disabled={!hasPrev}
                      className="p-1.5 bg-tj-bg-card hover:bg-tj-bg-recessed disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-tj-text-main border border-tj-border-main cursor-pointer shadow-sm flex items-center justify-center"
                      title="Previous word (Left Arrow)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={onNavigateNext}
                      disabled={!hasNext}
                      className="p-1.5 bg-tj-bg-card hover:bg-tj-bg-recessed disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-tj-text-main border border-tj-border-main cursor-pointer shadow-sm flex items-center justify-center"
                      title="Next word (Right Arrow)"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Range adjustment controls for multi-word phrases */}
                {selectedWordRange && (
                  <div className="flex flex-col gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-sans font-medium">
                    <span className="flex items-center gap-1.5 select-none">
                      Phrase length:{' '}
                      <strong className="text-tj-text-main font-bold font-mono">
                        {selectedWordRange[1] - selectedWordRange[0] + 1}/5
                        words
                      </strong>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExtendLeft?.();
                        }}
                        disabled={!canExtendLeft}
                        className="px-2 py-1 bg-tj-bg-card hover:bg-tj-bg-recessed disabled:opacity-30 disabled:cursor-not-allowed text-tj-text-main border border-tj-border-main rounded-lg cursor-pointer transition-colors shadow-sm text-[10px] font-semibold select-none"
                        title="Extend selection left (+ Left)"
                      >
                        + Left
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShrinkLeft?.();
                        }}
                        disabled={!canShrinkLeft}
                        className="px-2 py-1 bg-tj-bg-card hover:bg-tj-bg-recessed disabled:opacity-30 disabled:cursor-not-allowed text-tj-text-main border border-tj-border-main rounded-lg cursor-pointer transition-colors shadow-sm text-[10px] font-semibold select-none"
                        title="Shrink selection left (- Left)"
                      >
                        - Left
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShrinkRight?.();
                        }}
                        disabled={!canShrinkRight}
                        className="px-2 py-1 bg-tj-bg-card hover:bg-tj-bg-recessed disabled:opacity-30 disabled:cursor-not-allowed text-tj-text-main border border-tj-border-main rounded-lg cursor-pointer transition-colors shadow-sm text-[10px] font-semibold select-none"
                        title="Shrink selection right (- Right)"
                      >
                        - Right
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExtendRight?.();
                        }}
                        disabled={!canExtendRight}
                        className="px-2 py-1 bg-tj-bg-card hover:bg-tj-bg-recessed disabled:opacity-30 disabled:cursor-not-allowed text-tj-text-main border border-tj-border-main rounded-lg cursor-pointer transition-colors shadow-sm text-[10px] font-semibold select-none"
                        title="Extend selection right (+ Right)"
                      >
                        + Right
                      </button>
                    </div>
                  </div>
                )}

                {/* Alert/Status banner */}
                {!isOnline ? (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-955/20 text-rose-700 dark:text-rose-350 text-[10px] rounded-xl border border-rose-100 dark:border-rose-900/10 flex items-start gap-1.5 leading-tight">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
                    <span>
                      Offline: AI translation requires connection. You can enter
                      translations manually.
                    </span>
                  </div>
                ) : !currentUser ? (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-955/20 text-slate-700 dark:text-slate-355 text-[10px] rounded-xl border border-amber-100 dark:border-amber-900/10 flex items-start gap-1.5 leading-tight">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
                    <span>
                      Sign in in the top right to enable AI translations and
                      build vocabulary list!
                    </span>
                  </div>
                ) : !isPaid && !isAdmin && !customOpenRouterKey ? (
                  <div className="p-2 bg-amber-50 dark:bg-amber-955/20 text-slate-700 dark:text-slate-355 text-[10px] rounded-xl border border-amber-100 dark:border-amber-900/10 flex flex-col gap-1 leading-tight">
                    <div className="flex items-start gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
                      <span>
                        AI lookup limit:{' '}
                        {lookupLimitData ? lookupLimitData.count : 0}/100 today.
                        Configure OpenRouter key for unlimited!
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* SECTION 2: INPUT FIELDS */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Translation input & AI Fetch */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Translation
                    </label>
                    {currentUser && (
                      <button
                        onClick={handleFetchTranslation}
                        disabled={selectedWord.isFetching || !isOnline}
                        className="px-2 py-0.5 bg-tj-primary-light hover:bg-tj-primary-border dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover text-[9px] font-bold rounded flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {selectedWord.isFetching ? (
                          <>
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            <span>Fetching...</span>
                          </>
                        ) : (
                          <>
                            <Languages className="w-2.5 h-2.5" />
                            <span>Fetch AI Translation</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={selectedWord.translation}
                    onChange={(e) =>
                      setSelectedWord({
                        ...selectedWord,
                        translation: e.target.value,
                      })
                    }
                    placeholder="Enter or fetch translation"
                    className="w-full text-xs p-2.5 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main focus:border-tj-primary focus:outline-none"
                  />
                </div>

                {/* Part of Speech Select */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Part of Speech
                  </label>
                  <select
                    value={selectedWord.partOfSpeech}
                    onChange={(e) =>
                      setSelectedWord({
                        ...selectedWord,
                        partOfSpeech: e.target.value,
                      })
                    }
                    className="w-full text-xs p-2.5 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main focus:border-tj-primary focus:outline-none cursor-pointer"
                  >
                    <option value="Noun">Noun</option>
                    <option value="Verb">Verb</option>
                    <option value="Adjective">Adjective</option>
                    <option value="Adverb">Adverb</option>
                    <option value="Preposition">Preposition</option>
                    <option value="Pronoun">Pronoun</option>
                    <option value="Phrase">Phrase/Idiom</option>
                  </select>
                </div>

                {/* Definition Input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Definition (Optional)
                  </label>
                  <input
                    type="text"
                    value={selectedWord.definition}
                    onChange={(e) =>
                      setSelectedWord({
                        ...selectedWord,
                        definition: e.target.value,
                      })
                    }
                    placeholder="e.g. indicates movement / noun form"
                    className="w-full text-xs p-2.5 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main focus:border-tj-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* SECTION 3: SAVE BUTTON */}
              <div className="flex items-stretch justify-stretch shrink-0 lg:pt-3.5">
                <button
                  type="button"
                  onClick={handleSaveWordRecord}
                  disabled={!selectedWord.translation.trim()}
                  className="w-full lg:w-auto py-3 px-6 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-bold text-xs rounded-xl cursor-pointer disabled:bg-slate-300 disabled:dark:bg-slate-850 disabled:text-slate-400 transition-colors select-none flex items-center justify-center gap-1.5"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Save to Vocabulary List</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
