import {
  AlertTriangle,
  ChevronDown,
  Cpu,
  ExternalLink,
  Globe,
  Info,
  Key,
  Lock,
  Settings,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { FRONTIER_LATEST_MODELS } from '../../constants/models';
import {
  calculateBaselineStoryCost,
  fetchOpenRouterModels,
  type OpenRouterModelInfo,
} from '../../services/modelPricingService';
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
    defaultStoryModel,
    setDefaultStoryModel,
  } = useUIStore();
  const { currentUser } = useAuthStore();
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [keyTestResult, setKeyTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Default Story Model selection state
  const isPreset = FRONTIER_LATEST_MODELS.some(
    (m) => m.id === defaultStoryModel,
  );
  const [selectedModelOption, setSelectedModelOption] = useState<string>(
    isPreset ? defaultStoryModel : 'custom',
  );
  const [customModelIdInput, setCustomModelIdInput] = useState<string>(
    isPreset ? '' : defaultStoryModel,
  );
  const [pricingMap, setPricingMap] = useState<
    Map<string, OpenRouterModelInfo>
  >(new Map());

  useEffect(() => {
    fetchOpenRouterModels().then((map) => setPricingMap(map));
  }, []);

  const activeModelId =
    selectedModelOption === 'custom'
      ? customModelIdInput.trim()
      : selectedModelOption;

  const currentPricing = activeModelId ? pricingMap.get(activeModelId) : null;
  const baselineEst = currentPricing
    ? calculateBaselineStoryCost(
        10,
        currentPricing.promptPrice1M,
        currentPricing.completionPrice1M,
      )
    : null;

  if (!isOpen) return null;

  const testApiKey = async (testKey: string) => {
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
          model: 'deepseek/deepseek-chat',
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
            <h3 className="text-base font-bold text-tj-text-main">Settings</h3>
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
              <strong>CEFR Stories</strong> provides free story creation credits
              for a limited time while our shared library catalog is being
              built! If you wish to create additional stories or bypass shared
              generation limits, you can connect your own{' '}
              <strong>OpenRouter API Key</strong>.
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
                  <option value="" disabled>
                    Select language...
                  </option>
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
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-tj-text-muted">
                <Key className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder={
                  customOpenRouterKey
                    ? '••••••••••••••••••••••••••••'
                    : 'Paste your OpenRouter API Key directly (sk-or-...)'
                }
                defaultValue={customOpenRouterKey}
                id="custom-openrouter-key-input"
                className="w-full pl-10 pr-4 py-3 bg-transparent border-t-0 border-l-0 border-r-0 border-b border-tj-border-main hover:border-b-tj-text-muted text-tj-text-main text-xs font-mono placeholder:font-sans focus:border-b-tj-primary focus:ring-0 focus:outline-none transition-colors rounded-none"
              />
            </div>
            <p className="text-[10px] text-tj-text-muted flex items-center gap-1">
              💡 Need to generate more stories?{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-tj-primary hover:underline inline-flex items-center gap-0.5 font-semibold"
              >
                Purchase an API key at openrouter.ai/keys{' '}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </p>
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

          {/* BYOK Default Story Generation Model Setting */}
          <div className="space-y-3 pt-3 border-t border-tj-border-main">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-tj-text-muted font-bold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-tj-primary" />
                Default Story Generation Model (BYOK)
              </label>
              {customOpenRouterKey && currentPricing && (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                  ${currentPricing.promptPrice1M.toFixed(2)} in / $
                  {currentPricing.completionPrice1M.toFixed(2)} out (1M)
                </span>
              )}
            </div>

            {!customOpenRouterKey ? (
              <div className="p-3 bg-tj-bg-recessed border border-tj-border-main rounded-lg text-xs text-tj-text-muted flex items-center gap-2">
                <Lock className="w-4 h-4 text-tj-primary shrink-0" />
                <span>
                  Connect a custom OpenRouter API Key above to configure a
                  custom default story generation model for your account.
                </span>
              </div>
            ) : (
              <>
                <div className="relative">
                  <select
                    value={selectedModelOption}
                    onChange={(e) => setSelectedModelOption(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 bg-transparent border-t-0 border-l-0 border-r-0 border-b border-tj-border-main hover:border-b-tj-text-muted text-tj-text-main text-xs font-semibold focus:border-b-tj-primary focus:ring-0 focus:outline-none transition-colors cursor-pointer appearance-none rounded-none"
                  >
                    {FRONTIER_LATEST_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                    <option value="custom">
                      ⚙️ Enter Custom OpenRouter Model ID...
                    </option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-tj-text-muted pointer-events-none" />
                </div>

                {selectedModelOption === 'custom' && (
                  <div className="space-y-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
                      value={customModelIdInput}
                      onChange={(e) => setCustomModelIdInput(e.target.value)}
                      className="w-full px-3 py-2 bg-transparent border-t-0 border-l-0 border-r-0 border-b border-tj-border-main hover:border-b-tj-text-muted text-tj-text-main text-xs font-mono focus:border-b-tj-primary focus:ring-0 focus:outline-none transition-colors rounded-none"
                    />
                    <p className="text-[10px] text-tj-text-muted">
                      Specify any valid OpenRouter model ID slug.
                    </p>
                  </div>
                )}

                {/* JSON Support & Credit Loss Warning */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-300 text-[11px] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>JSON Format & Credit Loss Liability Notice</span>
                  </div>
                  <p className="opacity-90 leading-normal text-[10px]">
                    CEFR Stories uses structured JSON prompts for story
                    creation, chapter outlines, and vocabulary glossaries.
                    Custom or user-selected models must reliably adhere to JSON
                    output formatting. CEFR Stories is not responsible for
                    OpenRouter API credit consumption or financial loss incurred
                    from malformed, unparseable, or rejected model responses.
                  </p>
                </div>

                {/* Baseline Cost Reference */}
                {baselineEst && (
                  <div className="p-3 bg-tj-bg-recessed rounded-lg border border-tj-border-main text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-tj-text-main">
                      <Info className="w-3.5 h-3.5 text-tj-primary shrink-0" />
                      <span>Estimated OpenRouter Usage Cost</span>
                    </div>
                    <p className="text-[10px] text-tj-text-muted leading-normal">
                      A standard 10-chapter story (~25,000 total tokens) using{' '}
                      <strong>{activeModelId}</strong> will cost approximately{' '}
                      <strong className="text-tj-text-main">
                        $
                        {baselineEst.totalEstimatedCost < 0.01
                          ? '<$0.01'
                          : baselineEst.totalEstimatedCost.toFixed(3)}{' '}
                        USD
                      </strong>{' '}
                      directly on your OpenRouter account (~$
                      {(baselineEst.totalEstimatedCost / 10).toFixed(4)}
                      /chapter).
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

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
              {customOpenRouterKey && (
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
                  className="px-3.5 py-2 text-xs text-tj-error hover:text-tj-error/80 bg-tj-error-light/10 hover:bg-tj-error-light/25 rounded border border-tj-error-light/35 transition-colors font-bold cursor-pointer"
                >
                  Remove Key
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const openrouterVal =
                    (
                      document.getElementById(
                        'custom-openrouter-key-input',
                      ) as HTMLInputElement
                    )?.value || '';
                  handleSaveCustomOpenRouterKey(openrouterVal);
                  if (activeModelId) {
                    setDefaultStoryModel(activeModelId);
                  }
                  onClose();
                }}
                className="px-5 py-2.5 text-xs text-tj-bg-main bg-tj-primary hover:bg-tj-primary-hover font-bold rounded cursor-pointer transition-all shadow-none"
              >
                Save & Close
              </button>
            </div>
          </div>

          {/* Legal & Support Links */}
          <div className="pt-3 mt-2 border-t border-tj-border-main flex flex-wrap items-center justify-between text-xs text-tj-text-muted gap-2">
            <span>CEFR Graded Short Story Builder</span>
            <div className="flex items-center gap-3 font-medium text-xs">
              <button
                type="button"
                onClick={() => {
                  if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem('cefr_hide_instruction_box');
                    window.location.reload();
                  }
                }}
                className="hover:text-tj-primary transition-colors cursor-pointer"
                title="Reset hidden onboarding instruction banner"
              >
                Reset Guide Banner
              </button>
              <span className="text-tj-border-main">•</span>
              <a
                href="/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-tj-primary transition-colors"
              >
                Privacy
              </a>
              <span className="text-tj-border-main">•</span>
              <a
                href="/terms.html"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-tj-primary transition-colors"
              >
                Terms
              </a>
              <span className="text-tj-border-main">•</span>
              <a
                href="mailto:admin@teacherjake.com"
                className="hover:text-tj-primary transition-colors"
              >
                Support
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
