import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  Gift,
  Lock,
  Sparkles,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';

const STORAGE_KEY = 'cefr_hide_instruction_box';

interface InstructionFloatingBoxProps {
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
}

export default function InstructionFloatingBox({
  onOpenAuth,
}: InstructionFloatingBoxProps) {
  const [show, setShow] = useState<boolean>(false);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);
  const [showCefrDetails, setShowCefrDetails] = useState<boolean>(false);
  const { currentUser } = useAuthStore();

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    const isHidden = localStorage.getItem(STORAGE_KEY) === 'true';
    if (!isHidden) {
      // Small delay for smooth page entrance
      const timer = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setShow(false);
  };

  const handleActionClick = () => {
    if (dontShowAgain && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setShow(false);
    if (!currentUser && onOpenAuth) {
      onOpenAuth('signup');
    }
  };

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
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-tj-primary/10 text-tj-primary rounded-xl shrink-0">
                <BookOpen className="w-5 h-5 text-tj-primary" />
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-tight text-tj-text-main">
                  Welcome to CEFR Readers
                </h4>
                <p className="text-[11px] text-tj-text-muted">
                  Your AI-powered language reading companion
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 text-slate-400 hover:text-tj-text-main hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-colors"
              title="Close guide"
              aria-label="Close guide"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Cards */}
          <div className="flex flex-col gap-2.5 text-xs text-tj-text-muted leading-relaxed">
            {/* Promo Banner */}
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  Limited-Time Offer:
                </span>{' '}
                Sign up today to enjoy{' '}
                <strong className="text-tj-text-amber-700 font-semibold">
                  free book generations
                </strong>{' '}
                while our shared library is being built. Users can generate 1-2
                short stories per day for free. (No payment options required.)
              </div>
            </div>

            {/* App & CEFR Explanation */}
            <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <Filter className="w-4 h-4 text-tj-primary shrink-0 mt-0.5" />
                <div>
                  <strong className="text-tj-text-main font-semibold">
                    CEFR Level Filters:
                  </strong>{' '}
                  Stories are written to match standardized CEFR levels (Pre-A1
                  to C2), ensuring vocabulary and sentence structures fit your
                  reading comfort level.
                </div>
              </div>

              {/* Collapsible CEFR breakdown */}
              <button
                type="button"
                onClick={() => setShowCefrDetails(!showCefrDetails)}
                className="flex items-center justify-between text-[11px] text-tj-primary font-medium hover:underline pt-1 cursor-pointer select-none"
              >
                <span>
                  {showCefrDetails
                    ? 'Hide CEFR levels breakdown'
                    : 'What are CEFR levels (Pre-A1 – C2)?'}
                </span>
                {showCefrDetails ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showCefrDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-1 pt-1.5 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-1 text-[11px]"
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-mono font-medium">
                      A1 - Beginner
                    </span>
                    <span className="bg-sky-500/10 text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded font-mono font-medium">
                      A2 - Elementary
                    </span>
                    <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-mono font-medium">
                      B1 - Intermediate
                    </span>
                    <span className="bg-purple-500/10 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded font-mono font-medium">
                      B2 - Upper Interm.
                    </span>
                    <span className="bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono font-medium">
                      C1 - Advanced
                    </span>
                    <span className="bg-rose-500/10 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded font-mono font-medium">
                      C2 - Proficient
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* DRM Free Notice */}
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 line-through" />
              <div>
                <strong className="text-emerald-800 dark:text-emerald-300 font-semibold">
                  100% DRM-Free eBooks:
                </strong>{' '}
                Download your generated stories as standard EPUB ebooks. Keep
                them forever and read on Kindle, Kobo, Apple Books, or any
                e-reader.
              </div>
            </div>
          </div>

          {/* Footer Controls & Checkbox */}
          <div className="flex flex-col gap-2.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-tj-text-muted hover:text-tj-text-main transition-colors">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded text-tj-primary focus:ring-tj-primary border-slate-300 dark:border-slate-700 cursor-pointer accent-tj-primary"
              />
              <span>Don't show this again</span>
            </label>

            <div className="flex items-center gap-2">
              {!currentUser ? (
                <button
                  type="button"
                  onClick={handleActionClick}
                  className="flex-1 py-2 px-4 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-sm select-none text-center flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Sign Up & Generate Free
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleActionClick}
                  className="flex-1 py-2 px-4 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-sm select-none text-center flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Got it, let's read!
                </button>
              )}
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
