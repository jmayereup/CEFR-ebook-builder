import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface ChapterGenerationToastProps {
  isGenerating: boolean;
  isAutoGenerating: boolean;
  generationLogs: string[];
  generationStatus: string;
  handleCancelGeneration: () => void;
}

export default function ChapterGenerationToast({
  isGenerating,
  isAutoGenerating,
  generationLogs,
  generationStatus,
  handleCancelGeneration,
}: ChapterGenerationToastProps) {
  const isActive = isGenerating || isAutoGenerating;

  // Dynamically determine the header title based on status/type
  const getHeaderTitle = () => {
    if (isAutoGenerating) return 'Auto-Writing Chapters';
    if (generationStatus.toLowerCase().includes('regenerat')) {
      return 'Regenerating Chapter';
    }
    if (generationLogs.some((log) => log.includes('initial'))) {
      return 'Initiating Story';
    }
    return 'Writing Chapter';
  };

  return (
    <AnimatePresence>
      {isActive && (
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
                  {getHeaderTitle()}
                </h4>
                <p className="text-[10px] text-tj-text-muted mt-0.5 font-medium">
                  {generationStatus || 'Processing request...'}
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
          {generationLogs.length > 0 && (
            <div className="bg-tj-bg-recessed border border-tj-border-main p-3 rounded-xl font-mono text-[9px] text-tj-text-muted max-h-32 overflow-y-auto space-y-1">
              {generationLogs.map((log, idx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: logs are read-only and sequential
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
