import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X as CloseIcon,
  EyeOff,
  Save,
  Sparkles,
  Star,
  Trash2,
  Volume2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FREE_MODEL_IDS } from '../constants/models';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useStoryHighlights } from '../hooks/useStoryHighlights';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import {
  type Chapter,
  getAverageRating,
  getLanguageCodeFromName,
  type HighlightColor,
  type Story,
  type StoryHighlight,
  SUPPORTED_LANGUAGES,
  type VocabularyTerm,
} from '../types';
import { getStoryCoverUrl } from '../utils/coverUtils';
import { buildApiHeaders } from '../utils/modelUtils';
import {
  limitContextToTenWords,
  segmentText,
  stripMarkdown,
} from '../utils/segmenter';
import { calculateEstimatedUsage } from '../utils/storyEstimation';
import { countWords } from '../utils/wordCounter';
import BilingualSwapNotification from './reader/BilingualSwapNotification';
import ChapterEditForm from './reader/ChapterEditForm';
import ChapterNavigationBar from './reader/ChapterNavigationBar';
import ChapterSidebar from './reader/ChapterSidebar';
import HighlightToolbar from './reader/HighlightToolbar';
import InteractiveParagraph from './reader/InteractiveParagraph';
import NarrativeMaintenancePanel from './reader/NarrativeMaintenancePanel';
import PreferredLanguageModal from './reader/PreferredLanguageModal';
import TranslationToast from './reader/TranslationToast';
import TTSToolbar from './reader/TTSToolbar';
import VocabGlossary from './reader/VocabGlossary';

// A helper component to trigger scrolling back to the top of the reader panel
// only after the previous chapter card has fully faded out and the new card has mounted.
function ScrollToTop({
  readerRef,
}: {
  readerRef: RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    readerRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [readerRef]);
  return null;
}

interface ReaderPanelProps {
  story: Story;
  activeChapterIndex: number;
  onSelectChapter: (index: number) => void;
  onGenerateNextChapter: (chapterGuidance?: string) => void;
  onRegenerateChapter?: (
    index: number,
    chapterGuidance?: string,
  ) => Promise<void>;
  isLoadingNext: boolean;
  isAutoGeneratingRemaining: boolean;
  onAutoGenerateAll: () => void;
  onSaveWord?: (word: VocabularyTerm) => void;
  onRemoveWord?: (wordText: string) => void;
  isPaid?: boolean;
  isAdmin?: boolean;
  onOpenSettings?: () => void;
  onShowAlert?: (
    title: string,
    message: string,
    type?: 'info' | 'error' | 'warning',
  ) => void;
  generationStatus?: string;
  onCancelGeneration?: () => void;
  onRateStory?: (rating: number) => void;
  lookupLimitData?: { count: number; date: string } | null;
  onIncrementLookupCount?: () => void;
  savedVocab?: VocabularyTerm[];
  onDeleteChapter?: (index: number) => Promise<void>;
  onAddCustomChapter?: (
    title: string,
    content: string,
    vocabulary: VocabularyTerm[],
  ) => Promise<void>;
  onDeleteStory?: (bypassConfirm?: boolean) => void;
  onFlagStory?: (story: Story) => void;
  onStoryUpdated?: (story: Story) => void;
  isZenMode: boolean;
  onToggleZen: (zen: boolean) => void;
  onDownloadEpub?: () => void;
  isAutoGenerationPaused?: boolean;
  onGenerateGlossary?: (
    story: Story,
    modelId?: string,
    translationLanguage?: string,
    forceRegenerate?: boolean,
  ) => Promise<void>;
  onSaveStory?: (story?: Story) => Promise<any>;
  onGenerateCover?: (storyId: string, force?: boolean) => Promise<void>;
  onChapterFinished?: () => void;
  onStoryFinished?: (storyId: string) => void;
  onStoryUnfinished?: (storyId: string) => void;
  dirty?: boolean;
  isSyncing?: boolean;
  syncChangesToDatabase?: () => Promise<void>;
  onExit?: () => void;
  isGeneratingCover?: boolean;
}

