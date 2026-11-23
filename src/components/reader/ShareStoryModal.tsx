import { Bookmark, BookOpen, Share2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';

interface ShareStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyTitle: string;
  currentChapterNumber: number;
  currentChapterTitle?: string;
  onShareBeginning: () => void;
  onShareCurrentChapter: () => void;
}

/**
 * Modal prompting the user to share either from Chapter 1 (beginning of the book)
 * or from the chapter they are currently reading.
 */
export default function ShareStoryModal({
  isOpen,
  onClose,
  storyTitle,
  currentChapterNumber,
  currentChapterTitle,
  onShareBeginning,
  onShareCurrentChapter,
}: ShareStoryModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-story-modal-title"
        >
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
            className="relative bg-tj-bg-card rounded-2xl border border-tj-border-main p-6 shadow-2xl max-w-md w-full space-y-5 overflow-hidden z-10 text-tj-text-main font-sans"
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
                <Share2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3
                  id="share-story-modal-title"
                  className="text-base font-bold text-tj-text-main leading-tight"
                >
                  Share Book Link
                </h3>
                <p className="text-xs text-tj-text-muted leading-relaxed font-medium px-2">
                  Where should the link for{' '}
                  <span className="font-semibold text-tj-text-main">
                    "{storyTitle}"
                  </span>{' '}
                  open?
                </p>
              </div>
            </div>

            {/* Share options */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onShareBeginning}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-tj-border-main hover:border-tj-primary bg-tj-bg-main hover:bg-tj-primary-light/40 dark:hover:bg-tj-primary-light/10 text-left cursor-pointer transition-all group"
              >
                <div className="p-2.5 rounded-lg bg-tj-bg-recessed group-hover:bg-tj-primary-light dark:group-hover:bg-tj-primary-light/20 text-tj-text-muted group-hover:text-tj-primary transition-colors shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-tj-text-main">
                    Beginning of the Book
                  </div>
                  <div className="text-[11px] text-tj-text-muted truncate">
                    Start reading from Chapter 1
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={onShareCurrentChapter}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-tj-border-main hover:border-tj-primary bg-tj-bg-main hover:bg-tj-primary-light/40 dark:hover:bg-tj-primary-light/10 text-left cursor-pointer transition-all group"
              >
                <div className="p-2.5 rounded-lg bg-tj-bg-recessed group-hover:bg-tj-primary-light dark:group-hover:bg-tj-primary-light/20 text-tj-text-muted group-hover:text-tj-primary transition-colors shrink-0">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-tj-text-main">
                    Current Chapter (Chapter {currentChapterNumber})
                  </div>
                  {currentChapterTitle && (
                    <div className="text-[11px] text-tj-text-muted truncate">
                      {currentChapterTitle}
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-tj-text-muted hover:text-tj-text-main bg-tj-bg-recessed hover:bg-tj-border-main/40 border border-tj-border-main rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
