import {
  Brain,
  Cpu,
  Image as ImageIcon,
  Info,
  Lock,
  Sliders,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type React from 'react';
import { useState } from 'react';
import {
  AI_MODELS,
  COVER_IMAGE_MODELS,
  formatCoverModelPriceIndicator,
  formatModelPriceIndicator,
  FREE_MODEL_IDS,
  FRONTIER_LATEST_MODELS,
  isMuseModel,
} from '../../constants/models';
import { getModelThinkingSupport } from '../../utils/modelUtils';

interface ModelSettingsCardProps {
  selectedModel: string;
  onModelSelectChange: (model: string) => void;
  selectedCoverModel: string;
  onCoverModelSelectChange: (coverModel: string) => void;
  thinkingOption: string;
  onThinkingOptionChange: (option: string) => void;
  temperature: number;
  onTemperatureChange: (temp: number) => void;
  isByokActive: boolean;
  isAdmin: boolean;
  currentUser: any;
  onShowDefaultModelInfo: () => void;
  onLogin?: (mode?: 'signin' | 'signup') => void;
}

export default function ModelSettingsCard({
  selectedModel,
  onModelSelectChange,
  selectedCoverModel,
  onCoverModelSelectChange,
  thinkingOption,
  onThinkingOptionChange,
  temperature,
  onTemperatureChange,
  isByokActive,
  isAdmin,
  currentUser,
  onShowDefaultModelInfo,
  onLogin,
}: ModelSettingsCardProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const byokModelName =
    FRONTIER_LATEST_MODELS.find((m) => m.id === selectedModel)?.name ||
    AI_MODELS.find((m) => m.id === selectedModel)?.name ||
    selectedModel;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-tj-bg-recessed/50 border border-tj-border-main rounded-2xl animate-fade-in">
      {/* AI Writing Model */}
      <div className="col-span-1">
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Cpu className="w-4 h-4 text-tj-primary dark:text-tj-primary-hover" />
            AI Writing Model
          </label>
          <button
            type="button"
            onClick={onShowDefaultModelInfo}
            className="text-[10px] text-tj-primary hover:underline flex items-center gap-1 cursor-pointer font-semibold"
          >
            <Info className="w-3.5 h-3.5" />
            Info
          </button>
        </div>
        <select
          value={selectedModel}
          disabled={!currentUser}
          onChange={(e) => onModelSelectChange(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-tj-border-main bg-tj-bg-card text-tj-text-main text-sm focus:border-tj-primary focus:outline-none disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-tj-bg-recessed cursor-pointer"
        >
          {isByokActive ? (
            <>
              {!FRONTIER_LATEST_MODELS.some((m) => m.id === selectedModel) && (
                <option value={selectedModel}>
                  {byokModelName} (Custom Model)
                </option>
              )}
              {FRONTIER_LATEST_MODELS.map((m) => {
                const priceLabel = formatModelPriceIndicator(
                  m.inputCost1M,
                  m.outputCost1M,
                );
                const ageBadge = isMuseModel(m.id) ? ' [18+]' : '';
                return (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {ageBadge} {priceLabel}
                  </option>
                );
              })}
            </>
          ) : (
            (() => {
              const isFreeModelLocal = (id: string) =>
                FREE_MODEL_IDS.has(id) || id.endsWith(':free');

              // Free tier non-BYOK users only see free models (Muse Spark 1.3 Contributor and GLM 5.3 Flash)
              const modelsToDisplay = !isAdmin
                ? AI_MODELS.filter((m) => isFreeModelLocal(m.id))
                : AI_MODELS;

              const renderOption = (model: (typeof AI_MODELS)[0]) => {
                const isFree = isFreeModelLocal(model.id);
                const ageBadge = isMuseModel(model.id) ? ' [18+]' : '';
                const costLabel = isFree ? ' (Free)' : '';

                return (
                  <option key={model.id} value={model.id}>
                    {model.name}
                    {ageBadge}
                    {costLabel}
                  </option>
                );
              };

              const allSortedModels = [...modelsToDisplay].sort((a, b) =>
                a.name.localeCompare(b.name),
              );

              return allSortedModels.map(renderOption);
            })()
          )}
        </select>
      </div>

      {/* Cover Artwork Generator */}
      <div className="col-span-1">
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <ImageIcon className="w-4 h-4 text-tj-primary dark:text-tj-primary-hover" />
            Book Cover Artwork
          </label>
          {selectedCoverModel !== 'generic' && isByokActive && (
            <span className="text-[10px] text-tj-text-muted font-normal">
              (BYOK Billed)
            </span>
          )}
        </div>
        <select
          value={selectedCoverModel}
          disabled={!currentUser}
          onChange={(e) => onCoverModelSelectChange(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-tj-border-main bg-tj-bg-card text-tj-text-main text-sm focus:border-tj-primary focus:outline-none disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-tj-bg-recessed cursor-pointer"
        >
          <option value="generic">
            🎨 Generic (Curated Genre Artwork - No AI)
          </option>
          {isByokActive || isAdmin ? (
            <>
              {COVER_IMAGE_MODELS.map((m) => {
                const priceLabel = formatCoverModelPriceIndicator(m);
                const ageBadge = isMuseModel(m.id) ? ' [18+]' : '';
                return (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {ageBadge} {priceLabel}
                  </option>
                );
              })}
              {!COVER_IMAGE_MODELS.some((m) => m.id === selectedCoverModel) &&
                selectedCoverModel !== 'generic' && (
                  <option value={selectedCoverModel}>
                    {selectedCoverModel} (Custom Model)
                  </option>
                )}
            </>
          ) : (
            <>
              {COVER_IMAGE_MODELS.map((m) => {
                const ageBadge = isMuseModel(m.id) ? ' [18+]' : '';
                return (
                  <option key={m.id} value={m.id} disabled>
                    {m.name}
                    {ageBadge} (Requires BYOK)
                  </option>
                );
              })}
            </>
          )}
        </select>
      </div>

      {!currentUser ? (
        <div className="md:col-span-2 p-3 mt-1 rounded-xl bg-tj-primary-light/60 dark:bg-slate-800/60 border border-tj-primary-border/60 text-tj-text-main flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5 text-xs">
            <div className="p-1.5 bg-tj-primary/10 text-tj-primary rounded-lg shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                Sign up or Sign in to generate books
              </p>
              <p className="text-[11px] text-tj-text-muted mt-0.5 leading-relaxed">
                Create an account to choose AI models, generate custom stories,
                or use custom API keys.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => onLogin && onLogin('signup')}
              className="flex-1 sm:flex-none py-1.5 px-3.5 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
            >
              Sign Up Free
            </button>
            <button
              type="button"
              onClick={() => onLogin && onLogin('signin')}
              className="flex-1 sm:flex-none py-1.5 px-3.5 bg-transparent border border-tj-border-main hover:bg-slate-100 dark:hover:bg-slate-800 text-tj-text-main font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
            >
              Sign In
            </button>
          </div>
        </div>
      ) : isByokActive ? (
        <div className="md:col-span-2">
          <p className="text-[11px] text-tj-text-muted leading-normal bg-tj-primary/5 p-2 rounded-lg border border-tj-primary/20 font-medium">
            ✨ <strong>BYOK Active:</strong> Selected writing and cover models
            will use your OpenRouter key.
          </p>
        </div>
      ) : null}

      <div className="md:col-span-2 pt-2">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-xs font-semibold text-tj-primary hover:text-tj-primary-hover transition-colors cursor-pointer select-none"
        >
          <Sliders
            className={`w-3.5 h-3.5 transform transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`}
          />
          <span>
            {showAdvanced
              ? 'Hide Advanced Options'
              : 'Show Advanced Options (Thinking & Temperature)'}
          </span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 8 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="md:col-span-2 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200/50 dark:border-slate-800/80 pt-4"
          >
            {/* Reasoning / Thinking Level */}
            {isAdmin || isByokActive ? (
              <div className="col-span-1">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-355 mb-2">
                  <Brain className="w-4 h-4 text-tj-primary dark:text-tj-primary-hover" />
                  Reasoning / Thinking Level
                </label>
                {(() => {
                  const thinkingSupport =
                    getModelThinkingSupport(selectedModel);

                  if (thinkingSupport.type === 'simple') {
                    return (
                      <select
                        value={thinkingOption}
                        onChange={(e) =>
                          onThinkingOptionChange(e.target.value)
                        }
                        className="w-full p-2.5 rounded-xl border border-tj-border-main bg-tj-bg-card text-tj-text-main text-sm focus:border-tj-primary focus:outline-none"
                      >
                        <option value="disabled">Disabled (No Thinking)</option>
                        <option value="low">
                          Enabled (Low Reasoning Budget - 2,048 tokens)
                        </option>
                      </select>
                    );
                  } else if (thinkingSupport.type === 'level') {
                    return (
                      <select
                        value={thinkingOption}
                        onChange={(e) =>
                          onThinkingOptionChange(e.target.value)
                        }
                        className="w-full p-2.5 rounded-xl border border-tj-border-main bg-tj-bg-card text-tj-text-main text-sm focus:border-tj-primary focus:outline-none"
                      >
                        <option value="disabled">Disabled (No Thinking)</option>
                        <option value="minimal">Minimal Depth</option>
                        <option value="low">
                          Low Depth (Recommended - 2,048 tokens)
                        </option>
                        <option value="medium">Medium Depth</option>
                        <option value="high">High Depth (Nuanced)</option>
                      </select>
                    );
                  } else if (thinkingSupport.type === 'budget') {
                    return (
                      <select
                        value={thinkingOption}
                        onChange={(e) =>
                          onThinkingOptionChange(e.target.value)
                        }
                        className="w-full p-2.5 rounded-xl border border-tj-border-main bg-tj-bg-card text-tj-text-main text-sm focus:border-tj-primary focus:outline-none"
                      >
                        <option value="disabled">Disabled (No Thinking)</option>
                        <option value="low">
                          Low Budget (2,048 tokens - Recommended)
                        </option>
                        <option value="medium">
                          Medium Budget (2,048 tokens)
                        </option>
                        <option value="high">High Budget (4,096 tokens)</option>
                        <option value="dynamic">
                          Dynamic Budget (Auto-determined)
                        </option>
                      </select>
                    );
                  } else {
                    return (
                      <div className="w-full p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-xs flex items-center justify-center h-[38px] select-none">
                        Thinking is not supported by this model
                      </div>
                    );
                  }
                })()}
                <p className="text-[10px] text-slate-400 mt-1">
                  Enables Chain-of-Thought reasoning to improve pedagogical
                  grading.
                </p>
              </div>
            ) : null}

            {/* Temperature Slider */}
            {(() => {
              const currentModelObj = AI_MODELS.find(
                (m) => m.id === selectedModel,
              );
              const supportsTemp =
                currentModelObj?.supportsTemperature ?? true;
              const isThinkingActive = thinkingOption !== 'disabled';

              if (!supportsTemp) return null;

              const showReasoning = isAdmin || isByokActive;

              return (
                <div
                  className={showReasoning ? 'col-span-1' : 'md:col-span-2'}
                >
                  <label className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <span className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-tj-primary dark:text-tj-primary-hover" />
                      Model Temperature (Creativity)
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg shrink-0">
                      {isThinkingActive
                        ? 'Managed by Model'
                        : temperature.toFixed(1)}
                    </span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.0"
                      max="2.0"
                      step="0.1"
                      value={isThinkingActive ? 1.0 : temperature}
                      disabled={isThinkingActive}
                      onChange={(e) =>
                        onTemperatureChange(parseFloat(e.target.value))
                      }
                      className="w-full accent-tj-primary dark:accent-tj-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {isThinkingActive
                      ? 'Temperature control is disabled because Chain-of-Thought Reasoning is enabled.'
                      : 'Adjust randomness. Lower values (e.g. 0.3 - 0.5) are more focused, higher values (e.g. 0.9 - 1.2) are more creative.'}
                  </p>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
