import { AlertTriangle, Loader2, X } from 'lucide-react';
import { motion } from 'motion/react';

interface UnsavedChangesModalProps {
  onClose: () => void; // Stay / Cancel
  onDiscard: () => void | Promise<void>; // Discard changes & leave
  onSave: () => void | Promise<void>; // Save & leave
  isSaving?: boolean;
  isDiscarding?: boolean;
}

export default function UnsavedChangesModal({
  onClose,
  onDiscard,
  onSave,
  isSaving = false,
  isDiscarding = false,
}: UnsavedChangesModalProps) {
  const isPending = isSaving || isDiscarding;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop blur overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-sm"
      />

      {/* Modal card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', duration: 0.35 }}
        className="relative bg-tj-bg-card rounded-lg border border-tj-border-main shadow-2xl max-w-md w-full p-6 space-y-4 overflow-hidden z-10 animate-in fade-in duration-200"
      >
        {!isPending && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1 hover:bg-tj-bg-recessed text-tj-text-muted rounded-full cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded shrink-0 bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900/30">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-455" />
          </div>
          <div className="space-y-1.5 min-w-0 flex-1">
            <h3 className="text-sm font-bold text-tj-text-main leading-tight font-sans">
              Unsaved Changes
            </h3>
            <p className="text-xs text-tj-text-muted leading-relaxed break-words font-medium">
              You are trying to navigate away from this story, but it has not
              been saved yet. If you leave now, you will lose your generated
              chapters.
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={isPending}
            onClick={onDiscard}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 dark:hover:bg-rose-955/35 text-rose-600 dark:text-rose-455 border border-rose-200 dark:border-rose-900/50 rounded transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isDiscarding ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Discarding...</span>
              </>
            ) : (
              <span>Discard Changes</span>
            )}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={onSave}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save & Leave</span>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
