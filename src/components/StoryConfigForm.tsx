import {
  BookOpen,
  BookText,
  Brain,
  Coins,
  Cpu,
  Edit3,
  FileSignature,
  Globe,
  HelpCircle,
  Info,
  Layers,
  Lock,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { FREE_MODEL_IDS, GEMINI_MODELS } from '../constants/models';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { CEFR_LEVELS, GENRES, SUPPORTED_LANGUAGES } from '../types';
import { checkGenerationPermission } from '../utils/permissionUtils';
import {
  calculateEstimatedUsage,
  getRecommendedWordCount,
} from '../utils/storyEstimation';
import ModelSelectionModal from './creator/ModelSelectionModal';
import StoryOutlineReview from './creator/StoryOutlineReview';

export type { GeminiModelOption } from '../constants/models';
export { GEMINI_MODELS } from '../constants/models';

const getCefrBadgeStyle = (level: string) => {
  const lvl = level.toUpperCase();
  if (lvl.startsWith('A') || lvl.includes('PRE')) {
    return 'bg-[#d3e8d5] text-[#1b1c19] border border-[#b8ccba]/40';
  }
  if (lvl.startsWith('B')) {
    return 'bg-[#d2e3f0] text-[#1b1c19] border border-[#a2b8cc]/40';
  }
  return 'bg-[#ffdbcf] text-[#1b1c19] border border-[#f8b7a2]/40';
};

const DEFAULT_MODEL_FOR_LANGUAGE: Record<string, string> = {
  en: 'openrouter/free',
  es: 'openrouter/free',
  fr: 'openrouter/free',
  de: 'openrouter/free',
  it: 'openrouter/free',
  pt: 'openrouter/free',
  ja: 'openrouter/free',
  zh: 'openrouter/free',
  th: 'openrouter/free',
  ko: 'openrouter/free',
};

const WRITING_TYPES = [
  {
    id: 'narrative',
    label: 'Narrative',
    emoji: '📖',
    desc: 'Storytelling, plot-driven, fictional or personal account.',
  },
  {
    id: 'expository',
    label: 'Expository',
    emoji: '💡',
    desc: 'Explaining, informing, or describing a specific topic with facts.',
  },
  {
    id: 'analytical',
    label: 'Analytical',
    emoji: '🔍',
    desc: 'Breaking down concepts, examining relationships or arguments.',
  },
  {
    id: 'descriptive',
    label: 'Descriptive',
    emoji: '🎨',
    desc: 'Focusing on vivid sensory details, imagery, and mood.',
  },
];

interface StoryConfigFormProps {
  onSubmit: (config: {
    language: string;
    cefrLevel: string;
    genre: string;
    totalChapters: number;
    promptNotes: string;
    chapterLength: number;
    storyTitle?: string;
    outline?: string;
    description?: string;
    model?: string;
    thinkingLevel?: string;
    thinkingBudget?: number;
    temperature?: number;
    translationLanguage?: string;
    isPublic?: boolean;
    skipChapterGeneration?: boolean;
  }) => void;
  isLoading: boolean;
  isAdmin?: boolean;
  isPaid?: boolean;
  freeModelCount?: number;
  monthlyCreditsUsed?: number;
  onLogin?: () => void;
}

export default function StoryConfigForm({
  onSubmit,
  isLoading,
  isAdmin = false,
  isPaid = false,
  freeModelCount = 0,
  monthlyCreditsUsed = 0,
  onLogin,
}: StoryConfigFormProps) {
  const customOpenRouterKey = useUIStore((state) => state.customOpenRouterKey);
  const translationTargetLanguage = useUIStore(
    (state) => state.translationTargetLanguage,
  );
  const setTranslationTargetLanguage = useUIStore(
    (state) => state.setTranslationTargetLanguage,
  );
  const currentUser = useAuthStore((state) => state.currentUser);
  // Config state
  const [language, setLanguage] = useState('es');
  const [cefrLevel, setCefrLevel] = useState('B1');
  const [genre, setGenre] = useState('adventure');
  const [totalChapters, setTotalChapters] = useState(5);
  const [chapterLength, setChapterLength] = useState(350);
  const [promptNotes, setPromptNotes] = useState('');
  const [selectedModel, setSelectedModel] = useState('openrouter/free');
  const [thinkingOption, setThinkingOption] = useState('medium');
  const [temperature, setTemperature] = useState(0.8);
  const [isPublic, setIsPublic] = useState(true);
  const [showDefaultModelInfo, setShowDefaultModelInfo] = useState(false);
  const [_modalTab, _setModalTab] = useState<'free' | 'paid'>('free');
  const [writingType, setWritingType] = useState('narrative');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPrivateTooltip, setShowPrivateTooltip] = useState(false);
  const [isLangCollapsed, setIsLangCollapsed] = useState(true);
  const [sortedLanguages, _setSortedLanguages] = useState(() => {
    try {
      const stored = localStorage.getItem('prior_used_languages');
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        const languageMap = new Map(
          SUPPORTED_LANGUAGES.map((l) => [l.code, l]),
        );
        const sorted: typeof SUPPORTED_LANGUAGES = [];
        parsed.forEach((code) => {
          const lang = languageMap.get(code);
          if (lang) {
            sorted.push(lang);
            languageMap.delete(code);
          }
        });
        languageMap.forEach((lang) => {
          sorted.push(lang);
        });
        return sorted;
      }
    } catch (_e) {}
    return SUPPORTED_LANGUAGES;
  });

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode);
    try {
      const stored = localStorage.getItem('prior_used_languages');
      let parsed: string[] = stored ? JSON.parse(stored) : [];
      parsed = [langCode, ...parsed.filter((code) => code !== langCode)];
      localStorage.setItem('prior_used_languages', JSON.stringify(parsed));
    } catch (e) {
      console.error(e);
    }
    const newModel = DEFAULT_MODEL_FOR_LANGUAGE[langCode] || 'openrouter/free';
    setSelectedModel(newModel);

    // Auto-update thinkingOption for the new model
    const modelObj = GEMINI_MODELS.find((m) => m.id === newModel);
    if (modelObj?.supportsThinkingLevel || modelObj?.supportsThinkingBudget) {
      setThinkingOption('medium');
    } else {
      setThinkingOption('disabled');
    }
  };

  // Lower default temperature to 0.5 for nonfiction and historical fiction genres
  useEffect(() => {
    if (genre === 'nonfiction' || genre === 'historical') {
      setTemperature(0.5);
    } else {
      setTemperature(0.8);
    }
  }, [genre]);

  // Outline step states
  const [isDraftingOutline, setIsDraftingOutline] = useState(false);
  const [showOutlineReview, setShowOutlineReview] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftOutline, setDraftOutline] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftError, setDraftError] = useState('');
  const [isScratchMode, setIsScratchMode] = useState(false);

  const handleLevelChange = (lvl: string) => {
    setCefrLevel(lvl);
    setChapterLength(getRecommendedWordCount(lvl));
  };

  const handleRequestOutline = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDraftingOutline(true);
    setDraftError('');

    const isFree =
      FREE_MODEL_IDS.has(selectedModel) || selectedModel.endsWith(':free');
    const est = calculateEstimatedUsage(1, chapterLength, selectedModel);
    const estimatedCreditsCost = isFree
      ? 0
      : Math.max(1, Math.ceil(est.totalCost * 100));

    const denied = checkGenerationPermission(
      selectedModel,
      isPaid,
      isAdmin,
      customOpenRouterKey,
      freeModelCount,
      monthlyCreditsUsed,
      estimatedCreditsCost,
      1,
    );

    if (denied) {
      setDraftError(`${denied.title}: ${denied.message}`);
      setIsDraftingOutline(false);
      return;
    }

    if (!isPaid && !isAdmin) {
      const isLongStory = totalChapters > 10;
      if (isLongStory) {
        setDraftError(
          `Generating stories longer than 10 chapters is reserved for Paid Tier accounts. Please upgrade to the Paid Tier to unlock stories up to 30 chapters.`,
        );
        setIsDraftingOutline(false);
        return;
      }
    }

    const selectedLanguageName =
      SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name || 'Spanish';

    let finalThinkingLevel: string | undefined;
    let finalThinkingBudget: number | undefined;

    const currentModelObj = GEMINI_MODELS.find((m) => m.id === selectedModel);
    if (currentModelObj?.supportsThinkingLevel) {
      if (thinkingOption !== 'disabled') {
        finalThinkingLevel = thinkingOption;
      }
    } else if (currentModelObj?.supportsThinkingBudget) {
      if (thinkingOption === 'disabled') {
        finalThinkingBudget = 0;
      } else if (thinkingOption === 'low') {
        finalThinkingBudget = 1024;
      } else if (thinkingOption === 'medium') {
        finalThinkingBudget = 2048;
      } else if (thinkingOption === 'high') {
        finalThinkingBudget = 4096;
      } else if (thinkingOption === 'dynamic') {
        finalThinkingBudget = -1;
      }
    }

    const supportsTemp = currentModelObj?.supportsTemperature ?? true;
    const isThinkingActive = thinkingOption !== 'disabled';
    const finalTemperature =
      supportsTemp && !isThinkingActive ? temperature : undefined;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (customOpenRouterKey) {
        headers['X-OpenRouter-API-Key'] = customOpenRouterKey;
      }

      const response = await fetch('/api/stories/generate-outline', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          language: selectedLanguageName,
          cefrLevel,
          genre,
          totalChapters,
          promptNotes: `[Writing Type: ${writingType}]${promptNotes ? `\n\n${promptNotes}` : ''}`,
          chapterLength,
          model: selectedModel,
          thinkingLevel: finalThinkingLevel,
          thinkingBudget: finalThinkingBudget,
          temperature: finalTemperature,
          translationLanguage: translationTargetLanguage,
          userId: currentUser?.uid,
          userEmail: currentUser?.email,
        }),
      });

      if (!response.ok) {
        let errorMsg = 'Failed to generate story outline. Please retry.';
        try {
          const errorData = await response.json();
          if (errorData.error) errorMsg = errorData.error;
        } catch (_e) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setDraftTitle(data.storyTitle || '');
      setDraftOutline(data.outline || '');
      setDraftDescription(data.description || '');
      setShowOutlineReview(true);
    } catch (err: any) {
      console.error(err);
      setDraftError(
        err.message ||
          'An unexpected error occurred generating the outline draft.',
      );
    } finally {
      setIsDraftingOutline(false);
    }
  };

  const handleApproveAndGenerate = () => {
    const selectedLanguageName =
      SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name || 'Spanish';

    let finalThinkingLevel: string | undefined;
    let finalThinkingBudget: number | undefined;

    const currentModelObj = GEMINI_MODELS.find((m) => m.id === selectedModel);
    if (currentModelObj?.supportsThinkingLevel) {
      if (thinkingOption !== 'disabled') {
        finalThinkingLevel = thinkingOption;
      }
    } else if (currentModelObj?.supportsThinkingBudget) {
      if (thinkingOption === 'disabled') {
        finalThinkingBudget = 0;
      } else if (thinkingOption === 'low') {
        finalThinkingBudget = 1024;
      } else if (thinkingOption === 'medium') {
        finalThinkingBudget = 2048;
      } else if (thinkingOption === 'high') {
        finalThinkingBudget = 4096;
      } else if (thinkingOption === 'dynamic') {
        finalThinkingBudget = -1;
      }
    }

    const supportsTemp = currentModelObj?.supportsTemperature ?? true;
    const isThinkingActive = thinkingOption !== 'disabled';
    const finalTemperature =
      supportsTemp && !isThinkingActive ? temperature : undefined;

    onSubmit({
      language: selectedLanguageName,
      cefrLevel,
      genre,
      totalChapters,
      promptNotes: `[Writing Type: ${writingType}]${promptNotes ? `\n\n${promptNotes}` : ''}`,
      chapterLength,
      storyTitle: draftTitle,
      outline: draftOutline,
      description: draftDescription,
      model: selectedModel,
      thinkingLevel: finalThinkingLevel,
      thinkingBudget: finalThinkingBudget,
      temperature: finalTemperature,
      translationLanguage: translationTargetLanguage,
      isPublic,
      skipChapterGeneration: isScratchMode,
    });
  };

  const selectedLevelObj = CEFR_LEVELS.find((l) => l.code === cefrLevel);
  const est = calculateEstimatedUsage(
    totalChapters,
    chapterLength,
    selectedModel,
  );
  const maxChapters = isPaid || isAdmin ? 30 : 10;

  return (
    <>
      <AnimatePresence mode="wait">
        {!showOutlineReview ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-tj-bg-card p-6 rounded-2xl shadow-xl border border-tj-border-main"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover rounded-xl">
                <BookText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 font-sans tracking-tight">
                  Create a New Story
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Step 1 of 2: Configure narrative parameters
                </p>
              </div>
            </div>

            <form onSubmit={handleRequestOutline} className="space-y-6">
              {/* Language Selection */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <Globe className="w-4 h-4 text-tj-primary" />
                  Target Language
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {sortedLanguages
                    .filter(
                      (lang) =>
                        !isLangCollapsed ||
                        ['en', 'fr', 'es', 'th'].includes(lang.code) ||
                        lang.code === language,
                    )
                    .map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          language === lang.code
                            ? 'border-tj-primary bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover ring-2 ring-tj-primary/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-transparent text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-2xl mb-1">{lang.flag}</span>
                        <span className="text-xs font-semibold">
                          {lang.name}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {lang.nativeName}
                        </span>
                      </button>
                    ))}

                  {isLangCollapsed ? (
                    <button
                      type="button"
                      onClick={() => setIsLangCollapsed(false)}
                      className="col-span-full py-2.5 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-750 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-tj-primary hover:border-tj-primary/50 transition-all cursor-pointer text-center bg-transparent mt-1"
                    >
                      Show More Languages
                    </button>
                  ) : (
                    <div className="col-span-full space-y-3 mt-1">
                      <button
                        type="button"
                        onClick={() => setIsLangCollapsed(true)}
                        className="w-full py-2.5 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-750 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-tj-primary hover:border-tj-primary/50 transition-all cursor-pointer text-center bg-transparent"
                      >
                        Show Less
                      </button>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center font-medium leading-normal">
                        Don't see your language? Email me at{' '}
                        <a
                          href="mailto:admin@teacherjake.com"
                          className="text-tj-primary hover:underline font-semibold"
                        >
                          admin@teacherjake.com
                        </a>{' '}
                        to request support!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* CEFR Level */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-tj-text-main">
                  <BookOpen className="w-4 h-4 text-tj-primary" />
                  CEFR Level (Difficulty)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {CEFR_LEVELS.map((level) => {
                    const isSelected = cefrLevel === level.code;
                    return (
                      <button
                        key={level.code}
                        type="button"
                        onClick={() => handleLevelChange(level.code)}
                        className={`p-3 border rounded-xl text-center transition-all duration-200 flex items-center justify-center cursor-pointer font-mono font-bold text-sm tracking-wide ${
                          isSelected
                            ? `${getCefrBadgeStyle(level.code)} border-tj-primary ring-2 ring-tj-primary/20`
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-tj-bg-card text-slate-700 dark:text-slate-355'
                        }`}
                      >
                        {level.code}
                      </button>
                    );
                  })}
                </div>
                {selectedLevelObj && (
                  <motion.p
                    key={cefrLevel}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs text-tj-text-main ml-1 font-sans bg-tj-bg-recessed p-2.5 rounded border border-tj-border-main"
                  >
                    <strong>{selectedLevelObj.name}:</strong>{' '}
                    {selectedLevelObj.description}
                  </motion.p>
                )}
                {(cefrLevel === 'A1' || cefrLevel === 'Pre-A1') && (
                  <div className="space-y-2 mt-4 animate-fade-in pl-1">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Globe className="w-4 h-4 text-tj-primary" />
                      Bilingual Translation Language
                    </label>
                    <select
                      value={translationTargetLanguage}
                      onChange={(e) => {
                        const newLang = e.target.value;
                        setTranslationTargetLanguage(newLang);
                        localStorage.setItem(
                          'translation_target_language',
                          newLang,
                        );
                      }}
                      className="w-full p-2.5 rounded-xl border border-tj-border-main bg-tj-bg-card text-tj-text-main text-xs font-semibold focus:border-tj-primary focus:outline-none cursor-pointer"
                    >
                      {SUPPORTED_LANGUAGES.filter(
                        (lang) => lang.code !== language,
                      ).map((lang) => (
                        <option key={lang.code} value={lang.name}>
                          {lang.flag} {lang.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-405 dark:text-slate-400 leading-normal">
                      {cefrLevel} stories will be generated in a line-by-line
                      bilingual format. For Pre-A1, this includes a
                      word-by-word/phrase-by-phrase mapping in the translation.
                      This also changes the target translation language for
                      dictionary lookups at all levels.
                    </p>
                  </div>
                )}
              </div>

              {/* Genre / Theme */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <Layers className="w-4 h-4 text-tj-primary" />
                  Genre / Theme
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GENRES.map((g) => {
                    const isSelected = genre === g.id;
                    // Extract emoji if present
                    const emojiMatch = g.label.match(
                      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F9FF}]/u,
                    );
                    const emoji = emojiMatch ? emojiMatch[0] : '';
                    const text = g.label.replace(emoji, '').trim();
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGenre(g.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-tj-primary bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover ring-2 ring-tj-primary/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-transparent text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-2xl mb-1">{emoji}</span>
                        <span className="text-xs font-semibold">{text}</span>
                      </button>
                    );
                  })}
                </div>
                {genre === 'nonfiction' && (
                  <div className="mt-2.5 p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-xs rounded-xl border border-amber-100 dark:border-amber-950/30 flex items-start gap-2 animate-fade-in">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-500 dark:text-amber-400" />
                    <span>
                      <strong>Hallucination Warning:</strong> Non-fiction topics
                      generated by AI may contain factual inaccuracies or
                      historical hallucinations, especially when simplified for
                      language learning.
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chapters Adjustments */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <Layers className="w-4 h-4 text-tj-primary" />
                    Story Length (Chapters)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max={maxChapters}
                      step="1"
                      value={totalChapters}
                      onChange={(e) =>
                        setTotalChapters(parseInt(e.target.value, 10))
                      }
                      className="w-full accent-tj-primary dark:accent-tj-primary"
                    />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg shrink-0">
                      {totalChapters} {totalChapters === 1 ? 'ch' : 'chs'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Select from 1 to {maxChapters} chapters.
                  </p>
                </div>

                {/* Chapter Word Count */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <BookText className="w-4 h-4 text-tj-primary" />
                    Chapter Word Count
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="100"
                      max="500"
                      step="25"
                      value={chapterLength}
                      onChange={(e) =>
                        setChapterLength(parseInt(e.target.value, 10))
                      }
                      className="w-full accent-tj-primary dark:accent-tj-primary"
                    />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg shrink-0">
                      {chapterLength} words
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    A1 & A2 are recommended around 100-250 words.
                  </p>
                </div>
              </div>

              {/* Writing Style / Type */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <FileSignature className="w-4 h-4 text-tj-primary" />
                  Writing Style / Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {WRITING_TYPES.map((wt) => {
                    const isSelected = writingType === wt.id;
                    return (
                      <button
                        key={wt.id}
                        type="button"
                        onClick={() => setWritingType(wt.id)}
                        className={`p-3.5 border rounded-xl text-left transition-all duration-200 flex flex-col items-start gap-1 cursor-pointer bg-tj-bg-card hover:border-tj-primary ${
                          isSelected
                            ? 'border-tj-primary bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover ring-2 ring-tj-primary/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-transparent text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{wt.emoji}</span> {wt.label}
                        </span>
                        <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug mt-0.5 font-sans">
                          {wt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model & Intelligence Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-tj-bg-recessed/50 border border-tj-border-main rounded-2xl animate-fade-in">
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <Cpu className="w-4 h-4 text-tj-primary dark:text-tj-primary-hover" />
                      AI Writing Model
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDefaultModelInfo(true)}
                      className="text-[10px] text-tj-primary hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <Info className="w-3.5 h-3.5" />
                      Model Information
                    </button>
                  </div>
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value);
                      const model = GEMINI_MODELS.find(
                        (m) => m.id === e.target.value,
                      );
                      if (
                        model?.supportsThinkingLevel ||
                        model?.supportsThinkingBudget
                      ) {
                        setThinkingOption('medium');
                      } else {
                        setThinkingOption('disabled');
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-tj-border-main bg-tj-bg-card text-tj-text-main text-sm focus:border-tj-primary focus:outline-none"
                  >
                    {(() => {
                      const isFreeModelLocal = (id: string) =>
                        FREE_MODEL_IDS.has(id) || id.endsWith(':free');
                      const sortedModels = [...GEMINI_MODELS].sort(
                        (a, b) => a.outputCost1M - b.outputCost1M,
                      );
                      const renderOption = (
                        model: (typeof GEMINI_MODELS)[0],
                      ) => {
                        let isModelRestricted = false;
                        let restrictionLabel = '';

                        if (!isAdmin) {
                          if (isPaid) {
                            isModelRestricted = false;
                          } else {
                            if (!isFreeModelLocal(model.id)) {
                              isModelRestricted = true;
                              restrictionLabel = ' 🔒 (Paid Tier Required)';
                            }
                          }
                        }

                        const isFree = isFreeModelLocal(model.id);
                        let costLabel = '';
                        if (isFree) {
                          costLabel = ' (0 credits)';
                        } else {
                          const estForModel = calculateEstimatedUsage(
                            totalChapters,
                            chapterLength,
                            model.id,
                          );
                          const creds = Math.max(
                            1,
                            Math.ceil(estForModel.totalCost * 100),
                          );
                          costLabel = ` (${creds} ${creds === 1 ? 'credit' : 'credits'})`;
                        }

                        return (
                          <option
                            key={model.id}
                            value={model.id}
                            disabled={isModelRestricted}
                          >
                            {model.name}
                            {costLabel}
                            {restrictionLabel}
                          </option>
                        );
                      };

                      const freeModels: typeof GEMINI_MODELS = [];
                      const paidModels: typeof GEMINI_MODELS = [];

                      sortedModels.forEach((model) => {
                        if (isFreeModelLocal(model.id)) {
                          freeModels.push(model);
                        } else {
                          paidModels.push(model);
                        }
                      });

                      freeModels.sort((a, b) => a.name.localeCompare(b.name));
                      paidModels.sort((a, b) => a.name.localeCompare(b.name));

                      return (
                        <>
                          {freeModels.length > 0 && (
                            <optgroup label="Free Tier Models">
                              {freeModels.map(renderOption)}
                            </optgroup>
                          )}
                          {paidModels.length > 0 && (
                            <optgroup label="Paid Tier Models">
                              {paidModels.map(renderOption)}
                            </optgroup>
                          )}
                        </>
                      );
                    })()}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Choose the AI model. Flash is fast and economical, Pro
                    offers deep narrative quality.
                  </p>
                </div>

                <div className="md:col-span-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-xs font-semibold text-tj-primary hover:text-tj-primary-hover transition-colors cursor-pointer select-none"
                  >
                    <Sliders
                      className={`w-3.5 h-3.5 transform transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`}
                    />
                    <span>
                      {showAdvanced
                        ? 'Hide Advanced Options'
                        : 'Show Advanced Options (Thinking & Temperature)'}
                    </span>
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: 8 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="md:col-span-2 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200/50 dark:border-slate-800/80 pt-4"
                    >
                      {/* Reasoning / Thinking Level */}
                      {isAdmin || customOpenRouterKey ? (
                        <div className="col-span-1">
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-355 mb-2">
                            <Brain className="w-4 h-4 text-tj-primary dark:text-tj-primary-hover" />
                            Reasoning / Thinking Level
                          </label>
                          {(() => {
                            const currentModelObj = GEMINI_MODELS.find(
                              (m) => m.id === selectedModel,
                            );
                            const isSimpleThinking =
                              selectedModel.includes('deepseek') ||
                              selectedModel.includes('kimi') ||
                              selectedModel.includes('moonshot');

                            if (isSimpleThinking) {
                              return (
                                <select
                                  value={thinkingOption}
                                  onChange={(e) =>
                                    setThinkingOption(e.target.value)
                                  }
                                  className="w-full p-2.5 rounded-xl border border-tj-border-main bg-tj-bg-card text-tj-text-main text-sm focus:border-tj-primary focus:outline-none"
                                >
                                  <option value="disabled">
                                    Disabled (No Thinking)
                                  </option>
                                  <option value="medium">
                                    Enabled (Thinking Mode)
                                  </option>
                                </select>
                              );
                            } else if (currentModelObj?.supportsThinkingLevel) {
                              return (
                                <select
                                  value={thinkingOption}
                                  onChange={(e) =>
                                    setThinkingOption(e.target.value)
                                  }
                                  className="w-full p-2.5 rounded-xl border border-tj-border-main bg-tj-bg-card text-tj-text-main text-sm focus:border-tj-primary focus:outline-none"
                                >
                                  <option value="disabled">
                                    Disabled (No Thinking)
                                  </option>
                                  <option value="minimal">Minimal Depth</option>
                                  <option value="low">Low Depth</option>
                                  <option value="medium">
                                    Medium Depth (Recommended)
                                  </option>
                                  <option value="high">
                                    High Depth (Nuanced)
                                  </option>
                                </select>
                              );
                            } else if (
                              currentModelObj?.supportsThinkingBudget
                            ) {
                              return (
                                <select
                                  value={thinkingOption}
                                  onChange={(e) =>
                                    setThinkingOption(e.target.value)
                                  }
                                  className="w-full p-2.5 rounded-xl border border-tj-border-main bg-tj-bg-card text-tj-text-main text-sm focus:border-tj-primary focus:outline-none"
                                >
                                  <option value="disabled">
                                    Disabled (No Thinking)
                                  </option>
                                  <option value="low">
                                    Low Budget (1,024 tokens)
                                  </option>
                                  <option value="medium">
                                    Medium Budget (2,048 tokens)
                                  </option>
                                  <option value="high">
                                    High Budget (4,096 tokens)
                                  </option>
                                  <option value="dynamic">
                                    Dynamic Budget (Auto-determined)
                                  </option>
                                </select>
                              );
                            } else {
                              return (
                                <div className="w-full p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-xs flex items-center justify-center h-[38px] select-none">
                                  Thinking is not supported by this model
                                </div>
                              );
                            }
                          })()}
                          <p className="text-[10px] text-slate-400 mt-1">
                            Enables Chain-of-Thought reasoning to improve
                            pedagogical grading.
                          </p>
                        </div>
                      ) : null}

                      {/* Temperature Slider */}
                      {(() => {
                        const currentModelObj = GEMINI_MODELS.find(
                          (m) => m.id === selectedModel,
                        );
                        const supportsTemp =
                          currentModelObj?.supportsTemperature ?? true;
                        const isThinkingActive = thinkingOption !== 'disabled';

                        if (!supportsTemp) return null;

                        const showReasoning = isAdmin || !!customOpenRouterKey;

                        return (
                          <div
                            className={
                              showReasoning ? 'col-span-1' : 'md:col-span-2'
                            }
                          >
                            <label className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                              <span className="flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-tj-primary dark:text-tj-primary-hover" />
                                Model Temperature (Creativity)
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg shrink-0">
                                {isThinkingActive
                                  ? 'Managed by Model'
                                  : temperature.toFixed(1)}
                              </span>
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min="0.0"
                                max="2.0"
                                step="0.1"
                                value={isThinkingActive ? 1.0 : temperature}
                                disabled={isThinkingActive}
                                onChange={(e) =>
                                  setTemperature(parseFloat(e.target.value))
                                }
                                className="w-full accent-tj-primary dark:accent-tj-primary disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {isThinkingActive
                                ? 'Temperature control is disabled because Chain-of-Thought Reasoning is enabled.'
                                : 'Adjust randomness. Lower values (e.g. 0.3 - 0.5) are more focused, higher values (e.g. 0.9 - 1.2) are more creative.'}
                            </p>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Custom Notes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                    <Sparkles className="w-4 h-4 text-tj-primary" />
                    Story Prompt & Custom Ideas (Optional)
                  </label>

                  {/* Public / Private Story Toggle */}
                  <label className="relative flex items-center gap-3 select-none cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={!isPublic}
                      onChange={(e) => setIsPublic(!e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-tj-primary dark:peer-checked:bg-tj-primary shrink-0 relative"></div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      Private Story
                      <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    </span>
                    <div className="relative inline-flex items-center">
                      <HelpCircle
                        className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 hover:text-tj-primary cursor-pointer transition-colors"
                        onMouseEnter={() => setShowPrivateTooltip(true)}
                        onMouseLeave={() => setShowPrivateTooltip(false)}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setShowPrivateTooltip(!showPrivateTooltip);
                        }}
                      />
                      <AnimatePresence>
                        {showPrivateTooltip && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            className="absolute z-50 bottom-full right-0 mb-2 p-3 bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 text-[10px] rounded-lg shadow-xl border border-slate-700/50 w-56 leading-normal pointer-events-none text-left"
                          >
                            Only you will be able to view and read this story.
                            Quotas: Free tier allows up to 10 private stories,
                            Paid/Premium allows up to 100.
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </label>
                </div>
                <textarea
                  placeholder="e.g., A time traveler named Leo lands in Paris 1889 and meets a mysterious clockmaker. Or: focus on food and dining vocabulary."
                  value={promptNotes}
                  onChange={(e) => setPromptNotes(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl border border-tj-border-main bg-tj-bg-card text-tj-text-main text-sm placeholder:text-tj-text-muted/50 focus:border-tj-primary focus:outline-none focus:ring-1 focus:ring-tj-primary"
                />
              </div>

              {/* eBook Export Tip Card */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-250/60 dark:border-emerald-900/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>eBook Ready Output</span>
                </div>
                <p className="text-[10px] text-emerald-600/90 dark:text-emerald-400/90 leading-relaxed font-medium">
                  Every story generated in this app automatically compiles into
                  an offline-ready EPUB eBook. You can download and read it on
                  your <strong>Kindle, iPad, or Android e-reader</strong>,
                  complete with vocabulary glossaries!
                </p>
              </div>

              {/* Token & Cost Estimator */}
              <div className="p-4 bg-tj-primary-light/40 dark:bg-slate-800/40 border border-tj-primary-border/50 dark:border-slate-700/60 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-tj-primary dark:text-tj-primary-hover font-semibold text-xs uppercase tracking-wider">
                  <Coins className="w-4 h-4 shrink-0 text-tj-primary animate-pulse" />
                  <span>Estimated Generation Cost</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2.5 bg-tj-bg-card border border-tj-border-main rounded-xl">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      Total Words
                    </p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {est.totalWords}
                    </p>
                  </div>
                  <div className="p-2.5 bg-tj-bg-card border border-tj-border-main rounded-xl">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      Est. Tokens
                    </p>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {est.totalTokens.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2.5 bg-tj-bg-card border border-tj-border-main rounded-xl">
                    <p className="text-[10px] text-slate-400 dark:text-slate-505 font-medium">
                      Est. Credit Cost
                    </p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {FREE_MODEL_IDS.has(selectedModel) ||
                      selectedModel.endsWith(':free')
                        ? 0
                        : Math.max(1, Math.ceil(est.totalCost * 100))}{' '}
                      credits
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 items-start text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-tj-primary dark:text-tj-primary-hover" />
                  <span>
                    Estimates are progressive using standard{' '}
                    {GEMINI_MODELS.find((m) => m.id === selectedModel)?.name ||
                      'Dolphin Mistral 24B Venice Edition (Free)'}{' '}
                    rates (
                    {(
                      (GEMINI_MODELS.find((m) => m.id === selectedModel)
                        ?.inputCost1M || 0) * 100
                    ).toFixed(1)}{' '}
                    credits/1M input,{' '}
                    {(
                      (GEMINI_MODELS.find((m) => m.id === selectedModel)
                        ?.outputCost1M || 0) * 100
                    ).toFixed(1)}{' '}
                    credits/1M output tokens). Full-text context is dynamically
                    preserved across chapters.
                  </span>
                </div>
              </div>

              {/* Daily Quota Remaining card */}
              {!customOpenRouterKey && !isAdmin && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-350 font-semibold text-xs uppercase tracking-wider">
                    <Layers className="w-4 h-4 shrink-0 text-tj-primary" />
                    <span>Daily Quota Remaining</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-2.5 bg-tj-bg-card border border-tj-border-main rounded-xl">
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        Free Models
                      </p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {isPaid
                          ? `${Math.max(0, 30 - freeModelCount)} / 30`
                          : `${Math.max(0, 10 - freeModelCount)} / 10`}
                      </p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                        chapters remaining
                      </p>
                    </div>
                    <div className="p-2.5 bg-tj-bg-card border border-tj-border-main rounded-xl">
                      <p className="text-[10px] text-slate-400 dark:text-slate-505 font-medium">
                        Monthly Budget
                      </p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {isPaid
                          ? `${Math.max(0, 100 - monthlyCreditsUsed)} / 100`
                          : 'Locked 🔒'}
                      </p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-505 mt-0.5">
                        {isPaid ? 'credits remaining' : 'Upgrade to Paid Tier'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {draftError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 text-xs rounded-xl border border-rose-100 dark:border-rose-950/30 flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{draftError}</span>
                </div>
              )}

              {/* Sign in prompt banner */}
              {!currentUser && (
                <div className="p-5 bg-tj-primary-light/50 dark:bg-slate-800/40 border border-tj-primary-border/60 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-fade-in">
                  <div className="flex items-start gap-3 text-left">
                    <div className="p-2 bg-tj-primary-light dark:bg-tj-primary-light/20 text-tj-primary rounded-xl shrink-0 mt-0.5">
                      <Lock className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        Sign in to Create Stories
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Create custom graded stories, export to eBook formats,
                        and practice vocabulary. Signing up is free!
                      </p>
                    </div>
                  </div>
                  {onLogin && (
                    <button
                      type="button"
                      onClick={onLogin}
                      className="w-full md:w-auto py-2.5 px-5 bg-tj-primary hover:bg-tj-primary-hover active:bg-tj-primary text-tj-bg-main font-semibold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 shrink-0"
                    >
                      Sign In for Free
                    </button>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="submit"
                  disabled={!currentUser || isDraftingOutline || isLoading}
                  className="flex items-center justify-center gap-2 py-3.5 px-4 bg-tj-primary hover:bg-tj-primary-hover active:bg-tj-primary disabled:bg-slate-300 disabled:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:dark:bg-slate-800 dark:bg-tj-primary dark:hover:bg-tj-primary-hover text-tj-bg-main font-semibold text-sm rounded-xl transition-colors dark:shadow-none cursor-pointer"
                >
                  {isDraftingOutline ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin font-semibold"></div>
                      <span>Drafting Story Outline...</span>
                    </div>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      <span>Generate Story Outline & Plan</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={!currentUser || isDraftingOutline || isLoading}
                  onClick={() => {
                    setDraftTitle('');
                    setDraftDescription('');
                    setDraftOutline('');
                    setIsScratchMode(true);
                    setShowOutlineReview(true);
                  }}
                  className="flex items-center justify-center gap-2 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Create from Scratch</span>
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <StoryOutlineReview
            draftTitle={draftTitle}
            setDraftTitle={setDraftTitle}
            draftDescription={draftDescription}
            setDraftDescription={setDraftDescription}
            draftOutline={draftOutline}
            setDraftOutline={setDraftOutline}
            isScratchMode={isScratchMode}
            isLoading={isLoading}
            est={est}
            selectedModel={selectedModel}
            isPaid={isPaid}
            onBack={() => setShowOutlineReview(false)}
            onSubmit={handleApproveAndGenerate}
          />
        )}
      </AnimatePresence>

      <ModelSelectionModal
        isOpen={showDefaultModelInfo}
        onClose={() => setShowDefaultModelInfo(false)}
        selectedModel={selectedModel}
        language={language}
      />
    </>
  );
}
