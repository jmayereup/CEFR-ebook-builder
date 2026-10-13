import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { motion } from 'motion/react';

interface AlertModalProps {
  title: string;
  message: string;
  type?: 'info' | 'error' | 'warning';
  onClose: () => void;
}

export default function AlertModal({
  title,
  message,
  type = 'error',
  onClose,
}: AlertModalProps) {
  // Determine color theme based on type
  const theme = {
    error: {
      bg: 'bg-rose-50 dark:bg-rose-950/20',
      border: 'border-rose-100 dark:border-rose-950/30',
      iconColor: 'text-rose-600 dark:text-rose-400',
      buttonBg: 'bg-rose-600 hover:bg-rose-700',
      Icon: AlertCircle,
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-100 dark:border-amber-950/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      buttonBg: 'bg-amber-600 hover:bg-amber-700',
      Icon: AlertTriangle,
    },
    info: {
      bg: 'bg-tj-primary-light',
      border: 'border-tj-primary-border',
      iconColor: 'text-tj-primary',
      buttonBg: 'bg-tj-primary hover:bg-tj-primary-hover',
      Icon: Info,
    },
  }[type];

  const IconComponent = theme.Icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      {/* Backdrop blur overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Modal card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: 'spring', duration: 0.35 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-tj-bg-card rounded-lg border border-tj-border-main shadow-2xl max-w-sm w-full p-6 space-y-4 overflow-hidden z-10 pointer-events-auto"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close alert"
          className="absolute top-4 right-4 p-1.5 hover:bg-tj-bg-recessed text-tj-text-muted rounded-full cursor-pointer transition-colors touch-manipulation"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`p-2.5 rounded shrink-0 ${theme.bg} ${theme.border} border`}
          >
            <IconComponent className={`w-5 h-5 ${theme.iconColor}`} />
          </div>
          <div className="space-y-1.5 min-w-0 flex-1">
            <h3 className="text-sm font-bold text-tj-text-main leading-tight font-sans">
              {title}
            </h3>
            <p className="text-xs text-tj-text-muted leading-relaxed break-words font-medium">
              {message}
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={`w-full py-2.5 px-4 rounded text-tj-bg-main text-xs font-bold transition-all shadow-sm cursor-pointer select-none touch-manipulation active:scale-[0.98] ${theme.buttonBg}`}
          >
            Acknowledge
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
