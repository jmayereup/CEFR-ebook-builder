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
}

/** Legacy alias */
export type GeminiModelOption = AIModelOption;

export const AI_MODELS: AIModelOption[] = [
  {
    id: 'z-ai/glm-5.3-flash',
    name: 'GLM 5.3 Flash',
    inputCost1M: 0.15,
    outputCost1M: 0.5,
    category: 'flash',
    supportsThinkingLevel: true,
    supportsThinkingBudget: false,
    supportsTemperature: true,
    maxOutputTokens: 16384,
  },
  {
    id: 'deepseek/deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    inputCost1M: 0.435,
    outputCost1M: 0.87,
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
export const FREE_MODEL_IDS = new Set<string>(['z-ai/glm-5.3-flash']);

/** Curated frontier & latest models for BYOK story generation selection */
export const FRONTIER_LATEST_MODELS = [
  {
    id: 'z-ai/glm-5.3-flash',
    name: 'Z-AI: GLM 5.3 Flash',
    category: 'flash' as const,
  },
  {
    id: 'deepseek/deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    category: 'pro' as const,
  },
  {
    id: 'deepseek/deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    category: 'flash' as const,
  },
  {
    id: 'google/gemini-3.6-flash',
    name: 'Google: Gemini 3.6 Flash',
    category: 'flash' as const,
  },
  {
    id: 'anthropic/claude-sonnet-5',
    name: 'Anthropic: Claude Sonnet 5',
    category: 'pro' as const,
  },
  {
    id: 'openai/gpt-chat-latest',
    name: 'OpenAI: GPT Chat Latest',
    category: 'pro' as const,
  },
  {
    id: '~openai/gpt-mini-latest',
    name: 'OpenAI: GPT Mini Latest',
    category: 'flash' as const,
  },
  {
    id: '~google/gemini-pro-latest',
    name: 'Google: Gemini Pro Latest',
    category: 'pro' as const,
  },
  {
    id: '~google/gemini-flash-latest',
    name: 'Google: Gemini Flash Latest',
    category: 'flash' as const,
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    name: 'Google: Gemini 2.5 Flash Lite',
    category: 'flash' as const,
  },
  {
    id: '~x-ai/grok-latest',
    name: 'xAI: Grok Latest',
    category: 'pro' as const,
  },
  {
    id: 'moonshotai/kimi-k2.5',
    name: 'MoonshotAI: Kimi K2.5',
    category: 'pro' as const,
  },
  {
    id: '~moonshotai/kimi-latest',
    name: 'MoonshotAI: Kimi Latest',
    category: 'pro' as const,
  },
  {
    id: '~z-ai/glm-latest',
    name: 'Z-AI: GLM Latest',
    category: 'pro' as const,
  },
  {
    id: 'nousresearch/hermes-3-llama-3.1-405b',
    name: 'Nous: Hermes 3 405B',
    category: 'pro' as const,
  },
];

/** Legacy alias for backward compatibility */
export const GEMINI_MODELS = AI_MODELS;
