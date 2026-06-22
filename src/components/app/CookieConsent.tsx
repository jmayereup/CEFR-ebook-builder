import { Cookie, Settings, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [showPreferences, setShowPreferences] = useState<boolean>(false);

  // Consent states
  const [consent, setConsent] = useState({
    essential: true, // Always true
    analytics: true,
    ads: true,
  });

  useEffect(() => {
    const consentRegistered = localStorage.getItem('cefr_cookie_consent');
    if (!consentRegistered) {
      // Show banner after a short delay for smooth loading
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const preference = {
      essential: true,
      analytics: true,
      ads: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('cefr_cookie_consent', JSON.stringify(preference));
    setShowBanner(false);
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated'));
  };

  const handleDeclineAll = () => {
    const preference = {
      essential: true,
      analytics: false,
      ads: false,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('cefr_cookie_consent', JSON.stringify(preference));
    setShowBanner(false);
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated'));
  };

  const handleSavePreferences = () => {
    const preference = { ...consent, timestamp: new Date().toISOString() };
    localStorage.setItem('cefr_cookie_consent', JSON.stringify(preference));
    setShowBanner(false);
    window.dispatchEvent(new CustomEvent('cookieConsentUpdated'));
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:max-w-md z-50 p-6 bg-tj-bg-card/95 backdrop-blur-md border border-tj-border-main rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-tj-text-main flex flex-col gap-4 select-text"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-tj-primary/10 text-tj-primary rounded-xl">
                <Cookie className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold tracking-tight">
                Cookie Consent
              </h4>
            </div>
            <button
              type="button"
              onClick={handleDeclineAll}
              className="p-1 text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-800 rounded-full cursor-pointer transition-colors"
              title="Decline non-essential"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          {!showPreferences ? (
            <>
              <p className="text-xs text-tj-text-muted leading-relaxed">
                We use cookies to personalize your language learning journey,
                remember your preferences, analyze platform usage, and serve
                educational ads. By clicking "Accept All", you consent to our
                use of cookies. Read our{' '}
                <a
                  href="/privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tj-primary font-bold hover:underline"
                >
                  Privacy Policy
                </a>{' '}
                to learn more.
              </p>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="flex-1 py-2 px-4 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-bold text-xs rounded-xl cursor-pointer transition-colors select-none text-center"
                >
                  Accept All
                </button>
                <button
                  type="button"
                  onClick={handleDeclineAll}
                  className="py-2 px-4 bg-transparent border border-tj-border-main hover:bg-slate-50 dark:hover:bg-slate-800 text-tj-text-main font-bold text-xs rounded-xl cursor-pointer transition-colors select-none text-center"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreferences(true)}
                  className="p-2 bg-transparent border border-tj-border-main hover:bg-slate-50 dark:hover:bg-slate-800 text-tj-text-muted rounded-xl cursor-pointer transition-colors"
                  title="Customize preferences"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-tj-text-muted leading-relaxed">
                Customize your cookie settings. Essential cookies cannot be
                disabled.
              </p>

              <div className="flex flex-col gap-2.5 my-1.5">
                {/* Essential */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/50 dark:border-slate-800/50">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold">
                      Essential Cookies
                    </span>
                    <span className="text-[9px] text-tj-text-muted">
                      Required for secure sign-in and billing functionality.
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-tj-primary px-2 py-0.5 bg-tj-primary/10 rounded-md">
                    Always Active
                  </span>
                </div>

                {/* Analytics */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/50 dark:border-slate-800/50">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold">
                      Analytics & Performance
                    </span>
                    <span className="text-[9px] text-tj-text-muted">
                      Helps us monitor reading progression and lookups.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={consent.analytics}
                    onChange={(e) =>
                      setConsent({ ...consent, analytics: e.target.checked })
                    }
                    className="w-4 h-4 text-tj-primary focus:ring-tj-primary border-slate-300 rounded cursor-pointer"
                  />
                </div>

                {/* Ads */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100/50 dark:border-slate-800/50">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold">
                      Personalized Ads
                    </span>
                    <span className="text-[9px] text-tj-text-muted">
                      Used to deliver context-appropriate language ads.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={consent.ads}
                    onChange={(e) =>
                      setConsent({ ...consent, ads: e.target.checked })
                    }
                    className="w-4 h-4 text-tj-primary focus:ring-tj-primary border-slate-300 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="flex-1 py-2 px-4 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-bold text-xs rounded-xl cursor-pointer transition-colors select-none text-center"
                >
                  Save Settings
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreferences(false)}
                  className="py-2 px-4 bg-transparent border border-tj-border-main hover:bg-slate-50 dark:hover:bg-slate-800 text-tj-text-main font-bold text-xs rounded-xl cursor-pointer transition-colors select-none text-center"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
