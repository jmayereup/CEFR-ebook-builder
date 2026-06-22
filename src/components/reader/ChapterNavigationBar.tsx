import { ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import type { Story } from '../../types';

interface ChapterNavigationBarProps {
  story: Story;
  activeChapterIndex: number;
  onSelectChapter: (index: number) => void;
  onGenerateNextChapter: (chapterGuidance?: string) => void;
  isLoadingNext: boolean;
  isAutoGeneratingRemaining: boolean;
  isPaid: boolean;
  nextChapterCreditCost: number;
}

export default function ChapterNavigationBar({
  story,
  activeChapterIndex,
  onSelectChapter,
  onGenerateNextChapter,
  isLoadingNext,
  isAutoGeneratingRemaining,
  isPaid,
  nextChapterCreditCost,
}: ChapterNavigationBarProps) {
  const hasPrevious = activeChapterIndex > 0;
  const hasNextLoaded = activeChapterIndex < story.chapters.length - 1;
  const canWriteNextChapter = story.chapters.length < story.totalChapters;

  return (
    <div className="w-full">
      <div className="flex flex-row flex-wrap items-center justify-between gap-2 sm:gap-3">
        <button
          disabled={!hasPrevious}
          onClick={() => onSelectChapter(activeChapterIndex - 1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-tj-border-main bg-tj-primary-light text-tj-text-muted transition-colors duration-200 hover:bg-tj-primary-border hover:text-tj-text-main disabled:cursor-not-allowed disabled:opacity-30"
          title="Previous Chapter"
          aria-label="Previous Chapter"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="min-w-0 flex-1 text-center text-xs font-mono font-bold uppercase tracking-[0.18em] text-tj-text-muted sm:text-sm">
          Chapter {activeChapterIndex + 1} of {story.chapters.length}
        </span>

        {hasNextLoaded ? (
          <button
            onClick={() => onSelectChapter(activeChapterIndex + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-tj-border-main bg-tj-primary-light text-tj-text-muted transition-colors duration-200 hover:bg-tj-primary-border hover:text-tj-text-main disabled:cursor-not-allowed disabled:opacity-30"
            title="Next Chapter"
            aria-label="Next Chapter"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : canWriteNextChapter ? (
          <button
            disabled={isLoadingNext || isAutoGeneratingRemaining}
            onClick={() => onGenerateNextChapter()}
            className="flex items-center gap-2 rounded-xl border border-tj-border-main bg-tj-primary-light px-4 py-2 text-xs font-semibold text-tj-text-muted transition-colors duration-200 hover:bg-tj-primary-border hover:text-tj-text-main disabled:cursor-not-allowed disabled:opacity-30"
            title="Write next chapter"
          >
            {isLoadingNext ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Writing...
              </>
            ) : (
              <>
                <span>
                  Write Ch {story.chapters.length + 1}
                  {isPaid && nextChapterCreditCost > 0
                    ? ` (${nextChapterCreditCost} ${nextChapterCreditCost === 1 ? 'credit' : 'credits'})`
                    : ''}
                </span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-tj-border-main bg-tj-primary-light text-tj-text-muted opacity-30 cursor-not-allowed"
            title="Next Chapter"
            aria-label="Next Chapter"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
