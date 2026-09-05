import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { motion } from 'motion/react';

interface AgeVerificationModalProps {
  isOpen: boolean;
  modelName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AgeVerificationModal({
  isOpen,
  modelName = 'Meta Muse',
  onConfirm,
  onCancel,
}: AgeVerificationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-tj-bg-card rounded-2xl border border-tj-border-main p-6 shadow-2xl relative space-y-4 text-tj-text-main"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-tj-border-main pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-sans text-tj-text-main">
                  Age Verification Required
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 uppercase">
                  18+
                </span>
              </div>
              <p className="text-[11px] text-tj-text-muted mt-0.5">
                Model: {modelName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="p-1 hover:bg-tj-bg-recessed rounded-full text-tj-text-muted hover:text-tj-text-main cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 text-xs leading-relaxed text-tj-text-muted">
          <p>
            The <strong>{modelName}</strong> model requires basic age
            verification under Meta's model usage and data distribution terms.
          </p>
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <p className="text-[11px]">
              By proceeding, you attest that you are at least 18 years of age (or
              of legal age of majority in your jurisdiction) to generate content
              using this model.
            </p>
          </div>
          <p className="text-[11px]">
            Your verification will be remembered in this browser so you will not
            be asked again for future story generations.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-tj-border-main">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-tj-text-muted hover:text-tj-text-main hover:bg-tj-bg-recessed rounded-xl transition-colors cursor-pointer border border-tj-border-main"
          >
            Cancel / I am under 18
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold text-tj-bg-main bg-tj-primary hover:bg-tj-primary-hover rounded-xl transition-all shadow-sm cursor-pointer"
          >
            I Confirm I am 18 or Older
          </button>
        </div>
      </motion.div>
    </div>
  );
}
