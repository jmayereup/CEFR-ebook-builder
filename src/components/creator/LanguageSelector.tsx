import { Globe } from 'lucide-react';
import type React from 'react';
import type { SUPPORTED_LANGUAGES } from '../../types';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (langCode: string) => void;
  sortedLanguages: typeof SUPPORTED_LANGUAGES;
  isCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
  label?: string;
  showCollapseToggle?: boolean;
}

export default function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  sortedLanguages,
  isCollapsed = false,
  onToggleCollapsed,
  label = 'Target Language',
  showCollapseToggle = true,
}: LanguageSelectorProps) {
  const displayedLanguages = showCollapseToggle
    ? sortedLanguages.filter(
        (lang) =>
          !isCollapsed ||
          ['en', 'fr', 'es', 'th'].includes(lang.code) ||
          lang.code === selectedLanguage,
      )
    : sortedLanguages;

  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        <Globe className="w-4 h-4 text-tj-primary" />
        {label}
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {displayedLanguages.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => onLanguageChange(lang.code)}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
              selectedLanguage === lang.code
                ? 'border-tj-primary bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover ring-2 ring-tj-primary/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-transparent text-slate-700 dark:text-slate-300'
            }`}
          >
            <span className="text-2xl mb-1">{lang.flag}</span>
            <span className="text-xs font-semibold">{lang.name}</span>
            {lang.nativeName && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {lang.nativeName}
              </span>
            )}
          </button>
        ))}

        {showCollapseToggle && onToggleCollapsed && (
          <>
            {isCollapsed ? (
              <button
                type="button"
                onClick={() => onToggleCollapsed(false)}
                className="col-span-full py-2.5 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-750 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-tj-primary hover:border-tj-primary/50 transition-all cursor-pointer text-center bg-transparent mt-1"
              >
                Show More Languages
              </button>
            ) : (
              <div className="col-span-full space-y-3 mt-1">
                <button
                  type="button"
                  onClick={() => onToggleCollapsed(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-750 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-tj-primary hover:border-tj-primary/50 transition-all cursor-pointer text-center bg-transparent"
                >
                  Show Less
                </button>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center font-medium leading-normal">
                  Don't see your language? Email me at{' '}
                  <a
                    href="mailto:admin@teacherjake.com"
                    className="text-tj-primary hover:underline font-semibold"
                  >
                    admin@teacherjake.com
                  </a>{' '}
                  to request support!
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
