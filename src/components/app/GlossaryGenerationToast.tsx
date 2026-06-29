import { useState } from 'react';
import { AlertCircle, RotateCcw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface GlossaryGenerationToastProps {
  isGeneratingGlossary: boolean;
  glossaryLogs: string[];
  glossaryStatus: string;
  handleCancelGeneration: () => void;
  glossaryError: string | null;
  onRetry: (modelId: string) => void;
  onDismiss: () => void;
}

const FALLBACK_MODELS = [
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B (Free)' },
  { id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek V4 Flash' },
  { id: 'google/gemma-4-31b-it', name: 'Gemma 4 31B (Paid)' },
  { id: 'openrouter/free', name: 'OpenRouter Free' },
];

export default function GlossaryGenerationToast({
  isGeneratingGlossary,
  glossaryLogs,
  glossaryStatus,
  handleCancelGeneration,
  glossaryError,
  onRetry,
  onDismiss,
}: GlossaryGenerationToastProps) {
  const [selectedModel, setSelectedModel] = useState('google/gemma-4-31b-it:free');

  return (
    <AnimatePresence>
      {isGeneratingGlossary && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-4 right-4 left-4 md:left-auto md:max-w-sm z-50 p-5 bg-tj-bg-card/95 backdrop-blur-md border border-tj-border-main rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-tj-text-main flex flex-col gap-3.5 select-text font-sans"
        >
          {glossaryError ? (
            // Error / Fallback State
            <>
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-50 dark:bg-rose-955/20 text-rose-500 rounded-xl shrink-0">
                    <AlertCircle className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold tracking-tight text-rose-600 dark:text-rose-400">
                      Glossary Gen Failed
                    </h4>
                    <p className="text-[10px] text-tj-text-muted mt-0.5 font-medium leading-relaxed max-w-[240px] break-words">
                      {glossaryError}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="p-1 text-slate-450 hover:text-slate-655 dark:text-slate-450 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-colors border-0"
                  title="Dismiss toast"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Model selection */}
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Choose Fallback Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main focus:border-tj-primary focus:outline-none cursor-pointer"
                >
                  {FALLBACK_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRetry(selectedModel)}
                  className="flex-1 py-2.5 px-3 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 border-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Generation</span>
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="py-2.5 px-3 bg-tj-primary-light hover:bg-tj-primary-border text-tj-text-main font-semibold text-xs rounded-xl cursor-pointer transition-colors border border-tj-border-main"
                >
                  Dismiss
                </button>
              </div>
            </>
          ) : (
            // Generating State
            <>
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary rounded-xl shrink-0">
                    <div className="w-4 h-4 border-2 border-tj-primary/20 border-t-tj-primary rounded-full animate-spin"></div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold tracking-tight">
                      Generating Glossary
                    </h4>
                    <p className="text-[10px] text-tj-text-muted mt-0.5 font-medium">
                      {glossaryStatus || 'Extracting vocabulary terms...'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelGeneration}
                  className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-colors border-0"
                  title="Cancel generation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Logs */}
              {glossaryLogs.length > 0 && (
                <div className="bg-tj-bg-recessed border border-tj-border-main p-3 rounded-xl font-mono text-[9px] text-tj-text-muted max-h-32 overflow-y-auto space-y-1">
                  {glossaryLogs.map((log, idx) => (
                    <p key={idx} className="flex gap-1.5 leading-relaxed">
                      <span className="text-tj-primary">►</span>
                      <span>{log}</span>
                    </p>
                  ))}
                </div>
              )}

              {/* Action text */}
              <p className="text-[10px] text-tj-text-muted italic select-none">
                You can continue reading the story while generation is in progress.
              </p>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
