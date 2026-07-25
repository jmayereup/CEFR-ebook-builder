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
    id: 'deepseek/deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    inputCost1M: 0.435,
    outputCost1M: 0.87,
    category: 'pro',
    supportsThinkingLevel: true,
    supportsThinkingBudget: false,
    supportsTemperature: true,
    maxOutputTokens: 8192,
  },
  {
    id: 'google/gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    inputCost1M: 0.3,
    outputCost1M: 2.5,
    category: 'flash',
    supportsThinkingLevel: true,
    supportsThinkingBudget: false,
    supportsTemperature: true,
    maxOutputTokens: 8192,
  },
  {
    id: 'mistralai/mistral-large-2512',
    name: 'Mistral Large 2512',
    inputCost1M: 0.5,
    outputCost1M: 1.5,
    category: 'pro',
    supportsThinkingLevel: false,
    supportsThinkingBudget: false,
    supportsTemperature: true,
    maxOutputTokens: 8192,
  },
];

/** IDs of models that are always free to use (no contributor approval needed). */
export const FREE_MODEL_IDS = new Set<string>();

/** Legacy alias for backward compatibility */
export const GEMINI_MODELS = AI_MODELS;

