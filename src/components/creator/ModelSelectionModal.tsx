import { Brain, Check, Cpu, Key, Sparkles, X, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { AI_MODELS, FREE_MODEL_IDS } from '../../constants/models';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  language: string;
}

const MODEL_DETAILS: Record<
  string,
  {
    verdict: string;
    languages: string;
  }
> = {
  'z-ai/glm-5.3-flash': {
    verdict:
      'Free high-speed multimodal reasoning model from Z.ai. Delivers efficient generation, rich multilingual prose, and responsive chapter creation.',
    languages: 'All supported languages',
  },
  'deepseek/deepseek-v4-pro': {
    verdict:
      'Default flagship story model. High-capacity reasoning model delivering superior prose, character voice, and plot consistency.',
    languages: 'All supported languages',
  },
  'nousresearch/hermes-3-llama-3.1-405b': {
    verdict:
      'Frontier 405B open-weights model fine-tuned by Nous Research. Exceptional creative writing, roleplaying, reasoning, and complex narrative capabilities.',
    languages: 'All supported languages',
  },
  'deepseek/deepseek-v4-flash': {
    verdict:
      'Lightweight, high-speed model dedicated for dictionary lookups, vocabulary glossaries, and calculation tasks.',
    languages: 'All supported languages',
  },
};

export default function ModelSelectionModal({
  isOpen,
  onClose,
  selectedModel,
}: ModelSelectionModalProps) {
  const customOpenRouterKey = useUIStore((state) => state.customOpenRouterKey);
  const currentUser = useAuthStore((state) => state.currentUser);
  const isAdmin = currentUser?.isAdmin === true;
  const hasKey = !!customOpenRouterKey;

  if (!isOpen) return null;

  const isFreeModelLocal = (id: string) =>
    FREE_MODEL_IDS.has(id) || id.endsWith(':free');

  const modelsToDisplay =
    !isAdmin && !hasKey
      ? AI_MODELS.filter((m) => isFreeModelLocal(m.id))
      : AI_MODELS;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-tj-bg-card rounded-2xl border border-tj-border-main p-6 shadow-2xl relative space-y-5 overflow-hidden text-tj-text-main flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-tj-border-main pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-tj-primary" />
            <h3 className="text-base font-bold text-tj-text-main font-sans">
              Model Information
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-tj-bg-recessed rounded-full text-tj-text-muted hover:text-tj-text-main cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="space-y-4 text-xs font-sans text-tj-text-main overflow-y-auto pr-1 flex-1">
          <p className="leading-relaxed text-tj-text-muted">
            {!isAdmin && !hasKey
              ? 'GLM 5.3 Flash is the dedicated free AI model for story generation on the free tier. To unlock all frontier models (DeepSeek V4 Pro, Hermes 3, Claude, Gemini, GPT), configure your own OpenRouter API key in Settings.'
              : 'Select an AI model for story generation. Standard Flash models are cost-efficient and fast, while Pro models offer deep narrative nuances and high structural complexity.'}
          </p>

          <div className="space-y-3">
            {modelsToDisplay.map((model) => {
              const details = MODEL_DETAILS[model.id] || {
                verdict: `A capable ${model.category === 'pro' ? 'professional-grade' : 'fast and economical'} model.`,
                languages: 'All supported languages',
              };

              const isSelected = selectedModel === model.id;

              return (
                <div
                  key={model.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-tj-primary bg-tj-primary-light/10 dark:bg-tj-primary-light/5 ring-1 ring-tj-primary/20'
                      : 'border-tj-border-main bg-slate-50/50 dark:bg-slate-800/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-tj-text-main text-sm">
                          {model.name}
                        </h4>
                        {isSelected && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-tj-primary bg-tj-primary-light dark:bg-tj-primary-light/25 px-1.5 py-0.5 rounded-full">
                            <Check className="w-2.5 h-2.5" /> Currently Selected
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                            model.category === 'pro'
                              ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400'
                              : 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400'
                          }`}
                        >
                          {model.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-tj-text-muted mt-0.5 font-mono">
                        ID: {model.id}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-semibold text-tj-text-main">
                        ${model.inputCost1M.toFixed(3)} in / $
                        {model.outputCost1M.toFixed(3)} out (per 1M)
                      </p>
                      {model.maxOutputTokens && (
                        <p className="text-[9px] text-tj-text-muted mt-0.5">
                          Max Output: {model.maxOutputTokens.toLocaleString()}{' '}
                          tokens
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-tj-text-muted leading-relaxed mb-2.5 pl-0.5">
                    {details.verdict}
                  </p>

                  <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-tj-border-main/50 text-[10px]">
                    <div className="flex items-center gap-1 text-tj-text-muted">
                      <Sparkles className="w-3.5 h-3.5 text-tj-primary" />
                      <span>
                        Best for:{' '}
                        <strong className="text-tj-text-main">
                          {details.languages}
                        </strong>
                      </span>
                    </div>

                    {(model.supportsThinkingLevel ||
                      model.supportsThinkingBudget) && (
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                        <Brain className="w-3.5 h-3.5" />
                        <span>Supports Reasoning</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-tj-border-main shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs text-tj-bg-main bg-tj-primary hover:bg-tj-primary-hover font-bold rounded-xl cursor-pointer transition-all shadow-none border-0"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
