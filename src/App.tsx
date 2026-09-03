import { AlertCircle, WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AlertModal from './components/AlertModal';
import AppHeader from './components/app/AppHeader';
import AppNav from './components/app/AppNav';
// Modular Sub-components
import AuthModal from './components/app/AuthModal';
import ChapterGenerationToast from './components/app/ChapterGenerationToast';
import CookieConsent from './components/app/CookieConsent';
import FloatingFooter from './components/app/FloatingFooter';
import GlossaryGenerationToast from './components/app/GlossaryGenerationToast';
import InstructionFloatingBox from './components/app/InstructionFloatingBox';
import SettingsModal from './components/app/SettingsModal';
import StreakCelebrationModal from './components/app/StreakCelebrationModal';
import UnsavedChangesModal from './components/app/UnsavedChangesModal';
import FlagStoryModal from './components/library/FlagStoryModal';
import ReaderSkeleton from './components/reader/ReaderSkeleton';
import { useActiveStory } from './hooks/useActiveStory';
import { useAdSense } from './hooks/useAdSense';
import { useDarkMode } from './hooks/useDarkMode';
import { useDocumentMetadata } from './hooks/useDocumentMetadata';
import { useExport } from './hooks/useExport';
import { useFilters } from './hooks/useFilters';
import { useLibrary } from './hooks/useLibrary';
import { useStoryGeneration } from './hooks/useStoryGeneration';
import { useStreak } from './hooks/useStreak';
import { useUrlRouting } from './hooks/useUrlRouting';
import { useUserData } from './hooks/useUserData';
import { useWebViewWarning } from './hooks/useWebViewWarning';
// Pages
import AboutPage from './pages/AboutPage';
import BrowsePage from './pages/BrowsePage';
import ReaderPage from './pages/ReaderPage';

const AdminPage = lazy(() => import('./pages/AdminPage'));
const BookshelfPage = lazy(() => import('./pages/BookshelfPage'));
const CreatePage = lazy(() => import('./pages/CreatePage'));
const NotesPage = lazy(() => import('./pages/NotesPage'));
const PracticePage = lazy(() => import('./pages/PracticePage'));

import { initAuth, logout, syncUserProfile } from './services/auth';
import {
  decrementStoryCompletion,
  fetchAllUserHighlights,
  fetchPendingDeletionFlags,
  fetchStory,
  type GenerationLimitData,
  incrementStoryCompletion,
  saveUserLookupLimitDebounced,
} from './services/db';
import {
  getStory,
  removeStory as removeStoryFromOffline,
  saveStory as saveStoryToOffline,
} from './services/storage/offlineStorage';
import {
  persistStory,
  triggerStoryCoverGeneration,
} from './services/storyPersistence';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import type { DeletionFlag, Story } from './types';
import { buildApiHeaders } from './utils/modelUtils';

interface AppProps {
  ssrPath?: string;
  ssrData?: {
    story?: any;
    stories?: any[];
  };
}

export default function App({ ssrPath, ssrData }: AppProps = {}) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const authChecking = useAuthStore((state) => state.authChecking);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const setAuthChecking = useAuthStore((state) => state.setAuthChecking);

  const isOnline = useUIStore((state) => state.isOnline);
  const customOpenRouterKey = useUIStore((state) => state.customOpenRouterKey);
  const setCustomOpenRouterKey = useUIStore(
    (state) => state.setCustomOpenRouterKey,
  );
  const initializeClientState = useUIStore(
    (state) => state.initializeClientState,
  );

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>(
    'signin',
  );

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  // Custom AlertModal State
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type?: 'info' | 'error' | 'warning';
  } | null>(null);
  const showAlert = (
    title: string,
    message: string,
    type: 'info' | 'error' | 'warning' = 'error',
  ) => {
    setAlertConfig({ title, message, type });
  };

  // WebView detection and warning for TTS compatibility
  useWebViewWarning(showAlert);

  // App States
  const { darkMode, toggleDarkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState<
    'browse' | 'bookshelf' | 'notes' | 'create' | 'practice' | 'admin' | 'about'
  >(() => {
    if (ssrPath) {
      const tabMatch = ssrPath.match(
        /^\/(browse|bookshelf|notes|create|practice|admin|about)/,
      );
      if (tabMatch) return tabMatch[1] as any;
    } else if (typeof window !== 'undefined') {
      const tabMatch = window.location.pathname.match(
        /^\/(browse|bookshelf|notes|create|practice|admin|about)/,
      );
      if (tabMatch) return tabMatch[1] as any;
    }
    return 'browse';
  });

  const [notesCount, setNotesCount] = useState<number>(0);

  // Sync total notes count for badge
  useEffect(() => {
    if (!currentUser) {
      setNotesCount(0);
      return;
    }
    let active = true;
    fetchAllUserHighlights(currentUser.uid)
      .then((data) => {
        if (active) {
          setNotesCount(data.length);
        }
      })
      .catch((err) => {
        console.error('Error fetching highlight count for badge:', err);
      });
    return () => {
      active = false;
    };
  }, [currentUser]);

  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [generationLimitData, setGenerationLimitData] =
    useState<GenerationLimitData>(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const thisMonthStr = todayStr.substring(0, 7);
      return {
        dailyStoriesCreated: 0,
        freeModelCount: 0,
        monthlyCreditsUsed: 0,
        monthlyCreditsMonth: thisMonthStr,
        date: todayStr,
      };
    });

  // AdSense dynamic integration (Option 1: respect paid tier & cookie consent)
  useAdSense(isPaid);

  const [generatingCoverIds, setGeneratingCoverIds] = useState<Set<string>>(
    new Set(),
  );

  // Streak — extracted to useStreak hook
  const {
    streakData,
    celebrationConfig,
    setCelebrationConfig,
    syncInitialStreak,
    handleRecordDailyActivity,
  } = useStreak({
    currentUser,
  });

  // User data — extracted to useUserData hook
  const {
    bookshelf,
    recentlyRead,
    setRecentlyRead,
    savedVocab,
    lookupLimitData,
    isUserDataLoaded,
    handleIncrementLookupCount,
    handleIncrementGenerationCount,
    handleSaveWord,
    handleRemoveSavedWord,
    handleUpdateWordSRS,
    handleToggleBookshelf,
    updateRecentlyRead,
    removeFromRecentlyRead,
    dirty,
    isSyncing,
    syncChangesToDatabase,
  } = useUserData({
    currentUser,
    authChecking,
    isPaid,
    setIsPaid,
    generationLimitData,
    setGenerationLimitData,
    showAlert,
    onProfileLoaded: (profile) => {
      syncInitialStreak(currentUser?.uid || '', profile.streak).catch((err) =>
        console.error('Error syncing user streak state:', err),
      );
    },
  });

  const handleToggleBookshelfWithAuth = (storyId: string) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    handleToggleBookshelf(storyId);
  };

  // Active Story & actions — extracted to useActiveStory hook
  const {
    selectedStory,
    setSelectedStory,
    loadingStory,
    setLoadingStory,
    loadingStoryId,
    setLoadingStoryId,
    activeChapterIdx,
    setActiveChapterIdx,
    cachedStoryIds,
    setCachedStoryIds,
    handleSelectStory,
    handleDownloadStory,
    handleDeleteStory,
    handleToggleStoryPrivacy,
    handleRateStory,
    handleDeleteChapter,
    handleSaveNewChapter,
  } = useActiveStory({
    currentUser,
    recentlyRead,
    setRecentlyRead,
    isUserDataLoaded,
    libHandleSelectStory: (story) => libHandleSelectStory(story),
    libHandleDeleteStory: (storyId, e, bypass) =>
      libHandleDeleteStory(storyId, e, bypass),
    libHandleToggleStoryPrivacy: (storyId) =>
      libHandleToggleStoryPrivacy(storyId),
    libHandleRateStory: (storyId, rating) =>
      libHandleRateStory(storyId, rating),
    loadStoriesMetadata: (options) => loadStoriesMetadata(options),
    showAlert,
    isPaid,
    ssrPath,
    ssrData,
  });

  // Stories & library — extracted to useLibrary hook
  const {
    stories,
    setPublicStories,
    setPrivateStories,
    storiesLoading,
    privateStoriesLoading,
    loadStoriesMetadata,
    loadPrivateStories,
    handleDeleteStory: libHandleDeleteStory,
    handleToggleStoryPrivacy: libHandleToggleStoryPrivacy,
    handleRateStory: libHandleRateStory,
    handleSelectStory: libHandleSelectStory,
  } = useLibrary({
    currentUser,
    isPaid,
    isOnline,
    cachedStoryIds,
    showAlert,
    ssrData,
  });

  // Derive metadata for story currently loading into the reader
  const loadingStoryMetadata = useMemo(() => {
    if (loadingStory) return loadingStory;
    if (loadingStoryId) {
      const found = stories.find((s) => s.id === loadingStoryId);
      if (found) return found;
      return { id: loadingStoryId };
    }
    return null;
  }, [loadingStory, loadingStoryId, stories]);

  const isStoryLoading = !selectedStory && (!!loadingStoryId || !!loadingStory);

  // Dynamic SEO metadata & schema updates — must follow selectedStory / activeChapterIdx declarations
  useDocumentMetadata(selectedStory, activeChapterIdx);

  // Export states and handlers
  const {
    showShareToast,
    copyStatus,
    showExportMenu,
    setShowExportMenu,
    showDocOptions,
    setShowDocOptions,
    showEpubLinks,
    setShowEpubLinks,
    isExportingEpub,
    handleShareStoryLink,
    triggerCopyPlaintext,
    triggerCopyRichText,
    handleDownloadEpub,
  } = useExport({
    selectedStory,
    activeChapterIdx,
    showAlert,
  });

  // Flagging story modal state
  const [flaggingStory, setFlaggingStory] = useState<Story | null>(null);
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [pendingFlags, setPendingFlags] = useState<DeletionFlag[]>([]);

  const handleOpenFlagModal = (story: Story) => {
    setFlaggingStory(story);
    setIsFlagModalOpen(true);
  };

  useEffect(() => {
    if (currentUser?.isAdmin === true) {
      fetchPendingDeletionFlags()
        .then((flags) => setPendingFlags(flags))
        .catch((err) =>
          console.error('Error fetching admin deletion flags:', err),
        );
    }
  }, [currentUser]);

  const handleAutoSaveGeneratedStory = async (
    story: Story,
    isNewStory: boolean = false,
  ) => {
    const result = await persistStory({
      story,
      currentUser,
      onStoryUpdated: setSelectedStory,
      onRefreshMetadata: (opts) => loadStoriesMetadata(opts),
      generatingCoverIds,
      setGeneratingCoverIds,
    });

    if (isNewStory) {
      setActiveChapterIdx(0);
      setActiveTab('browse');
    }

    setCachedStoryIds((prev) => {
      const filtered = prev.filter((id) => id !== result.oldId);
      return filtered.includes(result.sanitizedId)
        ? filtered
        : [...filtered, result.sanitizedId];
    });
  };

  // Story generation — all state and handlers live in the hook
  const {
    isGenerating,
    isAutoGenerating,
    isAutoGenerationPaused,
    generationLogs,
    generationStatus,
    isGeneratingGlossary,
    glossaryStatus,
    glossaryLogs,
    glossaryError,
    handleInitiateStory,
    handleGenerateNextChapter,
    handleRegenerateChapter,
    handleAutoGenerateRemaining,
    handleGenerateGlossary,
    handleCancelGeneration,
  } = useStoryGeneration({
    currentUser,
    isPaid,
    customOpenRouterKey,
    freeModelCount: generationLimitData.freeModelCount ?? 0,
    monthlyCreditsUsed: generationLimitData.monthlyCreditsUsed ?? 0,
    dailyCreditsUsed: generationLimitData.dailyCreditsUsed ?? 0,
    dailyStoriesCreated: generationLimitData.dailyStoriesCreated ?? 0,
    onGenerationSuccess: handleIncrementGenerationCount,
    selectedStory,
    stories,
    showAlert,
    onStoryCreated: (story) => {
      handleAutoSaveGeneratedStory(story, true);
    },
    onStoryUpdated: (story) => {
      handleAutoSaveGeneratedStory(story, false);
    },
    onLoginRequired: () => setShowLoginPrompt(true),
  });

  // Pending navigation guard states
  const [pendingNavigation, setPendingNavigation] = useState<{
    tab?: typeof activeTab;
    clearStory?: boolean;
    scrollDashboard?: boolean;
  } | null>(null);
  const [isSavingStory, setIsSavingStory] = useState(false);
  const [isDiscardingStory, setIsDiscardingStory] = useState(false);

  const handleRequestTabChange = (tab: typeof activeTab) => {
    if (dirty) {
      syncChangesToDatabase().catch((err) =>
        console.error('Auto-sync failed on tab change:', err),
      );
    }
    setLoadingStory(null);
    setLoadingStoryId(null);
    if (selectedStory?.isUnsaved) {
      setPendingNavigation({ tab });
    } else {
      setSelectedStory(null);
      setActiveTab(tab);
    }
  };

  const handleRequestClearStory = () => {
    if (dirty) {
      syncChangesToDatabase().catch((err) =>
        console.error('Auto-sync failed on clear story:', err),
      );
    }
    setLoadingStory(null);
    setLoadingStoryId(null);
    if (selectedStory?.isUnsaved) {
      setPendingNavigation({ clearStory: true });
    } else {
      setSelectedStory(null);
    }
  };

  const handleSaveUnsavedStory = async (storyToSave?: Story) => {
    const targetStory = storyToSave || selectedStory;
    if (!targetStory) return;
    if (!storyToSave && !targetStory.isUnsaved) return;
    setIsSavingStory(true);
    try {
      const result = await persistStory({
        story: targetStory,
        currentUser,
        onStoryUpdated: setSelectedStory,
        onRefreshMetadata: (opts) => loadStoriesMetadata(opts),
        generatingCoverIds,
        setGeneratingCoverIds,
      });

      setCachedStoryIds((prev) => {
        const filtered = prev.filter((id) => id !== result.oldId);
        return filtered.includes(result.sanitizedId)
          ? filtered
          : [...filtered, result.sanitizedId];
      });

      // Sync any pending user changes (like recentlyRead) to prevent beforeunload prompts
      try {
        await syncChangesToDatabase();
      } catch (syncErr) {
        console.error('Failed to sync user profile after story save:', syncErr);
      }

      if (result.success) {
        showAlert(
          'Story Saved Successfully',
          `"${targetStory.title}" is saved to database.`,
          'info',
        );
        return result.story;
      }
      throw result.error || new Error('Failed to save to database');
    } catch (err: any) {
      console.error('Failed to save story to database:', err);
      showAlert(
        'Save Failed',
        `Failed to save story: ${err.message || err}`,
        'error',
      );
    } finally {
      setIsSavingStory(false);
    }
  };

  const handleGenerateCover = async (
    storyId: string,
    force: boolean = false,
  ) => {
    const targetStory =
      selectedStory && selectedStory.id === storyId
        ? selectedStory
        : stories.find((s) => s.id === storyId);

    if (targetStory && targetStory.isPublic === false) {
      showAlert(
        'Cover Generation Disabled',
        'Cover images cannot be generated for private stories.',
        'info',
      );
      return;
    }

    setGeneratingCoverIds((prev) => new Set(prev).add(storyId));
    try {
      const res = await triggerStoryCoverGeneration({
        storyId,
        force,
        onCoverUpdated: (cover, updated) => {
          if (selectedStory && selectedStory.id === storyId) {
            setSelectedStory({
              ...selectedStory,
              cover: cover || selectedStory.cover,
              updated,
            });
          }
        },
        onRefreshMetadata: (opts) => loadStoriesMetadata(opts),
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to generate cover.');
      }

      showAlert(
        'Cover Generated Successfully',
        'The cover has been regenerated and saved.',
        'info',
      );
    } catch (err: any) {
      console.error(err);
      showAlert(
        'Cover Generation Failed',
        `Failed to generate cover: ${err.message || err}`,
        'error',
      );
    } finally {
      setGeneratingCoverIds((prev) => {
        const next = new Set(prev);
        next.delete(storyId);
        return next;
      });
    }
  };

  const executePendingNavigation = (customPending = pendingNavigation) => {
    if (!customPending) return;
    if (customPending.clearStory) {
      setSelectedStory(null);
    }
    if (customPending.tab) {
      setActiveTab(customPending.tab);
    }
    if (customPending.scrollDashboard) {
      setTimeout(() => {
        const el = document.getElementById('streak-dashboard-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
    setPendingNavigation(null);
  };

  const handleConfirmSaveAndLeave = async () => {
    if (!selectedStory) return;
    const saved = await handleSaveUnsavedStory();
    if (saved) {
      executePendingNavigation();
    }
  };

  const handleConfirmDiscardAndLeave = async () => {
    if (selectedStory) {
      setIsDiscardingStory(true);
      const storyId = selectedStory.id;
      try {
        const dbStory = await fetchStory(storyId);
        if (dbStory) {
          await saveStoryToOffline(dbStory);
          setSelectedStory(dbStory);
        } else {
          // If the story draft does not exist in DB, clean up from offline storage and active list
          await removeStoryFromOffline(storyId);
          setSelectedStory(null);
          setCachedStoryIds((prev) => prev.filter((id) => id !== storyId));
        }
      } catch (err) {
        console.error('Failed to restore story from database on discard:', err);
        // Fallback: clear the offline cache entry so it doesn't stay dirty
        await removeStoryFromOffline(storyId);
        setSelectedStory(null);
      } finally {
        setIsDiscardingStory(false);
      }
    }
    executePendingNavigation();
  };

  // Warning before unloading/reloading window with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (selectedStory?.isUnsaved) {
        e.preventDefault();
        e.returnValue =
          'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [selectedStory?.isUnsaved]);

  // Library search & filter states
  const [isZenMode, setIsZenMode] = useState(false);

  // Track if user was prompted to login to generate
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Synchronize client-only state on mount to prevent hydration mismatch
  useEffect(() => {
    initializeClientState();
  }, [initializeClientState]);

  // Auth setup
  useEffect(() => {
    setAuthChecking(true);
    const unsubscribe = initAuth(
      async (user) => {
        setCurrentUser(user);
        setAuthChecking(false);
        try {
          // Sync user profile state with database
          const profile = await syncUserProfile(user);
          setIsPaid(profile.isPaid);
        } catch (err) {
          console.error('Failed to sync user profile on mount:', err);
        }
      },
      () => {
        setCurrentUser(null);
        setIsPaid(false);
        setAuthChecking(false);
      },
    );
    return () => unsubscribe();
  }, [setAuthChecking, setCurrentUser]);

  // Keep current selected story details synced in case it gets updated in the background
  useEffect(() => {
    if (selectedStory && !selectedStory.isUnsaved) {
      const matchingStory = stories.find((s) => s.id === selectedStory.id);
      if (matchingStory) {
        const matchingTime = matchingStory.updated
          ? new Date(matchingStory.updated).getTime()
          : 0;
        const selectedTime = selectedStory.updated
          ? new Date(selectedStory.updated).getTime()
          : 0;

        // Only sync if the metadata list item is actually newer than the loaded detail,
        // or if timestamps are not yet fully populated (to allow initial hydration/sync).
        // This prevents race conditions where stale metadata responses overwrite fresh details.
        const shouldSync =
          !matchingStory.updated ||
          !selectedStory.updated ||
          matchingTime > selectedTime;

        if (shouldSync) {
          const hasChanged =
            matchingStory.isCompleted !== selectedStory.isCompleted ||
            matchingStory.title !== selectedStory.title ||
            JSON.stringify(matchingStory.ratings || {}) !==
              JSON.stringify(selectedStory.ratings || {}) ||
            JSON.stringify(matchingStory.completedBy || {}) !==
              JSON.stringify(selectedStory.completedBy || {});

          if (hasChanged) {
            setSelectedStory((prev) => {
              if (prev) {
                const updated = {
                  ...prev,
                  title: matchingStory.title,
                  isCompleted: matchingStory.isCompleted,
                  ratings: matchingStory.ratings,
                  completedBy: matchingStory.completedBy,
                  updated: matchingStory.updated || prev.updated,
                };
                saveStoryToOffline(updated);
                return updated;
              }
              return null;
            });
          }
        }
      }
    }
  }, [stories, selectedStory, setSelectedStory]);

  // Reload metadata when switching to browse tab; fetch private stories on bookshelf tab
  useEffect(() => {
    if (activeTab === 'browse') {
      loadStoriesMetadata();
    } else if (activeTab === 'bookshelf') {
      loadPrivateStories();
    }
  }, [activeTab, loadStoriesMetadata, loadPrivateStories]);

  // Keep mutable references of callbacks to prevent unnecessary useEffect triggers
  const updateRecentlyReadRef = useRef(updateRecentlyRead);
  const removeFromRecentlyReadRef = useRef(removeFromRecentlyRead);
  const handleRecordDailyActivityRef = useRef(handleRecordDailyActivity);

  useEffect(() => {
    updateRecentlyReadRef.current = updateRecentlyRead;
    removeFromRecentlyReadRef.current = removeFromRecentlyRead;
    handleRecordDailyActivityRef.current = handleRecordDailyActivity;
  });

  const handleChapterFinished = useCallback(() => {
    handleRecordDailyActivityRef.current();
  }, []);

  const handleStoryFinished = useCallback(
    async (storyId: string) => {
      // 1. Mark in guest state if unauthenticated
      if (!currentUser) {
        useUIStore.getState().addGuestCompletedStoryId(storyId);
      }

      // 2. Remove from recentlyRead list so finished story leaves "Reading"
      removeFromRecentlyReadRef.current(storyId);

      // 3. Optimistically update stories in state
      setPublicStories((prev) =>
        prev.map((s) => {
          if (s.id !== storyId) return s;
          const completedBy = { ...(s.completedBy || {}) };
          if (currentUser) {
            completedBy[currentUser.uid] =
              (completedBy[currentUser.uid] || 0) + 1;
          }
          return {
            ...s,
            completedBy,
            totalReads: (s.totalReads ?? 0) + 1,
          };
        }),
      );

      setPrivateStories((prev) =>
        prev.map((s) => {
          if (s.id !== storyId) return s;
          const completedBy = { ...(s.completedBy || {}) };
          if (currentUser) {
            completedBy[currentUser.uid] =
              (completedBy[currentUser.uid] || 0) + 1;
          }
          return {
            ...s,
            completedBy,
            totalReads: (s.totalReads ?? 0) + 1,
          };
        }),
      );

      setSelectedStory((prev) => {
        if (!prev || prev.id !== storyId) return prev;
        const completedBy = { ...(prev.completedBy || {}) };
        if (currentUser) {
          completedBy[currentUser.uid] =
            (completedBy[currentUser.uid] || 0) + 1;
        }
        return {
          ...prev,
          completedBy,
          totalReads: (prev.totalReads ?? 0) + 1,
        };
      });

      if (currentUser) {
        try {
          await incrementStoryCompletion(storyId, currentUser.uid);
          loadStoriesMetadata({ refresh: true, storyId });
        } catch (err) {
          console.error('Failed to increment story completion:', err);
        }
      }
    },
    [
      currentUser,
      loadStoriesMetadata,
      setPublicStories,
      setPrivateStories,
      setSelectedStory,
    ],
  );

  const handleStoryUnfinished = useCallback(
    async (storyId: string) => {
      if (!currentUser) {
        useUIStore.getState().removeGuestCompletedStoryId(storyId);
      }

      setPublicStories((prev) =>
        prev.map((s) => {
          if (s.id !== storyId) return s;
          const completedBy = { ...(s.completedBy || {}) };
          if (currentUser && completedBy[currentUser.uid]) {
            const newCount = completedBy[currentUser.uid] - 1;
            if (newCount > 0) {
              completedBy[currentUser.uid] = newCount;
            } else {
              delete completedBy[currentUser.uid];
            }
          }
          return {
            ...s,
            completedBy,
            totalReads: Math.max(0, (s.totalReads ?? 0) - 1),
          };
        }),
      );

      setPrivateStories((prev) =>
        prev.map((s) => {
          if (s.id !== storyId) return s;
          const completedBy = { ...(s.completedBy || {}) };
          if (currentUser && completedBy[currentUser.uid]) {
            const newCount = completedBy[currentUser.uid] - 1;
            if (newCount > 0) {
              completedBy[currentUser.uid] = newCount;
            } else {
              delete completedBy[currentUser.uid];
            }
          }
          return {
            ...s,
            completedBy,
            totalReads: Math.max(0, (s.totalReads ?? 0) - 1),
          };
        }),
      );

      setSelectedStory((prev) => {
        if (!prev || prev.id !== storyId) return prev;
        const completedBy = { ...(prev.completedBy || {}) };
        if (currentUser && completedBy[currentUser.uid]) {
          const newCount = completedBy[currentUser.uid] - 1;
          if (newCount > 0) {
            completedBy[currentUser.uid] = newCount;
          } else {
            delete completedBy[currentUser.uid];
          }
        }
        return {
          ...prev,
          completedBy,
          totalReads: Math.max(0, (prev.totalReads ?? 0) - 1),
        };
      });

      if (currentUser) {
        try {
          await decrementStoryCompletion(storyId, currentUser.uid);
          loadStoriesMetadata({ refresh: true, storyId });
        } catch (err) {
          console.error('Failed to decrement story completion:', err);
        }
      }
    },
    [
      currentUser,
      loadStoriesMetadata,
      setPublicStories,
      setPrivateStories,
      setSelectedStory,
    ],
  );

  // Flush any pending debounced writes to database before the page unloads or App unmounts
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveUserLookupLimitDebounced.flush();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveUserLookupLimitDebounced.flush();
    };
  }, []);

  // Track recently read books and active chapters reactively
  useEffect(() => {
    if (!selectedStory?.id) return;
    if (currentUser && !isUserDataLoaded) return;

    // If story is already completed and user is on the final chapter, do not auto-add to recentlyRead
    const guestCompletedStoryIds = useUIStore.getState().guestCompletedStoryIds;
    const isStoryCompleted =
      (currentUser &&
        (selectedStory.completedBy?.[currentUser.uid] || 0) > 0) ||
      guestCompletedStoryIds.includes(selectedStory.id);
    const isAtLastChapter =
      activeChapterIdx >=
      (selectedStory.chapters?.length || selectedStory.totalChapters || 1) - 1;

    if (isStoryCompleted && isAtLastChapter) {
      return;
    }

    updateRecentlyReadRef.current(selectedStory.id, activeChapterIdx);
  }, [
    selectedStory?.id,
    selectedStory?.completedBy,
    selectedStory?.chapters?.length,
    selectedStory?.totalChapters,
    activeChapterIdx,
    currentUser,
    isUserDataLoaded,
  ]);

  const handleLogin = () => {
    handleOpenAuth('signin');
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setIsPaid(false);
    if (activeTab === 'admin') {
      setActiveTab('browse');
    }
  };

  const handleSaveCustomOpenRouterKey = (key: string) => {
    const trimmed = key.trim();
    setCustomOpenRouterKey(trimmed);
  };

  // Filters & computed story lists — extracted to useFilters hook
  const {
    searchQuery,
    setSearchQuery,
    filterLanguage,
    setFilterLanguage,
    filterCefrLevel,
    setFilterCefrLevel,
    filterGenre,
    setFilterGenre,
    filterReadingStatus,
    setFilterReadingStatus,
    sortBy,
    setSortBy,
    visibleStories,
    filteredStories,
    bookshelfStories,
    filteredBookshelfStories,
    recentlyReadStories,
  } = useFilters({
    stories,
    bookshelf,
    recentlyRead,
    currentUser,
    ssrPath,
  });

  useUrlRouting({
    selectedStory,
    setSelectedStory,
    loadingStoryId,
    setLoadingStoryId,
    activeChapterIdx,
    setActiveChapterIdx,
    activeTab,
    setActiveTab,
    storiesLoading,
    isOnline,
    cachedStoryIds,
    currentUser,
    recentlyRead,
    stories,
    showAlert,
    searchQuery,
    setSearchQuery,
    filterLanguage,
    setFilterLanguage,
    filterCefrLevel,
    setFilterCefrLevel,
    sortBy,
    setSortBy,
  });

  return (
    <div className="min-h-screen bg-tj-bg-main text-tj-text-main font-sans transition-colors duration-200">
      {' '}
      {/* HEADER NAVBAR */}
      {!isZenMode && (
        <AppHeader
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          setShowSettingsModal={setShowSettingsModal}
          authChecking={authChecking}
          isPaid={isPaid}
          handleLogin={() => handleOpenAuth('signin')}
          handleLogout={handleLogout}
          setSelectedStory={handleRequestClearStory}
          setActiveTab={handleRequestTabChange}
          streakData={streakData}
          pendingFlagCount={pendingFlags.length}
          onOpenStreakDashboard={() => {
            if (dirty) {
              syncChangesToDatabase().catch((err) =>
                console.error('Auto-sync failed on streak click:', err),
              );
            }
            if (selectedStory?.isUnsaved) {
              setPendingNavigation({
                tab: 'bookshelf',
                clearStory: true,
                scrollDashboard: true,
              });
            } else {
              setSelectedStory(null);
              setActiveTab('bookshelf');
              setTimeout(() => {
                const el = document.getElementById('streak-dashboard-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }
          }}
        />
      )}
      {isMounted && !isOnline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>
            Offline Mode. You can read any previously opened stories. Generation
            & online translations are unavailable.
          </span>
        </div>
      )}
      {/* CORE NAVIGATION */}
      {!isZenMode && (
        <AppNav
          activeTab={activeTab}
          setActiveTab={handleRequestTabChange}
          setSelectedStory={handleRequestClearStory}
          storiesCount={visibleStories.length}
          bookshelfCount={bookshelfStories.length}
          savedVocabCount={savedVocab.length}
          notesCount={notesCount}
          selectedStory={selectedStory}
          dirty={dirty}
          isSyncing={isSyncing}
          syncChangesToDatabase={syncChangesToDatabase}
        />
      )}
      {/* CORE FRAME LAYOUT */}
      <main
        className={
          isZenMode
            ? 'w-full max-w-full px-0 py-0'
            : 'max-w-7xl mx-auto px-4 py-8'
        }
      >
        {/* Banner notification when writing is blocked */}
        {showLoginPrompt && (
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-6 bg-tj-primary-light dark:bg-tj-primary-light/10 border border-tj-primary-border dark:border-tj-primary-border p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-tj-text-main dark:text-tj-text-main text-xs"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold">Authentication Required</p>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  You are free to read any story. However, generating new
                  personalized CEFR narratives requires logging in.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogin}
              className="py-1.5 px-4 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-semibold rounded-xl shrink-0 cursor-pointer"
            >
              Sign In Now
            </button>
          </motion.div>
        )}

        {/* Chapter Generation Non-Blocking Toast */}
        <ChapterGenerationToast
          isGenerating={isGenerating}
          isAutoGenerating={isAutoGenerating}
          generationLogs={generationLogs}
          generationStatus={generationStatus}
          handleCancelGeneration={handleCancelGeneration}
        />

        {/* Glossary Generation Non-Blocking Toast */}
        <GlossaryGenerationToast
          isGeneratingGlossary={isGeneratingGlossary}
          glossaryLogs={glossaryLogs}
          glossaryStatus={glossaryStatus}
          handleCancelGeneration={handleCancelGeneration}
          glossaryError={glossaryError}
          onRetry={(modelId) => {
            if (selectedStory) {
              handleGenerateGlossary(selectedStory, modelId);
            }
          }}
          onDismiss={handleCancelGeneration}
        />

        <AnimatePresence mode="wait">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
              </div>
            }
          >
            {selectedStory ? (
              <motion.div
                key={`reader-${selectedStory.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ReaderPage
                  currentUser={currentUser}
                  selectedStory={selectedStory}
                  setSelectedStory={handleRequestClearStory}
                  activeChapterIdx={activeChapterIdx}
                  onSelectChapter={(idx) => {
                    setActiveChapterIdx(idx);
                    updateRecentlyRead(selectedStory.id, idx);
                  }}
                  handleToggleStoryPrivacy={handleToggleStoryPrivacy}
                  handleToggleBookshelf={handleToggleBookshelfWithAuth}
                  handleShareStoryLink={handleShareStoryLink}
                  bookshelf={bookshelf}
                  showShareToast={showShareToast}
                  showExportMenu={showExportMenu}
                  setShowExportMenu={setShowExportMenu}
                  showDocOptions={showDocOptions}
                  setShowDocOptions={setShowDocOptions}
                  showEpubLinks={showEpubLinks}
                  setShowEpubLinks={setShowEpubLinks}
                  copyStatus={copyStatus}
                  isExportingEpub={isExportingEpub}
                  triggerCopyPlaintext={triggerCopyPlaintext}
                  triggerCopyRichText={triggerCopyRichText}
                  handleDownloadEpub={handleDownloadEpub}
                  isGenerating={isGenerating}
                  isAutoGenerating={isAutoGenerating}
                  isAutoGenerationPaused={isAutoGenerationPaused}
                  handleGenerateNextChapter={handleGenerateNextChapter}
                  handleRegenerateChapter={handleRegenerateChapter}
                  handleAutoGenerateRemaining={handleAutoGenerateRemaining}
                  handleSaveWord={handleSaveWord}
                  onRemoveWord={handleRemoveSavedWord}
                  isPaid={isPaid}
                  onOpenSettings={() => setShowSettingsModal(true)}
                  showAlert={showAlert}
                  generationStatus={generationStatus}
                  handleCancelGeneration={handleCancelGeneration}
                  handleRateStory={handleRateStory}
                  lookupLimitData={lookupLimitData}
                  handleIncrementLookupCount={handleIncrementLookupCount}
                  savedVocab={savedVocab}
                  onStoryUpdated={(updatedStory) => {
                    handleAutoSaveGeneratedStory(updatedStory, false);
                  }}
                  handleDeleteChapter={handleDeleteChapter}
                  handleSaveNewChapter={handleSaveNewChapter}
                  handleDeleteStory={(bypass) =>
                    handleDeleteStory(selectedStory.id, null, bypass)
                  }
                  onFlagStory={handleOpenFlagModal}
                  isZenMode={isZenMode}
                  setIsZenMode={setIsZenMode}
                  handleGenerateGlossary={handleGenerateGlossary}
                  onGenerateCover={handleGenerateCover}
                  onSaveStory={handleSaveUnsavedStory}
                  onChapterFinished={handleChapterFinished}
                  onStoryFinished={handleStoryFinished}
                  onStoryUnfinished={handleStoryUnfinished}
                  dirty={dirty}
                  isSyncing={isSyncing}
                  syncChangesToDatabase={syncChangesToDatabase}
                  isGeneratingCover={
                    selectedStory
                      ? generatingCoverIds.has(selectedStory.id)
                      : false
                  }
                />
              </motion.div>
            ) : isStoryLoading ? (
              <motion.div
                key="reader-skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ReaderSkeleton
                  story={loadingStoryMetadata}
                  onBack={handleRequestClearStory}
                />
              </motion.div>
            ) : activeTab === 'browse' ? (
              <motion.div
                key="browse"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <BrowsePage
                  cachedStoryIds={cachedStoryIds}
                  visibleStories={visibleStories}
                  filteredStories={filteredStories}
                  bookshelf={bookshelf}
                  recentlyReadStories={recentlyReadStories}
                  recentlyRead={recentlyRead}
                  generatingCoverIds={generatingCoverIds}
                  handleToggleBookshelf={handleToggleBookshelfWithAuth}
                  handleSelectStory={handleSelectStory}
                  onDownloadStory={handleDownloadStory}
                  handleDeleteStory={handleDeleteStory}
                  onFlagStory={handleOpenFlagModal}
                  setActiveTab={setActiveTab}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  filterLanguage={filterLanguage}
                  setFilterLanguage={setFilterLanguage}
                  filterCefrLevel={filterCefrLevel}
                  setFilterCefrLevel={setFilterCefrLevel}
                  filterGenre={filterGenre}
                  setFilterGenre={setFilterGenre}
                  filterReadingStatus={filterReadingStatus}
                  setFilterReadingStatus={setFilterReadingStatus}
                />
              </motion.div>
            ) : activeTab === 'bookshelf' && currentUser ? (
              <motion.div
                key="bookshelf"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <BookshelfPage
                  streakData={streakData}
                  isPaid={isPaid}
                  generationLimitData={generationLimitData}
                  currentUser={currentUser}
                  handleSelectStory={handleSelectStory}
                  onDownloadStory={handleDownloadStory}
                  cachedStoryIds={cachedStoryIds}
                  bookshelfStories={bookshelfStories}
                  filteredBookshelfStories={filteredBookshelfStories}
                  bookshelf={bookshelf}
                  recentlyRead={recentlyRead}
                  generatingCoverIds={generatingCoverIds}
                  handleToggleBookshelf={handleToggleBookshelfWithAuth}
                  handleDeleteStory={handleDeleteStory}
                  onFlagStory={handleOpenFlagModal}
                  setActiveTab={setActiveTab}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  filterLanguage={filterLanguage}
                  setFilterLanguage={setFilterLanguage}
                  filterCefrLevel={filterCefrLevel}
                  setFilterCefrLevel={setFilterCefrLevel}
                  filterGenre={filterGenre}
                  setFilterGenre={setFilterGenre}
                  filterReadingStatus={filterReadingStatus}
                  setFilterReadingStatus={setFilterReadingStatus}
                  onRefreshPrivateStories={loadPrivateStories}
                  privateStoriesLoading={privateStoriesLoading}
                />
              </motion.div>
            ) : activeTab === 'notes' ? (
              <motion.div
                key="notes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <NotesPage
                  currentUser={currentUser}
                  stories={stories}
                  onSelectStory={handleSelectStory}
                  setActiveTab={handleRequestTabChange}
                  onOpenAuth={handleOpenAuth}
                />
              </motion.div>
            ) : activeTab === 'create' ? (
              <motion.div
                key="create"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <CreatePage
                  isOnline={isOnline}
                  handleInitiateStory={handleInitiateStory}
                  isGenerating={isGenerating}
                  currentUser={currentUser}
                  isPaid={isPaid}
                  generationLimitData={generationLimitData}
                  onLogin={handleLogin}
                />
              </motion.div>
            ) : activeTab === 'practice' ? (
              <motion.div
                key="practice"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <PracticePage
                  selectedStory={selectedStory}
                  savedVocab={savedVocab}
                  handleRemoveSavedWord={handleRemoveSavedWord}
                  handleRecordDailyActivity={handleRecordDailyActivity}
                  onUpdateWordSRS={handleUpdateWordSRS}
                />
              </motion.div>
            ) : activeTab === 'admin' && currentUser?.isAdmin === true ? (
              <motion.div
                key="admin"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AdminPage
                  isAdmin={currentUser?.isAdmin === true}
                  showAlert={showAlert}
                  onRefreshCache={() =>
                    loadStoriesMetadata({ refresh: true, forceAll: true })
                  }
                />
              </motion.div>
            ) : activeTab === 'about' ? (
              <motion.div
                key="about"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AboutPage setActiveTab={handleRequestTabChange} />
              </motion.div>
            ) : null}
          </Suspense>
        </AnimatePresence>
      </main>
      {!isZenMode && (
        <>
          <FloatingFooter />
          <footer className="mt-20 border-t border-tj-border-main bg-tj-bg-card py-6 text-tj-text-muted select-none">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                CEFR Graded Short Story Builder.
              </p>
              <div className="flex items-center gap-4 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => handleRequestTabChange('about')}
                  className="text-slate-400 hover:text-tj-primary dark:text-slate-500 dark:hover:text-tj-primary-hover transition-colors border-0 bg-transparent cursor-pointer p-0 font-medium"
                >
                  About & Support
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <a
                  href="/privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-tj-primary dark:text-slate-500 dark:hover:text-tj-primary-hover transition-colors"
                >
                  Privacy Notice
                </a>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <a
                  href="/terms.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-tj-primary dark:text-slate-500 dark:hover:text-tj-primary-hover transition-colors"
                >
                  Terms of Service
                </a>
              </div>
            </div>
          </footer>
        </>
      )}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        handleSaveCustomOpenRouterKey={handleSaveCustomOpenRouterKey}
        isPaid={isPaid}
      />
      <StreakCelebrationModal
        isOpen={!!celebrationConfig && celebrationConfig.isOpen}
        onClose={() =>
          setCelebrationConfig((prev) =>
            prev ? { ...prev, isOpen: false } : null,
          )
        }
        streak={celebrationConfig?.streak ?? 0}
        type={celebrationConfig?.type ?? 'maintained'}
      />
      {/* Custom Alert Modal overlay */}
      <AnimatePresence>
        {alertConfig && (
          <AlertModal
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            onClose={() => setAlertConfig(null)}
          />
        )}
      </AnimatePresence>
      {/* Unsaved Changes warning overlay */}
      <AnimatePresence>
        {pendingNavigation && (
          <UnsavedChangesModal
            onClose={() => setPendingNavigation(null)}
            onDiscard={handleConfirmDiscardAndLeave}
            onSave={handleConfirmSaveAndLeave}
            isSaving={isSavingStory}
            isDiscarding={isDiscardingStory}
          />
        )}
      </AnimatePresence>
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
        initialMode={authModalMode}
      />
      <FlagStoryModal
        isOpen={isFlagModalOpen}
        onClose={() => setIsFlagModalOpen(false)}
        story={flaggingStory}
        currentUser={currentUser}
        onSuccess={(msg) => showAlert('Story Flagged', msg, 'info')}
      />
      <CookieConsent />
      <InstructionFloatingBox
        onOpenAuth={(mode = 'signup') => handleOpenAuth(mode)}
      />
    </div>
  );
}
