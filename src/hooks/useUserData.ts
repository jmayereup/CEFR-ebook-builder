import { useEffect, useRef, useState } from 'react';
import {
  fetchUserProfile,
  type GenerationLimitData,
  type RecentlyReadItem,
  saveUserGenerationLimit,
  saveUserProfileData,
} from '../services/db';
import type { VocabularyTerm } from '../types';

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
        savedVocab: savedVocabRef.current,
        bookshelf: bookshelfRef.current,
        recentlyRead: recentlyReadRef.current,
        lookupLimitData: lookupLimitDataRef.current,
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
        modelId ===
          'cognitivecomputations/dolphin-mistral-24b-venice-edition:free' ||
        modelId === 'meta-llama/llama-3.3-70b-instruct:free' ||
        modelId === 'google/gemma-4-31b-it:free' ||
        modelId === 'openai/gpt-oss-20b:free' ||
        modelId === 'openai/gpt-oss-120b:free';

      const prevDateIsToday = prev.date === todayStr;
      const prevMonthIsThisMonth = prev.monthlyCreditsMonth === thisMonthStr;

      const prevFreeCount = prevDateIsToday ? (prev.freeModelCount ?? 0) : 0;
      const prevCreditsUsed = prevMonthIsThisMonth
        ? (prev.monthlyCreditsUsed ?? 0)
        : 0;

      const updated: GenerationLimitData = {
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

    if (savedVocab.length >= 500) {
      const oldestWord = savedVocab[0];
      const updated = [...savedVocab.slice(1), wordObj];
      setSavedVocab(updated);
      localStorage.setItem('saved_vocab', JSON.stringify(updated));
      if (currentUser) {
        markDirty();
      }
      showAlert(
        'Vocabulary Limit Reached',
        `"${wordObj.word}" has been saved. Your oldest saved word ("${oldestWord.word}") was removed to fit within the 500-word limit.`,
        'warning',
      );
    } else if (savedVocab.length >= 490) {
      const updated = [...savedVocab, wordObj];
      setSavedVocab(updated);
      localStorage.setItem('saved_vocab', JSON.stringify(updated));
      if (currentUser) {
        markDirty();
      }
      showAlert(
        'Approaching Vocabulary Limit',
        `"${wordObj.word}" has been saved. You are approaching your limit of 500 saved words (${updated.length}/500), after which older words will be automatically removed.`,
        'warning',
      );
    } else {
      const updated = [...savedVocab, wordObj];
      setSavedVocab(updated);
      localStorage.setItem('saved_vocab', JSON.stringify(updated));
      if (currentUser) {
        markDirty();
      }
    }
  };

  const handleRemoveSavedWord = async (wordText: string) => {
    const updated = savedVocab.filter(
      (v) => v.word.toLowerCase() !== wordText.toLowerCase(),
    );
    setSavedVocab(updated);
    localStorage.setItem('saved_vocab', JSON.stringify(updated));
    if (currentUser) {
      markDirty();
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
    setRecentlyRead((prev) => {
      const filtered = prev.filter((item) => item.storyId !== storyId);
      const updated = [{ storyId, chapterIdx }, ...filtered].slice(0, 100);
      localStorage.setItem('recently_read', JSON.stringify(updated));
      return updated;
    });
    // markDirty must be called outside the updater to avoid calling setState inside setState
    if (currentUser) {
      markDirty();
    }
  };

  // Load saved vocabulary and lookup limit from database (if user is authenticated) or localStorage
  useEffect(() => {
    const loadSavedVocab = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const thisMonthStr = todayStr.substring(0, 7);
      if (currentUser) {
        try {
          const profile = await fetchUserProfile(currentUser.uid);
          if (profile) {
            setSavedVocab(profile.savedVocab);
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
            const cloudRecentlyRead = profile.recentlyRead || [];
            const rrMap = new Map<string, number>();
            for (const item of [...guestRecentlyRead, ...cloudRecentlyRead]) {
              const existing = rrMap.get(item.storyId);
              if (existing === undefined || item.chapterIdx > existing) {
                rrMap.set(item.storyId, item.chapterIdx);
              }
            }
            const mergedRecentlyRead: RecentlyReadItem[] = [];
            const rrSeen = new Set<string>();
            for (const item of [...guestRecentlyRead, ...cloudRecentlyRead]) {
              if (!rrSeen.has(item.storyId)) {
                rrSeen.add(item.storyId);
                mergedRecentlyRead.push({
                  storyId: item.storyId,
                  chapterIdx: rrMap.get(item.storyId) ?? 0,
                });
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
                savedVocab: profile.savedVocab,
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
          }
        } catch (err) {
          console.error('Error fetching user profile: ', err);
        }
      } else {
        // Clear guest legacy data
        localStorage.removeItem('savedVocab');
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
    };
    loadSavedVocab();
  }, [currentUser, setIsPaid, setGenerationLimitData]);

  return {
    bookshelf,
    setBookshelf,
    recentlyRead,
    setRecentlyRead,
    savedVocab,
    setSavedVocab,
    lookupLimitData,
    handleIncrementLookupCount,
    handleIncrementGenerationCount,
    handleSaveWord,
    handleRemoveSavedWord,
    handleToggleBookshelf,
    updateRecentlyRead,
    dirty,
    isSyncing,
    syncChangesToDatabase,
  };
}
