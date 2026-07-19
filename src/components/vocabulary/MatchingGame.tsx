import { CheckCircle, Shuffle, Volume2, X, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getLanguageCodeFromName, type VocabularyTerm } from '../../types';

const getPlaceholder = (word: string, hintCount: number) => {
  let revealedAlphaCount = 0;
  return word
    .split('')
    .map((char) => {
      if (/\s/.test(char)) return ' ';
      if (/[-_.,!?']/.test(char)) return char;
      revealedAlphaCount++;
      if (revealedAlphaCount <= hintCount) {
        return char;
      }
      return '_';
    })
    .join(' ');
};

interface ShuffledItem {
  id: string;
  word: string;
}

interface MatchingGameProps {
  terms: VocabularyTerm[];
  langCode: string;
  onVocabActivity?: (count: number) => void;
  onUpdateWordSRS?: (term: VocabularyTerm, isCorrect: boolean) => void;
  playWord: (word: string, customLanguage?: string) => void;
  key?: string;
}

export default function MatchingGame({
  terms,
  langCode,
  onVocabActivity,
  onUpdateWordSRS,
  playWord,
}: MatchingGameProps) {
  const [gameTerms, setGameTerms] = useState<VocabularyTerm[]>(() => terms);
  const [subset, setSubset] = useState<VocabularyTerm[]>([]);
  const [shuffledWords, setShuffledWords] = useState<ShuffledItem[]>([]);
  const [shuffledDefs, setShuffledDefs] = useState<ShuffledItem[]>([]);

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedDef, setSelectedDef] = useState<string | null>(null);

  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [failedPairs, setFailedPairs] = useState<{
    wordId: string;
    defId: string;
  } | null>(null);
  const [sessionMatchedWords, setSessionMatchedWords] = useState<Set<string>>(
    new Set(),
  );
  const [selectedTermForToast, setSelectedTermForToast] =
    useState<VocabularyTerm | null>(null);

  // Cognitive Boost states
  const [gameMode, setGameMode] = useState<'classic' | 'boost'>('boost');
  const [boostPhase, setBoostPhase] = useState<'recall' | 'match' | 'produce'>(
    'recall',
  );

  // Production phase states
  const [selectedProductionId, setSelectedProductionId] = useState<
    string | null
  >(null);
  const [productionInput, setProductionInput] = useState('');
  const [producedIds, setProducedIds] = useState<Set<string>>(new Set());
  const [productionFeedback, setProductionFeedback] = useState<
    'correct' | 'incorrect' | null
  >(null);
  const [productionHintCount, setProductionHintCount] = useState(0);

  const sessionMatchedWordsRef = useRef(sessionMatchedWords);
  useEffect(() => {
    sessionMatchedWordsRef.current = sessionMatchedWords;
  }, [sessionMatchedWords]);

  // Initialize a round of the game (slice 5 words)
  const initializeRound = useCallback(
    (resetSession = false, freshTerms?: VocabularyTerm[]) => {
      const activeTerms = freshTerms || gameTerms;
      const currentSessionMatched = resetSession
        ? new Set<string>()
        : sessionMatchedWordsRef.current;
      if (resetSession) {
        setSessionMatchedWords(new Set());
        sessionMatchedWordsRef.current = new Set();
      }

      // Filter out words that have already been matched in this session
      let availableTerms = activeTerms.filter(
        (t) => !currentSessionMatched.has(t.word.toLowerCase().trim()),
      );

      // Fallback: if we matched all words, reset the session pool
      if (availableTerms.length === 0) {
        availableTerms = activeTerms;
        setSessionMatchedWords(new Set());
        sessionMatchedWordsRef.current = new Set();
      }

      const shuffledTerms = [...availableTerms].sort(() => 0.5 - Math.random());
      const selected = shuffledTerms.slice(
        0,
        Math.min(5, shuffledTerms.length),
      );

      // Unique IDs for React keys and matching
      const words = selected.map((t, idx) => ({
        id: `${t.word}-${idx}`,
        word: t.word,
      }));
      const defs = selected.map((t, idx) => ({
        id: `${t.word}-${idx}`,
        word: t.definition,
      }));

      // Shuffle each columns
      setShuffledWords([...words].sort(() => 0.5 - Math.random()));
      setShuffledDefs([...defs].sort(() => 0.5 - Math.random()));

      setSubset(selected);
      setSelectedWord(null);
      setSelectedDef(null);
      setMatchedIds(new Set());
      setFailedPairs(null);

      // Reset Cognitive Boost states
      setBoostPhase('recall');
      setSelectedProductionId(null);
      setProductionInput('');
      setProducedIds(new Set());
      setProductionFeedback(null);
      setProductionHintCount(0);
    },
    [gameTerms],
  );

  useEffect(() => {
    initializeRound(true);
  }, [initializeRound]);

  // Click handler for Word Selection
  const handleWordSelect = (id: string) => {
    if (gameMode === 'boost' && boostPhase === 'produce') return;
    if (matchedIds.has(id)) return;
    setFailedPairs(null);

    const selectedItem = shuffledWords.find((w) => w.id === id);
    if (selectedItem) {
      const originalTerm = gameTerms.find((t) => t.word === selectedItem.word);
      playWord(selectedItem.word, originalTerm?.language);
      if (originalTerm?.contextSentence) {
        setSelectedTermForToast(originalTerm);
      }
    }

    if (gameMode === 'boost' && boostPhase === 'recall') {
      setSelectedWord(id === selectedWord ? null : id);
      return;
    }

    if (id === selectedWord) {
      setSelectedWord(null);
    } else {
      setSelectedWord(id);
      checkMatch(id, selectedDef);
    }
  };

  // Click handler for Definition Selection
  const handleDefSelect = (id: string) => {
    if (gameMode === 'boost' && boostPhase === 'produce') {
      if (producedIds.has(id)) return;
      setSelectedProductionId(id === selectedProductionId ? null : id);
      setProductionInput('');
      setProductionFeedback(null);
      setProductionHintCount(0);
      return;
    }

    if (gameMode === 'boost' && boostPhase === 'recall') return;
    if (matchedIds.has(id)) return;
    setFailedPairs(null);

    if (id === selectedDef) {
      setSelectedDef(null);
    } else {
      setSelectedDef(id);
      checkMatch(selectedWord, id);
    }
  };

  const checkMatch = (wordId: string | null, defId: string | null) => {
    if (wordId && defId) {
      if (wordId === defId) {
        // Success match!
        const newMatchedIds = new Set([...matchedIds, wordId]);
        setMatchedIds(newMatchedIds);
        setSelectedWord(null);
        setSelectedDef(null);

        const matchedItem = shuffledWords.find((w) => w.id === wordId);
        const originalTerm = gameTerms.find(
          (t) => t.word === matchedItem?.word,
        );
        if (originalTerm) {
          onUpdateWordSRS?.(originalTerm, true);
        }

        // If all matched in this round
        if (newMatchedIds.size === subset.length) {
          if (gameMode === 'boost') {
            // Transition to Phase 3 (Production)
            setBoostPhase('produce');
            // Auto-select the first definition to start production
            if (shuffledDefs.length > 0) {
              setSelectedProductionId(shuffledDefs[0].id);
            }
          } else {
            // Classic behavior: Update session matched words and trigger activity
            const nextSessionMatched = new Set(sessionMatchedWords);
            subset.forEach((t) => {
              nextSessionMatched.add(t.word.toLowerCase().trim());
            });
            setSessionMatchedWords(nextSessionMatched);
            onVocabActivity?.(subset.length);
          }
        }
      } else {
        // Fail match
        setFailedPairs({ wordId, defId });
        setSelectedWord(null);
        setSelectedDef(null);

        const selectedItem = shuffledWords.find((w) => w.id === wordId);
        const originalTerm = gameTerms.find(
          (t) => t.word === selectedItem?.word,
        );
        if (originalTerm) {
          onUpdateWordSRS?.(originalTerm, false);
        }
      }
    }
  };

  const handleCheckProduction = () => {
    if (!selectedProductionId) return;
    const matchedDef = shuffledDefs.find((d) => d.id === selectedProductionId);
    const originalTerm = gameTerms.find(
      (t) => t.definition === matchedDef?.word,
    );
    if (!originalTerm) return;

    const normalizedInput = productionInput.trim().toLowerCase();
    const normalizedTarget = originalTerm.word.trim().toLowerCase();

    if (normalizedInput === normalizedTarget) {
      setProductionFeedback('correct');
      playWord(originalTerm.word, originalTerm.language);
      const nextProduced = new Set(producedIds);
      nextProduced.add(selectedProductionId);
      setProducedIds(nextProduced);

      setTimeout(() => {
        // Auto-select the next unproduced definition to maintain typing flow
        const nextUnproduced = shuffledDefs.find(
          (d) => !nextProduced.has(d.id),
        );
        setSelectedProductionId(nextUnproduced ? nextUnproduced.id : null);
        setProductionInput('');
        setProductionFeedback(null);
        setProductionHintCount(0);

        // If all 5 produced
        if (nextProduced.size === subset.length) {
          const nextSessionMatched = new Set(sessionMatchedWords);
          subset.forEach((t) => {
            nextSessionMatched.add(t.word.toLowerCase().trim());
          });
          setSessionMatchedWords(nextSessionMatched);
          onVocabActivity?.(subset.length);
        }
      }, 1000);
    } else {
      setProductionFeedback('incorrect');
    }
  };

  const handleRevealProduction = () => {
    if (!selectedProductionId) return;
    const matchedDef = shuffledDefs.find((d) => d.id === selectedProductionId);
    const originalTerm = gameTerms.find(
      (t) => t.definition === matchedDef?.word,
    );
    if (!originalTerm) return;

    // Fill correct spelling and mark as correct
    setProductionInput(originalTerm.word);
    setProductionFeedback('correct');
    playWord(originalTerm.word, originalTerm.language);

    const nextProduced = new Set(producedIds);
    nextProduced.add(selectedProductionId);
    setProducedIds(nextProduced);

    setTimeout(() => {
      // Auto-select the next unproduced definition to maintain typing flow
      const nextUnproduced = shuffledDefs.find((d) => !nextProduced.has(d.id));
      setSelectedProductionId(nextUnproduced ? nextUnproduced.id : null);
      setProductionInput('');
      setProductionFeedback(null);
      setProductionHintCount(0);

      if (nextProduced.size === subset.length) {
        const nextSessionMatched = new Set(sessionMatchedWords);
        subset.forEach((t) => {
          nextSessionMatched.add(t.word.toLowerCase().trim());
        });
        setSessionMatchedWords(nextSessionMatched);
        onVocabActivity?.(subset.length);
      }
    }, 1500);
  };

  const handleRequestHint = () => {
    if (!selectedProductionId) return;
    const matchedDef = shuffledDefs.find((d) => d.id === selectedProductionId);
    const originalTerm = gameTerms.find(
      (t) => t.definition === matchedDef?.word,
    );
    if (!originalTerm) return;

    const revealableLength = originalTerm.word
      .split('')
      .filter((char) => !/\s/.test(char) && !/[-_.,!?']/.test(char)).length;

    const nextHintCount = productionHintCount + 1;
    setProductionHintCount(nextHintCount);

    if (nextHintCount >= revealableLength) {
      handleRevealProduction();
    }
  };

  if (!gameTerms || gameTerms.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-tj-text-muted bg-tj-bg-card p-6 rounded-lg border border-tj-border-main">
        No matching pairs available for the selected language filter.
      </div>
    );
  }

  const isRoundComplete =
    matchedIds.size === subset.length &&
    (gameMode !== 'boost' || producedIds.size === subset.length);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="bg-tj-bg-card p-6 rounded-lg border border-tj-border-main shadow-none space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-tj-text-main text-sm">
            Matching Exercise
          </h3>
          <p className="text-xs text-tj-text-muted">
            Connect the vocabulary words with their correct English definitions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setGameTerms(terms);
            initializeRound(true, terms);
          }}
          className="p-2 bg-tj-bg-recessed hover:bg-tj-primary-light text-tj-text-muted hover:text-tj-text-main rounded border border-tj-border-main transition-all cursor-pointer"
          title="Shuffled / Load New Board"
        >
          <Shuffle className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Selector and Phase Guidance */}
      <div className="flex flex-col sm:flex-row sm:items-stretch justify-between gap-4 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100/70 dark:border-slate-800/50">
        <div className="flex bg-slate-200/50 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50 w-full sm:w-fit self-start shrink-0">
          <button
            type="button"
            onClick={() => {
              setGameMode('boost');
              initializeRound(true);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              gameMode === 'boost'
                ? 'bg-white dark:bg-slate-700 text-tj-primary shadow-sm font-bold'
                : 'text-tj-text-muted hover:text-tj-text-main'
            }`}
          >
            🧠 Cognitive Boost
          </button>
          <button
            type="button"
            onClick={() => {
              setGameMode('classic');
              initializeRound(true);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              gameMode === 'classic'
                ? 'bg-white dark:bg-slate-700 text-tj-primary shadow-sm font-bold'
                : 'text-tj-text-muted hover:text-tj-text-main'
            }`}
          >
            ⚡ Classic Match
          </button>
        </div>

        {gameMode === 'boost' && (
          <div className="flex-1 text-xs text-tj-text-muted sm:pl-4 sm:border-l border-slate-200 dark:border-slate-800">
            {boostPhase === 'recall' && (
              <div className="space-y-1.5">
                <p className="font-bold text-tj-text-main flex items-center gap-1.5">
                  <span>🧠 Phase 1: Try to Recall</span>
                </p>
                <p className="leading-relaxed">
                  Look at each target word on the left. Attempt to recall its
                  English definition in your head.
                  <span className="block mt-1 font-medium text-tj-primary">
                    Science Reminder: You don't need to succeed! Just trying to
                    remember primes your brain to treat the information as
                    important. When you see the definitions next, they will
                    stick much better.
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setBoostPhase('match')}
                  className="mt-2.5 px-3 py-1.5 bg-tj-primary hover:bg-tj-primary-hover text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                >
                  Start Matching ➔
                </button>
              </div>
            )}
            {boostPhase === 'match' && (
              <div className="space-y-1">
                <p className="font-bold text-tj-text-main flex items-center gap-1.5">
                  <span>⚡ Phase 2: Recognition Match</span>
                </p>
                <p className="leading-relaxed">
                  Connect each target word with its correct English definition.
                </p>
              </div>
            )}
            {boostPhase === 'produce' && (
              <div className="space-y-1">
                <p className="font-bold text-tj-text-main flex items-center gap-1.5">
                  <span>
                    ✍️ Phase 3: Recall Target Words (Optional Production)
                  </span>
                </p>
                <p className="leading-relaxed">
                  Select a definition on the right, and try to recall how to
                  spell or say the target language word.
                  <span className="block mt-1 font-medium text-tj-primary">
                    Science Reminder: If you aren't sure of the spelling, just
                    try to think of it first, then click 'Reveal Word 👁️'. The
                    search attempt itself is what creates strong memories.
                  </span>
                </p>
              </div>
            )}
          </div>
        )}
        {gameMode === 'classic' && (
          <div className="flex-1 text-xs text-tj-text-muted sm:pl-4 sm:border-l border-slate-200 dark:border-slate-800 flex items-center">
            <p className="leading-relaxed">
              Standard mode. Select a target language word on the left and match
              it to its English definition on the right.
            </p>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="space-y-2 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-xl border border-slate-100/70 dark:border-slate-800/50">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400">
          <span>Session Progress</span>
          <span>
            {sessionMatchedWords.size} / {gameTerms.length} words matched
            {sessionMatchedWords.size === gameTerms.length &&
              gameTerms.length > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400 ml-2 font-bold animate-pulse">
                  Mastered! 🎉
                </span>
              )}
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-tj-primary h-full transition-all duration-500 ease-out rounded-full"
            style={{
              width: `${Math.min(100, (sessionMatchedWords.size / (gameTerms.length || 1)) * 100)}%`,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative select-none">
        {/* Words Column */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400 block mb-1">
            Target Language Word
          </span>
          {shuffledWords.map((item) => {
            const isMatched = matchedIds.has(item.id);
            const isSelected = selectedWord === item.id;
            const isFailed = failedPairs?.wordId === item.id;

            const originalTerm = gameTerms.find((t) => t.word === item.word);
            const termLangCode = getLanguageCodeFromName(
              originalTerm?.language || langCode,
            );

            // Blur logic for Phase 3
            const isProduced = producedIds.has(item.id);
            const isBlurred =
              gameMode === 'boost' && boostPhase === 'produce' && !isProduced;

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => handleWordSelect(item.id)}
                disabled={isBlurred}
                className={`w-full p-4 rounded-xl text-left border text-lg md:text-xl transition-all font-serif flex items-center justify-between ${
                  isBlurred
                    ? 'border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/10 filter blur-md select-none pointer-events-none opacity-30'
                    : isMatched
                      ? 'border-emerald-200 bg-emerald-50/40 text-slate-400 dark:border-emerald-955/20 dark:bg-emerald-955/10 cursor-not-allowed font-medium'
                      : isFailed
                        ? 'border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-955/20 dark:bg-rose-955/10 animate-shake'
                        : isSelected
                          ? 'border-tj-primary bg-tj-primary-light text-tj-primary dark:bg-tj-primary-light/10 font-bold shadow-md'
                          : 'border-slate-200 dark:border-slate-800 hover:border-tj-primary-border dark:hover:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200 font-semibold shadow-sm'
                }`}
              >
                <span lang={termLangCode} translate="no">
                  {item.word}
                </span>
                {isMatched && !isBlurred && (
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                {isFailed && (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Definitions Column */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400 block mb-1">
            English Definition
          </span>
          {shuffledDefs.map((item) => {
            const isMatched = matchedIds.has(item.id);
            const isSelected = selectedDef === item.id;
            const isFailed = failedPairs?.defId === item.id;

            // Blur logic for Phase 1
            const isBlurred = gameMode === 'boost' && boostPhase === 'recall';
            // Production states for Phase 3
            const isProductionSelected =
              gameMode === 'boost' &&
              boostPhase === 'produce' &&
              selectedProductionId === item.id;
            const isProduced =
              gameMode === 'boost' &&
              boostPhase === 'produce' &&
              producedIds.has(item.id);

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => handleDefSelect(item.id)}
                disabled={isBlurred || isProduced}
                className={`w-full p-4 rounded-xl text-left border text-sm transition-all font-sans flex items-center justify-between cursor-pointer ${
                  isBlurred
                    ? 'border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/10 filter blur-md select-none pointer-events-none opacity-30'
                    : isProduced
                      ? 'border-emerald-100 dark:border-emerald-950/20 bg-emerald-50/20 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                      : isProductionSelected
                        ? 'border-tj-primary bg-tj-primary-light text-tj-primary dark:bg-tj-primary-light/10 font-bold shadow-md'
                        : isMatched
                          ? 'border-emerald-200 bg-emerald-50/40 text-slate-400 dark:border-emerald-955/20 dark:bg-emerald-955/10 cursor-not-allowed font-medium'
                          : isFailed
                            ? 'border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-955/20 dark:bg-rose-955/10'
                            : isSelected
                              ? 'border-tj-primary bg-tj-primary-light text-tj-primary dark:bg-tj-primary-light/10 font-bold shadow-md'
                              : 'border-slate-200 dark:border-slate-800 hover:border-tj-primary-border dark:hover:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200 font-semibold shadow-sm'
                }`}
              >
                <span translate="yes" className="line-clamp-1 text-xs">
                  {item.word}
                </span>
                {isMatched &&
                  !isBlurred &&
                  !isProductionSelected &&
                  !isProduced && (
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                {isProduced && (
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                {isFailed && (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Production Phase Panel */}
      {gameMode === 'boost' &&
        boostPhase === 'produce' &&
        selectedProductionId &&
        (() => {
          const matchedDef = shuffledDefs.find(
            (d) => d.id === selectedProductionId,
          );
          const originalTerm = gameTerms.find(
            (t) => t.definition === matchedDef?.word,
          );
          if (!originalTerm) return null;

          const placeholder = getPlaceholder(
            originalTerm.word,
            productionHintCount,
          );

          return (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100/70 dark:border-slate-850 p-5 rounded-2xl space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400 block mb-1">
                    Active Production Challenge
                  </span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Translate: "{originalTerm.definition}"
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono bg-slate-200/50 dark:bg-slate-800 text-tj-text-muted px-2.5 py-1 rounded-md font-semibold">
                    Spelling Helper:{' '}
                    <code className="text-tj-primary font-bold">
                      {placeholder}
                    </code>
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={productionInput}
                    onChange={(e) => setProductionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCheckProduction();
                      }
                    }}
                    disabled={productionFeedback === 'correct'}
                    placeholder="Type the target word..."
                    className={`w-full px-4 py-3 rounded-xl border text-base focus:ring-0 outline-none transition-all ${
                      productionFeedback === 'correct'
                        ? 'border-emerald-300 bg-emerald-50/50 text-emerald-800 dark:border-emerald-950/20 dark:bg-emerald-955/20 dark:text-emerald-400 font-bold'
                        : productionFeedback === 'incorrect'
                          ? 'border-rose-300 bg-rose-50/50 text-rose-800 dark:border-rose-955/20 dark:bg-rose-955/20 dark:text-rose-450 animate-shake'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100'
                    }`}
                    // biome-ignore lint/a11y/noAutofocus: autofocus improves gaming flow immediately after selecting a definition
                    autoFocus
                  />
                  {productionFeedback === 'correct' && (
                    <CheckCircle className="absolute right-3.5 top-3.5 w-5 h-5 text-emerald-500" />
                  )}
                  {productionFeedback === 'incorrect' && (
                    <XCircle className="absolute right-3.5 top-3.5 w-5 h-5 text-rose-500" />
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCheckProduction}
                    disabled={
                      productionFeedback === 'correct' ||
                      !productionInput.trim()
                    }
                    className="px-5 py-3 bg-tj-primary hover:bg-tj-primary-hover text-white font-bold rounded-xl transition-all cursor-pointer text-xs whitespace-nowrap disabled:opacity-50"
                  >
                    Verify
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestHint}
                    disabled={productionFeedback === 'correct'}
                    className="px-4 py-3 bg-slate-200/80 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-750 text-tj-text-main text-xs font-semibold rounded-xl border border-slate-300/40 dark:border-slate-700/40 transition-colors cursor-pointer disabled:opacity-50"
                    title="Reveal next letter"
                  >
                    Hint 💡
                  </button>
                  <button
                    type="button"
                    onClick={handleRevealProduction}
                    disabled={productionFeedback === 'correct'}
                    className="px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-450 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    title="Reveal word immediately"
                  >
                    Reveal Word 👁️
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })()}

      {isRoundComplete && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-emerald-50/80 dark:bg-emerald-955/20 border border-emerald-200/50 dark:border-emerald-955/20 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-700 dark:text-emerald-400"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">
              {sessionMatchedWords.size === gameTerms.length
                ? 'Phenomenal! You have mastered all vocabulary terms in this set!'
                : 'Incredible work! You matched all pairs in this set!'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setGameTerms(terms);
              const resetSession =
                sessionMatchedWords.size === gameTerms.length;
              initializeRound(resetSession, terms);
            }}
            className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 font-semibold text-white text-xs rounded-xl transition-all cursor-pointer"
          >
            {sessionMatchedWords.size === gameTerms.length
              ? 'Restart Practice 🔄'
              : 'Load Next Board 🔄'}
          </button>
        </motion.div>
      )}

      {/* Example Sentence Toast */}
      <AnimatePresence>
        {selectedTermForToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-0 left-0 right-0 z-50 w-full bg-tj-bg-card border-t border-tj-border-main shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1),0_-8px_10px_-6px_rgba(0,0,0,0.1)] p-4 md:p-6"
          >
            <button
              type="button"
              onClick={() => setSelectedTermForToast(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-full cursor-pointer transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="max-w-3xl mx-auto">
              <button
                type="button"
                onClick={() => {
                  if (selectedTermForToast?.contextSentence) {
                    playWord(
                      selectedTermForToast.contextSentence,
                      selectedTermForToast.language,
                    );
                  }
                }}
                className="w-full text-left cursor-pointer border-0 bg-transparent p-0"
              >
                <span
                  lang={getLanguageCodeFromName(
                    selectedTermForToast.language || langCode,
                  )}
                  translate="no"
                  className="text-base text-slate-900 dark:text-slate-100 italic font-serif leading-relaxed"
                >
                  "{selectedTermForToast.contextSentence}"
                </span>
                <Volume2 className="w-4 h-4 inline ml-2 text-slate-900 dark:text-slate-100" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
