import { Check, Globe, Languages, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { SUPPORTED_LANGUAGES } from '../../types';

interface PreferredLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (languageName: string) => void;
}

export default function PreferredLanguageModal({
  isOpen,
  onClose,
  onConfirm,
}: PreferredLanguageModalProps) {
  const [selectedLang, setSelectedLang] = useState<string>('English');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0"
        />

        {/* Modal card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', duration: 0.35 }}
          className="relative bg-tj-bg-card rounded-2xl border border-tj-border-main p-6 shadow-2xl max-w-md w-full space-y-6 overflow-hidden z-10 text-tj-text-main"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-tj-bg-recessed text-tj-text-muted rounded-full cursor-pointer transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="p-3 bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary rounded-full shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-tj-text-main leading-tight font-sans">
                Translation Language
              </h3>
              <p className="text-xs text-tj-text-muted leading-relaxed font-medium px-2">
                Choose your preferred language for translations. Clicked words
                will be translated into this language.
              </p>
            </div>
          </div>

          {/* Language Grid */}
          <div className="grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = selectedLang === lang.name;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelectedLang(lang.name)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-tj-primary bg-tj-primary-light dark:bg-tj-primary-light/20 text-tj-text-main font-semibold shadow-sm'
                      : 'border-tj-border-main hover:border-tj-text-muted hover:bg-tj-bg-recessed text-tj-text-muted'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="text-xl shrink-0"
                      role="img"
                      aria-label={`${lang.name} flag`}
                    >
                      {lang.flag}
                    </span>
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="text-xs font-semibold text-tj-text-main truncate">
                        {lang.name}
                      </span>
                      <span className="text-[10px] text-tj-text-muted truncate">
                        {lang.nativeName}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-tj-primary shrink-0 ml-1.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Settings notice */}
          <div className="bg-tj-bg-recessed/60 dark:bg-tj-bg-recessed/30 p-3.5 rounded-xl border border-tj-border-main text-[11px] text-tj-text-muted leading-normal flex items-start gap-2.5">
            <span
              className="text-base shrink-0 mt-0.5"
              role="img"
              aria-label="settings info"
            >
              ⚙️
            </span>
            <p className="font-medium">
              You can change your target language or API key configurations at
              any time from the{' '}
              <strong className="text-tj-text-main">Settings</strong> panel in
              the header.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-tj-text-muted hover:text-tj-text-main hover:bg-tj-bg-recessed rounded-xl border border-transparent hover:border-tj-border-main transition-colors font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(selectedLang)}
              className="px-5 py-2.5 text-xs text-tj-bg-main bg-tj-primary hover:bg-tj-primary-hover font-bold rounded-xl cursor-pointer transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>Save & Continue</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
