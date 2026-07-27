/**
 * Model display / classification helpers and API header builder.
 * Extracted from App.tsx to eliminate duplicate logic.
 */

import { AI_MODELS } from '../constants/models';

/** Returns the human-readable provider name for a given model ID. */
export const getModelBaseName = (modelId?: string): string => {
  if (!modelId) return 'DeepSeek';
  if (modelId.includes('deepseek')) return 'DeepSeek';
  if (modelId.includes('gemini') || modelId.includes('gemma')) return 'Gemini';
  if (modelId.includes('hermes')) return 'Hermes';
  if (modelId.includes('mistral')) return 'Mistral';
  return 'DeepSeek';
};

/** Returns the short, user-facing display name for a given model ID. */
export const getModelDisplayName = (modelId?: string): string => {
  if (!modelId) return 'DeepSeek V4 Pro';
  const found = AI_MODELS.find((m) => m.id === modelId);
  if (found) return found.name;
  return modelId;
};

/**
 * Builds the Authorization / API-key request headers for a generation call.
 * Encapsulates the isDeepSeek branching that was copy-pasted 4× across the codebase.
 */
export const buildApiHeaders = (
  customOpenRouterKey: string,
): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (customOpenRouterKey) {
    headers['X-OpenRouter-API-Key'] = customOpenRouterKey;
  }

  return headers;
};
