import { Check, Plus, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import { getLanguageCodeFromName, type VocabularyTerm } from '../../types';

interface VocabGlossaryProps {
  vocabulary: VocabularyTerm[];
  language: string;
  handlePlayWord: (word: string) => void;
  fontSize: number;
  isZenMode?: boolean;
  activeChapterIndex?: number;
  onSelectChapter?: (index: number) => void;
  totalChapters?: number;
  onSaveWord?: (word: VocabularyTerm) => void;
  savedWordsSet?: Set<string>;
}

export default function VocabGlossary({
  vocabulary,
  language,
  handlePlayWord,
  fontSize,
  isZenMode = false,
  activeChapterIndex,
  onSelectChapter,
  totalChapters,
  onSaveWord,
  savedWordsSet,
}: VocabGlossaryProps) {
  if (!vocabulary || vocabulary.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      drag={isZenMode ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={(event, info) => {
        if (
          !isZenMode ||
          !onSelectChapter ||
          activeChapterIndex === undefined ||
          totalChapters === undefined
        )
          return;
        const swipeThreshold = 80;
        if (info.offset.x < -swipeThreshold) {
          if (activeChapterIndex < totalChapters - 1) {
            onSelectChapter(activeChapterIndex + 1);
          }
        } else if (info.offset.x > swipeThreshold) {
          if (activeChapterIndex > 0) {
            onSelectChapter(activeChapterIndex - 1);
          }
        }
      }}
      className="bg-tj-bg-card p-4 sm:p-6 sm:rounded-2xl rounded-none sm:shadow-sm shadow-none border-x-0 border-y sm:border border-tj-border-main"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 font-sans text-xs flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-tj-primary rounded-full animate-pulse"></span>
          Key Chapter Glossary Review
        </h3>
        <span className="text-[9px] font-mono font-bold text-slate-400 px-2 rounded bg-slate-100 dark:bg-slate-800 uppercase leading-none py-1">
          {vocabulary.length} terms list
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vocabulary.map((vocab, index) => {
          const isAlreadySaved = savedWordsSet?.has(
            vocab.word.toLowerCase().trim(),
          );
          return (
            <div
              key={index}
              className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 hover:border-slate-200 dark:hover:border-slate-700 transition-colors group relative"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    lang={getLanguageCodeFromName(language)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayWord(vocab.word);
                    }}
                    className="font-serif font-bold text-slate-900 dark:text-slate-100 hover:text-tj-primary dark:hover:text-tj-primary-hover transition-colors cursor-pointer select-none"
                    style={{ fontSize: `${Math.max(12, fontSize - 4)}px` }}
                    title="Click to pronounce"
                  >
                    {vocab.word}
                  </span>

                  {vocab.transliteration && (
                    <span
                      className="text-slate-400 dark:text-slate-500 font-sans text-[11px] italic"
                      style={{ fontSize: `${Math.max(9, fontSize - 7)}px` }}
                    >
                      [{vocab.transliteration}]
                    </span>
                  )}

                  {onSaveWord && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAlreadySaved) return;
                        onSaveWord({
                          ...vocab,
                          language,
                        });
                      }}
                      className={`p-1 rounded-lg transition-all cursor-pointer ${
                        isAlreadySaved
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                          : 'text-tj-primary hover:bg-tj-primary-light dark:hover:bg-slate-800'
                      }`}
                      title={
                        isAlreadySaved
                          ? 'Saved to study list'
                          : 'Add to study list'
                      }
                      disabled={isAlreadySaved}
                    >
                      {isAlreadySaved ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                <span
                  className="uppercase font-mono tracking-wider font-semibold text-tj-primary dark:text-tj-primary-hover bg-tj-primary-light dark:bg-tj-primary-light/10 px-1.5 py-0.5 rounded"
                  style={{ fontSize: `${Math.max(8, fontSize - 9)}px` }}
                >
                  {vocab.partOfSpeech}
                </span>
              </div>
              <p
                className="font-sans text-slate-600 dark:text-slate-355 font-semibold mb-1"
                style={{ fontSize: `${Math.max(10, fontSize - 6)}px` }}
              >
                {vocab.definition}
              </p>

              {vocab.contextSentence && (
                <p
                  className="text-tj-text-muted italic font-serif leading-relaxed mt-1.5 pl-2 border-l-2 border-tj-border-main"
                  style={{ fontSize: `${Math.max(11, fontSize - 5)}px` }}
                >
                  "{vocab.contextSentence}"
                </p>
              )}

              {/* Play pronunciation action */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayWord(vocab.word);
                }}
                className="absolute right-3.5 bottom-3.5 p-1 bg-tj-primary-light dark:bg-slate-800 group-hover:block hidden rounded-lg cursor-pointer hover:bg-tj-primary-border dark:hover:bg-slate-700 text-tj-primary dark:text-tj-primary-hover"
                title="Pronounce Word"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