export default function ReaderPanel({
  story,
  activeChapterIndex,
  onSelectChapter,
  onGenerateNextChapter,
  onRegenerateChapter,
  isLoadingNext,
  isAutoGeneratingRemaining,
  onAutoGenerateAll,
  onSaveWord,
  onRemoveWord,
  isPaid = false,
  isAdmin = false,
  onOpenSettings,
  onShowAlert,
  generationStatus = '',
  onCancelGeneration,
  onRateStory,
  lookupLimitData,
  onIncrementLookupCount,
  savedVocab = [],
  onStoryUpdated,
  onDeleteChapter,
  onAddCustomChapter,
  onDeleteStory,
  onFlagStory,
  isZenMode,
  onToggleZen,
  onDownloadEpub,
  isAutoGenerationPaused = false,
  onGenerateGlossary,
  onSaveStory,
  onGenerateCover,
  onChapterFinished,
  onStoryFinished,
  onStoryUnfinished,
  dirty = false,
  isSyncing = false,
  syncChangesToDatabase,
  onExit,
  isGeneratingCover = false,
}: ReaderPanelProps) {
  const readerRef = useRef<HTMLDivElement>(null);
  const translationTargetLanguage = useUIStore(
    (state) => state.translationTargetLanguage,
  );
  const setTranslationTargetLanguage = useUIStore(
    (state) => state.setTranslationTargetLanguage,
  );
  const isOnline = useUIStore((state) => state.isOnline);
  const customOpenRouterKey = useUIStore((state) => state.customOpenRouterKey);
  const defaultTranslationModel = useUIStore(
    (state) => state.defaultTranslationModel,
  );
  const currentUser = useAuthStore((state) => state.currentUser);

  const [selectedGlossaryLanguage, setSelectedGlossaryLanguage] =
    useState<string>(translationTargetLanguage || 'English');

  useEffect(() => {
    setSelectedGlossaryLanguage(translationTargetLanguage || 'English');
  }, [translationTargetLanguage]);

  const [sessionFinished, setSessionFinished] = useState(false);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [coverImgError, setCoverImgError] = useState(false);

  // Reset coverImgError when cover is generated, story updates, or story.id/cover changes
  useEffect(() => {
    setCoverImgError(false);
  }, [
    story.id,
    story.cover,
    story.updated,
    isGeneratingCover,
    activeChapterIndex,
  ]);

  // Deep-link scrolling when arriving with target highlight paragraph from NotesPage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const targetPara = sessionStorage.getItem('target_highlight_paragraph');
    if (targetPara !== null) {
      sessionStorage.removeItem('target_highlight_paragraph');
      const pIdx = parseInt(targetPara, 10);
      if (!Number.isNaN(pIdx)) {
        setTimeout(() => {
          const el = document.getElementById(`chapter-para-${pIdx}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-tj-primary', 'rounded-xl');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-tj-primary', 'rounded-xl');
            }, 2500);
          }
        }, 400);
      }
    }
  }, [activeChapterIndex, story.id]);

  const guestCompletedStoryIds = useUIStore(
    (state) => state.guestCompletedStoryIds,
  );

  useEffect(() => {
    const completedByObj = story.completedBy || {};
    const userReadCount = currentUser?.uid
      ? completedByObj[currentUser.uid] || 0
      : guestCompletedStoryIds.includes(story.id)
        ? 1
        : 0;
    setSessionFinished(userReadCount > 0);
  }, [story.id, story.completedBy, currentUser, guestCompletedStoryIds]);

  const fontSize = useUIStore((state) => state.readerFontSize);
  const setFontSize = useUIStore((state) => state.setReaderFontSize);
  const useSerif = useUIStore((state) => state.readerUseSerif);
  const setUseSerif = useUIStore((state) => state.setReaderUseSerif);
  const alignment = useUIStore((state) => state.readerTextAlignment);
  const setAlignment = useUIStore((state) => state.setReaderTextAlignment);
  const columnWidth = useUIStore((state) => state.readerColumnWidth);
  const setColumnWidth = useUIStore((state) => state.setReaderColumnWidth);
  const [showBilingual, setShowBilingual] = useState<boolean>(
    story.cefrLevel === 'A1' || story.cefrLevel === 'Pre-A1',
  );
  const [isSwapped, setIsSwapped] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'read' | 'maintenance'>('read');
  const [maintenanceSubTab, setMaintenanceSubTab] = useState<
    'bible' | 'audits' | 'tone' | 'outline'
  >('bible');

  const activeChapter: Chapter | undefined = (story.chapters ?? [])[
    activeChapterIndex
  ];

  const [selectedWordRange, setSelectedWordRange] = useState<
    [number, number] | null
  >(null);

  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [isReaderSettingsOpen, setIsReaderSettingsOpen] =
    useState<boolean>(false);

  const {
    highlights,
    addHighlight,
    updateHighlight,
    removeHighlight,
    getHighlightsForParagraph,
  } = useStoryHighlights({
    storyId: story.id,
    currentUser,
    onUnauthorized: () => {
      onShowAlert?.(
        'Sign In Required',
        'Please sign in or create an account to save highlights and personal notes.',
        'info',
      );
    },
  });

  const [highlightToolbarState, setHighlightToolbarState] = useState<{
    activeHighlight?: StoryHighlight | null;
    selection?: {
      text: string;
      chapterIndex: number;
      paragraphIndex: number;
      startOffset: number;
      endOffset: number;
    } | null;
    position: { x: number; y: number } | null;
  } | null>(null);

  interface DisplayParagraph {
    original: string;
    translation?: string;
  }

  const displayParagraphs = useMemo<DisplayParagraph[]>(() => {
    if (!activeChapter) return [];
    const paras = activeChapter.content
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const displayParas: DisplayParagraph[] = [];
    for (let i = 0; i < paras.length; i++) {
      const p = paras[i];
      if (p.startsWith('Translation:')) {
        if (displayParas.length > 0) {
          displayParas[displayParas.length - 1].translation = p.replace(
            /^Translation:\s*/i,
            '',
          );
        } else {
          displayParas.push({ original: p });
        }
      } else {
        displayParas.push({ original: p });
      }
    }
    return displayParas;
  }, [activeChapter]);

  // When the user swaps the primary/translation languages we flip original<->translation
  // on the displayed paragraphs. Paragraphs without a translation gracefully fall back
  // to showing the original text in the primary slot (no subtext).
  const effectiveDisplayParagraphs = useMemo<DisplayParagraph[]>(() => {
    if (!isSwapped) return displayParagraphs;
    return displayParagraphs.map((dp) => ({
      original: dp.translation ?? dp.original,
      translation: dp.translation ? dp.original : undefined,
    }));
  }, [displayParagraphs, isSwapped]);

  // Set of words in the glossary of the active chapter for fast lookup
  const glossaryWordsSet = useMemo(() => {
    const vocab = activeChapter?.vocabulary || [];
    return new Set(vocab.map((v) => v.word.toLowerCase().trim()));
  }, [activeChapter]);

  // Set of words in the user's saved vocabulary for fast lookup
  const savedWordsSet = useMemo(() => {
    return new Set((savedVocab || []).map((v) => v.word.toLowerCase().trim()));
  }, [savedVocab]);

  // Combined set of all words/phrases to match as single segments (glossary + saved phrases)
  const segmentMatchingSet = useMemo(() => {
    const combined = new Set<string>();
    glossaryWordsSet.forEach((w) => {
      combined.add(w);
    });
    savedWordsSet.forEach((w) => {
      combined.add(w);
    });
    return combined;
  }, [glossaryWordsSet, savedWordsSet]);

  // Reset swap toggle when the story changes (swap only applies to bilingual A1)
  useEffect(() => {
    setIsSwapped(false);
  }, [story.id]);

  // Swap is only supported on A1 bilingual stories (Pre-A1 has inserted scaffolding words
  // that would desynchronize the bilingual pairing if the primary language were flipped)
  const canSwapLanguages =
    story.cefrLevel === 'A1' && !!story.translationLanguage;

  const effectivePrimaryLanguage = isSwapped
    ? story.translationLanguage || story.language
    : story.language;

  const chapterWords = useMemo(() => {
    const words: {
      word: string;
      paragraphText: string;
      pIdx: number;
      indexInPara: number;
    }[] = [];
    if (!activeChapter) return words;
    const targetLangCode = getLanguageCodeFromName(effectivePrimaryLanguage);

    effectiveDisplayParagraphs.forEach((dp, pIdx) => {
      let indexInPara = 0;
      const segments = segmentText(
        dp.original,
        targetLangCode,
        segmentMatchingSet,
      );
      segments.forEach((seg) => {
        if (seg.isWordLike) {
          words.push({
            word: seg.segment,
            paragraphText: dp.original,
            pIdx,
            indexInPara: indexInPara++,
          });
        }
      });
    });

    return words;
  }, [
    effectiveDisplayParagraphs,
    effectivePrimaryLanguage,
    activeChapter,
    segmentMatchingSet,
  ]);

  const isFreeModel =
    story.model?.endsWith(':free') || FREE_MODEL_IDS.has(story.model || '');
  const nextChapterCreditCost = useMemo(() => {
    if (isFreeModel) return 0;
    const currentChaptersLoaded = story.chapters?.length ?? 0;
    const nextChapterNum = currentChaptersLoaded + 1;
    const estBefore = calculateEstimatedUsage(
      nextChapterNum - 1,
      story.chapterLength || 300,
      story.model || 'deepseek/deepseek-v4-pro',
    );
    const estAfter = calculateEstimatedUsage(
      nextChapterNum,
      story.chapterLength || 300,
      story.model || 'deepseek/deepseek-v4-pro',
    );
    const estCost = Math.max(
      1,
      Math.ceil((estAfter.totalCost - estBefore.totalCost) * 100),
    );

    if (nextChapterNum <= (story.initialTotalChapters ?? story.totalChapters)) {
      return Math.min(
        estCost,
        Math.max(
          0,
          (story.initialCreditsEstimate ?? 0) - (story.creditsCharged ?? 0),
        ),
      );
    }
    return estCost;
  }, [
    story.model,
    story.chapterLength,
    story.chapters?.length ?? 0,
    isFreeModel,
    story.initialTotalChapters,
    story.totalChapters,
    story.initialCreditsEstimate,
    story.creditsCharged,
  ]);

  // Sync state if story changes
  useEffect(() => {
    setShowBilingual(story.cefrLevel === 'A1' || story.cefrLevel === 'Pre-A1');
  }, [story.cefrLevel]);

  // TTS browser controls hook
  const {
    voices,
    selectedVoiceName,
    setSelectedVoiceName,
    speechRate,
    setSpeechRate,
    autoPlayWord,
    setAutoPlayWord,
    isSpeaking,
    isPaused,
    speak,
    stop,
    playWord,
  } = useSpeechSynthesis(effectivePrimaryLanguage);

  // Clicked word translation toast state
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    context: string;
    translation: string;
    partOfSpeech: string;
    definition: string;
    isFetching: boolean;
    saveSuccess: boolean;
  } | null>(null);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  const isCreator = currentUser && story.creatorId === currentUser.uid;
  const userRating = (currentUser && story.ratings?.[currentUser.uid]) || 0;

  useEffect(() => {
    setIsEditing(false);
  }, []);

  // Reset activeTab to 'read' when exiting edit mode
  useEffect(() => {
    if (!isEditing) {
      setActiveTab('read');
    }
  }, [isEditing]);

  const handleSyncAndClose = async () => {
    if (dirty || isSyncing) {
      try {
        if (syncChangesToDatabase) {
          await syncChangesToDatabase();
        }
      } catch (err) {
        console.error('Failed to sync on close:', err);
      }
    }
    if (onExit) {
      onExit();
    }
  };

  // Unified keyboard navigation is now registered below handleWordClick

  // Core TTS executors using custom hook actions
  const handleReadChapter = () => {
    if (!activeChapter) return;
    // When swapped, the effective primary text is the translation, so read that
    // from the display paragraphs instead of the raw chapter content.
    const textToSpeak = stripMarkdown(
      effectiveDisplayParagraphs.map((dp) => dp.original).join('\n'),
    );
    speak(textToSpeak);
  };

  const handleStopSpeech = stop;
  const handlePlayWord = playWord;

  const getPhraseFromRange = (
    startFlatIdx: number,
    endFlatIdx: number,
  ): string => {
    const startWord = chapterWords[startFlatIdx];
    const endWord = chapterWords[endFlatIdx];
    if (!startWord || !endWord || startWord.pIdx !== endWord.pIdx) return '';

    const pIdx = startWord.pIdx;
    const dp = effectiveDisplayParagraphs[pIdx];
    if (!dp) return '';

    const targetLangCode = getLanguageCodeFromName(effectivePrimaryLanguage);
    const segments = segmentText(
      dp.original,
      targetLangCode,
      segmentMatchingSet,
    );

    let phrase = '';
    let wordIdx = 0;
    let started = false;

    // Use absolute min and max of indexInPara in case flat indices are out of order
    const minParaIdx = Math.min(startWord.indexInPara, endWord.indexInPara);
    const maxParaIdx = Math.max(startWord.indexInPara, endWord.indexInPara);

    for (let sIdx = 0; sIdx < segments.length; sIdx++) {
      const seg = segments[sIdx];
      if (seg.isWordLike) {
        if (wordIdx === minParaIdx) {
          started = true;
        }
        if (started) {
          phrase += seg.segment;
        }
        if (wordIdx === maxParaIdx) {
          break;
        }
        wordIdx++;
      } else {
        if (started) {
          phrase += seg.segment;
        }
      }
    }
    return phrase;
  };

  const updateSelectedWordForRange = (
    startFlatIdx: number,
    endFlatIdx: number,
  ) => {
    const phrase = getPhraseFromRange(startFlatIdx, endFlatIdx);
    if (!phrase) return;

    if (autoPlayWord) {
      handlePlayWord(phrase);
    }

    const lookupWord = phrase.toLowerCase().trim();
    const savedMatch = (savedVocab || []).find(
      (v) => v.word.toLowerCase().trim() === lookupWord,
    );
    const glossaryMatch = (activeChapter?.vocabulary || []).find(
      (v) => v.word.toLowerCase().trim() === lookupWord,
    );

    let translation = '';
    let partOfSpeech = startFlatIdx !== endFlatIdx ? 'Phrase' : 'Noun';
    let definition = '';

    if (savedMatch) {
      const definitionStr = savedMatch.definition || '';
      const dashIdx = definitionStr.indexOf(' - ');
      if (dashIdx !== -1) {
        translation = definitionStr.substring(0, dashIdx).trim();
        definition = definitionStr.substring(dashIdx + 3).trim();
      } else {
        translation = definitionStr.trim();
      }
      partOfSpeech = savedMatch.partOfSpeech || partOfSpeech;
    } else if (glossaryMatch) {
      const definitionStr = glossaryMatch.definition || '';
      const dashIdx = definitionStr.indexOf(' - ');
      if (dashIdx !== -1) {
        translation = definitionStr.substring(0, dashIdx).trim();
        definition = definitionStr.substring(dashIdx + 3).trim();
      } else {
        translation = definitionStr.trim();
      }
      partOfSpeech = glossaryMatch.partOfSpeech || partOfSpeech;
    }

    const startWord = chapterWords[startFlatIdx];
    setSelectedWord({
      word: phrase,
      context: startWord ? startWord.paragraphText : '',
      translation,
      partOfSpeech,
      definition,
      isFetching: false,
      saveSuccess: false,
    });
  };

  // Triggered on word click: Pronounces and pops up translation builder
  const handleWordClick = (
    _wordClean: string,
    _fullParagraph: string,
    pIdx: number,
    indexInPara: number,
  ) => {
    const clickedFlatIdx = chapterWords.findIndex(
      (w) => w.pIdx === pIdx && w.indexInPara === indexInPara,
    );
    if (clickedFlatIdx === -1) return;

    let newRange: [number, number] | null = [clickedFlatIdx, clickedFlatIdx];

    if (selectedWordRange !== null) {
      const [start, end] = selectedWordRange;
      const startWord = chapterWords[start];
      const clickedWord = chapterWords[clickedFlatIdx];

      // Must be in the same paragraph
      if (startWord && clickedWord && startWord.pIdx === clickedWord.pIdx) {
        if (clickedFlatIdx === start && clickedFlatIdx === end) {
          // Single word clicked again -> Deselect completely
          setSelectedWordRange(null);
          setSelectedWord(null);
          return;
        } else if (clickedFlatIdx === start) {
          // Start word clicked again -> Shrink range by unselecting start
          const updatedRange: [number, number] = [start + 1, end];
          setSelectedWordRange(updatedRange);
          updateSelectedWordForRange(updatedRange[0], updatedRange[1]);
          return;
        } else if (clickedFlatIdx === end) {
          // End word clicked again -> Shrink range by unselecting end
          const updatedRange: [number, number] = [start, end - 1];
          setSelectedWordRange(updatedRange);
          updateSelectedWordForRange(updatedRange[0], updatedRange[1]);
          return;
        } else if (clickedFlatIdx > start && clickedFlatIdx < end) {
          // Inside the range clicked -> Collapse selection to just the clicked word
          const updatedRange: [number, number] = [
            clickedFlatIdx,
            clickedFlatIdx,
          ];
          setSelectedWordRange(updatedRange);
          updateSelectedWordForRange(updatedRange[0], updatedRange[1]);
          return;
        }

        const proposedStart = Math.min(start, clickedFlatIdx);
        const proposedEnd = Math.max(end, clickedFlatIdx);
        const wordCount = proposedEnd - proposedStart + 1;
        if (wordCount <= 50) {
          newRange = [proposedStart, proposedEnd];
        }
      }
    }

    setSelectedWordRange(newRange);
    if (newRange) {
      updateSelectedWordForRange(newRange[0], newRange[1]);
    }
  };

  const handleNavigateNext = () => {
    if (
      selectedWordRange !== null &&
      selectedWordRange[1] < chapterWords.length - 1
    ) {
      const nextIdx = selectedWordRange[1] + 1;
      const newRange: [number, number] = [nextIdx, nextIdx];
      setSelectedWordRange(newRange);
      updateSelectedWordForRange(newRange[0], newRange[1]);
    }
  };

  const handleNavigatePrev = () => {
    if (selectedWordRange !== null && selectedWordRange[0] > 0) {
      const prevIdx = selectedWordRange[0] - 1;
      const newRange: [number, number] = [prevIdx, prevIdx];
      setSelectedWordRange(newRange);
      updateSelectedWordForRange(newRange[0], newRange[1]);
    }
  };

  // Reset selectedWordRange when toast closes or when range is out of bounds
  useEffect(() => {
    if (selectedWord === null) {
      setSelectedWordRange(null);
    } else if (selectedWordRange !== null) {
      const [start, end] = selectedWordRange;
      if (
        start < 0 ||
        end >= chapterWords.length ||
        !chapterWords[start] ||
        !chapterWords[end]
      ) {
        setSelectedWordRange(null);
      }
    }
  }, [selectedWord, selectedWordRange, chapterWords]);

  // Ensure the highlighted / selected word is smoothly scrolled well above the bottom toast (showing upcoming lines)
  useEffect(() => {
    if (!selectedWord) return;

    // Small delay to allow layout and toast rendering to settle
    const timeoutId = setTimeout(() => {
      const activeEl =
        document.querySelector('[data-active-word="true"]') ||
        (selectedWordRange && chapterWords[selectedWordRange[0]]
          ? document.getElementById(
              `chapter-para-${chapterWords[selectedWordRange[0]].pIdx}`,
            )
          : null);

      if (!activeEl) return;

      const rect = activeEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      // Position the active highlighted word around 18% from the top (leaving 4-6 lines visible below it)
      const desiredTop = Math.max(70, Math.min(140, viewportHeight * 0.18));
      const bottomThreshold = viewportHeight - 340; // Clearance above toast

      // If hidden behind or near the bottom toast, or not scrolled up enough to show subsequent lines
      if (rect.bottom > bottomThreshold || rect.top < 65) {
        const scrollDelta = rect.top - desiredTop;
        window.scrollBy({
          top: scrollDelta,
          behavior: 'smooth',
        });
      }
    }, 80);

    return () => clearTimeout(timeoutId);
  }, [selectedWord, selectedWordRange, chapterWords]);

  // Helper checks for range adjustment (up to 50 words)
  const canExtendLeft =
    selectedWordRange !== null &&
    selectedWordRange[0] > 0 &&
    selectedWordRange[0] < chapterWords.length &&
    chapterWords[selectedWordRange[0] - 1]?.pIdx ===
      chapterWords[selectedWordRange[0]]?.pIdx &&
    selectedWordRange[1] - (selectedWordRange[0] - 1) + 1 <= 50;

  const canShrinkLeft =
    selectedWordRange !== null && selectedWordRange[0] < selectedWordRange[1];

  const canShrinkRight =
    selectedWordRange !== null && selectedWordRange[0] < selectedWordRange[1];

  const canExtendRight =
    selectedWordRange !== null &&
    selectedWordRange[1] >= 0 &&
    selectedWordRange[1] < chapterWords.length - 1 &&
    chapterWords[selectedWordRange[1] + 1]?.pIdx ===
      chapterWords[selectedWordRange[1]]?.pIdx &&
    selectedWordRange[1] + 1 - selectedWordRange[0] + 1 <= 50;

  const handleExtendLeft = () => {
    if (canExtendLeft && selectedWordRange) {
      const newRange: [number, number] = [
        selectedWordRange[0] - 1,
        selectedWordRange[1],
      ];
      setSelectedWordRange(newRange);
      updateSelectedWordForRange(newRange[0], newRange[1]);
    }
  };

  const handleShrinkLeft = () => {
    if (canShrinkLeft && selectedWordRange) {
      const newRange: [number, number] = [
        selectedWordRange[0] + 1,
        selectedWordRange[1],
      ];
      setSelectedWordRange(newRange);
      updateSelectedWordForRange(newRange[0], newRange[1]);
    }
  };

  const handleShrinkRight = () => {
    if (canShrinkRight && selectedWordRange) {
      const newRange: [number, number] = [
        selectedWordRange[0],
        selectedWordRange[1] - 1,
      ];
      setSelectedWordRange(newRange);
      updateSelectedWordForRange(newRange[0], newRange[1]);
    }
  };

  const handleExtendRight = () => {
    if (canExtendRight && selectedWordRange) {
      const newRange: [number, number] = [
        selectedWordRange[0],
        selectedWordRange[1] + 1,
      ];
      setSelectedWordRange(newRange);
      updateSelectedWordForRange(newRange[0], newRange[1]);
    }
  };

  const getOffsetsForWordRange = useCallback(
    (
      startFlatIdx: number,
      endFlatIdx: number,
    ): { startOffset: number; endOffset: number } | null => {
      const startWord = chapterWords[startFlatIdx];
      const endWord = chapterWords[endFlatIdx];
      if (!startWord || !endWord || startWord.pIdx !== endWord.pIdx)
        return null;

      const pIdx = startWord.pIdx;
      const dp = effectiveDisplayParagraphs[pIdx];
      if (!dp) return null;

      const targetLangCode = getLanguageCodeFromName(effectivePrimaryLanguage);
      const segments = segmentText(
        dp.original,
        targetLangCode,
        segmentMatchingSet,
      );

      const minParaIdx = Math.min(startWord.indexInPara, endWord.indexInPara);
      const maxParaIdx = Math.max(startWord.indexInPara, endWord.indexInPara);

      let wordIdx = 0;
      let currPos = 0;
      let startOffset = 0;
      let endOffset = dp.original.length;
      let foundStart = false;

      for (let sIdx = 0; sIdx < segments.length; sIdx++) {
        const seg = segments[sIdx];
        const segLen = seg.segment.length;
        if (seg.isWordLike) {
          if (wordIdx === minParaIdx && !foundStart) {
            startOffset = currPos;
            foundStart = true;
          }
          if (wordIdx === maxParaIdx) {
            endOffset = currPos + segLen;
            break;
          }
          wordIdx++;
        }
        currPos += segLen;
      }

      return { startOffset, endOffset };
    },
    [
      chapterWords,
      effectiveDisplayParagraphs,
      effectivePrimaryLanguage,
      segmentMatchingSet,
    ],
  );

  const activeHighlightForToast = useMemo<StoryHighlight | null>(() => {
    if (!selectedWordRange) return null;
    const offsets = getOffsetsForWordRange(
      selectedWordRange[0],
      selectedWordRange[1],
    );
    if (!offsets) return null;
    const pIdx = chapterWords[selectedWordRange[0]]?.pIdx;
    if (pIdx === undefined) return null;

    const paraHighlights = getHighlightsForParagraph(activeChapterIndex, pIdx);
    return (
      paraHighlights.find(
        (h) =>
          (offsets.startOffset >= h.startOffset &&
            offsets.endOffset <= h.endOffset) ||
          (h.startOffset >= offsets.startOffset &&
            h.endOffset <= offsets.endOffset) ||
          (offsets.startOffset < h.endOffset &&
            offsets.endOffset > h.startOffset),
      ) || null
    );
  }, [
    selectedWordRange,
    getOffsetsForWordRange,
    chapterWords,
    getHighlightsForParagraph,
    activeChapterIndex,
  ]);

  const handleToastHighlightColor = (color: HighlightColor) => {
    if (!selectedWordRange || !selectedWord) return;
    const offsets = getOffsetsForWordRange(
      selectedWordRange[0],
      selectedWordRange[1],
    );
    if (!offsets) return;
    const pIdx = chapterWords[selectedWordRange[0]]?.pIdx;
    if (pIdx === undefined) return;

    if (activeHighlightForToast) {
      updateHighlight(activeHighlightForToast.id, { color });
    } else {
      addHighlight({
        text: selectedWord.word,
        chapterIndex: activeChapterIndex,
        paragraphIndex: pIdx,
        startOffset: offsets.startOffset,
        endOffset: offsets.endOffset,
        color,
      });
    }
  };

  const handleToastHighlightNote = (note: string) => {
    if (!selectedWordRange || !selectedWord) return;
    const offsets = getOffsetsForWordRange(
      selectedWordRange[0],
      selectedWordRange[1],
    );
    if (!offsets) return;
    const pIdx = chapterWords[selectedWordRange[0]]?.pIdx;
    if (pIdx === undefined) return;

    if (activeHighlightForToast) {
      updateHighlight(activeHighlightForToast.id, { note });
    } else {
      addHighlight({
        text: selectedWord.word,
        chapterIndex: activeChapterIndex,
        paragraphIndex: pIdx,
        startOffset: offsets.startOffset,
        endOffset: offsets.endOffset,
        color: 'yellow',
        note,
      });
    }
  };

  const handleToastDeleteHighlight = () => {
    if (activeHighlightForToast) {
      removeHighlight(activeHighlightForToast.id);
    }
  };

  const handleHighlightClick = (
    highlight: StoryHighlight,
    _position?: { x: number; y: number },
  ) => {
    const pIdx = highlight.paragraphIndex;
    const dp = effectiveDisplayParagraphs[pIdx];
    if (!dp) return;

    const targetLangCode = getLanguageCodeFromName(effectivePrimaryLanguage);
    const segments = segmentText(
      dp.original,
      targetLangCode,
      segmentMatchingSet,
    );

    const matchingWords = chapterWords
      .map((w, idx) => ({ ...w, flatIdx: idx }))
      .filter((w) => w.pIdx === pIdx);

    let currPos = 0;
    let wordIdx = 0;
    const wordSpans: { flatIdx: number; startPos: number; endPos: number }[] =
      [];

    for (const seg of segments) {
      const start = currPos;
      const end = currPos + seg.segment.length;
      currPos = end;
      if (seg.isWordLike) {
        const found = matchingWords.find((mw) => mw.indexInPara === wordIdx);
        if (found) {
          wordSpans.push({
            flatIdx: found.flatIdx,
            startPos: start,
            endPos: end,
          });
        }
        wordIdx++;
      }
    }

    const overlapping = wordSpans.filter(
      (ws) =>
        ws.startPos < highlight.endOffset && ws.endPos > highlight.startOffset,
    );

    if (overlapping.length > 0) {
      const firstFlatIdx = overlapping[0].flatIdx;
      const lastFlatIdx = overlapping[overlapping.length - 1].flatIdx;
      const newRange: [number, number] = [firstFlatIdx, lastFlatIdx];
      setSelectedWordRange(newRange);
      updateSelectedWordForRange(firstFlatIdx, lastFlatIdx);
    } else {
      if (autoPlayWord) {
        handlePlayWord(highlight.text);
      }
      setSelectedWord({
        word: highlight.text,
        context: dp.original,
        translation: '',
        partOfSpeech: 'Phrase',
        definition: '',
        isFetching: false,
        saveSuccess: false,
      });
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0)
      return;
    const text = selection.toString().trim();
    if (!text || text.length < 1) return;

    const anchorNode = selection.anchorNode;
    const paraEl =
      anchorNode instanceof HTMLElement
        ? anchorNode.closest('[data-paragraph-index]')
        : anchorNode?.parentElement?.closest('[data-paragraph-index]');

    if (!paraEl) return;
    const pIdxStr = paraEl.getAttribute('data-paragraph-index');
    if (pIdxStr === null) return;
    const pIdx = parseInt(pIdxStr, 10);
    const dp = effectiveDisplayParagraphs[pIdx];
    if (!dp) return;

    const matchingWords = chapterWords
      .map((w, idx) => ({ ...w, flatIdx: idx }))
      .filter((w) => w.pIdx === pIdx);

    const startOffset = Math.max(0, dp.original.indexOf(text));
    const endOffset = startOffset + text.length;

    const targetLangCode = getLanguageCodeFromName(effectivePrimaryLanguage);
    const segments = segmentText(
      dp.original,
      targetLangCode,
      segmentMatchingSet,
    );

    let currPos = 0;
    let wordIdx = 0;
    const wordSpans: { flatIdx: number; startPos: number; endPos: number }[] =
      [];

    for (const seg of segments) {
      const start = currPos;
      const end = currPos + seg.segment.length;
      currPos = end;
      if (seg.isWordLike) {
        const found = matchingWords.find((mw) => mw.indexInPara === wordIdx);
        if (found) {
          wordSpans.push({
            flatIdx: found.flatIdx,
            startPos: start,
            endPos: end,
          });
        }
        wordIdx++;
      }
    }

    const overlapping = wordSpans.filter(
      (ws) => ws.startPos < endOffset && ws.endPos > startOffset,
    );

    if (overlapping.length > 0) {
      const firstFlatIdx = overlapping[0].flatIdx;
      const lastFlatIdx = overlapping[overlapping.length - 1].flatIdx;
      setSelectedWordRange([firstFlatIdx, lastFlatIdx]);
      updateSelectedWordForRange(firstFlatIdx, lastFlatIdx);
    } else {
      if (autoPlayWord) {
        handlePlayWord(text);
      }
      setSelectedWord({
        word: text,
        context: dp.original,
        translation: '',
        partOfSpeech: 'Phrase',
        definition: '',
        isFetching: false,
        saveSuccess: false,
      });
    }
  };

  const handleJumpToHighlight = (highlight: StoryHighlight) => {
    const paraEl = document.getElementById(
      `chapter-para-${highlight.paragraphIndex}`,
    );
    if (paraEl) {
      paraEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      paraEl.classList.add('ring-2', 'ring-tj-primary', 'rounded-xl');
      setTimeout(() => {
        paraEl.classList.remove('ring-2', 'ring-tj-primary', 'rounded-xl');
      }, 2000);
    }
  };

  const playSentenceContainingWord = (word: string, paragraphText: string) => {
    if (!window.speechSynthesis) return;

    const targetLangCode = getLanguageCodeFromName(effectivePrimaryLanguage);
    let sentenceToPlay = paragraphText;

    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      try {
        const segmenter = new Intl.Segmenter(targetLangCode, {
          granularity: 'sentence',
        });
        const sentences = Array.from(segmenter.segment(paragraphText)) as any[];
        const found = sentences.find((s) =>
          s.segment.toLowerCase().includes(word.toLowerCase()),
        );
        if (found) {
          sentenceToPlay = found.segment.trim();
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      const sentenceBoundaries = /([.!?。！？]|\n)/;
      const parts = paragraphText.split(sentenceBoundaries);
      const reconstructed: string[] = [];
      let current = '';
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part.match(sentenceBoundaries)) {
          current += part;
          reconstructed.push(current.trim());
          current = '';
        } else {
          current += part;
        }
      }
      if (current.trim()) reconstructed.push(current.trim());

      const found = reconstructed.find((s) =>
        s.toLowerCase().includes(word.toLowerCase()),
      );
      if (found) {
        sentenceToPlay = found;
      }
    }

    handlePlayWord(sentenceToPlay);
  };

  // Keyboard arrow key navigation for Zen Mode and Word-by-Word Vocab Box
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if the user is typing in an input, textarea, or contenteditable element
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.hasAttribute('contenteditable'))
      ) {
        return;
      }

      if (selectedWordRange !== null) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNavigateNext();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleNavigatePrev();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const activeWord = chapterWords[selectedWordRange[0]];
          if (activeWord) {
            const phrase = getPhraseFromRange(
              selectedWordRange[0],
              selectedWordRange[1],
            );
            handlePlayWord(phrase || activeWord.word);
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const activeWord = chapterWords[selectedWordRange[0]];
          if (activeWord) {
            const phrase = getPhraseFromRange(
              selectedWordRange[0],
              selectedWordRange[1],
            );
            playSentenceContainingWord(
              phrase || activeWord.word,
              activeWord.paragraphText,
            );
          }
        }
        return;
      }

      if (isZenMode) {
        if (e.key === 'ArrowRight') {
          if (activeChapterIndex < (story.chapters?.length ?? 0) - 1) {
            onSelectChapter(activeChapterIndex + 1);
          }
        } else if (e.key === 'ArrowLeft') {
          if (activeChapterIndex > 0) {
            onSelectChapter(activeChapterIndex - 1);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isZenMode,
    activeChapterIndex,
    story.chapters?.length ?? 0,
    onSelectChapter,
    selectedWordRange,
    chapterWords,
    playSentenceContainingWord,
    handlePlayWord,
    handleNavigateNext,
    handleNavigatePrev,
    getPhraseFromRange,
  ]);

  // Calls backend to automatically fetch Translation / Definition details via Gemini
  const handleFetchTranslation = async () => {
    if (!selectedWord) return;

    if (!currentUser) {
      if (onShowAlert) {
        onShowAlert(
          'Sign In Required',
          'Please sign in to translate words on-the-fly and save them to your vocabulary builder list.',
          'warning',
        );
      } else {
        alert('Please sign in to translate words on-the-fly.');
      }
      return;
    }

    setSelectedWord((prev) => (prev ? { ...prev, isFetching: true } : null));

    try {
      const headers = buildApiHeaders(customOpenRouterKey);

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          word: selectedWord.word,
          language: effectivePrimaryLanguage,
          context: selectedWord.context,
          targetLanguage: translationTargetLanguage || 'English',
          model: defaultTranslationModel || 'google/gemini-2.5-flash-lite',
          userId: currentUser?.uid,
          userEmail: currentUser?.email,
        }),
      });

      if (response.status === 429) {
        if (onShowAlert) {
          onShowAlert(
            'Rate Limit Exceeded',
            'You are looking up words too quickly. Please slow down and try again in a moment.',
            'warning',
          );
        }
        throw new Error('Rate limit exceeded');
      }

      if (!response.ok) {
        throw new Error('Fallback translating details.');
      }

      const data = await response.json();

      setSelectedWord((prev) =>
        prev
          ? {
              ...prev,
              translation: data.translation || '',
              partOfSpeech: data.partOfSpeech || 'Noun',
              definition: data.definition || '',
              isFetching: false,
            }
          : null,
      );
    } catch (err) {
      console.error(err);
      setSelectedWord((prev) =>
        prev
          ? { ...prev, isFetching: false, translation: 'Manual Translate' }
          : null,
      );
    }
  };

  const handleLanguageConfirm = (selectedLang: string) => {
    setTranslationTargetLanguage(selectedLang);
    setShowLanguageModal(false);

    // Automatically trigger translation lookup now that the target language is set!
    handleFetchTranslation();
  };

  const handleLanguageCancel = () => {
    setShowLanguageModal(false);
  };

  // Prompt for preferred translation language when the toast comes up
  useEffect(() => {
    if (selectedWord && translationTargetLanguage === null) {
      setShowLanguageModal(true);
    }
  }, [selectedWord, translationTargetLanguage]);

  const handleSaveWordRecord = () => {
    if (!selectedWord || !onSaveWord) return;

    if (!selectedWord.translation.trim()) {
      if (onShowAlert) {
        onShowAlert(
          'Translation Required',
          'Please enter or fetch a translation before saving.',
          'warning',
        );
      } else {
        alert('Please entering or fetching a translation before saving.');
      }
      return;
    }

    const langCode = getLanguageCodeFromName(story.language);
    const smartContext = limitContextToTenWords(
      selectedWord.context,
      selectedWord.word,
      langCode,
    );

    const newVocab: VocabularyTerm = {
      word: selectedWord.word,
      partOfSpeech: selectedWord.partOfSpeech,
      definition: `${selectedWord.translation} ${selectedWord.definition ? `- ${selectedWord.definition}` : ''}`,
      contextSentence: smartContext,
      language: story.language,
    };

    onSaveWord(newVocab);
    setSelectedWord((prev) => (prev ? { ...prev, saveSuccess: true } : null));

    // Auto-dismiss inside 1.5 seconds
    setTimeout(() => {
      setSelectedWord(null);
    }, 1500);
  };

  const isSelectedWordSaved = useMemo(() => {
    if (!selectedWord) return false;
    return savedWordsSet.has(selectedWord.word.toLowerCase().trim());
  }, [selectedWord, savedWordsSet]);

  const handleRemoveWordRecord = () => {
    if (!selectedWord || !onRemoveWord) return;
    onRemoveWord(selectedWord.word);
    setSelectedWord(null);
    setSelectedWordRange(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
      {/* CHAPTER DRAWER NAVIGATION SIDEBAR */}
      {!isZenMode && (
        <ChapterSidebar
          isOnline={isOnline}
          story={story}
          activeChapterIndex={activeChapterIndex}
          onSelectChapter={(index) => {
            onSelectChapter(index);
          }}
          onGenerateNextChapter={onGenerateNextChapter}
          isLoadingNext={isLoadingNext}
          isAutoGeneratingRemaining={isAutoGeneratingRemaining}
          isAutoGenerationPaused={isAutoGenerationPaused}
          onAutoGenerateAll={onAutoGenerateAll}
          onCancelGeneration={onCancelGeneration}
          generationStatus={generationStatus}
          currentUser={currentUser}
          onRateStory={onRateStory}
          isCreator={Boolean(isCreator)}
          onRegenerateChapter={
            onRegenerateChapter
              ? (guidance) => onRegenerateChapter(activeChapterIndex, guidance)
              : undefined
          }
          onDeleteChapter={onDeleteChapter}
          onAddCustomChapter={onAddCustomChapter}
          customOpenRouterKey={customOpenRouterKey}
          isEditing={isEditing}
          isPaid={isPaid}
          onViewAudits={() => {
            setIsEditing(true);
            setActiveTab('maintenance');
            setMaintenanceSubTab('audits');
          }}
          onGenerateGlossary={onGenerateGlossary}
          onStoryUpdated={onStoryUpdated}
          onGenerateCover={onGenerateCover}
          highlights={highlights}
          onJumpToHighlight={handleJumpToHighlight}
          onDeleteHighlight={removeHighlight}
        />
      )}

      {/* READING CENTER VIEWPORT */}
      <div
        ref={readerRef}
        className={`${isZenMode ? 'lg:col-span-4 py-8 px-4 sm:px-0' : 'lg:col-span-3'} order-1 lg:order-2 space-y-6 scroll-mt-20`}
        style={{ scrollMarginTop: '80px' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeChapter?.chapterNumber ?? 'empty'}-${activeTab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            drag={isZenMode ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_event, info) => {
              if (!isZenMode) return;
              const swipeThreshold = 80;
              if (info.offset.x < -swipeThreshold) {
                if (activeChapterIndex < (story.chapters?.length ?? 0) - 1) {
                  onSelectChapter(activeChapterIndex + 1);
                }
              } else if (info.offset.x > swipeThreshold) {
                if (activeChapterIndex > 0) {
                  onSelectChapter(activeChapterIndex - 1);
                }
              }
            }}
            className={`bg-tj-bg-card text-tj-text-main ${isZenMode ? 'p-6 sm:p-12 md:p-16' : 'p-4 sm:p-6 md:p-8'} ${
              selectedWord ? 'pb-72 sm:pb-80' : ''
            } ${
              columnWidth === 'narrow'
                ? 'max-w-xl'
                : columnWidth === 'wide'
                  ? 'max-w-5xl'
                  : columnWidth === 'full'
                    ? 'max-w-full'
                    : 'max-w-3xl'
            } sm:rounded-lg border-x-0 border-y sm:border border-tj-border-main shadow-none mx-auto relative overflow-hidden transition-all duration-300`}
          >
            <ScrollToTop readerRef={readerRef} />
            {/* Terracotta progress bookmark line at the top of the reading view card */}
            {story.totalChapters > 0 && activeChapter && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-tj-primary-light sm:rounded-t overflow-hidden">
                <div
                  className="h-full bg-tj-tertiary transition-all duration-300"
                  style={{
                    width: `${Math.round(((activeChapterIndex + 1) / story.totalChapters) * 100)}%`,
                  }}
                ></div>
              </div>
            )}

            {/* Unsaved Story Banner Alert */}
            {!isZenMode && story.isUnsaved && (
              <div className="mb-6 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-955/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs select-none">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Unsaved Draft Story
                  </h4>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 leading-relaxed font-medium max-w-xl font-sans">
                    This story is currently stored in memory. You can continue
                    generating chapters, outlines, and vocab lists. Make sure to
                    click <strong>Save Draft</strong> to store it permanently in
                    the database!
                  </p>
                </div>
                {onSaveStory && (
                  <button
                    type="button"
                    onClick={() => onSaveStory(story)}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-98 shrink-0 font-sans border-0 select-none"
                  >
                    <Save className="w-3.5 h-3.5 text-white" />
                    <span>Save Draft</span>
                  </button>
                )}
              </div>
            )}

            {/* TABS HEADER FOR CREATORS */}
            {!isZenMode && isCreator && isEditing && (
              <div className="flex border-b border-tj-border-main mb-6 font-sans text-xs select-none">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('read');
                  }}
                  className={`px-4 py-2.5 border-b-2 font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'read'
                      ? 'border-tj-success text-tj-success'
                      : 'border-transparent text-tj-text-muted hover:text-tj-text-main'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Read Chapter</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('maintenance');
                  }}
                  className={`px-4 py-2.5 border-b-2 font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'maintenance'
                      ? 'border-tj-success text-tj-success'
                      : 'border-transparent text-tj-text-muted hover:text-tj-text-main'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Narrative Maintenance</span>
                </button>
              </div>
            )}

            {activeTab === 'maintenance' && isCreator ? (
              <NarrativeMaintenancePanel
                story={story}
                onStoryUpdated={onStoryUpdated || (() => {})}
                onSaveStory={onSaveStory}
                customOpenRouterKey={customOpenRouterKey}
                onShowAlert={onShowAlert}
                isOnline={isOnline}
                activeSubTab={maintenanceSubTab}
                setActiveSubTab={setMaintenanceSubTab}
              />
            ) : (
              <>
                {/* TTS PLAYER BAR AND STYLE TOOLBAR */}
                {!isZenMode ? (
                  activeChapter ? (
                    <TTSToolbar
                      isSpeaking={isSpeaking}
                      isPaused={isPaused}
                      handleReadChapter={handleReadChapter}
                      handleStopSpeech={handleStopSpeech}
                      selectedVoiceName={selectedVoiceName}
                      setSelectedVoiceName={setSelectedVoiceName}
                      voices={voices}
                      speechRate={speechRate}
                      setSpeechRate={setSpeechRate}
                      useSerif={useSerif}
                      setUseSerif={setUseSerif}
                      fontSize={fontSize}
                      setFontSize={setFontSize}
                      alignment={alignment}
                      setAlignment={setAlignment}
                      columnWidth={columnWidth}
                      setColumnWidth={setColumnWidth}
                      cefrLevel={story.cefrLevel}
                      showBilingual={showBilingual}
                      setShowBilingual={setShowBilingual}
                      onToggleZen={() => onToggleZen(true)}
                      isCreator={Boolean(isCreator)}
                      isAdmin={isAdmin}
                      isEditing={isEditing}
                      onEditClick={() => setIsEditing(true)}
                      onDeleteClick={() => setShowDeleteModal(true)}
                      onFlagClick={() => onFlagStory && onFlagStory(story)}
                      canSwapLanguages={canSwapLanguages}
                      isSwapped={isSwapped}
                      onToggleSwap={() => setIsSwapped((s) => !s)}
                      primaryLanguage={story.language}
                      translationLanguage={story.translationLanguage}
                      isReaderSettingsOpen={isReaderSettingsOpen}
                      onReaderSettingsOpenChange={setIsReaderSettingsOpen}
                      autoPlayWord={autoPlayWord}
                      setAutoPlayWord={setAutoPlayWord}
                    />
                  ) : null
                ) : (
                  <div className="absolute top-4 right-4 z-10">
                    <button
                      type="button"
                      onClick={() => onToggleZen(false)}
                      title="Exit Zen Mode"
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-tj-primary dark:hover:text-tj-primary-hover rounded-full transition-all cursor-pointer shadow-sm flex items-center justify-center border border-slate-200/50 dark:border-slate-800"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Chapter Cover Image (for Chapter 1) */}
                {activeChapterIndex === 0 &&
                  activeChapter &&
                  (isGeneratingCover || !coverImgError) && (
                    <div className="flex justify-center mb-8 mt-2 select-none">
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="relative w-full max-w-[240px] sm:max-w-[280px] aspect-[3/4.2] rounded-lg overflow-hidden shadow-[0_8px_24px_-4px_rgba(0,0,0,0.15),_0_2px_8px_-2px_rgba(0,0,0,0.1)] border border-slate-200/60 dark:border-white/10"
                      >
                        {isGeneratingCover ? (
                          <div className="absolute inset-0 bg-tj-bg-card border flex flex-col items-center justify-center p-4 text-center">
                            <div className="w-8 h-8 border-2 border-tj-primary border-t-transparent rounded-full animate-spin mb-2" />
                            <span className="text-xs font-bold text-tj-text-main">
                              Generating Cover...
                            </span>
                          </div>
                        ) : (
                          <>
                            <img
                              src={getStoryCoverUrl(story)}
                              onError={() => setCoverImgError(true)}
                              className="w-full h-full object-cover"
                              alt={`${story.title} Cover`}
                              loading="eager"
                            />
                          </>
                        )}
                      </motion.div>
                    </div>
                  )}

                {/* Chapter header titles */}
                {activeChapter && (
                  <div className="mb-6 select-text">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <h2
                          lang={getLanguageCodeFromName(
                            effectivePrimaryLanguage,
                          )}
                          className="text-2xl sm:text-[28px] font-medium font-serif text-tj-text-main tracking-tight leading-[36px] break-words"
                        >
                          {activeChapter.title}
                        </h2>
                        <div className="h-0.5 w-12 bg-tj-tertiary mt-3"></div>
                      </div>
                      {!isZenMode && (
                        <div className="shrink-0 flex items-center">
                          <button
                            type="button"
                            onClick={handleSyncAndClose}
                            className="text-xs font-sans text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-colors cursor-pointer select-none flex items-center justify-center p-1 border-0 bg-transparent focus:outline-none"
                            title="Sync progress and exit book"
                          >
                            {dirty || isSyncing ? (
                              <span className="font-medium">Saving...</span>
                            ) : (
                              <CloseIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!isZenMode && activeChapter && (
                  <nav aria-label="Chapter navigation" className="mb-6">
                    <ChapterNavigationBar
                      story={story}
                      activeChapterIndex={activeChapterIndex}
                      onSelectChapter={onSelectChapter}
                      onGenerateNextChapter={onGenerateNextChapter}
                      isLoadingNext={isLoadingNext}
                      isAutoGeneratingRemaining={isAutoGeneratingRemaining}
                      isPaid={isPaid}
                      nextChapterCreditCost={nextChapterCreditCost}
                    />
                  </nav>
                )}

                {!activeChapter ? (
                  <div className="flex flex-col items-center justify-center py-16 text-tj-text-muted text-center space-y-3 select-text">
                    <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 animate-pulse" />
                    <p className="text-sm font-medium">No chapters yet.</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Use the sidebar to generate or add a chapter.
                    </p>
                  </div>
                ) : isEditing ? (
                  <ChapterEditForm
                    story={story}
                    activeChapter={activeChapter}
                    activeChapterIndex={activeChapterIndex}
                    fontSize={fontSize}
                    customOpenRouterKey={customOpenRouterKey}
                    onStoryUpdated={onStoryUpdated}
                    onSaveStory={onSaveStory}
                    onShowAlert={onShowAlert}
                    onClose={() => setIsEditing(false)}
                  />
                ) : (
                  <>
                    <section
                      lang={getLanguageCodeFromName(effectivePrimaryLanguage)}
                      onMouseUp={handleTextSelection}
                      onTouchEnd={handleTextSelection}
                      className={`space-y-6 select-text ${useSerif ? 'font-serif' : 'font-sans'}`}
                      style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
                    >
                      {effectiveDisplayParagraphs.map((dp, idx) => {
                        const startWord = selectedWordRange
                          ? chapterWords[selectedWordRange[0]]
                          : undefined;
                        const endWord = selectedWordRange
                          ? chapterWords[selectedWordRange[1]]
                          : undefined;
                        const isActiveParagraph =
                          startWord !== undefined && startWord.pIdx === idx;
                        const activeWordRangeInPara: [number, number] | null =
                          isActiveParagraph && startWord && endWord
                            ? [startWord.indexInPara, endWord.indexInPara]
                            : null;
                        const paraHighlights = getHighlightsForParagraph(
                          activeChapterIndex,
                          idx,
                        );
                        return (
                          <div
                            key={idx}
                            className="space-y-2 mb-6 group/para relative"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <InteractiveParagraph
                                  paragraphText={dp.original}
                                  pIdx={idx}
                                  language={effectivePrimaryLanguage}
                                  handleWordClick={handleWordClick}
                                  isBilingual={showBilingual}
                                  glossaryWordsSet={glossaryWordsSet}
                                  savedWordsSet={savedWordsSet}
                                  activeWordRangeInPara={activeWordRangeInPara}
                                  alignment={alignment}
                                  highlights={paraHighlights}
                                  onHighlightClick={handleHighlightClick}
                                />
                              </div>
                              {showBilingual && (
                                <button
                                  type="button"
                                  onClick={() => handlePlayWord(dp.original)}
                                  className="mt-1 p-1.5 text-slate-400 hover:text-tj-primary hover:bg-tj-primary-light dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors shrink-0"
                                  title="Play line narration"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            {showBilingual && dp.translation && (
                              <p
                                translate="yes"
                                className="text-sm text-tj-text-muted font-sans italic pl-4 border-l-2 border-tj-border-main select-text leading-[1.6] pr-8"
                              >
                                {dp.translation}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </section>

                    {/* Explicit book completion section */}
                    {activeChapterIndex ===
                      (story.chapters?.length ?? 0) - 1 && (
                      <div className="mt-8 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/10 dark:to-teal-950/5 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl animate-fade-in text-center space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
                            You've reached the end!
                          </h4>
                          <p className="text-xs text-tj-text-muted max-w-md mx-auto">
                            Congratulations on reading the entire story. Click
                            below to mark it as completed and update your
                            reading stats.
                          </p>
                        </div>
                        {sessionFinished ? (
                          <div className="space-y-3">
                            <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/10">
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>Story Completed!</span>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                if (onStoryFinished) {
                                  await onStoryFinished(story.id);
                                }
                              }}
                              className="block mx-auto text-xs text-tj-primary hover:underline font-semibold cursor-pointer border-0 bg-transparent"
                            >
                              Read again? Mark another completion
                            </button>
                            {onStoryUnfinished && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  setSessionFinished(false);
                                  await onStoryUnfinished(story.id);
                                }}
                                className="block mx-auto text-[10px] text-rose-500 hover:underline font-semibold cursor-pointer border-0 bg-transparent mt-1"
                              >
                                Oops, mark as unread
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              setSessionFinished(true);
                              if (onStoryFinished) {
                                await onStoryFinished(story.id);
                              }
                            }}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 cursor-pointer active:scale-98 border-0"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>I've finished</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Book Rating Section */}
                    {activeChapterIndex ===
                      (story.chapters?.length ?? 0) - 1 && (
                      <div className="mt-4 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-amber-50/40 to-orange-50/30 dark:from-amber-950/10 dark:to-orange-950/5 border border-amber-100/70 dark:border-amber-900/20 rounded-2xl animate-fade-in text-center space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 flex items-center justify-center gap-1.5">
                            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                            How did you like this story?
                          </h4>
                          <p className="text-xs text-tj-text-muted max-w-md mx-auto">
                            Share your feedback to help us recommend better
                            books for you.
                          </p>
                        </div>

                        <div className="p-3 bg-white/80 dark:bg-slate-900/40 backdrop-blur-sm rounded-xl border border-amber-100/50 dark:border-amber-900/10 inline-flex flex-col items-center gap-2 select-none min-w-[240px]">
                          {currentUser ? (
                            <>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold font-sans tracking-wide uppercase">
                                {userRating > 0 ? 'Your rating' : 'Tap to rate'}
                              </p>
                              <div className="flex items-center justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => {
                                  const isStarred =
                                    star <= (hoverRating || userRating);
                                  return (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => onRateStory?.(star)}
                                      onMouseEnter={() => setHoverRating(star)}
                                      onMouseLeave={() => setHoverRating(0)}
                                      className="p-1 hover:scale-125 transition-transform duration-100 cursor-pointer focus:outline-none"
                                    >
                                      <Star
                                        className={`w-8 h-8 transition-colors duration-150 ${
                                          isStarred
                                            ? 'text-amber-500 fill-amber-500 filter drop-shadow-sm'
                                            : 'text-slate-300 dark:text-slate-700'
                                        }`}
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-sans">
                                {Object.keys(story.ratings || {}).length} total{' '}
                                {Object.keys(story.ratings || {}).length === 1
                                  ? 'rating'
                                  : 'ratings'}
                                {story.ratings &&
                                  Object.keys(story.ratings).length > 0 && (
                                    <span className="ml-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                                      (Avg:{' '}
                                      {getAverageRating(story.ratings).toFixed(
                                        1,
                                      )}{' '}
                                      ★)
                                    </span>
                                  )}
                              </p>
                            </>
                          ) : (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-sans py-1">
                              <span>Please sign in to rate this book.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Take it Offline Milestone Callout */}
                    {(story.isCompleted ||
                      (story.chapters?.length ?? 0) === story.totalChapters) &&
                      ((onGenerateGlossary &&
                        (isCreator || isAdmin) &&
                        story.cefrLevel !== 'A1' &&
                        story.cefrLevel !== 'Pre-A1' &&
                        (story.chapters ?? []).some(
                          (ch) => !ch.vocabulary || ch.vocabulary.length === 0,
                        )) ||
                        (activeChapterIndex ===
                          (story.chapters?.length ?? 0) - 1 &&
                          onDownloadEpub)) && (
                        <div className="mt-8 space-y-3 animate-fade-in">
                          {/* Generate Glossary callout — shown when chapters lack vocabulary */}
                          {onGenerateGlossary &&
                            (isCreator || isAdmin) &&
                            story.cefrLevel !== 'A1' &&
                            story.cefrLevel !== 'Pre-A1' &&
                            (story.chapters ?? []).some(
                              (ch) =>
                                !ch.vocabulary || ch.vocabulary.length === 0,
                            ) && (
                              <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/10 border border-violet-200 dark:border-violet-900/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                                <div className="space-y-1">
                                  <h4 className="text-xs font-bold text-violet-800 dark:text-violet-400 flex items-center gap-1.5 uppercase tracking-wider">
                                    <Sparkles className="w-4 h-4 text-violet-500" />
                                    Generate Vocabulary Glossary
                                  </h4>
                                  <p className="text-[11px] text-violet-700/80 dark:text-violet-400/80 leading-relaxed font-medium max-w-xl font-sans">
                                    Your story is complete! Generate vocabulary
                                    terms for all chapters to enable the
                                    interactive word dictionary and EPUB export
                                    with glossary.
                                  </p>
                                </div>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto shrink-0 font-sans">
                                  <div className="relative">
                                    <select
                                      value={selectedGlossaryLanguage}
                                      onChange={(e) =>
                                        setSelectedGlossaryLanguage(
                                          e.target.value,
                                        )
                                      }
                                      className="w-full sm:w-40 pl-3 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-850 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer appearance-none"
                                    >
                                      {SUPPORTED_LANGUAGES.map((lang) => (
                                        <option
                                          key={lang.code}
                                          value={lang.name}
                                        >
                                          {lang.flag} {lang.name}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onGenerateGlossary(
                                        story,
                                        undefined,
                                        selectedGlossaryLanguage,
                                      )
                                    }
                                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-98 shrink-0 font-sans border-0"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-white" />
                                    <span>Generate Glossary</span>
                                  </button>
                                </div>
                              </div>
                            )}

                          {/* Download eBook callout */}
                          {activeChapterIndex ===
                            (story.chapters?.length ?? 0) - 1 &&
                            onDownloadEpub && (
                              <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                                <div className="space-y-1">
                                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                                    <Sparkles className="w-4 h-4 text-emerald-500" />
                                    Story Completed! Take it Offline
                                  </h4>
                                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed font-medium max-w-xl font-sans">
                                    Congratulations on finishing{' '}
                                    <strong>{story.title}</strong>! You can
                                    download this story as a beautifully styled
                                    EPUB eBook to read offline on your Kindle,
                                    Apple Books, or other e-readers, complete
                                    with the bilingual glossary.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={onDownloadEpub}
                                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-98 shrink-0 font-sans border-0"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-white" />
                                  <span>Download eBook</span>
                                </button>
                              </div>
                            )}
                        </div>
                      )}
                  </>
                )}

                {/* Chapter Navigation Buttons (above glossary) */}
                {!isZenMode &&
                  !isEditing &&
                  activeChapter &&
                  activeChapter.vocabulary &&
                  activeChapter.vocabulary.length > 0 && (
                    <div className="mt-8">
                      <ChapterNavigationBar
                        story={story}
                        activeChapterIndex={activeChapterIndex}
                        onSelectChapter={onSelectChapter}
                        onGenerateNextChapter={onGenerateNextChapter}
                        isLoadingNext={isLoadingNext}
                        isAutoGeneratingRemaining={isAutoGeneratingRemaining}
                        isPaid={isPaid}
                        nextChapterCreditCost={nextChapterCreditCost}
                      />
                    </div>
                  )}

                {/* Dynamic glossary extracted terms */}
                {activeChapter && !isEditing && (
                  <VocabGlossary
                    vocabulary={activeChapter.vocabulary}
                    language={story.language}
                    handlePlayWord={handlePlayWord}
                    fontSize={fontSize}
                    isZenMode={isZenMode}
                    activeChapterIndex={activeChapterIndex}
                    onSelectChapter={onSelectChapter}
                    totalChapters={story.chapters?.length ?? 0}
                    onSaveWord={onSaveWord}
                    onRemoveWord={onRemoveWord}
                    savedWordsSet={savedWordsSet}
                  />
                )}

                {/* Chapter Navigation Buttons */}
                {!isZenMode && activeChapter && (
                  <div className="mt-8">
                    <ChapterNavigationBar
                      story={story}
                      activeChapterIndex={activeChapterIndex}
                      onSelectChapter={onSelectChapter}
                      onGenerateNextChapter={onGenerateNextChapter}
                      isLoadingNext={isLoadingNext}
                      isAutoGeneratingRemaining={isAutoGeneratingRemaining}
                      isPaid={isPaid}
                      nextChapterCreditCost={nextChapterCreditCost}
                    />
                  </div>
                )}

                {!isZenMode ? (
                  <div className="mt-6 pt-4 border-t border-tj-border-main flex items-center justify-between text-[11px] text-tj-text-muted font-mono">
                    <span>
                      Tip: Click on any word to play its audio narration &
                      translate.
                    </span>
                    <span>
                      {countWords(activeChapter?.content ?? '', story.language)}{' '}
                      words
                    </span>
                  </div>
                ) : (
                  <div className="mt-8 pt-4 border-t border-tj-border-main/40 flex items-center justify-between text-[10px] text-tj-text-muted/50 font-sans tracking-wider w-full">
                    <button
                      type="button"
                      disabled={activeChapterIndex === 0}
                      onClick={() => onSelectChapter(activeChapterIndex - 1)}
                      className="p-1 hover:bg-tj-primary-light dark:hover:bg-slate-800 text-tj-text-muted hover:text-tj-primary rounded transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center border border-transparent"
                      title="Previous Chapter (Left Arrow)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-center px-2">
                      Swipe or use left/right arrow keys to navigate
                    </span>
                    <button
                      type="button"
                      disabled={
                        activeChapterIndex === (story.chapters?.length ?? 0) - 1
                      }
                      onClick={() => onSelectChapter(activeChapterIndex + 1)}
                      className="p-1 hover:bg-tj-primary-light dark:hover:bg-slate-800 text-tj-text-muted hover:text-tj-primary rounded transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center border border-transparent"
                      title="Next Chapter (Right Arrow)"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* FLOAT TRANSLATION, HIGHLIGHT AND SAVING TOAST MODAL */}
      <TranslationToast
        isOnline={isOnline}
        selectedWord={selectedWord}
        setSelectedWord={setSelectedWord}
        story={story}
        currentUser={currentUser}
        isPaid={isPaid}
        isAdmin={isAdmin}
        customOpenRouterKey={customOpenRouterKey}
        lookupLimitData={lookupLimitData}
        translationTargetLanguage={translationTargetLanguage}
        handleFetchTranslation={handleFetchTranslation}
        handleSaveWordRecord={handleSaveWordRecord}
        handlePlayWord={handlePlayWord}
        isSaved={isSelectedWordSaved}
        handleRemoveWordRecord={handleRemoveWordRecord}
        hasPrev={selectedWordRange !== null && selectedWordRange[0] > 0}
        hasNext={
          selectedWordRange !== null &&
          selectedWordRange[1] < chapterWords.length - 1
        }
        onNavigatePrev={handleNavigatePrev}
        onNavigateNext={handleNavigateNext}
        selectedWordRange={selectedWordRange}
        canExtendLeft={canExtendLeft}
        canShrinkLeft={canShrinkLeft}
        canShrinkRight={canShrinkRight}
        canExtendRight={canExtendRight}
        onExtendLeft={handleExtendLeft}
        onShrinkLeft={handleShrinkLeft}
        onShrinkRight={handleShrinkRight}
        onExtendRight={handleExtendRight}
        activeHighlight={activeHighlightForToast}
        onSelectHighlightColor={handleToastHighlightColor}
        onSaveHighlightNote={handleToastHighlightNote}
        onDeleteHighlight={handleToastDeleteHighlight}
        autoPlayWord={autoPlayWord}
        setAutoPlayWord={setAutoPlayWord}
      />

      {/* FLOATING HIGHLIGHT & NOTE TOOLBAR */}
      <AnimatePresence>
        {highlightToolbarState && (
          <HighlightToolbar
            activeHighlight={highlightToolbarState.activeHighlight}
            selectedText={
              highlightToolbarState.activeHighlight?.text ||
              highlightToolbarState.selection?.text ||
              ''
            }
            onSelectColor={handleToastHighlightColor}
            onSaveNote={handleToastHighlightNote}
            onDeleteHighlight={handleToastDeleteHighlight}
            onTranslate={() => {
              const snippet =
                highlightToolbarState.activeHighlight?.text ||
                highlightToolbarState.selection?.text ||
                '';
              if (snippet) {
                const startWord = chapterWords.find((w) =>
                  w.word
                    .toLowerCase()
                    .includes(snippet.toLowerCase().slice(0, 10)),
                );
                setSelectedWord({
                  word: snippet,
                  context: startWord ? startWord.paragraphText : snippet,
                  translation: '',
                  partOfSpeech: '',
                  definition: '',
                  isFetching: false,
                  saveSuccess: false,
                });
                handleFetchTranslation();
              }
            }}
            onCopy={() => {
              const snippet =
                highlightToolbarState.activeHighlight?.text ||
                highlightToolbarState.selection?.text ||
                '';
              if (snippet) {
                navigator.clipboard.writeText(snippet);
              }
            }}
            onClose={() => setHighlightToolbarState(null)}
            isLoggedIn={Boolean(currentUser?.uid || (currentUser as any)?.id)}
          />
        )}
      </AnimatePresence>

      {/* PREFERRED LANGUAGE MODAL FOR NEW USERS */}
      <PreferredLanguageModal
        isOpen={showLanguageModal}
        onClose={handleLanguageCancel}
        onConfirm={handleLanguageConfirm}
      />

      {/* BILINGUAL SWAP NOTIFICATION (A1 books with translation language) */}
      <BilingualSwapNotification
        story={story}
        onOpenReaderSettings={() => setIsReaderSettingsOpen(true)}
      />

      {/* DELETE BOOK CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-tj-bg-card rounded-2xl border border-tj-border-main p-5 shadow-2xl relative space-y-4 text-tj-text-main font-sans"
            >
              <div className="flex items-center gap-2.5 text-tj-error pb-1 border-b border-tj-border-main">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-sm font-bold text-tj-text-main">
                  Delete Graded Book?
                </h3>
              </div>

              <p className="text-xs text-tj-text-muted leading-relaxed">
                Are you absolutely sure you want to delete{' '}
                <strong className="text-tj-text-main font-bold">
                  "{story.title}"
                </strong>
                ? This action will permanently remove all chapters and review
                vocabulary from your database and cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-tj-text-muted hover:text-tj-text-main bg-tj-primary-light hover:bg-tj-primary-border border border-tj-border-main rounded-xl cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    if (onDeleteStory) onDeleteStory(true);
                  }}
                  className="px-4 py-2 text-xs text-white bg-rose-600 hover:bg-rose-700 font-bold rounded-xl cursor-pointer transition-all border-0"
                >
                  Delete Book
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
