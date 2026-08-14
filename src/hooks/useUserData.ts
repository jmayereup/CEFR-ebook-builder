import { useEffect, useRef, useState } from 'react';
import {
  deleteWord,
  fetchUserProfile,
  fetchUserVocab,
  type GenerationLimitData,
  type RecentlyReadItem,
  saveUserGenerationLimit,
  saveUserProfileData,
  saveWord,
} from '../services/db';
import { pb } from '../services/pocketbase';
import { useUIStore } from '../store/uiStore';
import type { VocabularyTerm } from '../types';
import { calculateNextSRS } from '../utils/srs';

interface LookupLimitData {
  count: number;
  date: string;
}

export function parseRecentlyReadItems(data: any): RecentlyReadItem[] {
  if (!data || !Array.isArray(data)) return [];
  return data
    .map((item) => {
      if (typeof item === 'string') {
        return { storyId: item, chapterIdx: 0 };
      }
      if (
        item &&
        typeof item === 'object' &&
        typeof item.storyId === 'string'
      ) {
        return {
          storyId: item.storyId,
          chapterIdx: typeof item.chapterIdx === 'number' ? item.chapterIdx : 0,
        };
      }
      return null;
    })
    .filter((item): item is RecentlyReadItem => !!item);
}

const defaultLookupLimitData = (): LookupLimitData => {
  const todayStr = new Date().toISOString().split('T')[0];
  const local =
    typeof window !== 'undefined'
      ? localStorage.getItem('lookup_limit_data')
      : null;
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (parsed.date === todayStr) {
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing lookup limit data:', e);
    }
  }
  return { count: 0, date: todayStr };
};

interface UseUserDataOptions {
  currentUser: { uid: string } | null;
  authChecking: boolean;
  isPaid: boolean;
  setIsPaid: (paid: boolean) => void;
  generationLimitData: GenerationLimitData;
  setGenerationLimitData: (
    data:
      | GenerationLimitData
      | ((prev: GenerationLimitData) => GenerationLimitData),
  ) => void;
  showAlert: (
    title: string,
    message: string,
    type?: 'info' | 'error' | 'warning',
  ) => void;
  onProfileLoaded?: (profile: { streak?: any }) => void;
}

