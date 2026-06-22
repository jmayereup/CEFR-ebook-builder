import { CheckCircle, Shuffle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getLanguageCodeFromName, type VocabularyTerm } from '../../types';

interface ShuffledItem {
  id: string;
  word: string;
}

interface MatchingGameProps {
  terms: VocabularyTerm[];
  langCode: string;
  onVocabActivity?: (count: number) => void;
  playWord: (word: string, customLanguage?: string) => void;
  key?: string;
}

export default function MatchingGame({
  terms,
  langCode,
  onVocabActivity,
  playWord,
}: MatchingGameProps) {
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

  const sessionMatchedWordsRef = useRef(sessionMatchedWords);
  useEffect(() => {
    sessionMatchedWordsRef.current = sessionMatchedWords;
  }, [sessionMatchedWords]);

  // Initialize a round of the game (slice 5 words)
  const initializeRound = useCallback(
    (resetSession = false) => {
      const currentSessionMatched = resetSession
        ? new Set<string>()
        : sessionMatchedWordsRef.current;
      if (resetSession) {
        setSessionMatchedWords(new Set());
        sessionMatchedWordsRef.current = new Set();
      }

      // Filter out words that have already been matched in this session
      let availableTerms = terms.filter(
        (t) => !currentSessionMatched.has(t.word.toLowerCase().trim()),
      );

      // Fallback: if we matched all words, reset the session pool
      if (availableTerms.length === 0) {
        availableTerms = terms;
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
    },
    [terms],
  );

  const prevTermsKeyRef = useRef<string>('');

  useEffect(() => {
    if (terms && terms.length > 0) {
      const currentTermsKey = terms
        .map((t) => t.word.toLowerCase().trim())
        .sort()
        .join('|');
      if (currentTermsKey !== prevTermsKeyRef.current) {
        prevTermsKeyRef.current = currentTermsKey;
        initializeRound(true);
      }
    }
  }, [terms, initializeRound]);

  // Click handler
  const handleWordSelect = (id: string) => {
    if (matchedIds.has(id)) return;
    setFailedPairs(null);

    const selectedItem = shuffledWords.find((w) => w.id === id);
    if (selectedItem) {
      const originalTerm = terms.find((t) => t.word === selectedItem.word);
      playWord(selectedItem.word, originalTerm?.language);
    }

    if (id === selectedWord) {
      setSelectedWord(null);
    } else {
      setSelectedWord(id);
      checkMatch(id, selectedDef);
    }
  };

  const handleDefSelect = (id: string) => {
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

        // If all matched in this round, update session matched words
        if (newMatchedIds.size === subset.length) {
          const nextSessionMatched = new Set(sessionMatchedWords);
          subset.forEach((t) => {
            nextSessionMatched.add(t.word.toLowerCase().trim());
          });
          setSessionMatchedWords(nextSessionMatched);
          onVocabActivity?.(subset.length);
        }
      } else {
        // Fail match
        setFailedPairs({ wordId, defId });
        setSelectedWord(null);
        setSelectedDef(null);
      }
    }
  };

  if (!terms || terms.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-tj-text-muted bg-tj-bg-card p-6 rounded-lg border border-tj-border-main">
        No matching pairs available for the selected language filter.
      </div>
    );
  }

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
          onClick={() => initializeRound(true)}
          className="p-2 bg-tj-bg-recessed hover:bg-tj-primary-light text-tj-text-muted hover:text-tj-text-main rounded border border-tj-border-main transition-all cursor-pointer"
          title="Shuffled / Load New Board"
        >
          <Shuffle className="w-4 h-4" />
        </button>
      </div>

      {/* Satisfying premium progress bar/indicator */}
      <div className="space-y-2 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-xl border border-slate-100/70 dark:border-slate-800/50">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400">
          <span>Session Progress</span>
          <span>
            {sessionMatchedWords.size} / {terms.length} words matched
            {sessionMatchedWords.size === terms.length && terms.length > 0 && (
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
              width: `${Math.min(100, (sessionMatchedWords.size / (terms.length || 1)) * 100)}%`,
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

            const originalTerm = terms.find((t) => t.word === item.word);
            const termLangCode = getLanguageCodeFromName(
              originalTerm?.language || langCode,
            );

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => handleWordSelect(item.id)}
                className={`w-full p-4 rounded-xl text-left border text-sm transition-all font-serif flex items-center justify-between cursor-pointer ${
                  isMatched
                    ? 'border-emerald-200 bg-emerald-50/40 text-slate-400 dark:border-emerald-955/20 dark:bg-emerald-955/10 cursor-not-allowed font-medium'
                    : isFailed
                      ? 'border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-955/20 dark:bg-rose-955/10 animate-shake'
                      : isSelected
                        ? 'border-tj-primary bg-tj-primary-light text-tj-primary dark:bg-tj-primary-light/10 font-bold shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-tj-primary-border dark:hover:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200 font-semibold shadow-sm'
                }`}
              >
                <span lang={termLangCode}>{item.word}</span>
                {isMatched && (
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

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => handleDefSelect(item.id)}
                className={`w-full p-4 rounded-xl text-left border text-sm transition-all font-sans flex items-center justify-between cursor-pointer ${
                  isMatched
                    ? 'border-emerald-200 bg-emerald-50/40 text-slate-400 dark:border-emerald-955/20 dark:bg-emerald-955/10 cursor-not-allowed font-medium'
                    : isFailed
                      ? 'border-rose-400 bg-rose-50 text-rose-700 dark:border-rose-955/20 dark:bg-rose-955/10'
                      : isSelected
                        ? 'border-tj-primary bg-tj-primary-light text-tj-primary dark:bg-tj-primary-light/10 font-bold shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-tj-primary-border dark:hover:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200 font-semibold shadow-sm'
                }`}
              >
                <span className="line-clamp-1 text-xs">{item.word}</span>
                {isMatched && (
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

      {matchedIds.size === subset.length && subset.length > 0 && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-emerald-50/80 dark:bg-emerald-955/20 border border-emerald-200/50 dark:border-emerald-955/20 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-700 dark:text-emerald-400"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold">
              {sessionMatchedWords.size === terms.length
                ? 'Phenomenal! You have mastered all vocabulary terms in this set!'
                : 'Incredible work! You matched all pairs in this set!'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => initializeRound(false)}
            className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 font-semibold text-white text-xs rounded-xl transition-all cursor-pointer"
          >
            {sessionMatchedWords.size === terms.length
              ? 'Restart Practice 🔄'
              : 'Load Next Board 🔄'}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
