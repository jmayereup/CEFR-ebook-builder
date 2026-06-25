/**
 * Generation permission checker.
 *
 * Replaces the guard blocks that check tier quotas and locks.
 *
 * Returns null when the user is allowed to generate, or a { title, message }
 * object describing why they are not.
 */

import { FREE_MODEL_IDS } from '../constants/models';

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
  _freeModelCount: number,
  monthlyCreditsUsed: number,
  estimatedCreditsCost: number,
  _chaptersToAdd: number,
): PermissionDenied | null => {
  // 1. Super Admin or users with their own API key have no limits and can use any model
  if (isAdmin || customOpenRouterKey) {
    return null;
  }

  // Classify selected model
  const isFreeModel =
    !!modelId && (FREE_MODEL_IDS.has(modelId) || modelId.endsWith(':free'));

  // 2. Free Tier models are unlimited for all signed-in users
  if (isFreeModel) {
    return null;
  }

  // 3. Premium Models (not free) require the user to be Paid (or Admin/have own key, which we checked above)
  if (!isPaid) {
    return {
      title: 'Premium Model Locked',
      message:
        'Free accounts can only use free models. To use premium or Paid Tier models, please upgrade to the Paid Tier, or configure your own OpenRouter API key in Settings.',
    };
  }

  // 4. Paid tier users using premium models with the shared key consume monthly credits
  if (monthlyCreditsUsed + estimatedCreditsCost > 100) {
    const remaining = Math.max(0, 100 - monthlyCreditsUsed);
    return {
      title: 'Monthly Credits Exceeded',
      message: `Generating this would cost ${estimatedCreditsCost} credits, which exceeds your remaining monthly budget of ${remaining} credits. You have used ${monthlyCreditsUsed} of 100 credits this month. Please configure your own API key in Settings for unlimited generations.`,
    };
  }

  return null;
};
