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

export type ModelThinkingType = 'none' | 'simple' | 'level' | 'budget';

export interface ModelThinkingSupport {
  supportsThinking: boolean;
  type: ModelThinkingType;
  defaultOption: string;
  defaultBudget?: number;
}

/**
 * Returns reasoning/thinking capabilities and sensible defaults for a model.
 */
export const getModelThinkingSupport = (modelId?: string): ModelThinkingSupport => {
  if (!modelId) {
    return { supportsThinking: true, type: 'simple', defaultOption: 'low', defaultBudget: 2048 };
  }
  const id = modelId.toLowerCase();

  // Non-reasoning models
  if (id.includes('hermes') || id.includes('llama')) {
    return { supportsThinking: false, type: 'none', defaultOption: 'disabled' };
  }

  // Check explicit model list definitions if present
  const modelObj = AI_MODELS.find((m) => m.id === modelId);
  if (modelObj) {
    if (modelObj.supportsThinkingBudget) {
      return { supportsThinking: true, type: 'budget', defaultOption: 'low', defaultBudget: 2048 };
    }
    if (modelObj.supportsThinkingLevel) {
      const isSimple = id.includes('deepseek') || id.includes('kimi') || id.includes('moonshot');
      return {
        supportsThinking: true,
        type: isSimple ? 'simple' : 'level',
        defaultOption: 'low',
        defaultBudget: 2048,
      };
    }
    if (!modelObj.supportsThinkingLevel && !modelObj.supportsThinkingBudget) {
      return { supportsThinking: false, type: 'none', defaultOption: 'disabled' };
    }
  }

  // Simple On/Off models
  if (id.includes('deepseek') || id.includes('kimi') || id.includes('moonshot')) {
    return { supportsThinking: true, type: 'simple', defaultOption: 'low', defaultBudget: 2048 };
  }

  // Token budget models
  if (id.includes('gemini-2.5')) {
    return { supportsThinking: true, type: 'budget', defaultOption: 'low', defaultBudget: 2048 };
  }

  // Level / effort models (GLM, Gemini 3, GPT, Claude, Grok, etc.)
  return { supportsThinking: true, type: 'level', defaultOption: 'low', defaultBudget: 2048 };
};

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

