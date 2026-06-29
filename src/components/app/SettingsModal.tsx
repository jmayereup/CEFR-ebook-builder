import {
  ChevronDown,
  ExternalLink,
  Globe,
  Key,
  Settings,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { SUPPORTED_LANGUAGES } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  handleSaveCustomOpenRouterKey: (key: string) => void;
  isPaid: boolean;
}

export default function SettingsModal({
  isOpen,
  onClose,
  handleSaveCustomOpenRouterKey,
  isPaid,
}: SettingsModalProps) {
  const {
    customOpenRouterKey,
    translationTargetLanguage,
    setTranslationTargetLanguage,
  } = useUIStore();
  const { currentUser } = useAuthStore();
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [keyTestResult, setKeyTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const testApiKey = async (testKey: string) => {
    if (!isPaid) return;
    if (!testKey.trim()) {
      setKeyTestResult({
        success: false,
        message: 'Please enter an API Key first.',
      });
      return;
    }
    setIsTestingKey(true);
    setKeyTestResult(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-OpenRouter-API-Key': testKey.trim(),
      };

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          word: 'test',
          language: 'English',
          context: 'Testing key connection',
          model: 'deepseek/deepseek-v4-flash',
          userId: currentUser?.uid,
          userEmail: currentUser?.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            'Server rejected key. Make sure it is a valid OpenRouter key.',
        );
      }

      await response.json();
      setKeyTestResult({
        success: true,
        message: `Connection successful! Your custom OpenRouter key is valid & fully functional.`,
      });
    } catch (err: any) {
      console.error(err);
      setKeyTestResult({
        success: false,
        message: err.message || 'Key verification failed.',
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg bg-tj-bg-card rounded-lg border border-tj-border-main p-6 shadow-2xl relative space-y-6 overflow-hidden text-tj-text-main"
      >
        <div className="flex items-center justify-between border-b border-tj-border-main pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-tj-primary" />
            <h3 className="text-base font-bold text-tj-text-main">
              Settings & Subscriptions
            </h3>
          </div>
          <button
            onClick={() => {
              onClose();
              setKeyTestResult(null);
            }}
            className="p-1 hover:bg-tj-bg-recessed rounded-full text-tj-text-muted hover:text-tj-text-main cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-tj-bg-recessed p-4 rounded border border-tj-border-main text-xs text-tj-text-muted leading-normal space-y-3">
            <p>
              <strong>CEFR Stories</strong> operates on a decentralized
              contributor tier structure: Approved members get direct access,
              while premium creators can connect their own{' '}
              <strong>OpenRouter API Key</strong> to bypass all shared
              generation caps!
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-450 font-medium leading-normal bg-amber-500/5 dark:bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
              ⚠️ <strong>Security Disclosure:</strong> Your key is stored in your
              browser's local storage and is never saved, persisted, or logged
              on our servers. However, because local storage can be accessed by
              scripts, a malicious browser extension could potentially steal it.
              To minimize risk, we strongly recommend using a{' '}
              <strong>prepaid OpenRouter key</strong> with strict usage limits
              configured in your OpenRouter console.
            </p>
          </div>

          {/* Lookup Target Language */}
          <div className="space-y-2">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-tj-text-muted font-bold">
              Translation Target Language
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-tj-text-muted pointer-events-none">
                <Globe className="w-4 h-4" />
              </span>
              <select
                value={translationTargetLanguage || ''}
                onChange={(e) => {
                  const newLang = e.target.value;
                  setTranslationTargetLanguage(newLang);
                  localStorage.setItem('translation_target_language', newLang);
                }}
                className="w-full pl-10 pr-10 py-3 bg-transparent border-t-0 border-l-0 border-r-0 border-b border-tj-border-main hover:border-b-tj-text-muted text-tj-text-main text-xs font-semibold focus:border-b-tj-primary focus:ring-0 focus:outline-none transition-colors cursor-pointer appearance-none rounded-none"
              >
                {translationTargetLanguage === null && (
                  <option value="" disabled>Select language...</option>
                )}
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.name}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-tj-text-muted pointer-events-none" />
            </div>
            <p className="text-[10px] text-tj-text-muted">
              Select the language you want looked up words translated into.
            </p>
          </div>

          {/* OpenRouter Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-tj-text-muted font-bold">
                My Custom OpenRouter API Key
              </label>
              {isPaid && (
                <button
                  type="button"
                  onClick={() => {
                    const val =
                      (
                        document.getElementById(
                          'custom-openrouter-key-input',
                        ) as HTMLInputElement
                      )?.value || '';
                    testApiKey(val);
                  }}
                  disabled={isTestingKey}
                  className="text-[10px] font-bold text-tj-primary hover:underline cursor-pointer disabled:opacity-50"
                >
                  Test Key
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-tj-text-muted">
                <Key className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder={
                  !isPaid
                    ? '🔒 Custom API Keys require Paid Tier'
                    : customOpenRouterKey
                      ? '••••••••••••••••••••••••••••'
                      : 'Paste your OpenRouter API Key directly (sk-or-...)'
                }
                defaultValue={isPaid ? customOpenRouterKey : ''}
                id="custom-openrouter-key-input"
                disabled={!isPaid}
                className="w-full pl-10 pr-4 py-3 bg-transparent border-t-0 border-l-0 border-r-0 border-b border-tj-border-main hover:border-b-tj-text-muted text-tj-text-main text-xs font-mono placeholder:font-sans focus:border-b-tj-primary focus:ring-0 focus:outline-none transition-colors disabled:bg-tj-bg-recessed/40 disabled:text-tj-text-muted/50 disabled:cursor-not-allowed rounded-none"
              />
            </div>
            {isPaid ? (
              <p className="text-[10px] text-tj-text-muted flex items-center gap-1">
                💡 Don't have an OpenRouter API key?{' '}
                <a
                  href="https://openrouter.ai"
                  target="_blank"
                  rel="noreferrer"
                  className="text-tj-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Get one at openrouter.ai{' '}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </p>
            ) : (
              <p className="text-[10px] text-tj-text-muted/80 font-medium">
                🔒 Locked: Access key inputs are reserved for Paid Tier
                accounts.
              </p>
            )}
          </div>

          {/* Connection Test Outcome */}
          {keyTestResult && (
            <div
              className={`p-3 rounded text-xs border ${
                keyTestResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/30'
                  : 'bg-rose-50 dark:bg-rose-955/20 text-rose-850 dark:text-rose-300 border-rose-100 dark:border-rose-955/30'
              }`}
            >
              <p className="font-semibold leading-tight">
                {keyTestResult.success
                  ? 'Validated Successfully'
                  : 'Verification Denied'}
              </p>
              <p className="text-[10px] mt-1 opacity-90 leading-normal">
                {keyTestResult.message}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="text-xs text-tj-text-muted">
              {isTestingKey && (
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 border-2 border-tj-primary/20 border-t-tj-primary rounded-full animate-spin shrink-0"></div>
                  <span>Verifying...</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isPaid && customOpenRouterKey && (
                <button
                  type="button"
                  onClick={() => {
                    const openrouterInput = document.getElementById(
                      'custom-openrouter-key-input',
                    ) as HTMLInputElement;
                    if (openrouterInput) openrouterInput.value = '';
                    handleSaveCustomOpenRouterKey('');
                    setKeyTestResult({
                      success: true,
                      message:
                        'Custom API key removed. Restoring default authorization rules.',
                    });
                  }}
                  className="px-3.5 py-2 px-3 text-xs text-tj-error hover:text-tj-error/80 bg-tj-error-light/10 hover:bg-tj-error-light/25 rounded border border-tj-error-light/35 transition-colors font-bold cursor-pointer"
                >
                  Remove Key
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (isPaid) {
                    const openrouterVal =
                      (
                        document.getElementById(
                          'custom-openrouter-key-input',
                        ) as HTMLInputElement
                      )?.value || '';
                    handleSaveCustomOpenRouterKey(openrouterVal);
                  }
                  onClose();
                }}
                className="px-5 py-2.5 text-xs text-tj-bg-main bg-tj-primary hover:bg-tj-primary-hover font-bold rounded cursor-pointer transition-all shadow-none"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
