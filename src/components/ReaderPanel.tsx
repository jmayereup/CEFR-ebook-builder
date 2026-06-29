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
  Trash2,
  Volume2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { FREE_MODEL_IDS } from '../constants/models';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import {
  type Chapter,
  getLanguageCodeFromName,
  type Story,
  SUPPORTED_LANGUAGES,
  type VocabularyTerm,
} from '../types';
import { limitContextToTenWords, segmentText } from '../utils/segmenter';
import { calculateEstimatedUsage } from '../utils/storyEstimation';
import { countWords } from '../utils/wordCounter';
import ChapterEditForm from './reader/ChapterEditForm';
import ChapterNavigationBar from './reader/ChapterNavigationBar';
import ChapterSidebar from './reader/ChapterSidebar';
import InteractiveParagraph from './reader/InteractiveParagraph';
import NarrativeMaintenancePanel from './reader/NarrativeMaintenancePanel';
import PreferredLanguageModal from './reader/PreferredLanguageModal';
import TranslationToast from './reader/TranslationToast';
import TTSToolbar from './reader/TTSToolbar';
import VocabGlossary from './reader/VocabGlossary';

// A helper component to trigger scrolling back to the top of the reader panel
// only after the previous chapter card has fully faded out and the new card has mounted.
function ScrollToTop({ readerRef }: { readerRef: RefObject<HTMLDivElement> }) {
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
  lookupLimitData?: { count: number; date: string };
  onIncrementLookupCount?: () => void;
  savedVocab?: VocabularyTerm[];
  onDeleteChapter?: (index: number) => Promise<void>;
  onAddCustomChapter?: (
    title: string,
    content: string,
    vocabulary: VocabularyTerm[],
  ) => Promise<void>;
  onDeleteStory?: (bypassConfirm?: boolean) => void;
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
  onChapterFinished?: () => void;
  onStoryFinished?: (storyId: string) => void;
  onStoryUnfinished?: (storyId: string) => void;
  dirty?: boolean;
  isSyncing?: boolean;
  syncChangesToDatabase?: () => Promise<void>;
  onExit?: () => void;
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
  isZenMode,
  onToggleZen,
  onDownloadEpub,
  isAutoGenerationPaused = false,
  onGenerateGlossary,
  onSaveStory,
  onChapterFinished,
  onStoryFinished,
  onStoryUnfinished,
  dirty = false,
  isSyncing = false,
  syncChangesToDatabase,
  onExit,
}: ReaderPanelProps) {
  const readerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const translationTargetLanguage = useUIStore(
    (state) => state.translationTargetLanguage,
  );
  const setTranslationTargetLanguage = useUIStore(
    (state) => state.setTranslationTargetLanguage,
  );
  const isOnline = useUIStore((state) => state.isOnline);
  const customOpenRouterKey = useUIStore((state) => state.customOpenRouterKey);
  const currentUser = useAuthStore((state) => state.currentUser);

  const [selectedGlossaryLanguage, setSelectedGlossaryLanguage] =
    useState<string>(translationTargetLanguage || 'English');

  useEffect(() => {
    setSelectedGlossaryLanguage(translationTargetLanguage);
  }, [translationTargetLanguage]);

  const [hasFinishedChapter, setHasFinishedChapter] = useState(false);
  const hasFinishedRef = useRef(false);
  const [sessionFinished, setSessionFinished] = useState(false);

  // Reset hasFinishedChapter when chapter or story changes, and set up scroll observer
  useEffect(() => {
    // Reference activeChapterIndex and story.id to ensure effect re-runs when they change
    const _chapterRef = activeChapterIndex;
    const _storyIdRef = story.id;

    hasFinishedRef.current = false;
    setHasFinishedChapter(false);

    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          if (hasFinishedRef.current) return;
          hasFinishedRef.current = true;
          setHasFinishedChapter(true);
          if (onChapterFinished) {
            onChapterFinished();
          }
        }
      },
      {
        root: null,
        rootMargin: '0px 0px 50px 0px',
        threshold: 0.1,
      },
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [activeChapterIndex, story.id, onChapterFinished]);

  useEffect(() => {
    const completedByObj = story.completedBy || {};
    const userReadCount = currentUser?.uid
      ? completedByObj[currentUser.uid] || 0
      : 0;
    const isLocalRead =
      typeof window !== 'undefined' &&
      localStorage.getItem(`completed_story_${story.id}`) === 'true';
    setSessionFinished(userReadCount > 0 || isLocalRead);
  }, [story.id, story.completedBy, currentUser]);

  const fontSize = useUIStore((state) => state.readerFontSize);
  const setFontSize = useUIStore((state) => state.setReaderFontSize);
  const useSerif = useUIStore((state) => state.readerUseSerif);
  const setUseSerif = useUIStore((state) => state.setReaderUseSerif);
  const [showBilingual, setShowBilingual] = useState<boolean>(
    story.cefrLevel === 'A1' || story.cefrLevel === 'Pre-A1',
  );
  const [activeTab, setActiveTab] = useState<'read' | 'maintenance'>('read');
  const [maintenanceSubTab, setMaintenanceSubTab] = useState<
    'bible' | 'audits' | 'tone' | 'outline'
  >('bible');

  const activeChapter: Chapter | undefined = story.chapters[activeChapterIndex];

  const [selectedWordRange, setSelectedWordRange] = useState<
    [number, number] | null
  >(null);

  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);

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

  const chapterWords = useMemo(() => {
    const words: {
      word: string;
      paragraphText: string;
      pIdx: number;
      indexInPara: number;
    }[] = [];
    if (!activeChapter) return words;
    const targetLangCode = getLanguageCodeFromName(story.language);

    displayParagraphs.forEach((dp, pIdx) => {
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
  }, [displayParagraphs, story.language, activeChapter, segmentMatchingSet]);

  const isFreeModel =
    story.model?.endsWith(':free') || FREE_MODEL_IDS.has(story.model || '');
  const nextChapterCreditCost = useMemo(() => {
    if (isFreeModel) return 0;
    const currentChaptersLoaded = story.chapters.length;
    const nextChapterNum = currentChaptersLoaded + 1;
    const estBefore = calculateEstimatedUsage(
      nextChapterNum - 1,
      story.chapterLength || 300,
      story.model || 'deepseek/deepseek-v4-flash',
    );
    const estAfter = calculateEstimatedUsage(
      nextChapterNum,
      story.chapterLength || 300,
      story.model || 'deepseek/deepseek-v4-flash',
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
    story.chapters.length,
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
    isSpeaking,
    isPaused,
    speak,
    stop,
    playWord,
  } = useSpeechSynthesis(story.language);

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
    const textToSpeak = activeChapter.content
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !p.startsWith('Translation:'))
      .join('\n');
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
    const dp = displayParagraphs[pIdx];
    if (!dp) return '';

    const targetLangCode = getLanguageCodeFromName(story.language);
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

    handlePlayWord(phrase);

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
        if (wordCount <= 5) {
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

  // Reset selectedWordRange when toast closes
  useEffect(() => {
    if (selectedWord === null) {
      setSelectedWordRange(null);
    }
  }, [selectedWord]);

  // Helper checks for range adjustment
  const canExtendLeft =
    selectedWordRange !== null &&
    selectedWordRange[0] > 0 &&
    chapterWords[selectedWordRange[0] - 1].pIdx ===
      chapterWords[selectedWordRange[0]].pIdx &&
    selectedWordRange[1] - (selectedWordRange[0] - 1) + 1 <= 5;

  const canShrinkLeft =
    selectedWordRange !== null && selectedWordRange[0] < selectedWordRange[1];

  const canShrinkRight =
    selectedWordRange !== null && selectedWordRange[0] < selectedWordRange[1];

  const canExtendRight =
    selectedWordRange !== null &&
    selectedWordRange[1] < chapterWords.length - 1 &&
    chapterWords[selectedWordRange[1] + 1].pIdx ===
      chapterWords[selectedWordRange[1]].pIdx &&
    selectedWordRange[1] + 1 - selectedWordRange[0] + 1 <= 5;

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

  const playSentenceContainingWord = (word: string, paragraphText: string) => {
    if (!window.speechSynthesis) return;

    const targetLangCode = getLanguageCodeFromName(story.language);
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
          if (activeChapterIndex < story.chapters.length - 1) {
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
    story.chapters.length,
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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (customOpenRouterKey) {
        headers['X-OpenRouter-API-Key'] = customOpenRouterKey;
      }

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          word: selectedWord.word,
          language: story.language,
          context: selectedWord.context,
          targetLanguage: translationTargetLanguage || 'English',
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
          isCreator={isCreator}
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
                if (activeChapterIndex < story.chapters.length - 1) {
                  onSelectChapter(activeChapterIndex + 1);
                }
              } else if (info.offset.x > swipeThreshold) {
                if (activeChapterIndex > 0) {
                  onSelectChapter(activeChapterIndex - 1);
                }
              }
            }}
            className={`bg-tj-bg-card text-tj-text-main ${isZenMode ? 'p-6 sm:p-12 md:p-16 max-w-3xl' : 'p-4 sm:p-6 md:p-8'} sm:rounded-lg border-x-0 border-y sm:border border-tj-border-main shadow-none mx-auto relative overflow-hidden`}
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
                onStoryUpdated={onStoryUpdated}
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
                      cefrLevel={story.cefrLevel}
                      showBilingual={showBilingual}
                      setShowBilingual={setShowBilingual}
                      onToggleZen={() => onToggleZen(true)}
                      isCreator={isCreator}
                      isAdmin={isAdmin}
                      isEditing={isEditing}
                      onEditClick={() => setIsEditing(true)}
                      onDeleteClick={() => setShowDeleteModal(true)}
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

                {/* Chapter header titles */}
                {activeChapter && (
                  <div className="mb-6 select-text">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <h2
                          lang={getLanguageCodeFromName(story.language)}
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
                  <div className="mb-6">
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
                    onShowAlert={onShowAlert}
                    onClose={() => setIsEditing(false)}
                  />
                ) : (
                  <>
                    <div
                      translate="no"
                      lang={getLanguageCodeFromName(story.language)}
                      className={`space-y-6 select-text ${useSerif ? 'font-serif' : 'font-sans'}`}
                      style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
                    >
                      {displayParagraphs.map((dp, idx) => {
                        const isActiveParagraph =
                          selectedWordRange !== null &&
                          chapterWords[selectedWordRange[0]]?.pIdx === idx;
                        const activeWordRangeInPara: [number, number] | null =
                          isActiveParagraph && selectedWordRange
                            ? [
                                chapterWords[selectedWordRange[0]].indexInPara,
                                chapterWords[selectedWordRange[1]].indexInPara,
                              ]
                            : null;
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
                                  language={story.language}
                                  handleWordClick={handleWordClick}
                                  isBilingual={showBilingual}
                                  glossaryWordsSet={glossaryWordsSet}
                                  savedWordsSet={savedWordsSet}
                                  activeWordRangeInPara={activeWordRangeInPara}
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
                    </div>

                    {/* Sentinel element to detect when user has scrolled to the bottom of the chapter */}
                    <div ref={sentinelRef} className="h-2 w-full" />

                    {/* Explicit book completion section */}
                    {activeChapterIndex === story.chapters.length - 1 &&
                      hasFinishedChapter && (
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

                    {/* Take it Offline Milestone Callout */}
                    {(story.isCompleted ||
                      story.chapters.length === story.totalChapters) &&
                      ((onGenerateGlossary &&
                        (isCreator || isAdmin) &&
                        story.cefrLevel !== 'A1' &&
                        story.cefrLevel !== 'Pre-A1' &&
                        story.chapters.some(
                          (ch) => !ch.vocabulary || ch.vocabulary.length === 0,
                        )) ||
                        (activeChapterIndex === story.chapters.length - 1 &&
                          onDownloadEpub)) && (
                        <div className="mt-8 space-y-3 animate-fade-in">
                          {/* Generate Glossary callout — shown when chapters lack vocabulary */}
                          {onGenerateGlossary &&
                            (isCreator || isAdmin) &&
                            story.cefrLevel !== 'A1' &&
                            story.cefrLevel !== 'Pre-A1' &&
                            story.chapters.some(
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
                          {activeChapterIndex === story.chapters.length - 1 &&
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
                    totalChapters={story.chapters.length}
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
                        activeChapterIndex === story.chapters.length - 1
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

      {/* FLOAT TRANSLATION AND SAVING TOAST MODAL */}
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
      />

      {/* PREFERRED LANGUAGE MODAL FOR NEW USERS */}
      <PreferredLanguageModal
        isOpen={showLanguageModal}
        onClose={handleLanguageCancel}
        onConfirm={handleLanguageConfirm}
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
