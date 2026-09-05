/**
 * AI model definitions shared across StoryConfigForm (UI) and App.tsx (display logic).
 * Moving these here prevents two sources of truth for model IDs and pricing.
 */

export interface AIModelOption {
  id: string;
  name: string;
  inputCost1M: number;
  outputCost1M: number;
  category: 'pro' | 'flash' | 'thinking';
  supportsThinkingLevel: boolean;
  supportsThinkingBudget: boolean;
  supportsTemperature: boolean;
  maxOutputTokens?: number;
  requiresAgeVerification?: boolean;
}

/** Legacy alias */
export type GeminiModelOption = AIModelOption;

/** Check if a model is a Meta Muse model that requires basic age verification */
export function isMuseModel(modelId?: string | null): boolean {
  if (!modelId) return false;
  return modelId.toLowerCase().includes('muse');
}

export const AI_MODELS: AIModelOption[] = [
  {
    id: 'z-ai/glm-5.3-flash',
    name: 'GLM 5.3 Flash',
    inputCost1M: 0.075,
    outputCost1M: 0.25,
    category: 'flash',
    supportsThinkingLevel: true,
    supportsThinkingBudget: false,
    supportsTemperature: true,
    maxOutputTokens: 16384,
  },
  {
    id: 'meta/muse-spark-1.3-contributor',
    name: 'Muse Spark 1.3 (Contributor)',
    inputCost1M: 0.1,
    outputCost1M: 0.2,
    category: 'flash',
    supportsThinkingLevel: true,
    supportsThinkingBudget: false,
    supportsTemperature: true,
    maxOutputTokens: 16384,
    requiresAgeVerification: true,
  },
  {
    id: 'meta/muse-spark-1.3',
    name: 'Muse Spark 1.3',
    inputCost1M: 1.25,
    outputCost1M: 4.25,
    category: 'pro',
    supportsThinkingLevel: true,
    supportsThinkingBudget: false,
    supportsTemperature: true,
    maxOutputTokens: 16384,
    requiresAgeVerification: true,
  },
  {
    id: 'deepseek/deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    inputCost1M: 1.042,
    outputCost1M: 2.085,
    category: 'pro',
    supportsThinkingLevel: true,
    supportsThinkingBudget: false,
    supportsTemperature: true,
    maxOutputTokens: 16384,
  },
  {
    id: 'nousresearch/hermes-3-llama-3.1-405b',
    name: 'Hermes 3 405B',
    inputCost1M: 1.0,
    outputCost1M: 1.0,
    category: 'pro',
    supportsThinkingLevel: false,
    supportsThinkingBudget: false,
    supportsTemperature: true,
    maxOutputTokens: 16384,
  },
];

/** IDs of models that are always free to use (no contributor approval needed). */
export const FREE_MODEL_IDS = new Set<string>([
  'z-ai/glm-5.3-flash',
  'meta/muse-spark-1.3-contributor',
]);

/** Date when OpenRouter token rates were last verified/updated */
export const MODEL_PRICES_LAST_UPDATED = 'September 5, 2026';

export interface FrontierModelOption {
  id: string;
  name: string;
  category: 'pro' | 'flash';
  inputCost1M: number;
  outputCost1M: number;
  requiresAgeVerification?: boolean;
}

/** Formats a concise input/output rate indicator per 1M tokens based on OpenRouter rates */
export const formatModelPriceIndicator = (
  inputCost1M?: number,
  outputCost1M?: number,
): string => {
  if (inputCost1M === undefined || outputCost1M === undefined) return '';
  const fmt = (val: number) => {
    if (val < 0.01) return `$${val.toFixed(3)}`;
    if (val < 0.1) return `$${val.toFixed(3).replace(/0$/, '')}`;
    return `$${val.toFixed(2)}`;
  };
  return `(${fmt(inputCost1M)} / ${fmt(outputCost1M)} / 1M)`;
};

/** Curated frontier & latest models for BYOK story generation selection with OpenRouter rates */
export const FRONTIER_LATEST_MODELS: FrontierModelOption[] = [
  {
    id: 'meta/muse-spark-1.3',
    name: 'Meta: Muse Spark 1.3',
    category: 'pro',
    inputCost1M: 1.25,
    outputCost1M: 4.25,
    requiresAgeVerification: true,
  },
  {
    id: 'meta/muse-spark-1.3-contributor',
    name: 'Meta: Muse Spark 1.3 (Contributor)',
    category: 'flash',
    inputCost1M: 0.1,
    outputCost1M: 0.2,
    requiresAgeVerification: true,
  },
  {
    id: 'z-ai/glm-5.3-flash',
    name: 'Z-AI: GLM 5.3 Flash',
    category: 'flash',
    inputCost1M: 0.075,
    outputCost1M: 0.25,
  },
  {
    id: 'deepseek/deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    category: 'pro',
    inputCost1M: 1.042,
    outputCost1M: 2.085,
  },
  {
    id: 'deepseek/deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    category: 'flash',
    inputCost1M: 0.089,
    outputCost1M: 0.177,
  },
  {
    id: 'google/gemini-3.6-flash',
    name: 'Google: Gemini 3.6 Flash',
    category: 'flash',
    inputCost1M: 0.75,
    outputCost1M: 3.75,
  },
  {
    id: 'anthropic/claude-sonnet-5',
    name: 'Anthropic: Claude Sonnet 5',
    category: 'pro',
    inputCost1M: 2.0,
    outputCost1M: 10.0,
  },
  {
    id: 'openai/gpt-chat-latest',
    name: 'OpenAI: GPT Chat Latest',
    category: 'pro',
    inputCost1M: 5.0,
    outputCost1M: 30.0,
  },
  {
    id: '~openai/gpt-mini-latest',
    name: 'OpenAI: GPT Mini Latest',
    category: 'flash',
    inputCost1M: 0.75,
    outputCost1M: 4.5,
  },
  {
    id: '~google/gemini-pro-latest',
    name: 'Google: Gemini Pro Latest',
    category: 'pro',
    inputCost1M: 2.0,
    outputCost1M: 12.0,
  },
  {
    id: '~google/gemini-flash-latest',
    name: 'Google: Gemini Flash Latest',
    category: 'flash',
    inputCost1M: 0.75,
    outputCost1M: 3.75,
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Google: Gemini 2.5 Flash Lite',
    category: 'flash',
    inputCost1M: 0.1,
    outputCost1M: 0.4,
  },
  {
    id: '~x-ai/grok-latest',
    name: 'xAI: Grok Latest',
    category: 'pro',
    inputCost1M: 2.0,
    outputCost1M: 6.0,
  },
  {
    id: 'moonshotai/kimi-k2.5',
    name: 'MoonshotAI: Kimi K2.5',
    category: 'pro',
    inputCost1M: 0.45,
    outputCost1M: 2.25,
  },
  {
    id: '~moonshotai/kimi-latest',
    name: 'MoonshotAI: Kimi Latest',
    category: 'pro',
    inputCost1M: 2.55,
    outputCost1M: 12.75,
  },
  {
    id: '~z-ai/glm-latest',
    name: 'Z-AI: GLM Latest',
    category: 'pro',
    inputCost1M: 1.092,
    outputCost1M: 3.432,
  },
  {
    id: 'nousresearch/hermes-3-llama-3.1-405b',
    name: 'Nous: Hermes 3 405B',
    category: 'pro',
    inputCost1M: 1.0,
    outputCost1M: 1.0,
  },
];

/** Legacy alias for backward compatibility */
export const GEMINI_MODELS = AI_MODELS;
