import { ArrowLeftRight, Languages, Settings2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { Story } from '../../types';
import { isSwappableBilingual } from '../../utils/storyFilters';

const STORAGE_KEY = 'cefr_hide_bilingual_swap_notification';

interface BilingualSwapNotificationProps {
  story: Story;
  onOpenReaderSettings?: () => void;
}

export default function BilingualSwapNotification({
  story,
  onOpenReaderSettings,
}: BilingualSwapNotificationProps) {
  const [show, setShow] = useState<boolean>(false);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  const isEligible = isSwappableBilingual(story);

  useEffect(() => {
    if (!isEligible) {
      setShow(false);
      return;
    }
    if (typeof localStorage === 'undefined') return;
    const isHidden = localStorage.getItem(STORAGE_KEY) === 'true';
    if (!isHidden) {
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isEligible, story.id]);

  const persistIfRequested = () => {
    if (dontShowAgain && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  };

  const handleClose = () => {
    persistIfRequested();
    setShow(false);
  };

  const handleOpenReaderSettings = () => {
    persistIfRequested();
    setShow(false);
    onOpenReaderSettings?.();
  };

  if (!isEligible) return null;

  const translationLanguage =
    story.translationLanguage || 'your translation language';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="fixed bottom-4 right-4 left-4 md:left-auto md:max-w-md z-40 p-5 bg-tj-bg-card/95 backdrop-blur-md border border-tj-border-main rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.18)] text-tj-text-main flex flex-col gap-3.5 select-text"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-tj-primary/10 text-tj-primary rounded-xl shrink-0">
                <Languages className="w-5 h-5 text-tj-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-tight text-tj-text-main">
                  Bilingual Book
                </h4>
                <p className="text-[11px] text-tj-text-muted">
                  {story.language} &middot; {translationLanguage}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 text-slate-400 hover:text-tj-text-main hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-colors"
              title="Dismiss"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2.5 text-xs text-tj-text-muted leading-relaxed">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-900 dark:text-sky-200 flex items-start gap-2.5">
              <ArrowLeftRight className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                This A1 story is bilingual. You can swap the primary and
                translation languages at any time from{' '}
                <strong className="text-tj-text-main font-semibold">
                  Reader Settings
                </strong>{' '}
                <Settings2 className="inline-block w-3 h-3 -mt-0.5 mx-0.5 text-sky-600 dark:text-sky-400" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-tj-text-muted hover:text-tj-text-main transition-colors">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded text-tj-primary focus:ring-tj-primary border-slate-300 dark:border-slate-700 cursor-pointer accent-tj-primary"
              />
              <span>Don&apos;t show this again</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenReaderSettings}
                disabled={!onOpenReaderSettings}
                className="flex-1 py-2 px-4 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-sm select-none text-center flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Open Reader Settings
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="py-2 px-3 bg-transparent border border-tj-border-main hover:bg-slate-100 dark:hover:bg-slate-800 text-tj-text-main font-semibold text-xs rounded-xl cursor-pointer transition-colors select-none text-center"
              >
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
