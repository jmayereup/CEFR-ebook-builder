import { Brain, Check, Cpu, Info, Sparkles, X, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { GEMINI_MODELS } from '../../constants/models';
import { SUPPORTED_LANGUAGES } from '../../types';

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
  // Free tier
  'openrouter/free': {
    verdict:
      'OpenRouter automatic free routing. Dynamically routes to the best available free model on OpenRouter.',
    languages: 'All supported languages',
  },
  'meta-llama/llama-3.3-70b-instruct:free': {
    verdict:
      'Optimized for Romance and Germanic languages. Great understanding of complex conjugation, gender agreements, and local idioms.',
    languages: 'Spanish, French, German, Italian, Portuguese',
  },
  'google/gemma-4-31b-it:free': {
    verdict:
      'Exceptional for East Asian scripts. Built on multilingual tokenizers that are highly accurate with Japanese, Chinese, Korean, and Thai.',
    languages: 'Japanese, Chinese, Korean, Thai',
  },
  'openai/gpt-oss-120b:free': {
    verdict:
      'High-parameter model with strong semantic reasoning, ideal for structured story layouts and precise vocabulary control in English.',
    languages: 'English',
  },

  // Paid tier
  'openai/gpt-5.5': {
    verdict:
      'The absolute peak for narrative prose and structural complexity. Avoids clichéd AI tropes and adapts flawlessly to distinct character voices.',
    languages: 'English, Spanish, French, German, Italian, Chinese, Japanese',
  },
  'openai/gpt-5.4': {
    verdict:
      'Provides top-tier prose, incredible consistency over long chapters, and excellent command of localized idioms.',
    languages:
      'English, Spanish, French, German, Italian, Chinese, Japanese, Korean, Thai',
  },
  'openai/gpt-5.4-mini': {
    verdict:
      'Fast, highly competent, and keeps excellent track of plot logic. Handles multilingual syntax beautifully for a fraction of the cost.',
    languages: 'English, Spanish, German, Portuguese, Italian, Korean',
  },
  'openai/gpt-5-mini': {
    verdict:
      'A fast and balanced general-purpose model with good structural control, optimized for direct pacing and prompt updates.',
    languages: 'English, Spanish, French, German',
  },
  'openai/gpt-oss-120b': {
    verdict:
      'Standard paid version of GPT OSS 120B. Offers consistent English narrative quality and high compliance with formatting instructions.',
    languages: 'English',
  },
  'anthropic/claude-haiku-4.5': {
    verdict:
      'Famously artistic and emotionally resonant. Excellent for character-driven dialogue and atmospheric description at an efficient cost.',
    languages: 'English, French, Spanish, Japanese',
  },
  'qwen/qwen3.7-plus': {
    verdict:
      'Exceptional for multilingual applications, complex layouts, and contextual consistency, especially across East Asian languages.',
    languages: 'Chinese, Japanese, Korean, English',
  },
  'qwen/qwen3.5-flash-02-23': {
    verdict:
      'Extremely fast and economical. Sparsely routed architecture delivering prompt responses and great structural consistency.',
    languages: 'Chinese, Japanese, Korean, English',
  },
  'google/gemini-3.5-flash': {
    verdict:
      'Exceptionally strong for worldbuilding, lore continuity, and handling extremely large context windows.',
    languages: 'English, Thai, Japanese, French, Spanish',
  },
  'google/gemini-3.1-flash-lite': {
    verdict:
      'Highly cost-effective and fast reasoning model. Delivers balanced multi-turn dialogue and vocabulary grading.',
    languages: 'English, Spanish, French, German, Japanese',
  },
  'google/gemini-2.5-flash-lite': {
    verdict:
      'Lightweight reasoning model optimized for ultra-low latency, translation, and vocabulary grading with active chain-of-thought support.',
    languages: 'English, Spanish, French, Japanese, Thai',
  },
  'google/gemma-4-31b-it': {
    verdict:
      'Paid version of Gemma 4 31B. Highly precise for East Asian languages with strong logical reasoning capabilities.',
    languages: 'Japanese, Chinese, Korean, Thai',
  },
  'deepseek/deepseek-v4-flash': {
    verdict:
      'Extremely cost-efficient reasoning model supporting native chain-of-thought to solve complex contextual relationships.',
    languages: 'English, Chinese, Spanish, Japanese',
  },
  'deepseek/deepseek-v4-pro': {
    verdict:
      'Flagship pro reasoning model with state-of-the-art code generation, logical deduction, and deep narrative capability.',
    languages: 'English, Chinese, Spanish, Japanese, French',
  },
  'moonshotai/kimi-k2.6': {
    verdict:
      'Natively multimodal Mixture-of-Experts (MoE) model optimized for long-context reasoning, complex outline planning, and cohesive chapter continuity.',
    languages: 'Chinese, English, Japanese, Korean',
  },
  'minimax/minimax-m3': {
    verdict:
      'Exceptional for creative prose and multilingual fluency, particularly with English and Chinese. Highly responsive with a natural narrative voice.',
    languages: 'English, Chinese, Spanish, Japanese, French, German',
  },
};

