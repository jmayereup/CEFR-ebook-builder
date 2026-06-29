import { Check, Plus } from 'lucide-react';
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
  onRemoveWord?: (wordText: string) => void;
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
  onRemoveWord,
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
      onDragEnd={(_event, info) => {
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
      className="mt-12 pt-8 border-t border-tj-border-main"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 font-sans text-xs flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-tj-primary rounded-full animate-pulse"></span>
          Key Chapter Glossary Review
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        {vocabulary.map((vocab) => {
          const isAlreadySaved = savedWordsSet?.has(
            vocab.word.toLowerCase().trim(),
          );
          return (
            <div
              key={vocab.word}
              className="py-3 border-b border-slate-100 dark:border-slate-800/40 last:border-b-0 transition-colors group relative"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    translate="no"
                    lang={getLanguageCodeFromName(language)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayWord(vocab.word);
                    }}
                    className="font-serif font-bold text-slate-900 dark:text-slate-100 hover:text-tj-primary dark:hover:text-tj-primary-hover transition-colors cursor-pointer select-none bg-transparent border-0 text-left p-0 outline-none"
                    style={{ fontSize: `${Math.max(12, fontSize - 4)}px` }}
                    title="Click to pronounce"
                  >
                    {vocab.word}
                  </button>

                  {vocab.transliteration && (
                    <span
                      translate="no"
                      className="text-slate-400 dark:text-slate-500 font-sans text-[11px] italic"
                      style={{ fontSize: `${Math.max(9, fontSize - 7)}px` }}
                    >
                      [{vocab.transliteration}]
                    </span>
                  )}

                  {onSaveWord && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAlreadySaved) {
                          if (onRemoveWord) {
                            onRemoveWord(vocab.word);
                          }
                        } else {
                          onSaveWord({
                            ...vocab,
                            language,
                          });
                        }
                      }}
                      className={`p-1 rounded-lg transition-all cursor-pointer ${
                        isAlreadySaved
                          ? 'text-emerald-600 dark:text-emerald-400 hover:bg-rose-50 dark:hover:bg-rose-955/20'
                          : 'text-tj-primary hover:bg-tj-primary-light dark:hover:bg-slate-800'
                      }`}
                      title={
                        isAlreadySaved
                          ? 'Remove from study list'
                          : 'Add to study list'
                      }
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
                translate="yes"
                className="font-sans text-slate-600 dark:text-slate-355 font-semibold mb-1"
                style={{ fontSize: `${Math.max(10, fontSize - 6)}px` }}
              >
                {vocab.definition}
              </p>

              {vocab.contextSentence && (
                <p
                  translate="no"
                  className="text-tj-text-muted italic font-serif leading-relaxed mt-1.5 pl-2 border-l-2 border-tj-border-main"
                  style={{ fontSize: `${Math.max(11, fontSize - 5)}px` }}
                >
                  "{vocab.contextSentence}"
                </p>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
