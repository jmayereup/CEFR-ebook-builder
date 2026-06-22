/**
 * Model display / classification helpers and API header builder.
 * Extracted from App.tsx to eliminate duplicate logic.
 */

import { GEMINI_MODELS } from '../constants/models';

/** Returns the human-readable provider name for a given model ID. */
export const getModelBaseName = (modelId?: string): string => {
  if (!modelId) return 'Venice';
  if (modelId.includes('dolphin') || modelId.includes('mistral'))
    return 'Venice';
  if (modelId.includes('llama')) return 'Llama';
  if (modelId.includes('gemma')) return 'Gemma';
  if (modelId.includes('deepseek')) return 'DeepSeek';
  if (modelId.includes('qwen')) return 'Qwen';
  if (modelId.includes('kimi') || modelId.includes('moonshot')) return 'Kimi';
  if (modelId.includes('gpt')) return 'GPT';
  return 'GPT';
};

/** Returns the short, user-facing display name for a given model ID. */
export const getModelDisplayName = (modelId?: string): string => {
  if (!modelId) return 'Dolphin Mistral 24B Venice Edition (Free)';
  const found = GEMINI_MODELS.find((m) => m.id === modelId);
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