export default function ModelSelectionModal({
  isOpen,
  onClose,
  selectedModel,
  language,
}: ModelSelectionModalProps) {
  const [modalTab, setModalTab] = useState<'free' | 'paid'>('free');

  if (!isOpen) return null;

  const isFreeModelLocal = (id: string) =>
    id.endsWith(':free') || id.includes('free');

  const freeModels = GEMINI_MODELS.filter((m) => isFreeModelLocal(m.id));
  const paidModels = GEMINI_MODELS.filter((m) => !isFreeModelLocal(m.id));

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
            onClick={() => {
              onClose();
              setModalTab('free');
            }}
            className="p-1 hover:bg-tj-bg-recessed rounded-full text-tj-text-muted hover:text-tj-text-main cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex gap-4 border-b border-tj-border-main pb-1 shrink-0">
          <button
            type="button"
            onClick={() => setModalTab('free')}
            className={`pb-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              modalTab === 'free'
                ? 'border-tj-primary text-tj-primary'
                : 'border-transparent text-tj-text-muted hover:text-tj-text-main'
            }`}
          >
            Free Tier Models
          </button>
          <button
            type="button"
            onClick={() => setModalTab('paid')}
            className={`pb-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              modalTab === 'paid'
                ? 'border-tj-primary text-tj-primary'
                : 'border-transparent text-tj-text-muted hover:text-tj-text-main'
            }`}
          >
            Paid Tier Models
          </button>
        </div>

        {/* Content Area */}
        <div className="space-y-4 text-xs font-sans text-tj-text-main overflow-y-auto pr-1 flex-1">
          <p className="leading-relaxed text-tj-text-muted">
            {modalTab === 'free'
              ? 'Free-Tier models are optimized for specific language families to ensure accurate grading and story flow without consuming credits.'
              : 'Paid-Tier models utilize premium resources. Standard "Flash" models are cost-efficient, while "Pro" models offer deep narrative nuances and high structural complexity.'}
          </p>

          <div className="space-y-3">
            {(modalTab === 'free' ? freeModels : paidModels).map((model) => {
              const details = MODEL_DETAILS[model.id] || {
                verdict: `A capable ${model.category === 'pro' ? 'professional-grade' : 'fast and economical'} model supporting ${model.supportsThinkingLevel || model.supportsThinkingBudget ? 'advanced reasoning' : 'standard text generation'}.`,
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
                        {isFreeModelLocal(model.id)
                          ? '0 credits'
                          : `$${model.inputCost1M.toFixed(3)} in / $${model.outputCost1M.toFixed(3)} out (per 1M)`}
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

          {modalTab === 'paid' && (
            <div className="p-3.5 bg-tj-primary-light/20 dark:bg-slate-800/20 border border-tj-primary-border/30 rounded-xl flex items-start gap-2.5 mt-4">
              <Zap className="w-4 h-4 shrink-0 text-tj-primary mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <span className="font-bold text-tj-text-main text-[11px]">
                  Creative Tier Usage Strategy
                </span>
                <p className="text-[10px] text-tj-text-muted leading-relaxed">
                  For longer projects, you can use a balanced{' '}
                  <strong>Flash</strong> model (like GPT-5.4 Mini, Gemini 2.5
                  Flash-Lite, or Claude 4.5 Haiku) to quickly draft outlines and
                  initial chapters. Switch to a flagship <strong>Pro</strong>{' '}
                  model (like GPT-5.5) for complex chapters requiring peak
                  narrative style.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-tj-border-main shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              setModalTab('free');
            }}
            className="px-5 py-2 text-xs text-tj-bg-main bg-tj-primary hover:bg-tj-primary-hover font-bold rounded-xl cursor-pointer transition-all shadow-none border-0"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
