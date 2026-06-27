import { AlertCircle, WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AlertModal from './components/AlertModal';
import AppHeader from './components/app/AppHeader';
import AppNav from './components/app/AppNav';
// Modular Sub-components
import AuthModal from './components/app/AuthModal';
import ChapterGenerationToast from './components/app/ChapterGenerationToast';
import CookieConsent from './components/app/CookieConsent';
import GlossaryGenerationToast from './components/app/GlossaryGenerationToast';
import PwaUpdateNotification from './components/app/PwaUpdateNotification';
import SettingsModal from './components/app/SettingsModal';
import StreakCelebrationModal from './components/app/StreakCelebrationModal';
import UnsavedChangesModal from './components/app/UnsavedChangesModal';
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
import AdminPage from './pages/AdminPage';
import BookshelfPage from './pages/BookshelfPage';
// Pages
import BrowsePage from './pages/BrowsePage';
import CreatePage from './pages/CreatePage';
import PracticePage from './pages/PracticePage';
import ReaderPage from './pages/ReaderPage';
import {
  googleSignIn,
  initAuth,
  logout,
  syncUserProfile,
} from './services/auth';
import {
  createStory,
  decrementStoryCompletion,
  fetchStory,
  type GenerationLimitData,
  incrementStoryCompletion,
  saveUserLookupLimitDebounced,
} from './services/db';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import type { Story } from './types';
import { cleanCompletedStory } from './utils/storyCleanup';

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

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

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
    'browse' | 'bookshelf' | 'create' | 'practice' | 'admin'
  >(() => {
    if (ssrPath) {
      const tabMatch = ssrPath.match(
        /^\/(browse|bookshelf|create|practice|admin)/,
      );
      if (tabMatch) return tabMatch[1] as any;
    } else if (typeof window !== 'undefined') {
      const tabMatch = window.location.pathname.match(
        /^\/(browse|bookshelf|create|practice|admin)/,
      );
      if (tabMatch) return tabMatch[1] as any;
    }
    return 'browse';
  });

  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [generationLimitData, setGenerationLimitData] =
    useState<GenerationLimitData>(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      const thisMonthStr = todayStr.substring(0, 7);
      const local =
        typeof window !== 'undefined'
          ? localStorage.getItem('generation_limit_data')
          : null;
      if (local) {
        try {
          const parsed = JSON.parse(local);
          return {
            freeModelCount:
              parsed.date === todayStr
                ? (parsed.freeModelCount ?? parsed.gemmaDeepseekCount ?? 0)
                : 0,
            monthlyCreditsUsed:
              parsed.monthlyCreditsMonth === thisMonthStr
                ? (parsed.monthlyCreditsUsed ?? 0)
                : 0,
            monthlyCreditsMonth: parsed.monthlyCreditsMonth ?? thisMonthStr,
            date: todayStr,
          };
        } catch (e) {
          console.error('Error parsing generation limit data:', e);
        }
      }
      return {
        freeModelCount: 0,
        monthlyCreditsUsed: 0,
        monthlyCreditsMonth: thisMonthStr,
        date: todayStr,
      };
    });

  // AdSense dynamic integration (Option 1: respect paid tier & cookie consent)
  useAdSense(isPaid);

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
    handleIncrementLookupCount,
    handleIncrementGenerationCount,
    handleSaveWord,
    handleRemoveSavedWord,
    handleUpdateWordSRS,
    handleToggleBookshelf,
    updateRecentlyRead,
    dirty,
    isSyncing,
    syncChangesToDatabase,
  } = useUserData({
    currentUser,
    isPaid,
    setIsPaid,
    generationLimitData,
    setGenerationLimitData,
    showAlert,
    onProfileLoaded: (profile) => {
      syncInitialStreak(currentUser?.uid, profile.streak).catch((err) =>
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
    onGenerationSuccess: handleIncrementGenerationCount,
    selectedStory,
    stories,
    showAlert,
    onStoryCreated: (story) => {
      const cleaned = cleanCompletedStory(story);
      setSelectedStory(cleaned);
      setActiveChapterIdx(0);
      localStorage.setItem(`last_read_chapter_${cleaned.id}`, '0');
      localStorage.setItem(
        `cefr_story_cache_${cleaned.id}`,
        JSON.stringify(cleaned),
      );
      setCachedStoryIds((prev) => {
        if (prev.includes(cleaned.id)) return prev;
        const updated = [...prev, cleaned.id];
        localStorage.setItem('cefr_cached_story_ids', JSON.stringify(updated));
        return updated;
      });
      loadStoriesMetadata({ refresh: true, storyId: cleaned.id });
      setActiveTab('browse');
    },
    onStoryUpdated: (story) => {
      const cleaned = cleanCompletedStory(story);
      setSelectedStory(cleaned);
      localStorage.setItem(
        `cefr_story_cache_${cleaned.id}`,
        JSON.stringify(cleaned),
      );
      loadStoriesMetadata({ refresh: true, storyId: cleaned.id });
    },
    onLoginRequired: () => setShowLoginPrompt(true),
  });

  // Pending navigation guard states
  const [pendingNavigation, setPendingNavigation] = useState<{
    tab?: 'browse' | 'bookshelf' | 'create' | 'practice' | 'admin';
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
    if (selectedStory?.isUnsaved) {
      setPendingNavigation({ tab });
    } else {
      setActiveTab(tab);
    }
  };

  const handleRequestClearStory = () => {
    if (dirty) {
      syncChangesToDatabase().catch((err) =>
        console.error('Auto-sync failed on clear story:', err),
      );
    }
    if (selectedStory?.isUnsaved) {
      setPendingNavigation({ clearStory: true });
    } else {
      setSelectedStory(null);
    }
  };

  const handleSaveUnsavedStory = async (storyToSave?: Story) => {
    const targetStory = storyToSave || selectedStory;
    if (!targetStory?.isUnsaved) return;
    setIsSavingStory(true);
    try {
      const oldId = targetStory.id;
      // PocketBase custom IDs must consist of a-z0-9 and be 15 to 50 characters.
      // If oldId is already a valid PocketBase ID format, keep it exactly as-is.
      let sanitizedId = oldId;
      const isValidPocketBaseId = /^[a-z0-9]{15,50}$/.test(oldId);
      if (!isValidPocketBaseId) {
        const alphanumeric = oldId.toLowerCase().replace(/[^a-z0-9]/g, '');
        sanitizedId = alphanumeric;
        if (alphanumeric.length > 50) {
          sanitizedId = alphanumeric.substring(0, 50);
        } else if (alphanumeric.length < 15) {
          const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
          while (sanitizedId.length < 15) {
            sanitizedId += chars.charAt(
              Math.floor(Math.random() * chars.length),
            );
          }
        }
      }

      const { isUnsaved, ...cleanedStory } = targetStory;
      const savedStory = {
        ...cleanedStory,
        id: sanitizedId,
        creatorId: currentUser?.uid || cleanedStory.creatorId,
        creatorEmail: currentUser?.email || cleanedStory.creatorEmail,
      } as Story;

      await createStory(savedStory);

      const finalizedStory = {
        ...targetStory,
        id: sanitizedId,
        isUnsaved: false,
        creatorId: currentUser?.uid || targetStory.creatorId,
        creatorEmail: currentUser?.email || targetStory.creatorEmail,
      };
      setSelectedStory(finalizedStory);

      // Clean up old ID cache keys if they differ
      if (oldId !== sanitizedId) {
        const lastReadChapter = localStorage.getItem(
          `last_read_chapter_${oldId}`,
        );
        if (lastReadChapter !== null) {
          localStorage.setItem(
            `last_read_chapter_${sanitizedId}`,
            lastReadChapter,
          );
        }
        localStorage.removeItem(`cefr_story_cache_${oldId}`);
        localStorage.removeItem(`last_read_chapter_${oldId}`);
        setCachedStoryIds((prev) => {
          const filtered = prev.filter((id) => id !== oldId);
          const updated = filtered.includes(sanitizedId)
            ? filtered
            : [...filtered, sanitizedId];
          localStorage.setItem(
            'cefr_cached_story_ids',
            JSON.stringify(updated),
          );
          return updated;
        });
      }

      localStorage.setItem(
        `cefr_story_cache_${sanitizedId}`,
        JSON.stringify(finalizedStory),
      );
      loadStoriesMetadata({ refresh: true, storyId: sanitizedId });

      // Sync any pending user changes (like recentlyRead) to prevent beforeunload prompts
      try {
        await syncChangesToDatabase();
      } catch (syncErr) {
        console.error('Failed to sync user profile after story save:', syncErr);
      }

      showAlert(
        'Story Saved Successfully',
        `"${targetStory.title}" is saved to database.`,
        'info',
      );
      return finalizedStory;
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
      const cacheKey = `cefr_story_cache_${storyId}`;
      try {
        const dbStory = await fetchStory(storyId);
        if (dbStory) {
          localStorage.setItem(cacheKey, JSON.stringify(dbStory));
          setSelectedStory(dbStory);
        } else {
          // If the story draft does not exist in DB, clean up from localStorage and active list
          localStorage.removeItem(cacheKey);
          localStorage.removeItem(`last_read_chapter_${storyId}`);
          setSelectedStory(null);
          setCachedStoryIds((prev) => {
            const updated = prev.filter((id) => id !== storyId);
            localStorage.setItem(
              'cefr_cached_story_ids',
              JSON.stringify(updated),
            );
            return updated;
          });
        }
      } catch (err) {
        console.error('Failed to restore story from database on discard:', err);
        // Fallback: clear the cache key so it doesn't stay dirty
        localStorage.removeItem(cacheKey);
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
              };
              localStorage.setItem(
                `cefr_story_cache_${prev.id}`,
                JSON.stringify(updated),
              );
              return updated;
            }
            return null;
          });
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
  const handleRecordDailyActivityRef = useRef(handleRecordDailyActivity);

  useEffect(() => {
    updateRecentlyReadRef.current = updateRecentlyRead;
    handleRecordDailyActivityRef.current = handleRecordDailyActivity;
  });

  const handleChapterFinished = useCallback(() => {
    handleRecordDailyActivityRef.current();
  }, []);

  const handleStoryFinished = useCallback(
    async (storyId: string) => {
      if (currentUser) {
        try {
          await incrementStoryCompletion(storyId, currentUser.uid);
          loadStoriesMetadata({ refresh: true, storyId });
        } catch (err) {
          console.error('Failed to increment story completion:', err);
        }
      } else {
        localStorage.setItem(`completed_story_${storyId}`, 'true');
      }
    },
    [currentUser, loadStoriesMetadata],
  );

  const handleStoryUnfinished = useCallback(
    async (storyId: string) => {
      if (currentUser) {
        try {
          await decrementStoryCompletion(storyId, currentUser.uid);
          loadStoriesMetadata({ refresh: true, storyId });
        } catch (err) {
          console.error('Failed to decrement story completion:', err);
        }
      } else {
        localStorage.removeItem(`completed_story_${storyId}`);
      }
    },
    [currentUser, loadStoriesMetadata],
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
    if (selectedStory?.id) {
      updateRecentlyReadRef.current(selectedStory.id, activeChapterIdx);
    }
  }, [selectedStory?.id, activeChapterIdx]);

  const handleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        const profile = await syncUserProfile(result.user);
        setIsPaid(profile.isPaid);
        setShowLoginPrompt(false);
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
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

  useUrlRouting({
    selectedStory,
    setSelectedStory,
    activeChapterIdx,
    setActiveChapterIdx,
    activeTab,
    setActiveTab,
    storiesLoading,
    isOnline,
    cachedStoryIds,
    currentUser,
    recentlyRead,
    showAlert,
  });

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
    filterStatus,
    setFilterStatus,
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
          handleLogin={() => setShowAuthModal(true)}
          handleLogout={handleLogout}
          setSelectedStory={handleRequestClearStory}
          setActiveTab={handleRequestTabChange}
          streakData={streakData}
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
      {!isOnline && (
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
        />

        <AnimatePresence mode="wait">
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
                  localStorage.setItem(
                    `last_read_chapter_${selectedStory.id}`,
                    idx.toString(),
                  );
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
                  const cleaned = cleanCompletedStory(updatedStory);
                  setSelectedStory(cleaned);
                  localStorage.setItem(
                    `cefr_story_cache_${cleaned.id}`,
                    JSON.stringify(cleaned),
                  );
                  // Only refresh metadata if the story is already saved in database.
                  // Unsaved drafts have no server record yet, so fetching would be
                  // a no-op and incorrectly sets storiesLoading=true, freezing the UI.
                  if (!cleaned.isUnsaved) {
                    loadStoriesMetadata({
                      refresh: true,
                      storyId: cleaned.id,
                    });
                  }
                }}
                handleDeleteChapter={handleDeleteChapter}
                handleSaveNewChapter={handleSaveNewChapter}
                handleDeleteStory={(bypass) =>
                  handleDeleteStory(selectedStory.id, null, bypass)
                }
                isZenMode={isZenMode}
                setIsZenMode={setIsZenMode}
                handleGenerateGlossary={handleGenerateGlossary}
                onSaveStory={handleSaveUnsavedStory}
                onChapterFinished={handleChapterFinished}
                onStoryFinished={handleStoryFinished}
                onStoryUnfinished={handleStoryUnfinished}
                dirty={dirty}
                isSyncing={isSyncing}
                syncChangesToDatabase={syncChangesToDatabase}
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
                handleToggleBookshelf={handleToggleBookshelfWithAuth}
                handleSelectStory={handleSelectStory}
                onDownloadStory={handleDownloadStory}
                handleDeleteStory={handleDeleteStory}
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
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
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
                handleToggleBookshelf={handleToggleBookshelfWithAuth}
                handleDeleteStory={handleDeleteStory}
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
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                filterReadingStatus={filterReadingStatus}
                setFilterReadingStatus={setFilterReadingStatus}
                onRefreshPrivateStories={loadPrivateStories}
                privateStoriesLoading={privateStoriesLoading}
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
          ) : activeTab === 'practice' &&
            (selectedStory || savedVocab.length > 0) ? (
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
          ) : activeTab === 'admin' &&
            currentUser?.email === 'jmayereup@gmail.com' ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AdminPage
                currentAdminEmail={currentUser.email}
                showAlert={showAlert}
                onRefreshCache={() =>
                  loadStoriesMetadata({ refresh: true, forceAll: true })
                }
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
      {!isZenMode && (
        <footer className="mt-20 border-t border-tj-border-main bg-tj-bg-card py-6 text-tj-text-muted select-none">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              CEFR Graded Short Story Builder.
            </p>
            <div className="flex items-center gap-4 text-xs font-medium">
              <a
                href="mailto:admin@teacherjake.com"
                className="text-slate-400 hover:text-tj-primary dark:text-slate-500 dark:hover:text-tj-primary-hover transition-colors"
              >
                Contact Support
              </a>
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
      />
      <CookieConsent />
      <PwaUpdateNotification />
    </div>
  );
}
