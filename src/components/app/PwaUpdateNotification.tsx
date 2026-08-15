import { useRegisterSW } from 'virtual:pwa-register/react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

export default function PwaUpdateNotification() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [show, setShow] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    if (needRefresh) {
      setShow(true);
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    let reloaded = false;
    const doReload = () => {
      if (!reloaded) {
        reloaded = true;
        window.location.reload();
      }
    };

    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', doReload, {
          once: true,
        });
      }

      await updateServiceWorker(true);

      // Fallback reload in case controllerchange didn't trigger
      setTimeout(doReload, 1500);
    } catch (error) {
      console.error('Failed to update service worker:', error);
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setShow(false);
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-4 right-4 left-4 md:left-auto md:max-w-sm z-50 p-5 bg-tj-bg-card/95 backdrop-blur-md border border-tj-border-main rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-tj-text-main flex flex-col gap-3.5 select-text"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-tj-primary/10 text-tj-primary rounded-xl">
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 text-tj-primary animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-tj-primary animate-pulse" />
                )}
              </div>
              <h4 className="text-sm font-bold tracking-tight">
                {isUpdating ? 'Updating Application...' : 'Update Available'}
              </h4>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isUpdating}
              className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col gap-3">
            <p className="text-xs text-tj-text-muted leading-relaxed">
              {isUpdating
                ? 'Applying latest updates and refreshing...'
                : 'A new version of CEFR Stories is ready. Update now to get the latest features and improvements.'}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 py-2 px-4 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-bold text-xs rounded-xl cursor-pointer transition-colors select-none text-center flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Update Now</span>
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={isUpdating}
                className="py-2 px-4 bg-transparent border border-tj-border-main hover:bg-slate-50 dark:hover:bg-slate-800 text-tj-text-main font-bold text-xs rounded-xl cursor-pointer transition-colors select-none text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Later
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
