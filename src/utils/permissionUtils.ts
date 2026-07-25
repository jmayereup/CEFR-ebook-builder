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
  _modelId: string | undefined,
  _isPaid: boolean,
  isAdmin: boolean,
  customOpenRouterKey: string,
  _freeModelCount: number,
  dailyCreditsUsed: number,
  estimatedCreditsCost: number,
  _chaptersToAdd: number,
  isEmailVerified: boolean = true,
): PermissionDenied | null => {
  // 1. Super Admin or users with their own API key have unlimited generations
  // (BYOK users use their own key only, bypassing the system pool entirely)
  if (isAdmin || customOpenRouterKey) {
    return null;
  }

  // 2. Unverified email accounts cannot use free system credits
  if (!isEmailVerified) {
    return {
      title: 'Email Verification Required',
      message:
        'Please verify your email address to use daily free generation credits. (Alternatively, configure your own OpenRouter API key in Settings for unlimited access).',
    };
  }

  // 3. Regular users using system key get 25 daily credits across all models
  if (dailyCreditsUsed + estimatedCreditsCost > 25) {
    const remaining = Math.max(0, 25 - dailyCreditsUsed);
    return {
      title: 'Daily Credits Limit Reached',
      message: `Generating this would cost ${estimatedCreditsCost} credit(s), which exceeds your remaining daily allocation of ${remaining} credit(s). All users receive 25 credits/day during our limited-time library build drive. Configure your own OpenRouter API key in Settings for unlimited generations.`,
    };
  }

  return null;
};
