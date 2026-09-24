import {
  AlertCircle,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Languages,
  Loader2,
  MessageSquare,
  Play,
  Trash2,
  Volume2,
  VolumeX,
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
  autoPlayWord?: boolean;
  setAutoPlayWord?: (enabled: boolean) => void;
  onResumeChapterFromWord?: () => void;
  isExpanded?: boolean;
  setIsExpanded?: (expanded: boolean) => void;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
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
  autoPlayWord = true,
  setAutoPlayWord,
  onResumeChapterFromWord,
  isExpanded: controlledExpanded,
  setIsExpanded: setControlledExpanded,
  onOpenAuth,
}: TranslationToastProps) {
  const dragControls = useDragControls();
  const [internalExpanded, setInternalExpanded] = useState<boolean>(false);
  const isExpanded =
    controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const setIsExpanded = (val: boolean) => {
    if (setControlledExpanded) {
      setControlledExpanded(val);
    } else {
      setInternalExpanded(val);
    }
  };

  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>('');

  // Automatically dismiss after 2 seconds when in thin toast (collapsed) mode
  useEffect(() => {
    if (!selectedWord || isExpanded || isHovered) return;

    const timer = setTimeout(() => {
      setSelectedWord(null);
    }, 2000);

    return () => clearTimeout(timer);
  }, [selectedWord, isExpanded, isHovered, lastActivity, setSelectedWord]);

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
          layout
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          onClick={(e) => e.stopPropagation()}
          onPointerEnter={() => setIsHovered(true)}
          onPointerLeave={() => setIsHovered(false)}
          className={`fixed bottom-0 left-0 right-0 z-50 w-full flex flex-col bg-tj-bg-card/95 dark:bg-tj-bg-card/95 backdrop-blur-md border-t border-tj-border-main shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1),0_-8px_10px_-6px_rgba(0,0,0,0.1)] select-text touch-pan-x ${isExpanded
            ? 'max-h-[50dvh]'
            : 'pb-[max(0.25rem,env(safe-area-inset-bottom))]'
            }`}
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: isExpanded ? 0 : 0.8, bottom: 0.8 }}
          onDragEnd={(_event, info) => {
            if (isExpanded) {
              if (info.offset.y > 150 || info.velocity.y > 450) {
                setSelectedWord(null);
              } else if (info.offset.y > 40 || info.velocity.y > 180) {
                setIsExpanded(false);
              }
            } else {
              if (info.offset.y < -25 || info.velocity.y < -150) {
                setIsExpanded(true);
              } else if (info.offset.y > 40 || info.velocity.y > 200) {
                setSelectedWord(null);
              }
            }
          }}
        >
          {/* Top drag handle indicator (shown when expanded) */}
          {isExpanded && (
            <div
              className="w-full flex items-center justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
              onPointerDown={(e) => {
                dragControls.start(e);
              }}
            >
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600 transition-colors hover:bg-tj-primary" />
            </div>
          )}

          {!isExpanded ? (
            /* COLLAPSED THIN TOAST */
            <div
              onClick={() => setIsExpanded(true)}
              className="w-full max-w-7xl mx-auto flex items-center justify-between px-3.5 sm:px-6 py-2 cursor-pointer select-none group transition-colors"
            >
              {/* Left: Word, pronunciation & preview */}
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLastActivity(Date.now());
                    handlePlayWord(selectedWord.word);
                  }}
                  className="p-1.5 rounded-full bg-tj-primary/10 hover:bg-tj-primary/20 dark:bg-tj-primary/15 dark:hover:bg-tj-primary/30 text-tj-primary dark:text-tj-primary-hover border border-tj-primary/20 hover:border-tj-primary/40 cursor-pointer transition-all shadow-2xs active:scale-90 flex items-center justify-center shrink-0"
                  title="Replay pronunciation"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <span
                  lang={getLanguageCodeFromName(story.language)}
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

              {/* Right: Simple ChevronUp only & Quick Dismiss */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(true);
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
                    setSelectedWord(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-xl transition-all cursor-pointer active:scale-95"
                  title="Dismiss"
                >
                  <X className="w-4 h-4 stroke-[2]" />
                </button>
              </div>
            </div>
          ) : (
            /* EXPANDED SHEET BODY */
            <div className="flex-1 overflow-y-auto overscroll-contain px-3.5 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 md:pb-5">
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
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-start gap-3 lg:gap-6">
                  {/* SECTION 1: WORD INFO with nav arrows & HIGHLIGHT CONTROLS */}
                  <div className="flex flex-col gap-2.5 min-w-[240px] lg:w-96 lg:max-w-md">
                    {/* Row 1: Word Heading + Pronounce & Word Navigation + Collapse & Close */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayWord(selectedWord.word);
                          }}
                          className="p-1.5 rounded-full bg-tj-primary/10 hover:bg-tj-primary/20 dark:bg-tj-primary/15 dark:hover:bg-tj-primary/30 text-tj-primary dark:text-tj-primary-hover border border-tj-primary/20 hover:border-tj-primary/40 cursor-pointer transition-all shadow-2xs active:scale-90 flex items-center justify-center shrink-0"
                          title="Pronounce word"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <h4
                          lang={getLanguageCodeFromName(story.language)}
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
                          onClick={() => setSelectedWord(null)}
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
                            className={`h-6 md:h-7 px-1.5 md:px-2 rounded-xl border cursor-pointer shadow-2xs flex items-center justify-center shrink-0 transition-colors text-[11px] md:text-xs gap-1 ${autoPlayWord
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
                              {selectedWordRange[1] -
                                selectedWordRange[0] +
                                1 ===
                                1
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

                    {/* 1-TAP HIGHLIGHTING & STUDY NOTES BAR */}
                    {onSelectHighlightColor && (
                      <div className="flex flex-col gap-1.5 pt-1.5 border-t border-tj-border-main/60">
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
                              const isSelected =
                                activeHighlight?.color === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectHighlightColor(c.id);
                                  }}
                                  className={`w-5 h-5 md:w-6 md:h-6 rounded-full border ${c.dotClass} flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-2xs ${isSelected
                                    ? 'ring-2 ring-tj-primary ring-offset-1 dark:ring-offset-slate-900 scale-105'
                                    : ''
                                    }`}
                                  title={`Highlight in ${c.label}`}
                                >
                                  {isSelected && (
                                    <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-slate-800 dark:text-slate-900 stroke-[3]" />
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
                            className={`p-1 px-2 md:p-1.5 md:px-2.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${isEditingNote || activeHighlight?.note
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

                          {/* Action button (Done Check) */}
                          <div className="ml-auto flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  !activeHighlight &&
                                  onSelectHighlightColor
                                ) {
                                  onSelectHighlightColor('yellow');
                                }
                                if (isEditingNote && noteText.trim()) {
                                  onSaveHighlightNote?.(noteText.trim());
                                }
                                setSelectedWord(null);
                              }}
                              className="px-2.5 py-1 bg-tj-primary/10 hover:bg-tj-primary/20 dark:bg-tj-primary/20 dark:hover:bg-tj-primary/30 text-tj-primary dark:text-tj-primary-hover border border-tj-primary/30 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1 shadow-2xs"
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
                                      if (!currentUser) {
                                        onOpenAuth?.('signin');
                                        return;
                                      }
                                      onSaveHighlightNote?.(noteText.trim());
                                      setIsEditingNote(false);
                                    }}
                                    className="px-2.5 py-1 bg-tj-primary hover:bg-tj-primary-hover text-white rounded-lg font-semibold cursor-pointer transition shadow-2xs"
                                  >
                                    {currentUser
                                      ? 'Save Note'
                                      : 'Sign in to save'}
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
                      <div className="p-2 bg-rose-50 dark:bg-rose-955/20 text-rose-700 dark:text-rose-350 text-[10px] rounded-xl border border-rose-100 dark:border-rose-900/10 flex items-start gap-1.5 leading-tight">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
                        <span>
                          Offline: AI translation requires connection. You can
                          enter translations manually.
                        </span>
                      </div>
                    ) : !currentUser ? (
                      <div className="p-2 bg-amber-50 dark:bg-amber-955/20 text-slate-700 dark:text-slate-355 text-[10px] rounded-xl border border-amber-100 dark:border-amber-900/10 flex items-start gap-1.5 leading-tight">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
                        <span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAuth?.('signin');
                            }}
                            className="font-bold underline underline-offset-2 text-tj-primary hover:text-tj-primary-hover cursor-pointer"
                          >
                            Sign in
                          </button>{' '}
                          to enable highlighting, AI translations, and
                          vocabulary lists!
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* SECTION 2: INPUT FIELDS (Compact 2-Column on Mobile) */}
                  <div className="flex-1 flex flex-col gap-2.5">
                    {/* Translation input */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Translation
                      </label>
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
                        className="w-full text-xs p-2 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main focus:border-tj-primary focus:outline-none"
                      />
                    </div>

                    {/* Tight 2-Column Row: Part of Speech & Definition together */}
                    <div className="flex items-center gap-2">
                      {/* Part of Speech Select (compact width) */}
                      <div className="w-28 sm:w-40 shrink-0 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
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
                          className="w-full text-xs p-2 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main focus:border-tj-primary focus:outline-none cursor-pointer"
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

                      {/* Definition Input (fills remaining width) */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
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
                          className="w-full text-xs p-2 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main focus:border-tj-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: TRANSLATE + SAVE / REMOVE BUTTONS */}
                  <div className="flex flex-col justify-center items-center shrink-0">
                    <div className="flex flex-row lg:flex-col items-center gap-2 w-full lg:pt-4">
                      {currentUser && (
                        <button
                          type="button"
                          onClick={handleFetchTranslation}
                          disabled={selectedWord.isFetching || !isOnline}
                          className="flex-1 lg:w-full py-2.5 px-3 bg-tj-primary hover:bg-tj-primary-hover text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
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
                          className="flex-1 lg:w-full py-2.5 px-3 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl select-none flex items-center justify-center gap-1.5 border border-emerald-500/20 min-w-[100px]"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Saved</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSaveWordRecord}
                          disabled={!selectedWord.translation.trim()}
                          className="flex-1 lg:w-full py-2.5 px-3 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-bold text-xs rounded-xl cursor-pointer disabled:bg-slate-300 disabled:dark:bg-slate-850 disabled:text-slate-400 transition-colors select-none flex items-center justify-center gap-1.5 min-w-[100px]"
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
                        className="text-[10px] text-slate-400 hover:text-rose-500 dark:text-slate-500 dark:hover:text-rose-400 hover:underline cursor-pointer select-none border-0 bg-transparent block text-center mt-1 font-sans"
                      >
                        Remove from list
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
