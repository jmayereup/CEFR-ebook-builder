import {
  AlertCircle,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Languages,
  Loader2,
  MessageSquare,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import React, { useEffect, useState } from 'react';
import {
  getLanguageCodeFromName,
  type HighlightColor,
  type Story,
  type StoryHighlight,
} from '../../types';
import { HIGHLIGHT_COLORS } from './HighlightToolbar';

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
  lookupLimitData?: { count: number; date: string } | null;
  translationTargetLanguage?: string | null;
  handleFetchTranslation: () => void;
  handleSaveWordRecord: () => void;
  handlePlayWord: (word: string) => void;
  isSaved?: boolean;
  handleRemoveWordRecord?: () => void;
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
  activeHighlight?: StoryHighlight | null;
  onSelectHighlightColor?: (color: HighlightColor) => void;
  onSaveHighlightNote?: (note: string) => void;
  onDeleteHighlight?: () => void;
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
  isSaved = false,
  handleRemoveWordRecord,
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
  activeHighlight,
  onSelectHighlightColor,
  onSaveHighlightNote,
  onDeleteHighlight,
}: TranslationToastProps) {
  const dragControls = useDragControls();
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>('');

  useEffect(() => {
    if (activeHighlight?.note) {
      setNoteText(activeHighlight.note);
      setIsEditingNote(true);
    } else {
      setNoteText('');
      setIsEditingNote(false);
    }
  }, [activeHighlight]);

  useEffect(() => {
    if (!selectedWord) return;

    const handleDocumentClick = (_e: MouseEvent) => {
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
          className="fixed bottom-0 left-0 right-0 z-50 w-full bg-tj-bg-card border-t border-tj-border-main shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1),0_-8px_10px_-6px_rgba(0,0,0,0.1)] p-4 pb-12 md:p-6 md:pb-6 select-text touch-pan-x"
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.8 }}
          onDragEnd={(_event, info) => {
            if (info.offset.y > 100 || info.velocity.y > 400) {
              setSelectedWord(null);
            }
          }}
          onPointerDown={(e) => {
            const target = e.target as HTMLElement;
            if (
              !target.closest('input, select, textarea, button, a') &&
              !target.isContentEditable
            ) {
              dragControls.start(e);
            }
          }}
        >
          {selectedWord.saveSuccess ? (
            <div className="py-3 flex flex-col items-center justify-center space-y-2">
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
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-start gap-6">
              {/* SECTION 1: WORD INFO with nav arrows & HIGHLIGHT CONTROLS */}
              <div className="flex flex-col gap-3 min-w-[200px] lg:max-w-[320px]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <h4
                      lang={getLanguageCodeFromName(story.language)}
                      translate="no"
                      className="text-xl font-serif font-black text-tj-primary dark:text-tj-primary-hover tracking-tight"
                    >
                      {selectedWord.word}
                    </h4>
                    <button
                      type="button"
                      onClick={() => handlePlayWord(selectedWord.word)}
                      className="p-1.5 bg-tj-bg-card hover:bg-tj-bg-recessed rounded-xl text-tj-text-main border border-tj-border-main cursor-pointer shadow-sm flex items-center justify-center shrink-0"
                      title="Pronounce again"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={onNavigatePrev}
                      disabled={!hasPrev}
                      className="p-1.5 bg-tj-bg-card hover:bg-tj-bg-recessed disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-tj-text-main border border-tj-border-main cursor-pointer shadow-sm flex items-center justify-center"
                      title="Previous word (Left Arrow)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={onNavigateNext}
                      disabled={!hasNext}
                      className="p-1.5 bg-tj-bg-card hover:bg-tj-bg-recessed disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-tj-text-main border border-tj-border-main cursor-pointer shadow-sm flex items-center justify-center"
                      title="Next word (Right Arrow)"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Range adjustment controls: intuitive 2-button stepper (+ More / - Less) */}
                {selectedWordRange && (
                  <div className="flex items-center justify-between gap-2 text-xs font-sans">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium select-none">
                      Phrase:{' '}
                      <strong className="text-tj-text-main font-bold font-mono">
                        {selectedWordRange[1] - selectedWordRange[0] + 1} words
                      </strong>
                    </span>
                    <div className="flex items-center gap-1 bg-tj-bg-recessed p-0.5 rounded-lg border border-tj-border-main/60">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShrinkRight?.();
                        }}
                        disabled={!canShrinkRight}
                        className="px-2.5 py-1 bg-tj-bg-card hover:bg-tj-bg-recessed disabled:opacity-30 disabled:cursor-not-allowed text-tj-text-main border border-tj-border-main/50 rounded-md cursor-pointer transition-colors shadow-2xs text-xs font-semibold select-none flex items-center gap-1"
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
                        className="px-2.5 py-1 bg-tj-bg-card hover:bg-tj-bg-recessed disabled:opacity-30 disabled:cursor-not-allowed text-tj-text-main border border-tj-border-main/50 rounded-md cursor-pointer transition-colors shadow-2xs text-xs font-semibold select-none flex items-center gap-1"
                        title="Add next word (+ More)"
                      >
                        <span>+ More</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 1-TAP HIGHLIGHTING & STUDY NOTES BAR */}
                {onSelectHighlightColor && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-tj-border-main/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Highlight & Notes
                      </span>
                      {activeHighlight && onDeleteHighlight && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteHighlight();
                          }}
                          className="text-[10px] text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-semibold cursor-pointer transition flex items-center gap-1"
                          title="Remove highlight"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 5 Color buttons */}
                      <div className="flex items-center gap-1.5 bg-tj-bg-recessed p-1 rounded-xl border border-tj-border-main/50">
                        {HIGHLIGHT_COLORS.map((c) => {
                          const isSelected = activeHighlight?.color === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectHighlightColor(c.id);
                              }}
                              className={`w-6 h-6 rounded-full border ${c.dotClass} flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-2xs ${
                                isSelected
                                  ? 'ring-2 ring-tj-primary ring-offset-1 dark:ring-offset-slate-900 scale-105'
                                  : ''
                              }`}
                              title={`Highlight in ${c.label}`}
                            >
                              {isSelected && (
                                <Check className="w-3 h-3 text-slate-800 dark:text-slate-900 stroke-[3]" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Note Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingNote((prev) => !prev);
                        }}
                        className={`p-1.5 px-2.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                          isEditingNote || activeHighlight?.note
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                            : 'bg-tj-bg-recessed text-tj-text-muted border-tj-border-main hover:text-tj-text-main'
                        }`}
                        title={
                          activeHighlight?.note
                            ? 'Edit study note'
                            : 'Add study note'
                        }
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="text-[11px]">
                          {activeHighlight?.note ? 'Note' : '+ Note'}
                        </span>
                      </button>

                      {/* Action buttons (Cancel X & Done Check) */}
                      <div className="ml-auto flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeHighlight && onDeleteHighlight) {
                              onDeleteHighlight();
                            }
                            setSelectedWord(null);
                          }}
                          className="p-1.5 bg-tj-bg-recessed hover:bg-rose-50 dark:hover:bg-rose-955/30 text-slate-400 hover:text-rose-500 rounded-xl border border-tj-border-main hover:border-rose-200 dark:hover:border-rose-900/50 cursor-pointer transition flex items-center justify-center shadow-2xs"
                          title={
                            activeHighlight
                              ? 'Remove highlight & close'
                              : 'Cancel & close'
                          }
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!activeHighlight && onSelectHighlightColor) {
                              onSelectHighlightColor('yellow');
                            }
                            if (isEditingNote && noteText.trim()) {
                              onSaveHighlightNote?.(noteText.trim());
                            }
                            setSelectedWord(null);
                          }}
                          className="px-2.5 py-1.5 bg-tj-primary/10 hover:bg-tj-primary/20 dark:bg-tj-primary/20 dark:hover:bg-tj-primary/30 text-tj-primary dark:text-tj-primary-hover border border-tj-primary/30 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1 shadow-2xs"
                          title="Done & Close (Default Yellow)"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Done</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Note Editor */}
                    <AnimatePresence>
                      {isEditingNote && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-1 flex flex-col gap-1.5 overflow-hidden"
                        >
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add your study note or thoughts..."
                            rows={2}
                            className="w-full text-xs p-2 rounded-xl bg-tj-bg-recessed border border-tj-border-main text-tj-text-main placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-tj-primary resize-none font-sans"
                          />
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">
                              {noteText.length > 0
                                ? `${noteText.length} chars`
                                : 'Markdown supported'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsEditingNote(false);
                                }}
                                className="px-2 py-0.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer font-medium"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSaveHighlightNote?.(noteText.trim());
                                  setIsEditingNote(false);
                                }}
                                disabled={!currentUser}
                                className="px-2.5 py-1 bg-tj-primary hover:bg-tj-primary-hover text-white rounded-lg font-semibold cursor-pointer transition shadow-2xs disabled:opacity-50"
                              >
                                {currentUser ? 'Save Note' : 'Sign in to save'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                ) : null}
              </div>

              {/* SECTION 2: INPUT FIELDS */}
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Translation input & AI Fetch */}
                  <div className="flex-1 space-y-1.5">
                    <div className="min-h-[12px]">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest min-h-[12px] flex items-start">
                        Translation
                      </label>
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
                  <div className="w-full sm:w-44 space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest min-h-[12px] flex items-start">
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
                </div>

                {/* Definition Input - full width row */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest min-h-[12px] flex items-start">
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

              {/* SECTION 3: TRANSLATE + SAVE / REMOVE BUTTONS */}
              <div className="flex flex-col justify-center items-center min-w-12">
                <div className="flex lg:flex-col items-center gap-2 lg:pt-5">
                  {currentUser && (
                    <button
                      type="button"
                      onClick={handleFetchTranslation}
                      disabled={selectedWord.isFetching || !isOnline}
                      className="w-full py-3 px-4 bg-tj-primary hover:bg-tj-primary-hover text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                    >
                      {selectedWord.isFetching ? (
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
                      className="w-full py-3 px-6 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl select-none flex items-center justify-center gap-1.5 border border-emerald-500/20 min-w-[120px]"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveWordRecord}
                      disabled={!selectedWord.translation.trim()}
                      className="w-full py-3 px-4 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-bold text-xs rounded-xl cursor-pointer disabled:bg-slate-300 disabled:dark:bg-slate-850 disabled:text-slate-400 transition-colors select-none flex items-center justify-center gap-1.5 min-w-[120px]"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  )}
                </div>
                {isSaved && (
                  <button
                    type="button"
                    onClick={handleRemoveWordRecord}
                    className="text-[10px] text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 hover:underline cursor-pointer select-none border-0 bg-transparent block text-center mt-2 font-sans"
                  >
                    Remove from list
                  </button>
                )}
              </div>
            </div>
          )}
          {/* Close button in the bottom right corner */}
          <button
            type="button"
            onClick={() => setSelectedWord(null)}
            className="absolute bottom-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-xl hover:bg-tj-bg-recessed transition-colors flex items-center justify-center cursor-pointer z-10"
            title="Close toast"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
