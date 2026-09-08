import { Coins, Layers } from 'lucide-react';
import type React from 'react';
import { FREE_MODEL_IDS } from '../../constants/models';

interface StoryCostSummaryProps {
  est: {
    totalWords: number;
    totalCost: number;
  };
  totalChapters: number;
  writingType: string;
  selectedModel: string;
  isByokActive: boolean;
  isAdmin: boolean;
  isPaid: boolean;
  dailyStoriesCreated: number;
  dailyCreditsUsed: number;
}

export default function StoryCostSummary({
  est,
  totalChapters,
  writingType,
  selectedModel,
  isByokActive,
  isAdmin,
  isPaid,
  dailyStoriesCreated,
  dailyCreditsUsed,
}: StoryCostSummaryProps) {
  const isNarrative = writingType === 'narrative';
  const isFree =
    FREE_MODEL_IDS.has(selectedModel) || selectedModel.endsWith(':free');

  return (
    <>
      {/* Token & Cost Estimator - Compact Summary Bar */}
      <div className="p-3.5 bg-tj-primary-light/30 dark:bg-slate-800/40 border border-tj-primary-border/40 dark:border-slate-700/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-fade-in">
        <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
          <Coins className="w-4 h-4 text-tj-primary shrink-0" />
          <span>Estimated Length & Cost</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-tj-bg-card border border-tj-border-main font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
            ~{est.totalWords.toLocaleString()} words
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-tj-bg-card border border-tj-border-main font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
            {totalChapters} {isNarrative ? 'chapters' : 'sections'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs">
            {isFree
              ? 'Free (0 credits)'
              : `${Math.max(1, Math.ceil(est.totalCost * 100))} credits`}
          </span>
        </div>
      </div>

      {/* Daily Quota Remaining card */}
      {!isByokActive && !isAdmin && !isPaid && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-350 font-semibold text-xs uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 shrink-0 text-tj-primary" />
              <span>Daily Free Tier Allowance</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2.5 bg-tj-bg-card border border-tj-border-main rounded-xl">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Daily Books
              </p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {Math.max(0, 2 - dailyStoriesCreated)} / 2
              </p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                books remaining (up to 10 ch)
              </p>
            </div>
            <div className="p-2.5 bg-tj-bg-card border border-tj-border-main rounded-xl">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                Daily Credits
              </p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {Math.max(0, 25 - dailyCreditsUsed)} / 25
              </p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                credits for regenerations (0.5/ch)
              </p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center italic">
            Note: Configure your own OpenRouter key in Settings for unlimited
            books and all frontier models.
          </p>
        </div>
      )}
    </>
  );
}
