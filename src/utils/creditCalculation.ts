/**
 * Credit calculation helpers for story generation.
 *
 * Extracted from useStoryGeneration.ts where the same per-chapter cost
 * calculation was duplicated across handleGenerateNextChapter,
 * handleRegenerateChapter, and handleAutoGenerateRemaining.
 *
 * Updated for full-context batch generation: hybrid context is removed.
 * Costs are now estimated based on full-text input growth per batch call.
 */

import { FREE_MODEL_IDS } from '../constants/models';
import { calculateEstimatedUsage } from './storyEstimation';

const DEFAULT_MODEL = 'deepseek/deepseek-v4-flash';

/** Returns the model ID to use for estimation, falling back to the default free model. */
const resolveModel = (model?: string): string => model || DEFAULT_MODEL;

/** Checks whether a model is free. */
export const isFreeModel = (model?: string): boolean =>
  !!model && (FREE_MODEL_IDS.has(model) || model.endsWith(':free'));

/**
 * Calculates the estimated credit cost for generating a single chapter.
 *
 * @param chapterNumber        The 1-based chapter number being generated.
 * @param currentChapters      How many chapters already exist (before this one).
 * @param chapterLength        Target word count per chapter.
 * @param model                The model ID.
 * @param initialCreditsEstimate  The pre-calculated total estimate for the whole story.
 * @param creditsCharged       Credits already charged so far.
 * @returns The estimated credit cost for this single chapter.
 */
export const calculateChapterCreditCost = (
  chapterNumber: number,
  currentChapters: number,
  chapterLength: number,
  model: string,
  initialCreditsEstimate?: number,
  creditsCharged?: number,
): number => {
  const resolvedModel = resolveModel(model);

  const estBefore = calculateEstimatedUsage(
    currentChapters,
    chapterLength,
    resolvedModel,
  );
  const estAfter = calculateEstimatedUsage(
    currentChapters + 1,
    chapterLength,
    resolvedModel,
  );

  const estimatedCost = Math.max(
    1,
    Math.ceil((estAfter.totalCost - estBefore.totalCost) * 100),
  );

  // For chapters within the initial story plan, cap the charge so we never
  // exceed the initial estimate the user was shown.
  if (
    initialCreditsEstimate != null &&
    creditsCharged != null &&
    chapterNumber <= currentChapters + 1
  ) {
    return Math.min(
      estimatedCost,
      Math.max(0, initialCreditsEstimate - creditsCharged),
    );
  }

  return estimatedCost;
};

/**
 * Calculates the total estimated credit cost for generating all remaining
 * chapters in a story. Used by the auto-generate (batch) flow.
 *
 * @param currentChapters      Number of chapters already generated.
 * @param totalChapters        Total chapters the story should have.
 * @param chapterLength        Target word count per chapter.
 * @param model                The model ID.
 * @param initialCreditsEstimate  Pre-calculated total estimate for the story.
 * @param creditsCharged       Credits already charged.
 * @returns The total estimated credit cost for all remaining chapters.
 */
export const calculateRemainingCreditCost = (
  currentChapters: number,
  totalChapters: number,
  chapterLength: number,
  model: string,
  initialCreditsEstimate?: number,
  creditsCharged?: number,
): number => {
  let totalCost = 0;
  let runningCharged = creditsCharged ?? 0;

  for (let ch = currentChapters + 1; ch <= totalChapters; ch++) {
    const cost = calculateChapterCreditCost(
      ch,
      ch - 1,
      chapterLength,
      model,
      initialCreditsEstimate,
      runningCharged,
    );
    totalCost += cost;
    runningCharged += cost;
  }

  return totalCost;
};

/**
 * Calculates the initial total credit estimate for a full story.
 * This is the value shown to the user before they start generation.
 *
 * @param totalChapters    Total chapters in the story.
 * @param chapterLength    Target word count per chapter.
 * @param model            The model ID.
 * @returns The total estimated credit cost, or 0 for free models.
 */
export const calculateInitialCreditEstimate = (
  totalChapters: number,
  chapterLength: number,
  model: string,
): number => {
  if (isFreeModel(model)) return 0;
  const est = calculateEstimatedUsage(
    totalChapters,
    chapterLength,
    resolveModel(model),
  );
  return Math.max(1, Math.ceil(est.totalCost * 100));
};