export function useUserData(options: UseUserDataOptions) {
  const {
    currentUser,
    authChecking,
    showAlert,
    onProfileLoaded,
    setIsPaid,
    setGenerationLimitData,
  } = options;

  const onProfileLoadedRef = useRef(onProfileLoaded);
  useEffect(() => {
    onProfileLoadedRef.current = onProfileLoaded;
  }, [onProfileLoaded]);

  const [bookshelf, setBookshelf] = useState<string[]>(() => {
    const local =
      typeof window !== 'undefined' ? localStorage.getItem('bookshelf') : null;
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error('Error parsing bookshelf from localStorage:', e);
      }
    }
    return [];
  });
  const [recentlyRead, setRecentlyRead] = useState<RecentlyReadItem[]>(() => {
    const local =
      typeof window !== 'undefined'
        ? localStorage.getItem('recently_read')
        : null;
    if (local) {
      try {
        return parseRecentlyReadItems(JSON.parse(local));
      } catch (e) {
        console.error('Error parsing recently_read from localStorage:', e);
      }
    }
    return [];
  });
  const [savedVocab, setSavedVocab] = useState<VocabularyTerm[]>(() => {
    const local =
      typeof window !== 'undefined'
        ? localStorage.getItem('saved_vocab')
        : null;
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error('Error parsing saved vocab from localStorage:', e);
      }
    }
    return [];
  });
  const [lookupLimitData, setLookupLimitData] = useState<LookupLimitData>(
    defaultLookupLimitData,
  );

  const [dirty, setDirty] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isUserDataLoaded, setIsUserDataLoaded] = useState<boolean>(false);
  const isSyncingFromServer = useRef(false);

  const translationTargetLanguage = useUIStore(
    (state) => state.translationTargetLanguage,
  );
  const readerFontSize = useUIStore((state) => state.readerFontSize);
  const readerUseSerif = useUIStore((state) => state.readerUseSerif);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (isSyncingFromServer.current) {
      return;
    }
    if (currentUser) {
      markDirty();
    }
  }, [translationTargetLanguage, readerFontSize, readerUseSerif, currentUser]);

  const savedVocabRef = useRef(savedVocab);
  const bookshelfRef = useRef(bookshelf);
  const recentlyReadRef = useRef(recentlyRead);
  const lookupLimitDataRef = useRef(lookupLimitData);
  const dirtyRef = useRef(dirty);

  useEffect(() => {
    savedVocabRef.current = savedVocab;
    bookshelfRef.current = bookshelf;
    recentlyReadRef.current = recentlyRead;
    lookupLimitDataRef.current = lookupLimitData;
    dirtyRef.current = dirty;
  }, [savedVocab, bookshelf, recentlyRead, lookupLimitData, dirty]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUserRef = useRef<{ uid: string } | null>(null);

  const markDirty = () => {
    setDirty(true);
    dirtyRef.current = true;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      syncChangesToDatabase().catch((err) =>
        console.error('[Auto-Sync] Sync failed:', err),
      );
    }, 2000); // 2 seconds
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const syncChangesToDatabase = async (): Promise<void> => {
    if (!currentUser || !dirtyRef.current) return;
    setIsSyncing(true);
    try {
      const payload = {
        userId: currentUser.uid,
        bookshelf: bookshelfRef.current,
        recentlyRead: recentlyReadRef.current,
        lookupLimitData: lookupLimitDataRef.current,
        translationTargetLanguage:
          useUIStore.getState().translationTargetLanguage,
        readerFontSize: useUIStore.getState().readerFontSize,
        readerUseSerif: useUIStore.getState().readerUseSerif,
      };

      const response = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Server sync failed');
      }

      setDirty(false);
      dirtyRef.current = false;
    } catch (err) {
      console.error('Failed to sync cached user data to database:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Use beforeunload to prevent accidental tab closures on PC when dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
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
  }, []);

  const handleIncrementLookupCount = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setLookupLimitData((prev) => {
      const updated = {
        count: prev.date === todayStr ? prev.count + 1 : 1,
        date: todayStr,
      };

      localStorage.setItem('lookup_limit_data', JSON.stringify(updated));
      return updated;
    });
    // markDirty must be called outside the updater to avoid calling setState inside setState
    if (currentUser) {
      markDirty();
    }
  };

  const handleIncrementGenerationCount = (
    modelId: string,
    creditsCost: number,
  ) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const thisMonthStr = todayStr.substring(0, 7);
    setGenerationLimitData((prev) => {
      const isFreeModel =
        modelId.endsWith(':free') ||
        modelId === 'openrouter/free' ||
        modelId ===
          'cognitivecomputations/dolphin-mistral-24b-venice-edition:free' ||
        modelId === 'meta-llama/llama-3.3-70b-instruct:free' ||
        modelId === 'google/gemma-4-31b-it:free' ||
        modelId === 'openai/gpt-oss-20b:free' ||
        modelId === 'openai/gpt-oss-120b:free';

      const prevDateIsToday = prev.date === todayStr;
      const prevMonthIsThisMonth = prev.monthlyCreditsMonth === thisMonthStr;

      const prevFreeCount = prevDateIsToday ? (prev.freeModelCount ?? 0) : 0;
      const prevDailyCredits = prevDateIsToday
        ? (prev.dailyCreditsUsed ?? 0)
        : 0;
      const prevCreditsUsed = prevMonthIsThisMonth
        ? (prev.monthlyCreditsUsed ?? 0)
        : 0;

      const updated: GenerationLimitData = {
        dailyCreditsUsed: prevDailyCredits + creditsCost,
        dailyCreditsDate: todayStr,
        freeModelCount: isFreeModel ? prevFreeCount + 1 : prevFreeCount,
        monthlyCreditsUsed: !isFreeModel
          ? prevCreditsUsed + creditsCost
          : prevCreditsUsed,
        monthlyCreditsMonth: thisMonthStr,
        date: todayStr,
      };

      if (currentUser) {
        localStorage.setItem('generation_limit_data', JSON.stringify(updated));
        saveUserGenerationLimit(currentUser.uid, updated).catch((err) => {
          console.error(
            'Error updating generation limit data in database:',
            err,
          );
        });
      }
      return updated;
    });
  };

  const handleSaveWord = async (wordObj: VocabularyTerm) => {
    if (
      savedVocab.some(
        (v) => v.word.toLowerCase() === wordObj.word.toLowerCase(),
      )
    ) {
      showAlert(
        'Word Already Saved',
        `"${wordObj.word}" is already saved in your vocabulary list.`,
        'info',
      );
      return;
    }

    if (currentUser) {
      try {
        const savedTerm = await saveWord(currentUser.uid, wordObj);
        const updated = [...savedVocab, savedTerm];
        setSavedVocab(updated);
        localStorage.setItem('saved_vocab', JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving word to DB:', e);
        showAlert('Error', 'Failed to save word.', 'error');
      }
    } else {
      const updated = [...savedVocab, wordObj];
      setSavedVocab(updated);
      localStorage.setItem('saved_vocab', JSON.stringify(updated));
      showAlert(
        'Word Saved Locally',
        `"${wordObj.word}" saved to your local device.`,
        'info',
      );
    }
  };

  const handleRemoveSavedWord = async (wordText: string) => {
    if (currentUser) {
      try {
        await deleteWord(currentUser.uid, wordText);
      } catch (e) {
        console.error('Error deleting word from DB:', e);
      }
    }
    const updated = savedVocab.filter(
      (v) => v.word.toLowerCase() !== wordText.toLowerCase(),
    );
    setSavedVocab(updated);
    localStorage.setItem('saved_vocab', JSON.stringify(updated));
  };

  const handleUpdateWordSRS = async (
    term: VocabularyTerm,
    isCorrect: boolean,
  ) => {
    const updatedSrs = calculateNextSRS(
      {
        nextReviewDate: term.nextReviewDate,
        repetition: term.repetition,
        interval: term.interval,
        easeFactor: term.easeFactor,
      },
      isCorrect,
    );

    const updatedTerm: VocabularyTerm = {
      ...term,
      ...updatedSrs,
    };

    if (currentUser) {
      try {
        const savedTerm = await saveWord(currentUser.uid, updatedTerm);
        setSavedVocab((prev) => {
          const filtered = prev.filter(
            (v) => v.word.toLowerCase() !== savedTerm.word.toLowerCase(),
          );
          const updated = [...filtered, savedTerm];
          localStorage.setItem('saved_vocab', JSON.stringify(updated));
          return updated;
        });
      } catch (e) {
        console.error('Error updating word SRS:', e);
      }
    } else {
      // Local fallback
      setSavedVocab((prev) => {
        const filtered = prev.filter(
          (v) => v.word.toLowerCase() !== updatedTerm.word.toLowerCase(),
        );
        const updated = [...filtered, updatedTerm];
        localStorage.setItem('saved_vocab', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleToggleBookshelf = async (storyId: string) => {
    const isSaved = bookshelf.includes(storyId);
    const updated = isSaved
      ? bookshelf.filter((id) => id !== storyId)
      : [...bookshelf, storyId];
    setBookshelf(updated);
    localStorage.setItem('bookshelf', JSON.stringify(updated));
    if (currentUser) {
      markDirty();
    }
  };

  const updateRecentlyRead = async (storyId: string, chapterIdx: number) => {
    const currentList = recentlyReadRef.current;
    const existing = currentList.find((item) => item.storyId === storyId);
    if (
      existing &&
      existing.chapterIdx === chapterIdx &&
      currentList[0]?.storyId === storyId
    ) {
      return;
    }

    const filtered = currentList.filter((item) => item.storyId !== storyId);
    const updated = [{ storyId, chapterIdx }, ...filtered].slice(0, 100);
    localStorage.setItem('recently_read', JSON.stringify(updated));
    localStorage.setItem(`last_read_chapter_${storyId}`, chapterIdx.toString());
    setRecentlyRead(updated);

    if (currentUser) {
      markDirty();
    }
  };

  // Load saved vocabulary and lookup limit from database (if user is authenticated) or localStorage
  useEffect(() => {
    if (authChecking) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const thisMonthStr = todayStr.substring(0, 7);
    const lastFetchTimeRef = { current: 0 };
    const isFetchingRef = { current: false };

    const loadSavedVocab = async (force = false) => {
      if (currentUser) {
        // Throttle automatic re-fetches (e.g. on focus) to at most once every 15 seconds unless forced
        const now = Date.now();
        if (!force && now - lastFetchTimeRef.current < 15000) {
          return;
        }
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        lastFetchTimeRef.current = now;

        try {
          // Attempt to refresh the auth token first to verify session validity
          try {
            await pb.collection('users').authRefresh();
          } catch (authErr: any) {
            console.warn(
              '[useUserData] authRefresh failed on load/focus:',
              authErr,
            );
            // If the token is expired/revoked (401/403), stop and let auth handler log the user out
            if (authErr.status === 401 || authErr.status === 403) {
              pb.authStore.clear();
              return;
            }
          }

          const profile = await fetchUserProfile(currentUser.uid);
          const vocab = await fetchUserVocab(currentUser.uid);

          if (profile) {
            setSavedVocab(vocab);
            setIsPaid(profile.isPaid ?? false);

            // Notify parent about profile load for streak sync
            if (onProfileLoadedRef.current) {
              onProfileLoadedRef.current(profile);
            }

            // Load and merge Bookshelf
            const guestBookshelfRaw = localStorage.getItem('bookshelf');
            let guestBookshelf: string[] = [];
            if (guestBookshelfRaw) {
              try {
                guestBookshelf = JSON.parse(guestBookshelfRaw);
              } catch (e) {
                console.error('Error parsing guest bookshelf:', e);
              }
            }
            const cloudBookshelf = profile.bookshelf || [];
            const mergedBookshelf = Array.from(
              new Set([...guestBookshelf, ...cloudBookshelf]),
            );

            // Load and merge Recently Read
            const guestRecentlyReadRaw = localStorage.getItem('recently_read');
            let guestRecentlyRead: RecentlyReadItem[] = [];
            if (guestRecentlyReadRaw) {
              try {
                guestRecentlyRead = parseRecentlyReadItems(
                  JSON.parse(guestRecentlyReadRaw),
                );
              } catch (e) {
                console.error('Error parsing guest recently_read:', e);
              }
            }
            const cloudRecentlyRead = parseRecentlyReadItems(
              profile.recentlyRead,
            );
            const cloudMap = new Map<string, RecentlyReadItem>();
            for (const item of cloudRecentlyRead) {
              cloudMap.set(item.storyId, item);
            }

            // Cloud history is authoritative for the user's account across devices
            const mergedRecentlyRead: RecentlyReadItem[] = [
              ...cloudRecentlyRead,
            ];
            for (const guestItem of guestRecentlyRead) {
              const existingCloud = cloudMap.get(guestItem.storyId);
              if (!existingCloud) {
                mergedRecentlyRead.push(guestItem);
              } else if (guestItem.chapterIdx > existingCloud.chapterIdx) {
                const idx = mergedRecentlyRead.findIndex(
                  (m) => m.storyId === guestItem.storyId,
                );
                if (idx !== -1) {
                  mergedRecentlyRead[idx] = {
                    ...mergedRecentlyRead[idx],
                    chapterIdx: guestItem.chapterIdx,
                  };
                }
              }
            }
            const finalRecentlyRead = mergedRecentlyRead.slice(0, 100);

            // Determine if data has changed/guest data is added compared to cloud
            const bookshelfChanged =
              mergedBookshelf.length !== cloudBookshelf.length ||
              mergedBookshelf.some((id, idx) => cloudBookshelf[idx] !== id);

            const recentlyReadChanged =
              finalRecentlyRead.length !== cloudRecentlyRead.length ||
              finalRecentlyRead.some((item, idx) => {
                const cloudItem = cloudRecentlyRead[idx];
                return (
                  !cloudItem ||
                  cloudItem.storyId !== item.storyId ||
                  cloudItem.chapterIdx !== item.chapterIdx
                );
              });

            // Persist immediately to cloud if changed
            if (bookshelfChanged || recentlyReadChanged) {
              await saveUserProfileData(currentUser.uid, {
                bookshelf: mergedBookshelf,
                recentlyRead: finalRecentlyRead,
                lookupLimitData: profile.lookupLimitData,
              });
            }

            // Sync back to local states and localStorage
            setBookshelf(mergedBookshelf);
            localStorage.setItem('bookshelf', JSON.stringify(mergedBookshelf));
            setRecentlyRead(finalRecentlyRead);
            localStorage.setItem(
              'recently_read',
              JSON.stringify(finalRecentlyRead),
            );
            for (const item of finalRecentlyRead) {
              localStorage.setItem(
                `last_read_chapter_${item.storyId}`,
                item.chapterIdx.toString(),
              );
            }

            if (
              profile.lookupLimitData &&
              profile.lookupLimitData.date === todayStr
            ) {
              setLookupLimitData(profile.lookupLimitData);
              localStorage.setItem(
                'lookup_limit_data',
                JSON.stringify(profile.lookupLimitData),
              );
            } else {
              const resetData = { count: 0, date: todayStr };
              setLookupLimitData(resetData);
              localStorage.setItem(
                'lookup_limit_data',
                JSON.stringify(resetData),
              );
            }

            if (profile.generationLimitData) {
              const dataWithFallbacks = {
                dailyCreditsUsed:
                  profile.generationLimitData.date === todayStr
                    ? (profile.generationLimitData.dailyCreditsUsed ?? 0)
                    : 0,
                dailyCreditsDate: todayStr,
                freeModelCount:
                  profile.generationLimitData.date === todayStr
                    ? (profile.generationLimitData.freeModelCount ??
                      (profile.generationLimitData as any).gemmaDeepseekCount ??
                      0)
                    : 0,
                monthlyCreditsUsed:
                  profile.generationLimitData.monthlyCreditsMonth ===
                  thisMonthStr
                    ? (profile.generationLimitData.monthlyCreditsUsed ?? 0)
                    : 0,
                monthlyCreditsMonth:
                  profile.generationLimitData.monthlyCreditsMonth ??
                  thisMonthStr,
                date: todayStr,
              };
              setGenerationLimitData(dataWithFallbacks);
              localStorage.setItem(
                'generation_limit_data',
                JSON.stringify(dataWithFallbacks),
              );
            } else {
              const resetData = {
                dailyCreditsUsed: 0,
                dailyCreditsDate: todayStr,
                freeModelCount: 0,
                monthlyCreditsUsed: 0,
                monthlyCreditsMonth: thisMonthStr,
                date: todayStr,
              };
              setGenerationLimitData(resetData);
              localStorage.setItem(
                'generation_limit_data',
                JSON.stringify(resetData),
              );
            }

            // Load and update target language, font size, serif choice
            isSyncingFromServer.current = true;
            if (profile.translationTargetLanguage !== undefined) {
              useUIStore
                .getState()
                .setTranslationTargetLanguage(
                  profile.translationTargetLanguage,
                );
            }
            if (
              profile.readerFontSize !== undefined &&
              profile.readerFontSize !== null
            ) {
              const dbSize = profile.readerFontSize;
              if (typeof dbSize === 'number' && dbSize >= 14 && dbSize <= 26) {
                useUIStore.getState().setReaderFontSize(dbSize);
              } else {
                useUIStore.getState().setReaderFontSize(18);
              }
            }
            if (
              profile.readerUseSerif !== undefined &&
              profile.readerUseSerif !== null
            ) {
              useUIStore.getState().setReaderUseSerif(profile.readerUseSerif);
            }
            isSyncingFromServer.current = false;
          }
        } catch (err) {
          console.error('Error fetching user profile: ', err);
        } finally {
          isFetchingRef.current = false;
          setIsUserDataLoaded(true);
        }
      } else {
        // Only clear states and localStorage if we transitioned from a logged-in user to a guest
        if (prevUserRef.current !== null) {
          localStorage.removeItem('saved_vocab');
          localStorage.removeItem('lookup_limit_data');
          localStorage.removeItem('generation_limit_data');
          localStorage.removeItem('bookshelf');
          localStorage.removeItem('recently_read');

          setSavedVocab([]);
          setIsPaid(false);
          setBookshelf([]);
          setRecentlyRead([]);
          setLookupLimitData({ count: 0, date: todayStr });
          setGenerationLimitData({
            freeModelCount: 0,
            monthlyCreditsUsed: 0,
            monthlyCreditsMonth: thisMonthStr,
            date: todayStr,
          });
        }
        setIsUserDataLoaded(true);
      }
      prevUserRef.current = currentUser;
    };

    // Trigger initial load
    loadSavedVocab(true);

    // Set up listeners for tab focus, visibility change, and online status to automatically re-fetch/sync
    const handleTriggerLoad = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible'
      ) {
        loadSavedVocab(false);
      }
    };

    window.addEventListener('focus', handleTriggerLoad);
    window.addEventListener('visibilitychange', handleTriggerLoad);
    window.addEventListener('online', handleTriggerLoad);

    return () => {
      window.removeEventListener('focus', handleTriggerLoad);
      window.removeEventListener('visibilitychange', handleTriggerLoad);
      window.removeEventListener('online', handleTriggerLoad);
    };
  }, [currentUser, authChecking, setIsPaid, setGenerationLimitData]);

  return {
    bookshelf,
    setBookshelf,
    recentlyRead,
    setRecentlyRead,
    savedVocab,
    setSavedVocab,
    lookupLimitData,
    isUserDataLoaded,
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
  };
}
