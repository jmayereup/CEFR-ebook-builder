import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Loader2,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { FREE_MODEL_IDS, GEMINI_MODELS } from '../../constants/models';
import { updateStoryModel } from '../../services/db';
import {
  getAverageRating,
  getLanguageCodeFromName,
  type Story,
  type VocabularyTerm,
} from '../../types';
import { extractChapterOutline } from '../../utils/outlineParser';
import { calculateEstimatedUsage } from '../../utils/storyEstimation';
import AddChapterModal from './AddChapterModal';

interface ChapterSidebarProps {
  story: Story;
  activeChapterIndex: number;
  onSelectChapter: (index: number) => void;
  onGenerateNextChapter: (chapterGuidance?: string) => void;
  isLoadingNext: boolean;
  isAutoGeneratingRemaining: boolean;
  isAutoGenerationPaused?: boolean;
  onAutoGenerateAll: () => void;
  onCancelGeneration?: () => void;
  generationStatus?: string;
  currentUser?: any;
  onRateStory?: (rating: number) => void;
  isCreator?: boolean;
  onRegenerateChapter?: (guidance?: string) => void;
  onDeleteChapter?: (index: number) => Promise<void>;
  onAddCustomChapter?: (
    title: string,
    content: string,
    vocabulary: VocabularyTerm[],
  ) => Promise<void>;
  customOpenRouterKey?: string;
  isOnline?: boolean;
  isEditing?: boolean;
  isPaid?: boolean;
  onViewAudits?: () => void;
  onGenerateGlossary?: (story: Story) => Promise<void>;
  onStoryUpdated?: (story: Story) => void;
}

