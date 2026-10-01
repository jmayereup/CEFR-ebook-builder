import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deleteWord,
  fetchUserProfile,
  fetchUserVocab,
  type GenerationLimitData,
  incrementStoryCompletion,
  type RecentlyReadItem,
  saveUserGenerationLimit,
  saveUserProfileData,
  saveWord,
} from '../services/db';
import { pb } from '../services/pocketbase';
import { useUIStore } from '../store/uiStore';
import type { VocabularyTerm } from '../types';
import { isFreeModel } from '../utils/creditCalculation';
import { calculateNextSRS } from '../utils/srs';

interface LookupLimitData {
  count: number;
  date: string;
}

export interface RemoteReadingLocation {
  storyId: string;
  chapterIdx: number;
  updatedAt: number;
}

export function parseRecentlyReadItems(data: any): RecentlyReadItem[] {
  if (!data || !Array.isArray(data)) return [];
  const results: RecentlyReadItem[] = [];
  for (const item of data) {
    if (typeof item === 'string') {
      results.push({ storyId: item, chapterIdx: 0, updatedAt: 0 });
    } else if (
      item &&
      typeof item === 'object' &&
      typeof item.storyId === 'string'
    ) {
      results.push({
        storyId: item.storyId,
        chapterIdx: typeof item.chapterIdx === 'number' ? item.chapterIdx : 0,
        updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : 0,
      });
    }
  }
  return results;
}

const defaultRecentlyRead = (): RecentlyReadItem[] => {
  if (typeof window === 'undefined') return [];
  try {
    const local = localStorage.getItem('recently_read');
    return local ? parseRecentlyReadItems(JSON.parse(local)) : [];
  } catch (e) {
    console.error('Error parsing local recently_read:', e);
    return [];
  }
};

const defaultBookshelf = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const local = localStorage.getItem('bookshelf');
    return local ? JSON.parse(local) : [];
  } catch (e) {
    console.error('Error parsing local bookshelf:', e);
    return [];
  }
};

const defaultSavedVocab = (): VocabularyTerm[] => {
  if (typeof window === 'undefined') return [];
  try {
    const local = localStorage.getItem('saved_vocab');
    return local ? JSON.parse(local) : [];
  } catch (e) {
    console.error('Error parsing local saved_vocab:', e);
    return [];
  }
};

const PENDING_VOCAB_PREFIX = 'pending_vocab_queue_';

interface PendingVocabAction {
  action: 'upsert' | 'delete';
  term?: VocabularyTerm;
  word?: string;
  timestamp: number;
}

function getPendingVocabQueue(userId: string): PendingVocabAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_VOCAB_PREFIX + userId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function queuePendingVocab(
  userId: string,
  action: Omit<PendingVocabAction, 'timestamp'>,
) {
  if (typeof window === 'undefined') return;
  try {
    const queue = getPendingVocabQueue(userId);
    const wordKey = (action.term?.word || action.word || '').toLowerCase();
    const filtered = queue.filter((item) => {
      const itemKey = (item.term?.word || item.word || '').toLowerCase();
      return itemKey !== wordKey;
    });
    filtered.push({ ...action, timestamp: Date.now() });
    localStorage.setItem(
      PENDING_VOCAB_PREFIX + userId,
      JSON.stringify(filtered),
    );
  } catch (e) {
    console.error('[useUserData] Failed to queue pending vocab mutation:', e);
  }
}

