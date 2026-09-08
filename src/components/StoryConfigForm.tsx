import {
  BookText,
  Globe,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type React from 'react';
import { useEffect, useState } from 'react';
import {
  AI_MODELS,
  COVER_IMAGE_MODELS,
  FREE_MODEL_IDS,
  FRONTIER_LATEST_MODELS,
  isMuseModel,
} from '../constants/models';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { SUPPORTED_LANGUAGES } from '../types';
import { buildApiHeaders, getModelThinkingSupport } from '../utils/modelUtils';
import { checkGenerationPermission } from '../utils/permissionUtils';
import {
  calculateEstimatedUsage,
  getRecommendedWordCount,
} from '../utils/storyEstimation';
import { generatePocketBaseId } from '../utils/storyFactory';
import AgeVerificationModal from './creator/AgeVerificationModal';
import CefrLevelSelector from './creator/CefrLevelSelector';
import EmbedStoryForm from './creator/EmbedStoryForm';
import GenreSelector from './creator/GenreSelector';
import LanguageSelector from './creator/LanguageSelector';
import ModelSelectionModal from './creator/ModelSelectionModal';
import ModelSettingsCard from './creator/ModelSettingsCard';
import StoryCostSummary from './creator/StoryCostSummary';
import StoryCreationActions from './creator/StoryCreationActions';
import StoryLengthSliders from './creator/StoryLengthSliders';
import StoryOutlineReview from './creator/StoryOutlineReview';
import StoryPromptInput from './creator/StoryPromptInput';

export type { AIModelOption, GeminiModelOption } from '../constants/models';
export { AI_MODELS, GEMINI_MODELS } from '../constants/models';

interface StoryConfigFormProps {
  onSubmit: (config: {
    storyId?: string;
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
    coverModel?: string;
    thinkingLevel?: string;
    thinkingBudget?: number;
    temperature?: number;
    translationLanguage?: string;
    isPublic?: boolean;
    skipChapterGeneration?: boolean;
    copyrightFlag?: boolean;
    copyrightFlagReason?: string;
    embedUrl?: string;
    sourceType?: string;
  }) => void;
  isLoading: boolean;
  isAdmin?: boolean;
  isPaid?: boolean;
  freeModelCount?: number;
  monthlyCreditsUsed?: number;
  dailyCreditsUsed?: number;
  dailyStoriesCreated?: number;
  onLogin?: (mode?: 'signin' | 'signup') => void;
}

export default function StoryConfigForm({
  onSubmit,
  isLoading,
  isAdmin = false,
  isPaid = false,
  freeModelCount = 0,
  dailyCreditsUsed = 0,
  dailyStoriesCreated = 0,
  onLogin,
}: StoryConfigFormProps) {
  const customOpenRouterKey = useUIStore((state) => state.customOpenRouterKey);
  const defaultStoryModel = useUIStore((state) => state.defaultStoryModel);
  const defaultCoverModel = useUIStore((state) => state.defaultCoverModel);
  const translationTargetLanguage = useUIStore(
    (state) => state.translationTargetLanguage,
  );
  const setTranslationTargetLanguage = useUIStore(
    (state) => state.setTranslationTargetLanguage,
  );
  const currentUser = useAuthStore((state) => state.currentUser);
  const isByokActive = !!currentUser && !!customOpenRouterKey;
  const isAgeVerified = useUIStore((state) => state.isAgeVerified);
  const setIsAgeVerified = useUIStore((state) => state.setIsAgeVerified);
  const [showAgeVerificationModal, setShowAgeVerificationModal] =
    useState(false);
  const [pendingModelForAge, setPendingModelForAge] = useState<string | null>(
    null,
  );
  const [pendingCoverModelForAge, setPendingCoverModelForAge] = useState<
    string | null
  >(null);

  // Config state
  const [language, setLanguage] = useState('es');
  const [cefrLevel, setCefrLevel] = useState('B1');
  const [genre, setGenre] = useState('adventure');
  const [totalChapters, setTotalChapters] = useState(5);
  const [chapterLength, setChapterLength] = useState(350);
  const [promptNotes, setPromptNotes] = useState('');
  const [selectedCoverModel, setSelectedCoverModel] = useState<string>(() => {
    if (isByokActive || isAdmin) {
      const preferred =
        defaultCoverModel || 'google/gemini-3.1-flash-lite-image';
      if (isMuseModel(preferred) && !isAgeVerified) {
        return 'google/gemini-3.1-flash-lite-image';
      }
      return preferred;
    }
    return 'generic';
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    if (isByokActive || isAdmin) {
      const preferred = defaultStoryModel || 'deepseek/deepseek-v4-pro';
      if (isMuseModel(preferred) && !isAgeVerified) {
        return 'deepseek/deepseek-v4-pro';
      }
      return preferred;
    }
    return 'z-ai/glm-5.3-flash';
  });
  const [thinkingOption, setThinkingOption] = useState(() => {
    const initialModel =
      isByokActive || isAdmin
        ? defaultStoryModel || 'deepseek/deepseek-v4-pro'
        : 'z-ai/glm-5.3-flash';
    const support = getModelThinkingSupport(initialModel);
    return support.defaultOption;
  });
  const [temperature, setTemperature] = useState(0.8);
  const [isPublic, setIsPublic] = useState(true);
  const [showDefaultModelInfo, setShowDefaultModelInfo] = useState(false);
  const [writingType, setWritingType] = useState('narrative');
  const [isLangCollapsed, setIsLangCollapsed] = useState(true);
  const [sortedLanguages] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
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
      }
    } catch (_e) {}
    return SUPPORTED_LANGUAGES;
  });

  // Sync selectedModel with defaultStoryModel when BYOK is active or when defaultStoryModel changes
  useEffect(() => {
    if (isByokActive && defaultStoryModel) {
      if (isMuseModel(defaultStoryModel) && !isAgeVerified) {
        return;
      }
      setSelectedModel(defaultStoryModel);
      const support = getModelThinkingSupport(defaultStoryModel);
      setThinkingOption(support.defaultOption);
    }
  }, [isByokActive, defaultStoryModel, isAgeVerified]);

  // Sync selectedCoverModel with defaultCoverModel when BYOK or Admin is active
  useEffect(() => {
    if ((isByokActive || isAdmin) && defaultCoverModel) {
      if (isMuseModel(defaultCoverModel) && !isAgeVerified) {
        return;
      }
      setSelectedCoverModel(defaultCoverModel);
    }
  }, [isByokActive, isAdmin, defaultCoverModel, isAgeVerified]);

  const handleModelSelectChange = (newModel: string) => {
    if (isMuseModel(newModel) && !isAgeVerified) {
      setPendingModelForAge(newModel);
      setShowAgeVerificationModal(true);
      return;
    }
    setSelectedModel(newModel);
    const support = getModelThinkingSupport(newModel);
    setThinkingOption(support.defaultOption);
  };

  const handleCoverModelSelectChange = (newCoverModel: string) => {
    if (isMuseModel(newCoverModel) && !isAgeVerified) {
      setPendingCoverModelForAge(newCoverModel);
      setShowAgeVerificationModal(true);
      return;
    }
    setSelectedCoverModel(newCoverModel);
  };

  const handleAgeVerificationConfirm = () => {
    setIsAgeVerified(true);
    setShowAgeVerificationModal(false);
    if (pendingModelForAge) {
      setSelectedModel(pendingModelForAge);
      const support = getModelThinkingSupport(pendingModelForAge);
      setThinkingOption(support.defaultOption);
      setPendingModelForAge(null);
    }
    if (pendingCoverModelForAge) {
      setSelectedCoverModel(pendingCoverModelForAge);
      setPendingCoverModelForAge(null);
    }
  };

  const handleAgeVerificationCancel = () => {
    setShowAgeVerificationModal(false);
    setPendingModelForAge(null);
    setPendingCoverModelForAge(null);
  };

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
    if (!isByokActive && !isAdmin) {
      if (!FREE_MODEL_IDS.has(selectedModel)) {
        const newModel = 'z-ai/glm-5.3-flash';
        setSelectedModel(newModel);

        // Auto-update thinkingOption for the new model
        const support = getModelThinkingSupport(newModel);
        setThinkingOption(support.defaultOption);
      }
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
  const [draftStoryId, setDraftStoryId] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftOutline, setDraftOutline] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftError, setDraftError] = useState('');
  const [copyrightFlag, setCopyrightFlag] = useState(false);
  const [copyrightFlagReason, setCopyrightFlagReason] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);
  const [isScratchMode, setIsScratchMode] = useState(false);

  // Embedded story import states
  const [creationMode, setCreationMode] = useState<'generate' | 'gemini_embed'>(
    'generate',
  );
  const [embedUrl, setEmbedUrl] = useState('');
  const [embedStoryTitle, setEmbedStoryTitle] = useState('');
  const [embedDescription, setEmbedDescription] = useState('');
  const [embedUrlError, setEmbedUrlError] = useState('');

  const handleImportGeminiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = embedUrl.trim();
    if (!trimmedUrl) {
      setEmbedUrlError('Please enter a valid Gemini share link.');
      return;
    }
    if (
      !trimmedUrl.startsWith('http://') &&
      !trimmedUrl.startsWith('https://')
    ) {
      setEmbedUrlError('Link must start with https://');
      return;
    }
    if (
      !trimmedUrl.includes('gemini.google.com') &&
      !trimmedUrl.includes('share.gemini.google')
    ) {
      setEmbedUrlError(
        'URL must be a valid Google Gemini share link (e.g. https://share.gemini.google/...)',
      );
      return;
    }
    setEmbedUrlError('');

    onSubmit({
      language,
      cefrLevel,
      genre,
      totalChapters: 1,
      promptNotes: 'Imported Gemini Storybook',
      chapterLength: 300,
      storyTitle: embedStoryTitle.trim() || 'Gemini Storybook',
      description: embedDescription.trim(),
      isPublic,
      embedUrl: trimmedUrl,
      sourceType: 'gemini_storybook',
      coverModel: selectedCoverModel,
    });
  };

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
    const estUsage = calculateEstimatedUsage(1, chapterLength, selectedModel);
    const estimatedCreditsCost = isFree
      ? 0
      : Math.max(1, Math.ceil(estUsage.totalCost * 100));

    const denied = checkGenerationPermission(
      selectedModel,
      isPaid,
      isAdmin,
      customOpenRouterKey,
      freeModelCount,
      dailyCreditsUsed,
      estimatedCreditsCost,
      1,
      currentUser?.emailVerified ?? true,
      dailyStoriesCreated,
      true,
    );

    if (denied) {
      setDraftError(`${denied.title}: ${denied.message}`);
      setIsDraftingOutline(false);
      return;
    }

    if (isMuseModel(selectedModel) && !isAgeVerified) {
      setPendingModelForAge(selectedModel);
      setShowAgeVerificationModal(true);
      setIsDraftingOutline(false);
      return;
    }

    if (!isAdmin && !isByokActive) {
      if (
        !FREE_MODEL_IDS.has(selectedModel) &&
        !selectedModel.endsWith(':free')
      ) {
        setDraftError(
          'Free tier accounts can only generate stories using Free Tier models (GLM 5.3 Flash or Muse Spark 1.3 Contributor). Configure your own OpenRouter API key in Settings to use frontier models.',
        );
        setIsDraftingOutline(false);
        return;
      }
      const isLongStory = totalChapters > 10;
      if (isLongStory) {
        setDraftError(
          `Free tier stories are limited to 10 chapters. Add your own OpenRouter API key in Settings to unlock stories up to 30 chapters.`,
        );
        setIsDraftingOutline(false);
        return;
      }
    }

    const selectedLanguageName =
      SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name || 'Spanish';

    let finalThinkingLevel: string | undefined;
    let finalThinkingBudget: number | undefined;

    const thinkingSupport = getModelThinkingSupport(selectedModel);
    if (thinkingSupport.type === 'simple') {
      if (thinkingOption !== 'disabled') {
        finalThinkingLevel = 'low';
        finalThinkingBudget = 2048;
      } else {
        finalThinkingLevel = 'disabled';
        finalThinkingBudget = 0;
      }
    } else if (thinkingSupport.type === 'level') {
      finalThinkingLevel = thinkingOption;
      if (thinkingOption !== 'disabled') {
        finalThinkingBudget = 2048;
      } else {
        finalThinkingBudget = 0;
      }
    } else if (thinkingSupport.type === 'budget') {
      if (thinkingOption === 'disabled') {
        finalThinkingBudget = 0;
        finalThinkingLevel = 'disabled';
      } else if (thinkingOption === 'low') {
        finalThinkingBudget = 2048;
        finalThinkingLevel = 'low';
      } else if (thinkingOption === 'medium') {
        finalThinkingBudget = 2048;
        finalThinkingLevel = 'medium';
      } else if (thinkingOption === 'high') {
        finalThinkingBudget = 4096;
        finalThinkingLevel = 'high';
      } else if (thinkingOption === 'dynamic') {
        finalThinkingBudget = -1;
      }
    }

    const currentModelObj = AI_MODELS.find((m) => m.id === selectedModel);
    const supportsTemp = currentModelObj?.supportsTemperature ?? true;
    const isThinkingActive = thinkingOption !== 'disabled';
    const finalTemperature =
      supportsTemp && !isThinkingActive ? temperature : undefined;

    try {
      const headers = buildApiHeaders(customOpenRouterKey);
      const storyId = draftStoryId || generatePocketBaseId();
      setDraftStoryId(storyId);

      const response = await fetch('/api/stories/generate-outline', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          storyId,
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
          isPublic,
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
      if (data.error) {
        throw new Error(data.error);
      }
      if (data.storyId) {
        setDraftStoryId(data.storyId);
      }
      setDraftTitle(data.storyTitle || '');
      setDraftOutline(data.outline || '');
      setDraftDescription(data.description || '');

      // Separate call for IP risk check so model can focus on story writing
      try {
        const classifyRes = await fetch('/api/stories/classify-ip', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: data.storyTitle,
            outline: data.outline,
            description: data.description,
            promptNotes: `[Writing Type: ${writingType}]${promptNotes ? `\n\n${promptNotes}` : ''}`,
            userId: currentUser?.uid,
            userEmail: currentUser?.email,
          }),
        });
        if (classifyRes.ok) {
          const classData = await classifyRes.json();
          const isFlagged =
            classData.flagged === true ||
            classData.ipRisk === true ||
            classData.adultRisk === true;
          setCopyrightFlag(isFlagged);
          const reason =
            (typeof classData.flagReason === 'string' &&
              classData.flagReason) ||
            (typeof classData.adultRiskReason === 'string' &&
              classData.adultRiskReason) ||
            (typeof classData.ipRiskReason === 'string' &&
              classData.ipRiskReason) ||
            '';
          setCopyrightFlagReason(reason);
        } else {
          setCopyrightFlag(false);
          setCopyrightFlagReason('');
        }
      } catch (classifyErr) {
        console.warn('Content classification call failed:', classifyErr);
        setCopyrightFlag(false);
        setCopyrightFlagReason('');
      }

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

  const handleApproveAndGenerate = async () => {
    if (isMuseModel(selectedModel) && !isAgeVerified) {
      setPendingModelForAge(selectedModel);
      setShowAgeVerificationModal(true);
      return;
    }

    const selectedLanguageName =
      SUPPORTED_LANGUAGES.find((l) => l.code === language)?.name || 'Spanish';

    // Scratch-mode stories bypass the outline API, so they were never
    // classified. Run the lightweight classifier on the manually
    // written title/outline/description before creating the story.
    let finalCopyrightFlag = copyrightFlag;
    let finalCopyrightFlagReason = copyrightFlagReason;
    if (isScratchMode && !finalCopyrightFlag) {
      setIsClassifying(true);
      try {
        const headers = buildApiHeaders(customOpenRouterKey);
        const response = await fetch('/api/stories/classify-ip', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: draftTitle,
            outline: draftOutline,
            description: draftDescription,
            promptNotes,
            userId: currentUser?.uid,
            userEmail: currentUser?.email,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const isFlagged =
            data.flagged === true ||
            data.ipRisk === true ||
            data.adultRisk === true;
          if (isFlagged) {
            finalCopyrightFlag = true;
            finalCopyrightFlagReason =
              (typeof data.flagReason === 'string' && data.flagReason) ||
              (typeof data.adultRiskReason === 'string' &&
                data.adultRiskReason) ||
              (typeof data.ipRiskReason === 'string' && data.ipRiskReason) ||
              '';
            setCopyrightFlag(true);
            setCopyrightFlagReason(finalCopyrightFlagReason);
          }
        }
      } catch (err) {
        // Fail-open: never block story creation on a classifier outage.
        console.warn('Content classification failed, proceeding unflagged:', err);
      } finally {
        setIsClassifying(false);
      }
    }

    let finalThinkingLevel: string | undefined;
    let finalThinkingBudget: number | undefined;

    const thinkingSupport = getModelThinkingSupport(selectedModel);
    if (thinkingSupport.type === 'simple') {
      if (thinkingOption !== 'disabled') {
        finalThinkingLevel = 'low';
        finalThinkingBudget = 2048;
      } else {
        finalThinkingLevel = 'disabled';
        finalThinkingBudget = 0;
      }
    } else if (thinkingSupport.type === 'level') {
      finalThinkingLevel = thinkingOption;
      if (thinkingOption !== 'disabled') {
        finalThinkingBudget = 2048;
      } else {
        finalThinkingBudget = 0;
      }
    } else if (thinkingSupport.type === 'budget') {
      if (thinkingOption === 'disabled') {
        finalThinkingBudget = 0;
        finalThinkingLevel = 'disabled';
      } else if (thinkingOption === 'low') {
        finalThinkingBudget = 2048;
        finalThinkingLevel = 'low';
      } else if (thinkingOption === 'medium') {
        finalThinkingBudget = 2048;
        finalThinkingLevel = 'medium';
      } else if (thinkingOption === 'high') {
        finalThinkingBudget = 4096;
        finalThinkingLevel = 'high';
      } else if (thinkingOption === 'dynamic') {
        finalThinkingBudget = -1;
      }
    }

    const currentModelObj = AI_MODELS.find((m) => m.id === selectedModel);
    const supportsTemp = currentModelObj?.supportsTemperature ?? true;
    const isThinkingActive = thinkingOption !== 'disabled';
    const finalTemperature =
      supportsTemp && !isThinkingActive ? temperature : undefined;

    onSubmit({
      storyId: draftStoryId || undefined,
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
      coverModel: selectedCoverModel,
      thinkingLevel: finalThinkingLevel,
      thinkingBudget: finalThinkingBudget,
      temperature: finalTemperature,
      translationLanguage: translationTargetLanguage || 'English',
      isPublic: finalCopyrightFlag ? false : isPublic,
      skipChapterGeneration: isScratchMode,
      copyrightFlag: finalCopyrightFlag,
      copyrightFlagReason: finalCopyrightFlagReason,
    });
  };

  const handleCreateFromScratch = () => {
    setDraftStoryId('');
    setDraftTitle('');
    setDraftDescription('');
    setDraftOutline('');
    setCopyrightFlag(false);
    setCopyrightFlagReason('');
    setIsScratchMode(true);
    setShowOutlineReview(true);
  };

  const est = calculateEstimatedUsage(
    totalChapters,
    chapterLength,
    selectedModel,
  );
  const maxChapters = isPaid || isAdmin || isByokActive ? 30 : 10;

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
                  {creationMode === 'generate'
                    ? 'Step 1 of 2: Configure narrative parameters'
                    : 'Import an interactive Gemini Storybook via link'}
                </p>
              </div>
            </div>

            {/* Step Progress Stepper */}
            {creationMode === 'generate' && (
              <div className="flex items-center gap-2.5 mb-5 px-3.5 py-2 bg-tj-bg-recessed/60 rounded-xl border border-tj-border-main text-xs select-none">
                <div className="flex items-center gap-2 font-bold text-tj-primary dark:text-tj-primary-hover">
                  <span className="w-5 h-5 rounded-full bg-tj-primary text-tj-bg-main text-[10px] font-extrabold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>Concept & Settings</span>
                </div>
                <div className="flex-1 h-[1px] bg-slate-200 dark:bg-slate-700 mx-1" />
                <div className="flex items-center gap-2 text-tj-text-muted font-medium opacity-70">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>Review & Refine Outline</span>
                </div>
              </div>
            )}

            {/* Creation Mode Toggle */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl mb-6 border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setCreationMode('generate')}
                className={`flex-1 py-2.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  creationMode === 'generate'
                    ? 'bg-white dark:bg-slate-700 text-tj-primary dark:text-tj-primary-hover shadow-xs border border-slate-200/50 dark:border-slate-600/50'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Generate AI Book
              </button>
              <button
                type="button"
                onClick={() => setCreationMode('gemini_embed')}
                className={`flex-1 py-2.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  creationMode === 'gemini_embed'
                    ? 'bg-white dark:bg-slate-700 text-tj-primary dark:text-tj-primary-hover shadow-xs border border-slate-200/50 dark:border-slate-600/50'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Globe className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                Import Gemini Link ✨
              </button>
            </div>

            {creationMode === 'gemini_embed' ? (
              <EmbedStoryForm
                embedUrl={embedUrl}
                setEmbedUrl={setEmbedUrl}
                embedUrlError={embedUrlError}
                setEmbedUrlError={setEmbedUrlError}
                embedStoryTitle={embedStoryTitle}
                setEmbedStoryTitle={setEmbedStoryTitle}
                embedDescription={embedDescription}
                setEmbedDescription={setEmbedDescription}
                language={language}
                onLanguageChange={handleLanguageChange}
                sortedLanguages={sortedLanguages}
                cefrLevel={cefrLevel}
                onLevelChange={handleLevelChange}
                genre={genre}
                setGenre={setGenre}
                isPublic={isPublic}
                setIsPublic={setIsPublic}
                isLoading={isLoading}
                onSubmit={handleImportGeminiSubmit}
              />
            ) : (
              <form onSubmit={handleRequestOutline} className="space-y-6">
                {/* Language Selection */}
                <LanguageSelector
                  selectedLanguage={language}
                  onLanguageChange={handleLanguageChange}
                  sortedLanguages={sortedLanguages}
                  isCollapsed={isLangCollapsed}
                  onToggleCollapsed={setIsLangCollapsed}
                  label="Target Language"
                />

                {/* CEFR Level */}
                <CefrLevelSelector
                  cefrLevel={cefrLevel}
                  onLevelChange={handleLevelChange}
                  language={language}
                  translationTargetLanguage={translationTargetLanguage}
                  onTranslationTargetLanguageChange={setTranslationTargetLanguage}
                />

                {/* Writing Style / Type & Genre / Theme */}
                <GenreSelector
                  writingType={writingType}
                  onWritingTypeChange={setWritingType}
                  genre={genre}
                  onGenreChange={setGenre}
                />

                {/* Chapters and Word Count Sliders */}
                <StoryLengthSliders
                  totalChapters={totalChapters}
                  onTotalChaptersChange={setTotalChapters}
                  chapterLength={chapterLength}
                  onChapterLengthChange={setChapterLength}
                  writingType={writingType}
                  maxChapters={maxChapters}
                />

                {/* Model & Intelligence Settings */}
                <ModelSettingsCard
                  selectedModel={selectedModel}
                  onModelSelectChange={handleModelSelectChange}
                  selectedCoverModel={selectedCoverModel}
                  onCoverModelSelectChange={handleCoverModelSelectChange}
                  thinkingOption={thinkingOption}
                  onThinkingOptionChange={setThinkingOption}
                  temperature={temperature}
                  onTemperatureChange={setTemperature}
                  isByokActive={isByokActive}
                  isAdmin={isAdmin}
                  currentUser={currentUser}
                  onShowDefaultModelInfo={() => setShowDefaultModelInfo(true)}
                  onLogin={onLogin}
                />

                {/* Custom Notes & Inspiration Chips */}
                <StoryPromptInput
                  promptNotes={promptNotes}
                  onPromptNotesChange={setPromptNotes}
                  writingType={writingType}
                  genre={genre}
                  isPublic={isPublic}
                  onIsPublicChange={setIsPublic}
                  copyrightFlag={copyrightFlag}
                  copyrightFlagReason={copyrightFlagReason}
                />

                {/* Estimated Length, Cost & Daily Allowance */}
                <StoryCostSummary
                  est={est}
                  totalChapters={totalChapters}
                  writingType={writingType}
                  selectedModel={selectedModel}
                  isByokActive={isByokActive}
                  isAdmin={isAdmin}
                  isPaid={isPaid}
                  dailyStoriesCreated={dailyStoriesCreated}
                  dailyCreditsUsed={dailyCreditsUsed}
                />

                {/* Creation Action Buttons & Sign-In Callout */}
                <StoryCreationActions
                  draftError={draftError}
                  currentUser={currentUser}
                  isDraftingOutline={isDraftingOutline}
                  isLoading={isLoading}
                  onCreateFromScratch={handleCreateFromScratch}
                  onLogin={onLogin}
                />
              </form>
            )}
          </motion.div>
        ) : (
          <>
            {copyrightFlag && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-900/60 rounded-2xl flex items-start gap-3"
              >
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                  <p className="font-bold mb-1">
                    {copyrightFlagReason?.toLowerCase().includes('explicit') ||
                    copyrightFlagReason?.toLowerCase().includes('adult')
                      ? 'Adult content policy restriction — this story will be saved as private.'
                      : 'Copyright-restricted story — this will be saved as private.'}
                  </p>
                  <p>
                    {copyrightFlagReason
                      ? `Our classifier identified this as: ${copyrightFlagReason}.`
                      : 'Our classifier identified this as referencing restricted or copyrighted material.'}{' '}
                    Personal stories for your own language learning practice are
                    welcome, but restricted content cannot be shared publicly.
                    This story will not appear in the public library, and only
                    you (and admins) will be able to read it. Contact{' '}
                    <a
                      href="mailto:admin@teacherjake.com"
                      className="underline font-semibold"
                    >
                      admin@teacherjake.com
                    </a>{' '}
                    to appeal.
                  </p>
                </div>
              </motion.div>
            )}
            <StoryOutlineReview
              draftTitle={draftTitle}
              setDraftTitle={setDraftTitle}
              draftDescription={draftDescription}
              setDraftDescription={setDraftDescription}
              draftOutline={draftOutline}
              setDraftOutline={setDraftOutline}
              isScratchMode={isScratchMode}
              isLoading={isLoading || isClassifying}
              est={est}
              selectedModel={selectedModel}
              isPaid={isPaid}
              onBack={() => setShowOutlineReview(false)}
              onSubmit={handleApproveAndGenerate}
            />
          </>
        )}
      </AnimatePresence>

      <ModelSelectionModal
        isOpen={showDefaultModelInfo}
        onClose={() => setShowDefaultModelInfo(false)}
        selectedModel={selectedModel}
        language={language}
      />

      <AgeVerificationModal
        isOpen={showAgeVerificationModal}
        modelName={
          COVER_IMAGE_MODELS.find((m) => m.id === pendingCoverModelForAge)
            ?.name ||
          FRONTIER_LATEST_MODELS.find((m) => m.id === pendingModelForAge)
            ?.name ||
          AI_MODELS.find((m) => m.id === pendingModelForAge)?.name ||
          pendingModelForAge ||
          pendingCoverModelForAge ||
          'Meta Muse'
        }
        modelId={pendingModelForAge || pendingCoverModelForAge || undefined}
        onConfirm={handleAgeVerificationConfirm}
        onCancel={handleAgeVerificationCancel}
      />
    </>
  );
}
