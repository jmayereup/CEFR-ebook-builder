/**
 * Generation permission checker.
 *
 * Replaces the guard blocks that check tier quotas and locks.
 *
 * Returns null when the user is allowed to generate, or a { title, message }
 * object describing why they are not.
 */

import { FREE_MODEL_IDS } from '../constants/models';
import { getModelDisplayName } from './modelUtils';

export interface PermissionDenied {
  title: string;
  message: string;
}

/**
 * Checks whether the current user is allowed to trigger a generation call.
 *
 * @param modelId              The model ID selected for the story.
 * @param isPaid               Whether the user is on the paid tier.
 * @param isAdmin              Whether the user is the Super Admin.
 * @param customOpenRouterKey  Custom OpenRouter API key.
 * @param freeModelCount       Chapters generated today on Free models.
 * @param monthlyCreditsUsed   Monthly credits spent so far by this user.
 * @param estimatedCreditsCost The estimated cost of the requested generation in credits.
 * @param chaptersToAdd        Number of chapters requested to generate.
 * @returns `null` if permitted, or a `PermissionDenied` reason if blocked.
 */
export const checkGenerationPermission = (
  modelId: string | undefined,
  isPaid: boolean,
  isAdmin: boolean,
  customOpenRouterKey: string,
  freeModelCount: number,
  monthlyCreditsUsed: number,
  estimatedCreditsCost: number,
  chaptersToAdd: number,
): PermissionDenied | null => {
  // 1. Super Admin has no limits and can use any model
  if (isAdmin) {
    return null;
  }

  const hasRequiredKey = !!customOpenRouterKey;

  // Classify selected model
  const isFreeModel =
    !!modelId && (FREE_MODEL_IDS.has(modelId) || modelId.endsWith(':free'));
  const isPaidModel =
    modelId === 'openai/gpt-oss-120b' ||
    modelId === 'openai/gpt-5-mini' ||
    modelId === 'qwen/qwen3.7-plus' ||
    modelId === 'qwen/qwen3.5-flash-02-23';
  const isPrivateKeyModel = !isFreeModel && !isPaidModel;

  // 2. Paid tier users with their own API key can use any model without daily limits
  if (isPaid && hasRequiredKey) {
    return null;
  }

  // 3. Users without custom API keys (using shared keys)
  if (isPaid) {
    // Paid users without custom key can use all models
    if (isFreeModel) {
      if (freeModelCount + chaptersToAdd > 30) {
        return {
          title: 'Daily Limit Reached',
          message: `Generating ${chaptersToAdd} more chapter(s) would exceed your daily limit of 30 chapters on Free Tier models. You have generated ${freeModelCount} chapter(s) today. Please try again tomorrow or configure your own API key in Settings for unlimited generations.`,
        };
      }
    } else {
      // Paid model consumes monthly credits (1 credit = 1 penny of estimated cost)
      if (monthlyCreditsUsed + estimatedCreditsCost > 100) {
        const remaining = Math.max(0, 100 - monthlyCreditsUsed);
        return {
          title: 'Monthly Credits Exceeded',
          message: `Generating this would cost ${estimatedCreditsCost} credits, which exceeds your remaining monthly budget of ${remaining} credits. You have used ${monthlyCreditsUsed} of 100 credits this month. Please configure your own API key in Settings for unlimited generations.`,
        };
      }
    }
  } else {
    // Free Tier users (not paid, not admin)
    if (!isFreeModel) {
      return {
        title: 'Premium Model Locked',
        message:
          'Free Tier accounts can only generate stories using Free Tier models. To use premium or Paid Tier models, please upgrade to the Paid Tier. To use custom keys, you must upgrade and configure your own API key in Settings.',
      };
    }

    if (freeModelCount + chaptersToAdd > 10) {
      return {
        title: 'Daily Limit Reached',
        message: `Generating ${chaptersToAdd} more chapter(s) would exceed your free tier daily limit of 10 chapters. You have generated ${freeModelCount} chapter(s) today. Please upgrade to the Paid Tier for higher limits or configure your own API key.`,
      };
    }
  }

  return null;
};