export default function ChapterSidebar({
  story,
  activeChapterIndex,
  onSelectChapter,
  onGenerateNextChapter,
  isLoadingNext,
  isAutoGeneratingRemaining,
  isAutoGenerationPaused = false,
  onAutoGenerateAll,
  onCancelGeneration,
  generationStatus = '',
  currentUser,
  onRateStory,
  isCreator = false,
  onRegenerateChapter,
  onDeleteChapter,
  onAddCustomChapter,
  customOpenRouterKey = '',
  isOnline = true,
  isEditing = false,
  isPaid = false,
  onViewAudits,
  onGenerateGlossary,
  onStoryUpdated,
}: ChapterSidebarProps) {
  const [chapterGuidance, setChapterGuidance] = useState<string>('');
  const [regenerateGuidance, setRegenerateGuidance] = useState<string>('');

  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModelId = e.target.value;
    if (!newModelId || newModelId === story.model) return;

    try {
      if (!story.isUnsaved) {
        await updateStoryModel(story.id, newModelId);
      }

      if (onStoryUpdated) {
        onStoryUpdated({
          ...story,
          model: newModelId,
        });
      }
    } catch (err: any) {
      console.error('Failed to update story model:', err);
      alert('Failed to update model. Please try again.');
    }
  };
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const userRating =
    (currentUser && story.ratings && story.ratings[currentUser.uid]) || 0;
  const totalChaptersCount = story.totalChapters;
  const currentChaptersLoaded = story.chapters.length;
  const isBookFinished =
    story.isCompleted || currentChaptersLoaded >= totalChaptersCount;

  const hasChaptersLackingVocabulary = useMemo(() => {
    return (
      story.cefrLevel !== 'A1' &&
      story.cefrLevel !== 'Pre-A1' &&
      story.chapters.some((ch) => !ch.vocabulary || ch.vocabulary.length === 0)
    );
  }, [story.chapters, story.cefrLevel]);

  const isFreeModel =
    story.model?.endsWith(':free') || FREE_MODEL_IDS.has(story.model || '');

  const nextChapterCreditCost = useMemo(() => {
    if (isFreeModel) return 0;
    const nextChapterNum = currentChaptersLoaded + 1;
    const estBefore = calculateEstimatedUsage(
      nextChapterNum - 1,
      story.chapterLength || 300,
      story.model ||
        'openrouter/free',
    );
    const estAfter = calculateEstimatedUsage(
      nextChapterNum,
      story.chapterLength || 300,
      story.model ||
        'openrouter/free',
    );
    const estCost = Math.max(
      1,
      Math.ceil((estAfter.totalCost - estBefore.totalCost) * 100),
    );

    if (nextChapterNum <= (story.initialTotalChapters ?? story.totalChapters)) {
      return Math.min(
        estCost,
        Math.max(
          0,
          (story.initialCreditsEstimate ?? 0) - (story.creditsCharged ?? 0),
        ),
      );
    }
    return estCost;
  }, [
    story.model,
    story.chapterLength,
    currentChaptersLoaded,
    isFreeModel,
    story.initialTotalChapters,
    story.totalChapters,
    story.initialCreditsEstimate,
    story.creditsCharged,
  ]);

  const autoCreditCost = useMemo(() => {
    if (isFreeModel) return 0;
    let costSum = 0;
    let tempCreditsCharged = story.creditsCharged ?? 0;
    for (let ch = currentChaptersLoaded + 1; ch <= story.totalChapters; ch++) {
      const estBefore = calculateEstimatedUsage(
        ch - 1,
        story.chapterLength || 300,
        story.model ||
          'openrouter/free',
      );
      const estAfter = calculateEstimatedUsage(
        ch,
        story.chapterLength || 300,
        story.model ||
          'openrouter/free',
      );
      const estCost = Math.max(
        1,
        Math.ceil((estAfter.totalCost - estBefore.totalCost) * 100),
      );

      let chCharge = estCost;
      if (ch <= (story.initialTotalChapters ?? story.totalChapters)) {
        chCharge = Math.min(
          estCost,
          Math.max(0, (story.initialCreditsEstimate ?? 0) - tempCreditsCharged),
        );
        tempCreditsCharged += chCharge;
      }
      costSum += chCharge;
    }
    return costSum;
  }, [
    story.model,
    story.chapterLength,
    story.totalChapters,
    currentChaptersLoaded,
    isFreeModel,
    story.initialTotalChapters,
    story.initialCreditsEstimate,
    story.creditsCharged,
  ]);

  const regenCreditCost = useMemo(() => {
    if (isFreeModel) return 0;
    if ((story.regenerationsCount ?? 0) < 3) return 0;
    const currentChapterNum = activeChapterIndex + 1;
    const estBefore = calculateEstimatedUsage(
      currentChapterNum - 1,
      story.chapterLength || 300,
      story.model ||
        'openrouter/free',
    );
    const estAfter = calculateEstimatedUsage(
      currentChapterNum,
      story.chapterLength || 300,
      story.model ||
        'openrouter/free',
    );
    return Math.max(
      1,
      Math.ceil((estAfter.totalCost - estBefore.totalCost) * 100),
    );
  }, [
    story.model,
    story.chapterLength,
    activeChapterIndex,
    isFreeModel,
    story.regenerationsCount,
  ]);

  // Prefill next chapter guidance when the loaded chapters count or outline changes
  useEffect(() => {
    if (story.outline) {
      const nextChapterNum = currentChaptersLoaded + 1;
      const extracted = extractChapterOutline(story.outline, nextChapterNum);
      setChapterGuidance(extracted);
    } else {
      setChapterGuidance('');
    }
  }, [story.outline, currentChaptersLoaded]);

  // Prefill regenerate guidance when active chapter changes
  useEffect(() => {
    if (story.outline) {
      const extracted = extractChapterOutline(
        story.outline,
        activeChapterIndex + 1,
      );
      setRegenerateGuidance(extracted);
    } else {
      setRegenerateGuidance('');
    }
  }, [story.outline, activeChapterIndex]);
  const handleNextChapterWrite = () => {
    onGenerateNextChapter(chapterGuidance);
    setChapterGuidance(''); // Reset guidance textarea
  };

  return (
    <div className="lg:col-span-1 order-2 lg:order-1 bg-tj-bg-card p-4 sm:rounded-2xl rounded-none border-x-0 border-y sm:border border-tj-border-main sm:shadow-sm shadow-none space-y-4 h-fit">
      <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono">
        Chapters
      </h3>
      <nav className="flex flex-col gap-1 max-h-[220px] lg:max-h-none overflow-y-auto">
        {Array.from({ length: totalChaptersCount }).map((_, index) => {
          const chapterNum = index + 1;
          const isLoaded = index < story.chapters.length;
          const isCurrent = index === activeChapterIndex;

          return (
            <div
              key={index}
              className="flex items-center gap-1 group relative w-full"
            >
              <button
                disabled={!isLoaded && !isLoadingNext}
                onClick={() => onSelectChapter(index)}
                className={`flex items-center justify-between w-full p-2.5 rounded-xl font-sans text-xs text-left transition-all cursor-pointer border ${
                  isCurrent
                    ? 'bg-tj-mint text-tj-text-main border-tj-success/50 shadow-none font-bold'
                    : isLoaded
                      ? 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 bg-transparent pr-8 border-transparent'
                      : 'text-slate-400 dark:text-slate-600 cursor-not-allowed bg-slate-50/50 dark:bg-slate-900/10 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center border font-mono text-[10px] ${
                      isCurrent
                        ? 'border-tj-success/50 bg-tj-mint text-tj-text-main font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {chapterNum}
                  </span>
                  <span
                    lang={
                      isLoaded
                        ? getLanguageCodeFromName(story.language)
                        : undefined
                    }
                    className="truncate max-w-[120px] lg:max-w-[150px]"
                  >
                    {isLoaded
                      ? story.chapters[index].title
                      : `Chapter ${chapterNum}`}
                  </span>
                </div>
                {isLoaded && (
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${isCurrent ? 'text-tj-success' : 'text-emerald-500'} ${
                      isCreator && onDeleteChapter ? 'group-hover:hidden' : ''
                    }`}
                  />
                )}
              </button>

              {isLoaded && isCreator && onDeleteChapter && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      confirm(
                        `Are you sure you want to delete Chapter ${chapterNum}: "${
                          story.chapters[index].title
                        }"? This will shift subsequent chapters and cannot be undone.`,
                      )
                    ) {
                      onDeleteChapter(index);
                    }
                  }}
                  className={`absolute right-2 p-1.5 rounded-lg border-0 transition-colors cursor-pointer hidden group-hover:block ${
                    isCurrent
                      ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-100/50 dark:hover:bg-rose-900/30'
                      : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20'
                  }`}
                  title={`Delete Chapter ${chapterNum}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </nav>

      {/* Generate Triggers */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
        {isCreator && (
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-tj-primary" />
              Writing Model
            </label>
            <select
              disabled={!isOnline || isLoadingNext || isAutoGeneratingRemaining}
              value={story.model || ''}
              onChange={handleModelChange}
              className="w-full text-xs p-2.5 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main focus:border-tj-primary focus:outline-none cursor-pointer disabled:opacity-50 font-medium"
            >
              {(() => {
                const isFreeModelLocal = (id: string) =>
                  FREE_MODEL_IDS.has(id) || id.endsWith(':free');

                const freeModels = GEMINI_MODELS.filter((m) =>
                  isFreeModelLocal(m.id),
                );
                const paidModels = GEMINI_MODELS.filter(
                  (m) => !isFreeModelLocal(m.id),
                );

                const renderOption = (model: (typeof GEMINI_MODELS)[0]) => {
                  let isModelRestricted = false;
                  let restrictionLabel = '';

                  const isAdmin = currentUser?.email === 'jmayereup@gmail.com';
                  if (!isAdmin && !isPaid && !isFreeModelLocal(model.id)) {
                    isModelRestricted = true;
                    restrictionLabel = ' 🔒 (Paid Tier Required)';
                  }

                  return (
                    <option
                      key={model.id}
                      value={model.id}
                      disabled={isModelRestricted}
                    >
                      {model.name}
                      {restrictionLabel}
                    </option>
                  );
                };

                return (
                  <>
                    <optgroup label="Free Tier Models">
                      {freeModels.map(renderOption)}
                    </optgroup>
                    <optgroup label="Paid Tier Models">
                      {paidModels.map(renderOption)}
                    </optgroup>
                  </>
                );
              })()}
            </select>
          </div>
        )}

        {currentChaptersLoaded < totalChaptersCount ? (
          <div className="space-y-3">
            {/* NEXT CHAPTER SPECIFIC GUIDANCE PROMPT BOX */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-tj-primary" />
                Guide Chapter {currentChaptersLoaded + 1}
              </label>
              <textarea
                disabled={!isOnline}
                value={chapterGuidance}
                onChange={(e) => setChapterGuidance(e.target.value)}
                placeholder={
                  isOnline
                    ? 'e.g. Include a conversation about a clock, or introduce a detective named Marco.'
                    : 'AI guidance is offline.'
                }
                rows={3}
                className="w-full text-xs p-2 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main placeholder:text-tj-text-muted/50 focus:border-tj-primary focus:outline-none resize-none disabled:opacity-50"
              />
            </div>

            <button
              disabled={isLoadingNext || isAutoGeneratingRemaining || !isOnline}
              onClick={handleNextChapterWrite}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-tj-primary hover:bg-tj-primary-hover disabled:bg-slate-300 dark:bg-tj-primary dark:hover:bg-tj-primary-hover text-tj-bg-main text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingNext && !isAutoGeneratingRemaining ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Ch {currentChaptersLoaded + 1}...</span>
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span>
                    Write Chapter {currentChaptersLoaded + 1}
                    {isPaid &&
                      !isFreeModel &&
                      ` (${nextChapterCreditCost} ${nextChapterCreditCost === 1 ? 'credit' : 'credits'})`}
                    {!isOnline && ' (Online Only)'}
                  </span>
                </>
              )}
            </button>

            <button
              disabled={isLoadingNext || isAutoGeneratingRemaining || !isOnline}
              onClick={onAutoGenerateAll}
              className="w-full py-2 px-3 border border-dashed border-tj-primary-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium rounded-xl transition-colors cursor-pointer bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAutoGeneratingRemaining ? (
                <span className="flex items-center justify-center gap-1.5 text-tj-primary">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Writing Ch {currentChaptersLoaded + 1}–
                  {Math.min(currentChaptersLoaded + 5, totalChaptersCount)} of{' '}
                  {totalChaptersCount}
                </span>
              ) : (
                <span>
                  {isAutoGenerationPaused
                    ? 'Resume Auto-Writing'
                    : 'Auto-Write Remaining'}
                  {isPaid &&
                    !isFreeModel &&
                    ` (Est. ${autoCreditCost} ${autoCreditCost === 1 ? 'credit' : 'credits'})`}
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-sans text-xs bg-emerald-50 dark:bg-emerald-955/20 p-2.5 rounded-xl border border-emerald-100/50 dark:border-emerald-950/20">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Full book written!</span>
            </div>
            {hasChaptersLackingVocabulary &&
              onGenerateGlossary &&
              (isCreator || currentUser?.email === 'jmayereup@gmail.com') && (
                <button
                  disabled={isLoadingNext || isAutoGeneratingRemaining}
                  onClick={() => onGenerateGlossary(story)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>Generate Glossary</span>
                </button>
              )}
          </div>
        )}

        {/* Paused for Audit Review Alert Card */}
        {isAutoGenerationPaused &&
          !isLoadingNext &&
          !isAutoGeneratingRemaining && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3 text-left">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Auto-Write Paused
                  </h4>
                  <p className="text-[11px] text-tj-text-muted mt-1 leading-relaxed">
                    A 10-chapter consistency check has been performed. Please
                    review the audit before resuming.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {onViewAudits && (
                  <button
                    onClick={onViewAudits}
                    className="flex-1 py-1.5 px-2.5 bg-tj-primary-light hover:bg-tj-primary-border text-tj-primary text-[10px] font-bold rounded-lg transition-all border border-tj-border-main cursor-pointer"
                  >
                    Review Audit
                  </button>
                )}
                <button
                  onClick={onAutoGenerateAll}
                  className="flex-1 py-1.5 px-2.5 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main text-[10px] font-bold rounded-lg transition-all border-0 cursor-pointer"
                >
                  Resume Auto-Write
                </button>
              </div>
            </div>
          )}

        {/* Cancel / Retry Status Card */}
        {(isLoadingNext || isAutoGeneratingRemaining) && (
          <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {isAutoGeneratingRemaining
                  ? 'Writing Chapters (Batch of 5)...'
                  : 'Writing Chapter...'}
              </span>
              {onCancelGeneration && (
                <button
                  onClick={onCancelGeneration}
                  className="px-2 py-0.5 bg-rose-50 dark:bg-rose-955/20 hover:bg-rose-100 hover:dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              )}
            </div>
            {generationStatus && (
              <p className="text-[11px] font-medium text-tj-primary dark:text-tj-primary-hover leading-normal animate-pulse">
                {generationStatus}
              </p>
            )}
          </div>
        )}
      </div>

      {/* REGENERATE CURRENT CHAPTER PROMPT BOX */}
      {isCreator &&
        activeChapterIndex < currentChaptersLoaded &&
        onRegenerateChapter &&
        (!isBookFinished || isEditing) && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-tj-primary" />
                Regenerate Chapter {activeChapterIndex + 1}
              </label>
              <textarea
                disabled={!isOnline}
                value={regenerateGuidance}
                onChange={(e) => setRegenerateGuidance(e.target.value)}
                placeholder={
                  isOnline
                    ? 'How should the AI rewrite this chapter? (e.g. Include a conversation about a key, or make it more action-packed)'
                    : 'AI regeneration is offline.'
                }
                rows={3}
                className="w-full text-xs p-2 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main placeholder:text-tj-text-muted/50 focus:border-tj-primary focus:outline-none resize-none disabled:opacity-50"
              />
            </div>

            <button
              disabled={isLoadingNext || isAutoGeneratingRemaining || !isOnline}
              onClick={() => {
                onRegenerateChapter(regenerateGuidance);
                setRegenerateGuidance('');
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-tj-primary hover:bg-tj-primary-hover dark:bg-tj-primary dark:hover:bg-tj-primary-hover text-tj-bg-main text-xs font-semibold rounded-xl transition-all cursor-pointer border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingNext && !isAutoGeneratingRemaining ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Regenerating Ch {activeChapterIndex + 1}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Regenerate Chapter {activeChapterIndex + 1}
                    {isPaid &&
                      !isFreeModel &&
                      ((story.regenerationsCount ?? 0) < 3
                        ? ` (Free: ${3 - (story.regenerationsCount ?? 0)} left)`
                        : ` (${regenCreditCost} ${regenCreditCost === 1 ? 'credit' : 'credits'})`)}
                    {!isOnline && ' (Online Only)'}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

      {/* Book Rating Section */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5 font-sans">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            Book Rating
          </h4>
          {story.ratings && Object.keys(story.ratings).length > 0 && (
            <span className="text-[10px] font-bold text-tj-primary dark:text-tj-primary-hover bg-tj-primary-light dark:bg-tj-primary-light/10 px-2 py-0.5 rounded font-sans">
              Avg: {getAverageRating(story.ratings).toFixed(1)} ★
            </span>
          )}
        </div>

        <div className="bg-slate-50/50 dark:bg-slate-900/20 p-3 rounded-xl border border-slate-100/50 dark:border-slate-800 text-center space-y-2 select-none">
          {currentUser ? (
            <>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium font-sans">
                {userRating > 0 ? 'Your rating:' : 'Rate this book:'}
              </p>
              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isStarred = star <= (hoverRating || userRating);
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => onRateStory?.(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-0.5 hover:scale-125 transition-transform duration-100 cursor-pointer"
                    >
                      <Star
                        className={`w-5 h-5 transition-colors ${
                          isStarred
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal font-sans">
                {Object.keys(story.ratings || {}).length} total{' '}
                {Object.keys(story.ratings || {}).length === 1
                  ? 'rating'
                  : 'ratings'}
              </p>
            </>
          ) : (
            <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-sans">
              <span>Please sign in to rate this book.</span>
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Chapter Trigger */}
      {isCreator && onAddCustomChapter && (!isBookFinished || isEditing) && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-805/50">
          <button
            disabled={!isOnline}
            onClick={() => setIsAddModalOpen(true)}
            className="w-full py-2 px-3 border border-dashed border-tj-primary-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-655 dark:text-slate-400 text-xs font-semibold rounded-xl transition-all cursor-pointer bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Custom Chapter {!isOnline && '(Online Only)'}
          </button>
        </div>
      )}

      {/* Add Chapter Modal */}
      {isAddModalOpen && onAddCustomChapter && (
        <AddChapterModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSave={onAddCustomChapter}
          language={story.language}
          cefrLevel={story.cefrLevel}
          customOpenRouterKey={customOpenRouterKey}
          model={story.model}
          nextChapterNumber={story.chapters.length + 1}
        />
      )}
    </div>
  );
}
