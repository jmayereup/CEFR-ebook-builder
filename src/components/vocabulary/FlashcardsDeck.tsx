import { RefreshCw, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { getLanguageCodeFromName, type VocabularyTerm } from '../../types';
import { limitContextToTenWords } from '../../utils/segmenter';

interface FlashcardsDeckProps {
  terms: VocabularyTerm[];
  langCode: string;
  onVocabActivity?: (count: number) => void;
  playWord: (word: string, customLanguage?: string) => void;
  key?: string;
}

export default function FlashcardsDeck({
  terms,
  langCode,
  onVocabActivity,
  playWord,
}: FlashcardsDeckProps) {
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

  useEffect(() => {
    setCurrentIndex(0);
    setKnownCount(0);
    setIsFlipped(false);
  }, []);

  if (!terms || terms.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-tj-text-muted bg-tj-bg-card p-6 rounded-lg border border-tj-border-main max-w-md mx-auto">
        No vocabulary terms available for the selected language filter.
      </div>
    );
  }

  const activeTerm = terms[currentIndex % terms.length];
  const termLangCode = getLanguageCodeFromName(
    activeTerm?.language || langCode,
  );

  const handleNext = (known: boolean) => {
    if (known) {
      setKnownCount((c) => c + 1);
      setPendingCount((c) => c + 1);
    }
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % terms.length);
    }, 150);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setKnownCount(0);
    setIsFlipped(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="max-w-md mx-auto space-y-6 flex flex-col items-center"
    >
      {/* Flashcard container with 3D Flip */}
      <div
        onClick={() => {
          setIsFlipped(!isFlipped);
          playWord(activeTerm.word, activeTerm.language);
        }}
        className="w-full h-72 perspective cursor-pointer"
      >
        <div
          className={`w-full h-full relative transition-all duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
        >
          {/* FRONT Side: Target Word */}
          <div className="absolute inset-0 w-full h-full bg-tj-bg-card rounded-lg p-6 border border-tj-border-main flex flex-col justify-between backface-hidden shadow-none">
            <span className="text-[10px] font-mono text-tj-text-muted tracking-wider">
              Card {currentIndex + 1} of {terms.length} • FRONT
            </span>
            <div className="text-center py-6 flex flex-col items-center">
              <div className="flex items-center justify-center gap-2">
                <h2
                  lang={termLangCode}
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
                <p className="text-sm font-sans italic text-tj-text-muted mt-1 select-none">
                  [{activeTerm.transliteration}]
                </p>
              )}
              <span
                lang={termLangCode}
                className="text-[10px] uppercase font-mono bg-tj-primary-light border border-tj-primary-border text-tj-text-main font-bold px-2.5 py-1 rounded mt-3 inline-block select-none"
              >
                {activeTerm.partOfSpeech}
              </span>
            </div>
            <p className="text-[10px] text-center text-tj-text-muted select-none animate-pulse">
              Click to Flip
            </p>
          </div>

          {/* BACK Side: English definition and context */}
          <div className="absolute inset-0 w-full h-full bg-tj-bg-recessed rounded-lg p-6 border border-tj-border-main flex flex-col justify-between backface-hidden rotate-y-180 shadow-none">
            <span className="text-[10px] font-mono text-tj-text-muted tracking-wider">
              Card {currentIndex + 1} of {terms.length} • BACK (Translation)
            </span>
            <div className="space-y-4 text-center">
              <div>
                <h3 className="text-lg font-bold text-tj-text-main leading-tight font-serif">
                  {activeTerm.definition}
                </h3>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span
                    lang={termLangCode}
                    className="text-[9px] uppercase font-mono tracking-wider font-semibold text-tj-text-muted"
                  >
                    {activeTerm.word} ({activeTerm.partOfSpeech})
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
              <div
                lang={termLangCode}
                className="bg-tj-bg-card p-3 rounded border border-tj-border-main text-xs text-tj-text-muted italic font-serif leading-relaxed max-h-[85px] overflow-y-auto"
              >
                "
                {limitContextToTenWords(
                  activeTerm.contextSentence || '',
                  activeTerm.word,
                  termLangCode,
                )}
                "
              </div>
            </div>
            <p className="text-[10px] text-center text-tj-text-muted select-none">
              Click to Flip BACK
            </p>
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
