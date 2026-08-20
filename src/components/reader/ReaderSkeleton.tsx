import { ArrowLeft, BookOpen, Volume2 } from 'lucide-react';
import type { Story } from '../../types';
import { getStoryCoverUrl } from '../../utils/coverUtils';

interface ReaderSkeletonProps {
  story?: Partial<Story> | null;
  onBack?: () => void;
}

export default function ReaderSkeleton({ story, onBack }: ReaderSkeletonProps) {
  const coverUrl = story?.id
    ? getStoryCoverUrl({
        id: story.id,
        cover: story.cover,
      })
    : null;

  return (
    <article className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header / Title Breadcrumb Card */}
      <header className="bg-tj-bg-card p-5 rounded-2xl border border-tj-border-main shadow-sm flex flex-col gap-4 relative overflow-hidden">
        {/* Subtle top shimmer bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/60 to-emerald-500/0 animate-shimmer" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            {/* Breadcrumb row */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onBack}
                className="text-xs text-tj-text-muted hover:text-tj-text-main font-semibold hover:underline cursor-pointer flex items-center gap-1.5 transition-colors"
                title="Return to Library"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Library</span>
              </button>

              <span className="text-xs text-slate-300 dark:text-slate-600">
                /
              </span>

              {story?.cefrLevel ? (
                <span className="text-xs font-mono font-bold bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-text-main px-2 py-0.5 rounded uppercase tracking-wide">
                  {story.cefrLevel} Difficulty
                </span>
              ) : (
                <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              )}

              {story?.language ? (
                <span className="text-[10px] text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                  {story.language} Graded
                </span>
              ) : (
                <div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
              )}
            </div>

            {/* Title row */}
            <div className="flex items-center gap-3 pt-1">
              {coverUrl && (
                <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 border border-tj-border-main shadow-xs bg-tj-bg-recessed">
                  <img
                    src={coverUrl}
                    alt={story?.title || 'Book cover'}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                {story?.title ? (
                  <h1 className="text-2xl font-serif font-black text-slate-900 dark:text-white leading-tight">
                    {story.title}
                  </h1>
                ) : (
                  <div className="space-y-2">
                    <div className="h-7 w-3/4 max-w-md bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                    <div className="h-4 w-1/3 max-w-xs bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick status pill */}
          <div className="self-start md:self-center shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-medium shadow-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Opening book...</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Reader Content Skeleton */}
      <section className="bg-tj-bg-card p-6 md:p-10 rounded-2xl border border-tj-border-main shadow-sm space-y-8 relative overflow-hidden">
        {/* Chapter Header bar */}
        <div className="flex items-center justify-between border-b border-tj-border-main pb-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg border border-tj-border-main text-tj-text-muted opacity-40">
              <Volume2 className="w-4 h-4" />
            </div>
            <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Shimmering Reading Paragraphs */}
        <div className="space-y-6 max-w-2xl mx-auto py-2">
          {/* Paragraph 1 */}
          <div className="space-y-3">
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-[96%] bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-[92%] bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-[68%] bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>

          {/* Paragraph 2 */}
          <div className="space-y-3">
            <div className="h-4 w-[98%] bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-[94%] bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-[99%] bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-[89%] bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-[45%] bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>

          {/* Paragraph 3 */}
          <div className="space-y-3">
            <div className="h-4 w-[95%] bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-[97%] bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-[91%] bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-[60%] bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        </div>

        {/* Center floating glassmorphic indicator */}
        <div className="flex justify-center pt-2">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-tj-bg-recessed/80 dark:bg-tj-bg-recessed/80 backdrop-blur-md border border-tj-border-main shadow-xs text-xs text-tj-text-muted">
            <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading chapters & vocabulary...</span>
          </div>
        </div>

        {/* Bottom chapter navigation bar skeleton */}
        <div className="flex items-center justify-between border-t border-tj-border-main pt-6 mt-6">
          <div className="h-9 w-28 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-9 w-28 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
      </section>
    </article>
  );
}
