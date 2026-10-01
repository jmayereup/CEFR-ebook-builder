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
  bestFor?: string;
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
    id: '~deepseek/deepseek-flash-latest',
    name: 'DeepSeek Flash Latest',
    inputCost1M: 0.035,
    outputCost1M: 0.29,
    category: 'flash',
    supportsThinkingLevel: true,
    supportsThinkingBudget: false,
    supportsTemperature: true,
    maxOutputTokens: 16384,
  },
  {
    id: '~z-ai/glm-flash-latest',
    name: 'GLM Flash Latest',
    inputCost1M: 0.045,
    outputCost1M: 0.14,
    category: 'flash',
    supportsThinkingLevel: true,
    supportsThinkingBudget: false,
    supportsTemperature: true,
    maxOutputTokens: 16384,
    bestFor: 'Best for Non-Fiction',
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
    bestFor: 'Best for Fiction',
  },
  {
    id: 'xiaomi/mimo-v2.6-pro',
    name: 'Xiaomi: MiMo-V2.6-Pro',
    inputCost1M: 0.435,
    outputCost1M: 0.87,
    category: 'pro',
    supportsThinkingLevel: true,
    supportsThinkingBudget: false,
    supportsTemperature: true,
    maxOutputTokens: 16384,
  },
];

/** IDs of models that are always free to use (no contributor approval needed). */
export const FREE_MODEL_IDS = new Set<string>([
  '~z-ai/glm-flash-latest',
  'z-ai/glm-5.3-flash',
  'meta/muse-spark-1.3-contributor',
]);

/** Date when OpenRouter token rates were last verified/updated */
export const MODEL_PRICES_LAST_UPDATED = 'September 27, 2026';

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
    id: 'anthropic/claude-sonnet-5',
    name: 'Anthropic: Claude Sonnet 5',
    category: 'pro',
    inputCost1M: 2.0,
    outputCost1M: 10.0,
  },
  {
    id: '~deepseek/deepseek-flash-latest',
    name: 'DeepSeek: DeepSeek Flash Latest',
    category: 'flash',
    inputCost1M: 0.035,
    outputCost1M: 0.29,
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Google: Gemini 2.5 Flash Lite',
    category: 'flash',
    inputCost1M: 0.1,
    outputCost1M: 0.4,
  },
  {
    id: '~google/gemini-flash-latest',
    name: 'Google: Gemini Flash Latest',
    category: 'flash',
    inputCost1M: 0.75,
    outputCost1M: 3.75,
  },
  {
    id: '~google/gemini-pro-latest',
    name: 'Google: Gemini Pro Latest',
    category: 'pro',
    inputCost1M: 2.0,
    outputCost1M: 12.0,
  },
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
    inputCost1M: 0.9875,
    outputCost1M: 5.53,
  },
  {
    id: 'nousresearch/hermes-3-llama-3.1-405b',
    name: 'Nous: Hermes 3 405B',
    category: 'pro',
    inputCost1M: 1.0,
    outputCost1M: 1.0,
  },
  {
    id: '~openai/gpt-luna-latest',
    name: 'OpenAI: GPT Luna Latest',
    category: 'flash',
    inputCost1M: 0.1,
    outputCost1M: 0.5,
  },
  {
    id: '~openai/gpt-sol-latest',
    name: 'OpenAI: GPT Sol Latest',
    category: 'pro',
    inputCost1M: 2.0,
    outputCost1M: 10.0,
  },
  {
    id: '~openai/gpt-terra-latest',
    name: 'OpenAI: GPT Terra Latest',
    category: 'pro',
    inputCost1M: 2.0,
    outputCost1M: 12.0,
  },
  {
    id: '~x-ai/grok-latest',
    name: 'xAI: Grok Latest',
    category: 'pro',
    inputCost1M: 1.6,
    outputCost1M: 4.8,
  },
  {
    id: 'xiaomi/mimo-v2.6-pro',
    name: 'Xiaomi: MiMo-V2.6-Pro',
    category: 'pro',
    inputCost1M: 0.435,
    outputCost1M: 0.87,
  },
  {
    id: '~z-ai/glm-flash-latest',
    name: 'Z-AI: GLM Flash Latest',
    category: 'flash',
    inputCost1M: 0.045,
    outputCost1M: 0.14,
  },
  {
    id: '~z-ai/glm-latest',
    name: 'Z-AI: GLM Latest',
    category: 'pro',
    inputCost1M: 0.2737,
    outputCost1M: 2.574,
  },
];

/** Legacy alias for backward compatibility */
export const GEMINI_MODELS = AI_MODELS;

export interface CoverModelOption {
  id: string;
  name: string;
  costPerImage?: number;
  inputCost1M?: number;
  outputCost1M?: number;
  requiresAgeVerification?: boolean;
}

export const COVER_IMAGE_MODELS: CoverModelOption[] = [
  {
    id: 'google/gemini-3.1-flash-lite-image',
    name: 'Gemini 3.1 Flash Lite Image',
    inputCost1M: 0.25,
    outputCost1M: 1.5,
  },
  {
    id: 'meta/muse-image',
    name: 'Meta: Muse Image',
    costPerImage: 0.01,
    requiresAgeVerification: true,
  },
];

export const DEFAULT_COVER_IMAGE_MODEL = 'google/gemini-3.1-flash-lite-image';

export const formatCoverModelPriceIndicator = (
  model: CoverModelOption,
): string => {
  if (model.costPerImage !== undefined) {
    return `($${model.costPerImage.toFixed(2)} / img)`;
  }
  return formatModelPriceIndicator(model.inputCost1M, model.outputCost1M);
};
