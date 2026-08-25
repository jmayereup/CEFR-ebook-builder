/**
 * Model display / classification helpers and API header builder.
 * Extracted from App.tsx to eliminate duplicate logic.
 */

import { AI_MODELS, FRONTIER_LATEST_MODELS } from '../constants/models';

/** Returns the human-readable provider name for a given model ID. */
export const getModelBaseName = (modelId?: string): string => {
  if (!modelId) return 'DeepSeek';
  if (modelId.includes('deepseek')) return 'DeepSeek';
  if (modelId.includes('gemini') || modelId.includes('gemma')) return 'Gemini';
  if (modelId.includes('hermes')) return 'Hermes';
  if (modelId.includes('mistral')) return 'Mistral';
  if (modelId.includes('kimi') || modelId.includes('moonshot')) return 'Kimi';
  if (modelId.includes('glm') || modelId.includes('z-ai')) return 'GLM';
  return 'DeepSeek';
};

/** Returns the short, user-facing display name for a given model ID. */
export const getModelDisplayName = (modelId?: string): string => {
  if (!modelId) return 'DeepSeek V4 Pro';
  const found =
    AI_MODELS.find((m) => m.id === modelId) ||
    FRONTIER_LATEST_MODELS.find((m) => m.id === modelId);
  if (found) return found.name;
  return modelId;
};

import { pb } from '../services/pocketbase';

/**
 * Builds the Authorization / API-key request headers for a generation call.
 * Automatically attaches the active PocketBase user JWT token when logged in.
 */
export const buildApiHeaders = (
  customOpenRouterKey?: string,
): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (pb.authStore.isValid && pb.authStore.token) {
    headers['Authorization'] = `Bearer ${pb.authStore.token}`;
  }

  if (customOpenRouterKey) {
    headers['X-OpenRouter-API-Key'] = customOpenRouterKey;
  }

  return headers;
};
