import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, BookOpen, Smartphone, X } from 'lucide-react';

export interface ReadingSyncPromptProps {
  isOpen: boolean;
  remoteChapterIdx: number;
  currentChapterIdx: number;
  totalChapters?: number;
  onJump: (targetChapterIdx: number) => void;
  onDismiss: () => void;
}

export const ReadingSyncPrompt: React.FC<ReadingSyncPromptProps> = ({
  isOpen,
  remoteChapterIdx,
  currentChapterIdx,
  totalChapters,
  onJump,
  onDismiss,
}) => {
  if (!isOpen) return null;

  const remoteChapterNum = remoteChapterIdx + 1;
  const currentChapterNum = currentChapterIdx + 1;
  const isAhead = remoteChapterIdx > currentChapterIdx;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg"
          role="dialog"
          aria-live="polite"
          aria-label="Sync reading location"
        >
          <div className="relative overflow-hidden rounded-2xl bg-tj-bg-card/95 backdrop-blur-md border border-tj-primary/35 shadow-2xl p-4 sm:p-5 text-tj-text-main">
            {/* Top subtle terracotta indicator stripe */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-tj-primary/40 via-tj-primary to-tj-primary/40" />

            <div className="flex items-start gap-3.5">
              {/* Icon badge */}
              <div className="shrink-0 w-10 h-10 rounded-xl bg-tj-primary/10 border border-tj-primary/25 flex items-center justify-center text-tj-primary mt-0.5">
                <Smartphone className="w-5 h-5 animate-pulse" />
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-tj-primary font-mono mb-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Sync Reading Location</span>
                </div>

                <p className="text-sm font-serif text-tj-text-main leading-snug">
                  You were reading{' '}
                  <span className="font-bold text-tj-primary">
                    Chapter {remoteChapterNum}
                    {totalChapters ? ` of ${totalChapters}` : ''}
                  </span>{' '}
                  on another device.
                </p>

                <p className="text-xs text-tj-text-muted mt-0.5 font-sans">
                  {isAhead
                    ? `You are currently on Chapter ${currentChapterNum}. Jump ahead or stay here?`
                    : `You are currently on Chapter ${currentChapterNum}. Return to Chapter ${remoteChapterNum} or stay?`}
                </p>

                {/* Action buttons */}
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onJump(remoteChapterIdx)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-tj-primary text-white text-xs font-medium shadow-xs hover:bg-tj-primary-hover active:scale-95 transition-all cursor-pointer font-sans"
                  >
                    <span>Go to Chapter {remoteChapterNum}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={onDismiss}
                    className="px-3 py-1.5 rounded-lg bg-tj-bg-secondary hover:bg-tj-border-main text-tj-text-muted hover:text-tj-text-main text-xs font-medium transition-all cursor-pointer font-sans"
                  >
                    Stay on Chapter {currentChapterNum}
                  </button>
                </div>
              </div>

              {/* Close / Dismiss button */}
              <button
                type="button"
                onClick={onDismiss}
                className="absolute top-3.5 right-3.5 p-1 rounded-lg text-tj-text-muted hover:text-tj-text-main hover:bg-tj-border-main/50 transition-colors cursor-pointer"
                title="Dismiss"
                aria-label="Dismiss reading sync prompt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReadingSyncPrompt;
