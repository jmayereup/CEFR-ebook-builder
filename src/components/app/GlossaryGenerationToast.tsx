import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface GlossaryGenerationToastProps {
  isGeneratingGlossary: boolean;
  glossaryLogs: string[];
  glossaryStatus: string;
  handleCancelGeneration: () => void;
}

export default function GlossaryGenerationToast({
  isGeneratingGlossary,
  glossaryLogs,
  glossaryStatus,
  handleCancelGeneration,
}: GlossaryGenerationToastProps) {
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
              className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-colors"
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
