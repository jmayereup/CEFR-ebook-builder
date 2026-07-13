import { ChevronLeft, ChevronRight, RefreshCw, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getLanguageCodeFromName, type VocabularyTerm } from '../../types';
import { limitContextToTenWords } from '../../utils/segmenter';

interface FlashcardsDeckProps {
  terms: VocabularyTerm[];
  langCode: string;
  onVocabActivity?: (count: number) => void;
  onUpdateWordSRS?: (term: VocabularyTerm, isCorrect: boolean) => void;
  playWord: (word: string, customLanguage?: string) => void;
  key?: string;
}

export default function FlashcardsDeck({
  terms,
  langCode,
  onVocabActivity,
  onUpdateWordSRS,
  playWord,
}: FlashcardsDeckProps) {
  const [deckTerms, setDeckTerms] = useState<VocabularyTerm[]>(() => terms);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);

  const [pendingCount, setPendingCount] = useState(0);
  const pendingCountRef = useRef(pendingCount);
  const onVocabActivityRef = useRef(onVocabActivity);

  // Keep refs in sync
  useEffect(() => {
    pendingCountRef.current = pendingCount;
  }, [pendingCount]);

  useEffect(() => {
    onVocabActivityRef.current = onVocabActivity;
  }, [onVocabActivity]);

  useEffect(() => {
    if (pendingCount === 0) return;

    const timer = setTimeout(() => {
      onVocabActivityRef.current?.(pendingCount);
      setPendingCount(0);
    }, 2500);

    return () => {
      clearTimeout(timer);
    };
  }, [pendingCount]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (pendingCountRef.current > 0) {
        onVocabActivityRef.current?.(pendingCountRef.current);
      }
    };
  }, []);

  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const prevTermsKeyRef = useRef<string>('');

  // Only reset/update deck when the actual set of words changes, not when individual metadata/sort changes
  useEffect(() => {
    if (terms && terms.length > 0) {
      const currentTermsKey = terms
        .map((t) => t.word.toLowerCase().trim())
        .sort()
        .join('|');
      if (currentTermsKey !== prevTermsKeyRef.current) {
        prevTermsKeyRef.current = currentTermsKey;
        setDeckTerms(terms);
        setCurrentIndex(0);
        setKnownCount(0);
        setIsFlipped(false);
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
          transitionTimeoutRef.current = null;
        }
      }
    }
  }, [terms]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const isFlippedRef = useRef(isFlipped);
  useEffect(() => {
    isFlippedRef.current = isFlipped;
  }, [isFlipped]);

  const handleNavigate = useCallback(
    (direction: 'next' | 'prev') => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }

      if (isFlippedRef.current) {
        setIsFlipped(false);
        transitionTimeoutRef.current = setTimeout(() => {
          setCurrentIndex((prev) => {
            if (direction === 'next') {
              return (prev + 1) % deckTerms.length;
            }
            return (prev - 1 + deckTerms.length) % deckTerms.length;
          });
          transitionTimeoutRef.current = null;
        }, 150);
      } else {
        setCurrentIndex((prev) => {
          if (direction === 'next') {
            return (prev + 1) % deckTerms.length;
          }
          return (prev - 1 + deckTerms.length) % deckTerms.length;
        });
      }
    },
    [deckTerms.length],
  );

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'Right') {
        handleNavigate('next');
      } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
        handleNavigate('prev');
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsFlipped((flipped) => !flipped);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNavigate]);

  if (!deckTerms || deckTerms.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-tj-text-muted bg-tj-bg-card p-6 rounded-lg border border-tj-border-main max-w-md mx-auto">
        No vocabulary terms available for the selected language filter.
      </div>
    );
  }

  const activeTerm = deckTerms[currentIndex % deckTerms.length];
  const termLangCode = getLanguageCodeFromName(
    activeTerm?.language || langCode,
  );

  const handleNext = (known: boolean) => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    if (known) {
      setKnownCount((c) => c + 1);
      setPendingCount((c) => c + 1);
    }
    onUpdateWordSRS?.(activeTerm, known);
    setIsFlipped(false);
    transitionTimeoutRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % deckTerms.length);
      transitionTimeoutRef.current = null;
    }, 150);
  };

  const handleReset = () => {
    setDeckTerms(terms);
    setCurrentIndex(0);
    setKnownCount(0);
    setIsFlipped(false);
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-lg mx-auto space-y-6 flex flex-col items-center w-full"
    >
      <div className="w-full flex items-center justify-center select-none">
        {/* Card Viewport */}
        <div className="flex-1 h-72 perspective max-w-md w-full">
          <div
            className={`w-full h-full relative transition-all duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
          >
            {/* FRONT Side: Target Word */}
            <div className="absolute inset-0 w-full h-full bg-tj-bg-card rounded-lg p-5 border border-tj-border-main flex flex-col justify-between backface-hidden shadow-none">
              <span className="text-[10px] font-mono text-tj-text-muted tracking-wider">
                Card {(currentIndex % deckTerms.length) + 1} of {deckTerms.length} •
                FRONT
              </span>
              <div className="text-center py-2 flex flex-col items-center">
                <div className="flex items-center justify-center gap-2">
                  <h2
                    lang={termLangCode}
                    translate="no"
                    className="text-3xl font-serif font-black text-tj-text-main tracking-tight select-none"
                  >
                    {activeTerm.word}
                  </h2>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // prevent flipping the card
                      playWord(activeTerm.word, activeTerm.language);
                    }}
                    className="p-1 rounded-full hover:bg-tj-primary-light text-tj-text-muted hover:text-tj-primary transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center"
                    title="Pronounce word"
                  >
                    <Volume2 className="w-4.5 h-4.5" />
                  </button>
                </div>
                {activeTerm.transliteration && (
                  <p
                    translate="no"
                    className="text-sm font-sans italic text-tj-text-muted mt-1 select-none"
                  >
                    [{activeTerm.transliteration}]
                  </p>
                )}
                <span
                  lang={termLangCode}
                  className="text-[10px] uppercase font-mono bg-tj-primary-light border border-tj-primary-border text-tj-text-main font-bold px-2.5 py-1 rounded mt-2 inline-block select-none"
                >
                  {activeTerm.partOfSpeech}
                </span>
                {activeTerm.contextSentence && (
                  // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: onClick is only used to prevent card flip propagation
                  <div
                    lang={termLangCode}
                    translate="no"
                    onClick={(e) => {
                      e.stopPropagation();
                      playWord(activeTerm.contextSentence, activeTerm.language);
                    }}
                    className="bg-tj-bg-recessed p-3 rounded border border-tj-border-main text-base text-tj-text-muted italic font-serif leading-relaxed max-h-[85px] overflow-y-auto mt-3 w-full relative cursor-pointer"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-center">
                        {limitContextToTenWords(
                          activeTerm.contextSentence,
                          activeTerm.word,
                          termLangCode,
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playWord(
                            activeTerm.contextSentence,
                            activeTerm.language,
                          );
                        }}
                        className="p-1 rounded-full hover:bg-tj-primary-light text-tj-text-muted hover:text-tj-primary transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center"
                        title="Pronounce example sentence"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Navigation & Flip Tray */}
              <div className="flex items-stretch mx-[-20px] mb-[-20px] border-t border-dashed border-tj-border-main select-none mt-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate('prev');
                  }}
                  className="px-4 text-tj-text-muted hover:text-tj-primary hover:bg-tj-primary-light/30 transition-colors cursor-pointer border-r border-dashed border-tj-border-main flex items-center justify-center shrink-0 rounded-bl-lg"
                  title="Previous card (ArrowLeft)"
                >
                  <ChevronLeft className="w-4.5 h-4.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsFlipped(true);
                    playWord(activeTerm.word, activeTerm.language);
                  }}
                  className="flex-1 py-3.5 text-[10px] uppercase font-mono tracking-wider text-tj-text-muted hover:text-tj-primary transition-colors cursor-pointer select-none text-center"
                >
                  Click to Flip 🔄
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate('next');
                  }}
                  className="px-4 text-tj-text-muted hover:text-tj-primary hover:bg-tj-primary-light/30 transition-colors cursor-pointer border-l border-dashed border-tj-border-main flex items-center justify-center shrink-0 rounded-br-lg"
                  title="Next card (ArrowRight)"
                >
                  <ChevronRight className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* BACK Side: English definition */}
            <div className="absolute inset-0 w-full h-full bg-tj-bg-recessed rounded-lg p-6 border border-tj-border-main flex flex-col justify-between backface-hidden rotate-y-180 shadow-none">
              <span className="text-[10px] font-mono text-tj-text-muted tracking-wider">
                Card {(currentIndex % deckTerms.length) + 1} of {deckTerms.length} •
                BACK (Translation)
              </span>
              <div className="space-y-4 text-center my-auto">
                <div>
                  <h3
                    translate="yes"
                    className="text-xl font-bold text-tj-text-main leading-tight font-serif"
                  >
                    {activeTerm.definition}
                  </h3>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <span
                      lang={termLangCode}
                      className="text-xs uppercase font-mono tracking-wider font-semibold text-tj-text-muted"
                    >
                      ({activeTerm.partOfSpeech})
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // prevent flipping the card
                        playWord(activeTerm.word, activeTerm.language);
                      }}
                      className="p-1 rounded hover:bg-tj-primary-light text-tj-text-muted hover:text-tj-primary transition-colors cursor-pointer border-0 bg-transparent flex items-center justify-center"
                      title="Pronounce word"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Navigation & Flip Tray */}
              <div className="flex items-stretch mx-[-24px] mb-[-24px] border-t border-dashed border-tj-border-main select-none mt-auto">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate('prev');
                  }}
                  className="px-4 text-tj-text-muted hover:text-tj-primary hover:bg-tj-primary-light/30 transition-colors cursor-pointer border-r border-dashed border-tj-border-main flex items-center justify-center shrink-0 rounded-bl-lg"
                  title="Previous card (ArrowLeft)"
                >
                  <ChevronLeft className="w-4.5 h-4.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsFlipped(false);
                  }}
                  className="flex-1 py-3.5 text-[10px] uppercase font-mono tracking-wider text-tj-text-muted hover:text-tj-primary transition-colors cursor-pointer select-none text-center"
                >
                  Click to Flip BACK 🔄
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigate('next');
                  }}
                  className="px-4 text-tj-text-muted hover:text-tj-primary hover:bg-tj-primary-light/30 transition-colors cursor-pointer border-l border-dashed border-tj-border-main flex items-center justify-center shrink-0 rounded-br-lg"
                  title="Next card (ArrowRight)"
                >
                  <ChevronRight className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-4 w-full select-none">
        <button
          type="button"
          onClick={() => handleNext(false)}
          className="flex-1 py-3 px-4 bg-tj-bg-recessed hover:bg-tj-primary-light text-tj-text-main text-xs font-semibold rounded border border-tj-border-main transition-colors cursor-pointer"
        >
          Still Practicing 🔄
        </button>
        <button
          type="button"
          onClick={() => handleNext(true)}
          className="flex-1 py-3 px-4 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main text-xs font-semibold rounded border border-tj-primary transition-all cursor-pointer shadow-none"
        >
          Got It! 👍
        </button>
      </div>

      {/* Progress status indicators */}
      <div className="flex justify-between w-full text-xs font-semibold text-tj-text-muted select-none">
        <span>
          Score: {knownCount}/{currentIndex} words
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="text-tj-primary hover:underline flex items-center gap-1 leading-none font-sans cursor-pointer font-bold"
        >
          <RefreshCw className="w-3 h-3" />
          Reset Stats
        </button>
      </div>
    </motion.div>
  );
}