const flushPendingVocab = async (userId: string) => {
  if (typeof window === 'undefined') return;
  const queue = getPendingVocabQueue(userId);
  if (queue.length === 0) return;

  const remaining: PendingVocabAction[] = [];
  for (const item of queue) {
    try {
      if (item.action === 'upsert' && item.term) {
        await saveWord(userId, item.term);
      } else if (item.action === 'delete' && item.word) {
        await deleteWord(userId, item.word);
      }
    } catch (err) {
      console.warn(
        '[useUserData] Failed to flush pending vocab action, retaining in queue:',
        item,
        err,
      );
      remaining.push(item);
    }
  }

  const key = PENDING_VOCAB_PREFIX + userId;
  if (remaining.length > 0) {
    localStorage.setItem(key, JSON.stringify(remaining));
  } else {
    localStorage.removeItem(key);
  }
};

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

  // Initialize with empty arrays so server SSR HTML and initial client hydration match exactly
  const [bookshelf, setBookshelf] = useState<string[]>([]);
  const [recentlyRead, setRecentlyRead] = useState<RecentlyReadItem[]>([]);
  const [remoteReadingLocation, setRemoteReadingLocation] =
    useState<RemoteReadingLocation | null>(null);
  const lastLocalUpdateTimestampRef = useRef<number>(Date.now());
  const [savedVocab, setSavedVocab] = useState<VocabularyTerm[]>([]);
  const [lookupLimitData, setLookupLimitData] = useState<LookupLimitData>(() => ({
    count: 0,
    date: new Date().toISOString().split('T')[0],
  }));

  // Immediately hydrate client-persisted storage on mount to eliminate layout shifts without hydration mismatches
  useEffect(() => {
    const recent = defaultRecentlyRead();
    if (recent.length > 0) setRecentlyRead(recent);

    const shelf = defaultBookshelf();
    if (shelf.length > 0) setBookshelf(shelf);

    const vocab = defaultSavedVocab();
    if (vocab.length > 0) setSavedVocab(vocab);

    const lookup = defaultLookupLimitData();
    if (lookup.count > 0) setLookupLimitData(lookup);
  }, []);

  const [isUserDataLoaded, setIsUserDataLoaded] = useState<boolean>(false);
  const lastSyncedSettingsRef = useRef<{
    userId: string;
    translationTargetLanguage: string | null;
    readerFontSize: number;
    readerUseSerif: boolean;
  } | null>(null);

  const translationTargetLanguage = useUIStore(
    (state) => state.translationTargetLanguage,
  );
  const readerFontSize = useUIStore((state) => state.readerFontSize);
  const readerUseSerif = useUIStore((state) => state.readerUseSerif);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const synced = lastSyncedSettingsRef.current;
    // Do not sync UI settings to server if profile for this user has not finished loading
    if (!synced || synced.userId !== currentUser.uid) {
      return;
    }

    const langChanged =
      synced.translationTargetLanguage !== translationTargetLanguage;
    const fontChanged = synced.readerFontSize !== readerFontSize;
    const serifChanged = synced.readerUseSerif !== readerUseSerif;

    if (!langChanged && !fontChanged && !serifChanged) {
      return;
    }

    // Update synced reference immediately to prevent race conditions or circular sync
    synced.translationTargetLanguage = translationTargetLanguage;
    synced.readerFontSize = readerFontSize;
    synced.readerUseSerif = readerUseSerif;

    saveUserProfileData(currentUser.uid, {
      translationTargetLanguage,
      readerFontSize,
      readerUseSerif,
    }).catch((err) =>
      console.error('[useUserData] Failed to sync UI settings:', err),
    );
  }, [translationTargetLanguage, readerFontSize, readerUseSerif, currentUser]);

  const savedVocabRef = useRef(savedVocab);
  const bookshelfRef = useRef(bookshelf);
  const recentlyReadRef = useRef(recentlyRead);
  const lookupLimitDataRef = useRef(lookupLimitData);

  useEffect(() => {
    savedVocabRef.current = savedVocab;
    bookshelfRef.current = bookshelf;
    recentlyReadRef.current = recentlyRead;
    lookupLimitDataRef.current = lookupLimitData;
  }, [savedVocab, bookshelf, recentlyRead, lookupLimitData]);

  const prevUserRef = useRef<{ uid: string } | null>(null);

  const syncChangesToDatabase = async (): Promise<void> => {
    // No-op kept for backwards-compatible API signatures since writes are instant
  };

  const handleIncrementLookupCount = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setLookupLimitData((prev) => {
      const updated = {
        count: prev.date === todayStr ? prev.count + 1 : 1,
        date: todayStr,
      };

      localStorage.setItem('lookup_limit_data', JSON.stringify(updated));
      if (currentUser) {
        saveUserProfileData(currentUser.uid, {
          lookupLimitData: updated,
        }).catch((err) =>
          console.error('[useUserData] Failed to sync lookup limit:', err),
        );
      }
      return updated;
    });
  };

  const handleIncrementGenerationCount = (
    modelId: string,
    creditsCost: number = 0,
    isNewStory: boolean = false,
  ) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const thisMonthStr = todayStr.substring(0, 7);
    setGenerationLimitData((prev) => {
      const isFree = isFreeModel(modelId);

      const prevDateIsToday = prev.date === todayStr;
      const prevMonthIsThisMonth = prev.monthlyCreditsMonth === thisMonthStr;

      const prevFreeCount = prevDateIsToday ? (prev.freeModelCount ?? 0) : 0;
      const prevDailyCredits = prevDateIsToday
        ? (prev.dailyCreditsUsed ?? 0)
        : 0;
      const prevDailyStories = prevDateIsToday
        ? (prev.dailyStoriesCreated ?? 0)
        : 0;
      const prevCreditsUsed = prevMonthIsThisMonth
        ? (prev.monthlyCreditsUsed ?? 0)
        : 0;

      const updated: GenerationLimitData = {
        dailyCreditsUsed: prevDailyCredits + creditsCost,
        dailyCreditsDate: todayStr,
        dailyStoriesCreated: isNewStory
          ? prevDailyStories + 1
          : prevDailyStories,
        freeModelCount: isFree ? prevFreeCount + 1 : prevFreeCount,
        monthlyCreditsUsed: !isFree
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

    // 1. Optimistically update local state & localStorage immediately
    const updated = [...savedVocab, wordObj];
    setSavedVocab(updated);
    localStorage.setItem('saved_vocab', JSON.stringify(updated));

    // 2. Persist to PocketBase or queue for offline sync
    if (currentUser) {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const savedTerm = await saveWord(currentUser.uid, wordObj);
          if (savedTerm.id) {
            setSavedVocab((prev) =>
              prev.map((v) =>
                v.word.toLowerCase() === savedTerm.word.toLowerCase()
                  ? savedTerm
                  : v,
              ),
            );
          }
        } catch (e) {
          console.warn(
            '[useUserData] Failed to save word to DB, queued offline:',
            e,
          );
          queuePendingVocab(currentUser.uid, {
            action: 'upsert',
            term: wordObj,
          });
        }
      } else {
        queuePendingVocab(currentUser.uid, {
          action: 'upsert',
          term: wordObj,
        });
      }
    } else {
      showAlert(
        'Word Saved Locally',
        `"${wordObj.word}" saved to your local device.`,
        'info',
      );
    }
  };

  const handleRemoveSavedWord = async (wordText: string) => {
    // 1. Optimistically remove from local state & localStorage immediately
    const updated = savedVocab.filter(
      (v) => v.word.toLowerCase() !== wordText.toLowerCase(),
    );
    setSavedVocab(updated);
    localStorage.setItem('saved_vocab', JSON.stringify(updated));

    // 2. Delete on PocketBase or queue for offline sync
    if (currentUser) {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          await deleteWord(currentUser.uid, wordText);
        } catch (e) {
          console.warn(
            '[useUserData] Failed to delete word from DB, queued offline:',
            e,
          );
          queuePendingVocab(currentUser.uid, {
            action: 'delete',
            word: wordText,
          });
        }
      } else {
        queuePendingVocab(currentUser.uid, {
          action: 'delete',
          word: wordText,
        });
      }
    }
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

    // 1. Optimistically update local state & localStorage immediately
    setSavedVocab((prev) => {
      const filtered = prev.filter(
        (v) => v.word.toLowerCase() !== updatedTerm.word.toLowerCase(),
      );
      const updated = [...filtered, updatedTerm];
      localStorage.setItem('saved_vocab', JSON.stringify(updated));
      return updated;
    });

    // 2. Persist to PocketBase or queue for offline sync
    if (currentUser) {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const savedTerm = await saveWord(currentUser.uid, updatedTerm);
          if (savedTerm.id) {
            setSavedVocab((prev) =>
              prev.map((v) =>
                v.word.toLowerCase() === savedTerm.word.toLowerCase()
                  ? savedTerm
                  : v,
              ),
            );
          }
        } catch (e) {
          console.warn(
            '[useUserData] Failed to update word SRS, queued offline:',
            e,
          );
          queuePendingVocab(currentUser.uid, {
            action: 'upsert',
            term: updatedTerm,
          });
        }
      } else {
        queuePendingVocab(currentUser.uid, {
          action: 'upsert',
          term: updatedTerm,
        });
      }
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
      saveUserProfileData(currentUser.uid, {
        bookshelf: updated,
      }).catch((err) =>
        console.error('[useUserData] Failed to sync bookshelf:', err),
      );
    }
  };

  const updateRecentlyRead = async (
    storyId: string,
    chapterIdx: number,
    customTimestamp?: number,
  ) => {
    const currentList = recentlyReadRef.current;
    const existing = currentList.find((item) => item.storyId === storyId);
    const now = customTimestamp ?? Date.now();
    lastLocalUpdateTimestampRef.current = now;

    // Clear remote prompt for this story if matching or advancing
    setRemoteReadingLocation((prev) =>
      prev?.storyId === storyId ? null : prev,
    );

    if (
      existing &&
      existing.chapterIdx === chapterIdx &&
      currentList[0]?.storyId === storyId &&
      now - (existing.updatedAt || 0) < 60000
    ) {
      return;
    }

    const filtered = currentList.filter((item) => item.storyId !== storyId);
    const updated = [
      { storyId, chapterIdx, updatedAt: now },
      ...filtered,
    ].slice(0, 100);
    localStorage.setItem('recently_read', JSON.stringify(updated));
    setRecentlyRead(updated);

    if (currentUser) {
      saveUserProfileData(currentUser.uid, {
        recentlyRead: updated,
      }).catch((err) =>
        console.error('[useUserData] Failed to sync recentlyRead:', err),
      );
    }
  };

  const removeFromRecentlyRead = async (storyId: string) => {
    const currentList = recentlyReadRef.current;
    const updated = currentList.filter((item) => item.storyId !== storyId);
    localStorage.setItem('recently_read', JSON.stringify(updated));
    setRecentlyRead(updated);

    if (currentUser) {
      saveUserProfileData(currentUser.uid, {
        recentlyRead: updated,
      }).catch((err) =>
        console.error('[useUserData] Failed to sync recentlyRead:', err),
      );
    }
  };

  // Load saved vocabulary and lookup limit from database (if user is authenticated) or localStorage
  useEffect(() => {
    if (authChecking) return;

    if (currentUser?.uid !== prevUserRef.current?.uid) {
      lastSyncedSettingsRef.current = null;
      setIsUserDataLoaded(false);
      if (prevUserRef.current && currentUser) {
        // Direct switch between accounts - purge stale user data from memory and storage
        setBookshelf([]);
        setRecentlyRead([]);
        setSavedVocab([]);
        localStorage.removeItem('recently_read');
        localStorage.removeItem('bookshelf');
        localStorage.removeItem('saved_vocab');
      }
    }

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

          // Flush any pending offline vocab changes before fetching from cloud
          await flushPendingVocab(currentUser.uid);

          const profile = await fetchUserProfile(currentUser.uid);
          const vocab = await fetchUserVocab(currentUser.uid);

          if (profile) {
            // Reconcile cloud vocab with any remaining local pending updates
            const pendingQueue = getPendingVocabQueue(currentUser.uid);
            const pendingUpserts = new Map<string, VocabularyTerm>();
            const pendingDeletes = new Set<string>();

            for (const item of pendingQueue) {
              const k = (item.term?.word || item.word || '').toLowerCase();
              if (item.action === 'delete') {
                pendingDeletes.add(k);
              } else if (item.action === 'upsert' && item.term) {
                pendingUpserts.set(k, item.term);
              }
            }

            const finalVocab: VocabularyTerm[] = [];
            for (const v of vocab) {
              const k = v.word.toLowerCase();
              if (pendingDeletes.has(k)) continue;
              if (pendingUpserts.has(k)) {
                finalVocab.push(pendingUpserts.get(k)!);
                pendingUpserts.delete(k);
              } else {
                finalVocab.push(v);
              }
            }
            for (const term of pendingUpserts.values()) {
              finalVocab.push(term);
            }

            setSavedVocab(finalVocab);
            localStorage.setItem('saved_vocab', JSON.stringify(finalVocab));
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

            // Cloud history is merged with guest history, prioritizing newer timestamps
            const mergedRecentlyRead: RecentlyReadItem[] = [
              ...cloudRecentlyRead,
            ];
            for (const guestItem of guestRecentlyRead) {
              const existingCloud = cloudMap.get(guestItem.storyId);
              if (!existingCloud) {
                mergedRecentlyRead.push(guestItem);
              } else {
                const guestTime = guestItem.updatedAt || 0;
                const cloudTime = existingCloud.updatedAt || 0;
                if (
                  guestTime > cloudTime ||
                  (guestTime === cloudTime &&
                    guestItem.chapterIdx > existingCloud.chapterIdx)
                ) {
                  const idx = mergedRecentlyRead.findIndex(
                    (m) => m.storyId === guestItem.storyId,
                  );
                  if (idx !== -1) {
                    mergedRecentlyRead[idx] = {
                      ...mergedRecentlyRead[idx],
                      chapterIdx: guestItem.chapterIdx,
                      updatedAt: guestItem.updatedAt || guestTime,
                    };
                  }
                }
              }
            }
            mergedRecentlyRead.sort(
              (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0),
            );
            const finalRecentlyRead = mergedRecentlyRead.slice(0, 100);

            // Detect remote device progress update on focus/refresh
            if (!force) {
              const remoteCandidate = cloudRecentlyRead.find(
                (item) =>
                  item.updatedAt &&
                  item.updatedAt > lastLocalUpdateTimestampRef.current + 2000,
              );
              if (remoteCandidate) {
                setRemoteReadingLocation({
                  storyId: remoteCandidate.storyId,
                  chapterIdx: remoteCandidate.chapterIdx,
                  updatedAt: remoteCandidate.updatedAt,
                });
              }
            }

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
                  cloudItem.chapterIdx !== item.chapterIdx ||
                  cloudItem.updatedAt !== item.updatedAt
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

            // Sync any guest completed stories to PocketBase upon login
            const guestCompletions =
              useUIStore.getState().guestCompletedStoryIds;
            if (guestCompletions && guestCompletions.length > 0) {
              for (const sId of guestCompletions) {
                try {
                  await incrementStoryCompletion(sId, currentUser.uid);
                } catch (err) {
                  console.warn(
                    `[useUserData] Failed to sync guest completion for ${sId}:`,
                    err,
                  );
                }
              }
              useUIStore.getState().setGuestCompletedStoryIds([]);
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
                dailyStoriesCreated:
                  profile.generationLimitData.date === todayStr
                    ? (profile.generationLimitData.dailyStoriesCreated ?? 0)
                    : 0,
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
                dailyStoriesCreated: 0,
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
            const targetLang =
              profile.translationTargetLanguage !== undefined
                ? profile.translationTargetLanguage
                : null;
            const dbSize = profile.readerFontSize;
            const validFontSize =
              typeof dbSize === 'number' && dbSize >= 14 && dbSize <= 26
                ? dbSize
                : 18;
            const validUseSerif =
              typeof profile.readerUseSerif === 'boolean'
                ? profile.readerUseSerif
                : true;

            // Set synced state FIRST so React renders won't trigger a write to server
            lastSyncedSettingsRef.current = {
              userId: currentUser.uid,
              translationTargetLanguage: targetLang,
              readerFontSize: validFontSize,
              readerUseSerif: validUseSerif,
            };

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
              useUIStore.getState().setReaderFontSize(validFontSize);
            }
            if (
              profile.readerUseSerif !== undefined &&
              profile.readerUseSerif !== null
            ) {
              useUIStore.getState().setReaderUseSerif(profile.readerUseSerif);
            }
          } else {
            // Profile returned null/not found, fall back to local storage
            const localRecentlyRead = localStorage.getItem('recently_read');
            if (localRecentlyRead) {
              try {
                setRecentlyRead(
                  parseRecentlyReadItems(JSON.parse(localRecentlyRead)),
                );
              } catch {}
            }
            const localBookshelf = localStorage.getItem('bookshelf');
            if (localBookshelf) {
              try {
                setBookshelf(JSON.parse(localBookshelf));
              } catch {}
            }
            const localVocab = localStorage.getItem('saved_vocab');
            if (localVocab) {
              try {
                setSavedVocab(JSON.parse(localVocab));
              } catch {}
            }
          }
        } catch (err) {
          console.error(
            'Error fetching user profile (falling back to offline local storage): ',
            err,
          );
          // Hydrate from localStorage when offline or network fails
          const localRecentlyRead = localStorage.getItem('recently_read');
          if (localRecentlyRead) {
            try {
              const parsed = parseRecentlyReadItems(
                JSON.parse(localRecentlyRead),
              );
              setRecentlyRead((prev) => (prev.length === 0 ? parsed : prev));
            } catch (e) {
              console.error('Error parsing local recently_read on fallback:', e);
            }
          }
          const localBookshelf = localStorage.getItem('bookshelf');
          if (localBookshelf) {
            try {
              const parsed = JSON.parse(localBookshelf);
              setBookshelf((prev) => (prev.length === 0 ? parsed : prev));
            } catch (e) {
              console.error('Error parsing local bookshelf on fallback:', e);
            }
          }
          const localVocab = localStorage.getItem('saved_vocab');
          if (localVocab) {
            try {
              const parsed = JSON.parse(localVocab);
              setSavedVocab((prev) => (prev.length === 0 ? parsed : prev));
            } catch (e) {
              console.error('Error parsing local saved_vocab on fallback:', e);
            }
          }
          const localLookup = localStorage.getItem('lookup_limit_data');
          if (localLookup) {
            try {
              const parsed = JSON.parse(localLookup);
              if (parsed.date === todayStr) {
                setLookupLimitData(parsed);
              }
            } catch {}
          }
          const localGen = localStorage.getItem('generation_limit_data');
          if (localGen) {
            try {
              setGenerationLimitData(JSON.parse(localGen));
            } catch {}
          }
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

          lastSyncedSettingsRef.current = null;
          useUIStore.getState().setReaderFontSize(18);
          useUIStore.getState().setReaderUseSerif(true);
          useUIStore.getState().setTranslationTargetLanguage(null);
        } else {
          // Initial guest hydration from localStorage
          const guestBookshelfRaw = localStorage.getItem('bookshelf');
          if (guestBookshelfRaw) {
            try {
              setBookshelf(JSON.parse(guestBookshelfRaw));
            } catch {}
          }
          const guestRecentlyReadRaw = localStorage.getItem('recently_read');
          if (guestRecentlyReadRaw) {
            try {
              setRecentlyRead(
                parseRecentlyReadItems(JSON.parse(guestRecentlyReadRaw)),
              );
            } catch {}
          }
          const guestVocabRaw = localStorage.getItem('saved_vocab');
          if (guestVocabRaw) {
            try {
              setSavedVocab(JSON.parse(guestVocabRaw));
            } catch {}
          }
          const guestLookupRaw = localStorage.getItem('lookup_limit_data');
          if (guestLookupRaw) {
            try {
              const parsed = JSON.parse(guestLookupRaw);
              if (parsed.date === todayStr) {
                setLookupLimitData(parsed);
              }
            } catch {}
          }
        }
        setIsUserDataLoaded(true);
      }
      prevUserRef.current = currentUser;
    };

    // Trigger initial load
    loadSavedVocab(true);

    // Refresh profile and flush pending mutations on reconnect or window/tab focus
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        loadSavedVocab(false);
      }
    };
    const handleOnline = () => {
      if (currentUser?.uid) {
        flushPendingVocab(currentUser.uid).then(() => {
          loadSavedVocab(false);
        });
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [currentUser, authChecking, setIsPaid, setGenerationLimitData]);

  // Realtime subscription to the user's record on PocketBase with error guard
  useEffect(() => {
    if (!currentUser?.uid) return;

    let isMounted = true;
    let unsubFn: (() => void) | null = null;

    try {
      pb.collection('users')
        .subscribe(currentUser.uid, (e) => {
          if (!isMounted || e.action !== 'update' || !e.record) return;

          const updatedRecord = e.record as any;

          // 1. Sync Bookshelf
          if (Array.isArray(updatedRecord.bookshelf)) {
            setBookshelf((prev) => {
              if (
                JSON.stringify(prev) === JSON.stringify(updatedRecord.bookshelf)
              ) {
                return prev;
              }
              localStorage.setItem(
                'bookshelf',
                JSON.stringify(updatedRecord.bookshelf),
              );
              return updatedRecord.bookshelf;
            });
          }

          // 2. Sync Recently Read
          if (updatedRecord.recentlyRead) {
            const parsed = parseRecentlyReadItems(updatedRecord.recentlyRead);
            setRecentlyRead((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(parsed)) {
                return prev;
              }
              localStorage.setItem('recently_read', JSON.stringify(parsed));
              return parsed;
            });

            // Detect remote device progress update
            const remoteCandidate = parsed.find(
              (item) =>
                item.updatedAt &&
                item.updatedAt > lastLocalUpdateTimestampRef.current + 2000,
            );
            if (remoteCandidate) {
              setRemoteReadingLocation({
                storyId: remoteCandidate.storyId,
                chapterIdx: remoteCandidate.chapterIdx,
                updatedAt: remoteCandidate.updatedAt,
              });
            }
          }

          // 3. Sync Lookup Limit
          if (updatedRecord.lookupLimitData) {
            let parsedLookup = updatedRecord.lookupLimitData;
            if (typeof parsedLookup === 'string') {
              try {
                parsedLookup = JSON.parse(parsedLookup);
              } catch {}
            }
            if (parsedLookup && typeof parsedLookup === 'object') {
              setLookupLimitData((prev) => {
                if (JSON.stringify(prev) === JSON.stringify(parsedLookup)) {
                  return prev;
                }
                localStorage.setItem(
                  'lookup_limit_data',
                  JSON.stringify(parsedLookup),
                );
                return parsedLookup;
              });
            }
          }

          // 4. Sync Paid Tier
          if (typeof updatedRecord.isPaid === 'boolean') {
            setIsPaid(updatedRecord.isPaid);
          }

          // 5. Sync Reader UI Preferences without circular save
          const synced = lastSyncedSettingsRef.current;
          if (synced && synced.userId === currentUser.uid) {
            if (updatedRecord.translationTargetLanguage !== undefined) {
              synced.translationTargetLanguage =
                updatedRecord.translationTargetLanguage;
              useUIStore
                .getState()
                .setTranslationTargetLanguage(
                  updatedRecord.translationTargetLanguage,
                );
            }
            if (
              typeof updatedRecord.readerFontSize === 'number' &&
              updatedRecord.readerFontSize >= 14 &&
              updatedRecord.readerFontSize <= 26
            ) {
              synced.readerFontSize = updatedRecord.readerFontSize;
              useUIStore
                .getState()
                .setReaderFontSize(updatedRecord.readerFontSize);
            }
            if (typeof updatedRecord.readerUseSerif === 'boolean') {
              synced.readerUseSerif = updatedRecord.readerUseSerif;
              useUIStore
                .getState()
                .setReaderUseSerif(updatedRecord.readerUseSerif);
            }
          }
        })
        .then((unsub) => {
          if (typeof unsub === 'function') {
            unsubFn = unsub;
          }
        })
        .catch((err) => {
          console.warn(
            '[useUserData] Realtime subscription failed (will use focus sync):',
            err?.message || err,
          );
        });
    } catch (err) {
      console.warn('[useUserData] Realtime subscription init error:', err);
    }

    return () => {
      isMounted = false;
      if (unsubFn) {
        try {
          unsubFn();
        } catch {}
      } else {
        try {
          pb.collection('users')
            .unsubscribe(currentUser.uid)
            .catch(() => {});
        } catch {}
      }
    };
  }, [currentUser?.uid, setIsPaid]);

  const clearRemoteReadingLocation = useCallback(() => {
    setRemoteReadingLocation(null);
  }, []);

  return {
    bookshelf,
    setBookshelf,
    recentlyRead,
    setRecentlyRead,
    remoteReadingLocation,
    clearRemoteReadingLocation,
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
    removeFromRecentlyRead,
    dirty: false,
    isSyncing: false,
    syncChangesToDatabase,
  };
}
