import { BookOpen, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import type React from 'react';
import { CEFR_LEVELS, SUPPORTED_LANGUAGES } from '../../types';
import { getCefrBadgeStyle } from './storyConfigConstants';

interface CefrLevelSelectorProps {
  cefrLevel: string;
  onLevelChange: (level: string) => void;
  language: string;
  translationTargetLanguage: string | null;
  onTranslationTargetLanguageChange: (language: string) => void;
}

export default function CefrLevelSelector({
  cefrLevel,
  onLevelChange,
  language,
  translationTargetLanguage,
  onTranslationTargetLanguageChange,
}: CefrLevelSelectorProps) {
  const selectedLevelObj = CEFR_LEVELS.find((l) => l.code === cefrLevel);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium text-tj-text-main">
        <BookOpen className="w-4 h-4 text-tj-primary" />
        CEFR Level (Difficulty)
      </label>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {CEFR_LEVELS.map((level) => {
          const isSelected = cefrLevel === level.code;
          return (
            <button
              key={level.code}
              type="button"
              onClick={() => onLevelChange(level.code)}
              className={`p-3 border rounded-xl text-center transition-all duration-200 flex items-center justify-center cursor-pointer font-mono font-bold text-sm tracking-wide ${
                isSelected
                  ? `${getCefrBadgeStyle(level.code)} border-tj-primary ring-2 ring-tj-primary/20`
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-tj-bg-card text-slate-700 dark:text-slate-355'
              }`}
            >
              {level.code}
            </button>
          );
        })}
      </div>
      {selectedLevelObj && (
        <motion.p
          key={cefrLevel}
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xs text-tj-text-main ml-1 font-sans bg-tj-bg-recessed p-2.5 rounded border border-tj-border-main"
        >
          <strong>{selectedLevelObj.name}:</strong>{' '}
          {selectedLevelObj.description}
        </motion.p>
      )}
      {(cefrLevel === 'A1' || cefrLevel === 'Pre-A1') && (
        <div className="space-y-2 mt-4 animate-fade-in pl-1">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Globe className="w-4 h-4 text-tj-primary" />
            Bilingual Translation Language
          </label>
          <select
            value={translationTargetLanguage || ''}
            onChange={(e) => {
              const newLang = e.target.value;
              onTranslationTargetLanguageChange(newLang);
              localStorage.setItem('translation_target_language', newLang);
            }}
            className="w-full p-2.5 rounded-xl border border-tj-border-main bg-tj-bg-card text-tj-text-main text-xs font-semibold focus:border-tj-primary focus:outline-none cursor-pointer"
          >
            {translationTargetLanguage === null && (
              <option value="" disabled>
                Select language...
              </option>
            )}
            {SUPPORTED_LANGUAGES.filter(
              (lang) => lang.code !== language,
            ).map((lang) => (
              <option key={lang.code} value={lang.name}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-405 dark:text-slate-400 leading-normal">
            {cefrLevel} stories will be generated in a line-by-line bilingual
            format. For Pre-A1, this includes a word-by-word/phrase-by-phrase
            mapping in the translation. This also changes the target translation
            language for dictionary lookups at all levels.
          </p>
        </div>
      )}
    </div>
  );
}
