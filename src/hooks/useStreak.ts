import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkAndSyncStreakState,
  getLocalTodayStr,
  recordDailyActivity,
  syncStreakWithOfflineDates,
  updateStreak,
} from '../services/db';
import type { UserStreakData } from '../types';
import {
  calculateStreakFromHistory,
  pruneActivityHistory,
} from '../utils/streakUtils';

interface CelebrationConfig {
  isOpen: boolean;
  streak: number;
  type: 'maintained' | 'repaired' | 'milestone';
}

interface UseStreakOptions {
  currentUser: { uid: string } | null;
  authChecking?: boolean;
}

const GUEST_STREAK_KEY = 'tj_guest_streak';
const LEGACY_GUEST_STREAK_KEY = 'cefr_guest_streak';
const USER_STREAK_KEY_PREFIX = 'tj_user_streak_';
const PENDING_STREAK_SYNC_KEY_PREFIX = 'tj_pending_streak_dates_';

function getStoredStreak(key: string): UserStreakData | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
}

function setStoredStreak(key: string, data: UserStreakData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('[useStreak] Failed to save streak to localStorage:', e);
  }
}

function getPendingDates(userId: string): string[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(PENDING_STREAK_SYNC_KEY_PREFIX + userId);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

function addPendingDate(userId: string, dateStr: string) {
  if (typeof window === 'undefined') return;
  const current = getPendingDates(userId);
  if (!current.includes(dateStr)) {
    current.push(dateStr);
    localStorage.setItem(
      PENDING_STREAK_SYNC_KEY_PREFIX + userId,
      JSON.stringify(current),
    );
  }
}

function clearPendingDates(userId: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PENDING_STREAK_SYNC_KEY_PREFIX + userId);
}

export function useStreak(options: UseStreakOptions) {
  const { currentUser, authChecking = false } = options;

  const [streakData, setStreakData] = useState<UserStreakData | null>(null);
  const [celebrationConfig, setCelebrationConfig] =
    useState<CelebrationConfig | null>(null);

  const streakDataRef = useRef(streakData);
  useEffect(() => {
    streakDataRef.current = streakData;
  }, [streakData]);

  const isRecordingRef = useRef(false);

  // Initialize and load cached streak state when user changes or mounts
  useEffect(() => {
    if (authChecking) return;

    if (currentUser?.uid) {
      const userKey = USER_STREAK_KEY_PREFIX + currentUser.uid;
      const cached = getStoredStreak(userKey);
      if (cached) {
        const recalculated = calculateStreakFromHistory(
          cached.activityHistory || [],
          {
            previousMaxStreak: cached.maxStreak,
            previousCurrentStreak: cached.currentStreak,
            previousLastActiveDate: cached.lastActiveDate,
          },
        );
        const refreshed: UserStreakData = {
          ...cached,
          ...recalculated,
          activityHistory: pruneActivityHistory(cached.activityHistory || []),
        };
        setStreakData(refreshed);
      }
    } else {
      // Guest mode
      let guestStreak = getStoredStreak(GUEST_STREAK_KEY);
      if (!guestStreak) {
        // Check legacy key
        guestStreak = getStoredStreak(LEGACY_GUEST_STREAK_KEY);
      }
      if (guestStreak) {
        const recalculated = calculateStreakFromHistory(
          guestStreak.activityHistory || [],
          {
            previousMaxStreak: guestStreak.maxStreak,
            previousCurrentStreak: guestStreak.currentStreak,
            previousLastActiveDate: guestStreak.lastActiveDate,
          },
        );
        const refreshed: UserStreakData = {
          ...guestStreak,
          ...recalculated,
          activityHistory: pruneActivityHistory(
            guestStreak.activityHistory || [],
          ),
        };
        setStreakData(refreshed);
        setStoredStreak(GUEST_STREAK_KEY, refreshed);
      } else {
        const emptyStreak: UserStreakData = {
          currentStreak: 0,
          maxStreak: 0,
          lastActiveDate: '',
          activityHistory: [],
        };
        setStreakData(emptyStreak);
      }
    }
  }, [currentUser, authChecking]);

  // Sync any pending offline dates to PocketBase
  const flushPendingOfflineDates = useCallback(
    async (userId: string): Promise<UserStreakData | null> => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return null;
      }
      const pending = getPendingDates(userId);
      if (pending.length === 0) return null;

      try {
        console.log(
          `[useStreak] Flushing ${pending.length} offline streak date(s) to cloud:`,
          pending,
        );
        const synced = await syncStreakWithOfflineDates(userId, pending);
        clearPendingDates(userId);
        const userKey = USER_STREAK_KEY_PREFIX + userId;
        setStoredStreak(userKey, synced);
        setStreakData(synced);
        return synced;
      } catch (err) {
        console.warn('[useStreak] Failed to flush pending offline dates:', err);
        return null;
      }
    },
    [],
  );

  // Merge legacy or guest streak with cloud on user login
  const mergeGuestStreakWithCloud = useCallback(
    async (userId: string, dbStreak: UserStreakData) => {
      const guestStreak =
        getStoredStreak(GUEST_STREAK_KEY) ||
        getStoredStreak(LEGACY_GUEST_STREAK_KEY);
      if (!guestStreak || !guestStreak.activityHistory?.length) {
        return dbStreak;
      }

      try {
        localStorage.removeItem(GUEST_STREAK_KEY);
        localStorage.removeItem(LEGACY_GUEST_STREAK_KEY);

        const mergedHistory = pruneActivityHistory(
          Array.from(
            new Set([
              ...(dbStreak.activityHistory || []),
              ...(guestStreak.activityHistory || []),
            ]),
          ),
        );

        const { currentStreak, maxStreak, lastActiveDate } =
          calculateStreakFromHistory(mergedHistory, {
            previousMaxStreak: Math.max(
              dbStreak.maxStreak,
              guestStreak.maxStreak,
            ),
            previousCurrentStreak: dbStreak.currentStreak,
            previousLastActiveDate: dbStreak.lastActiveDate,
          });

        const mergedStreak: UserStreakData = {
          currentStreak,
          maxStreak,
          lastActiveDate,
          activityHistory: mergedHistory,
        };

        console.log(
          `[useStreak] Merged guest streak into user ${userId}:`,
          mergedStreak,
        );
        await updateStreak(userId, mergedStreak);
        return mergedStreak;
      } catch (e) {
        console.error('[useStreak] Error merging guest streak:', e);
        return dbStreak;
      }
    },
    [],
  );

  const syncInitialStreak = useCallback(
    async (
      userId: string,
      profileStreak: UserStreakData | null | undefined,
    ): Promise<UserStreakData> => {
      let initialStreak = profileStreak || {
        currentStreak: 0,
        maxStreak: 0,
        lastActiveDate: '',
        activityHistory: [],
      };

      initialStreak = await mergeGuestStreakWithCloud(userId, initialStreak);

      // 1. Flush any pending offline dates first
      const flushed = await flushPendingOfflineDates(userId);
      if (flushed) {
        return flushed;
      }

      // 2. Perform regular check & sync with cloud
      try {
        const syncedStreak = await checkAndSyncStreakState(userId);
        setStreakData(syncedStreak);
        setStoredStreak(USER_STREAK_KEY_PREFIX + userId, syncedStreak);
        return syncedStreak;
      } catch (err) {
        console.warn(
          '[useStreak] Network error during checkAndSyncStreakState, using local cache:',
          err,
        );
        const cached = getStoredStreak(USER_STREAK_KEY_PREFIX + userId);
        if (cached) {
          setStreakData(cached);
          return cached;
        }
        setStreakData(initialStreak);
        return initialStreak;
      }
    },
    [flushPendingOfflineDates, mergeGuestStreakWithCloud],
  );

  // Sync when window comes online or gains focus
  useEffect(() => {
    if (!currentUser?.uid) return;

    const handleOnlineOrFocus = () => {
      if (
        typeof navigator !== 'undefined' &&
        navigator.onLine &&
        document.visibilityState === 'visible'
      ) {
        flushPendingOfflineDates(currentUser.uid).catch((err) =>
          console.warn('[useStreak] Auto-sync failed:', err),
        );
      }
    };

    window.addEventListener('online', handleOnlineOrFocus);
    window.addEventListener('focus', handleOnlineOrFocus);
    window.addEventListener('visibilitychange', handleOnlineOrFocus);

    return () => {
      window.removeEventListener('online', handleOnlineOrFocus);
      window.removeEventListener('focus', handleOnlineOrFocus);
      window.removeEventListener('visibilitychange', handleOnlineOrFocus);
    };
  }, [currentUser, flushPendingOfflineDates]);

  // Main activity recorder: called on turning a chapter, finishing a book, or completing vocab
  const handleRecordDailyActivity = useCallback(async () => {
    if (isRecordingRef.current) return;
    isRecordingRef.current = true;

    try {
      const todayStr = getLocalTodayStr();
      const current = streakDataRef.current || {
        currentStreak: 0,
        maxStreak: 0,
        lastActiveDate: '',
        activityHistory: [],
      };

      // If already recorded today, skip redundant write
      if (
        current.lastActiveDate === todayStr ||
        current.activityHistory?.includes(todayStr)
      ) {
        return;
      }

      const oldStreak = current.currentStreak ?? 0;
      const history = [...(current.activityHistory || [])];
      if (!history.includes(todayStr)) {
        history.push(todayStr);
      }

      const { currentStreak, maxStreak, lastActiveDate } =
        calculateStreakFromHistory(history, {
          previousMaxStreak: current.maxStreak,
          previousCurrentStreak: current.currentStreak,
          previousLastActiveDate: current.lastActiveDate,
        });

      const updatedStreak: UserStreakData = {
        currentStreak,
        maxStreak,
        lastActiveDate,
        activityHistory: pruneActivityHistory(history),
      };

      // 1. Optimistically update local state & localStorage immediately
      const storageKey = currentUser
        ? USER_STREAK_KEY_PREFIX + currentUser.uid
        : GUEST_STREAK_KEY;
      setStoredStreak(storageKey, updatedStreak);
      setStreakData(updatedStreak);

      // 2. Trigger celebration modal if streak increased
      if (updatedStreak.currentStreak > oldStreak) {
        const isMilestone =
          updatedStreak.currentStreak > 0 &&
          (updatedStreak.currentStreak % 7 === 0 ||
            updatedStreak.currentStreak === 30 ||
            updatedStreak.currentStreak === 50 ||
            updatedStreak.currentStreak === 100);

        setCelebrationConfig({
          isOpen: true,
          streak: updatedStreak.currentStreak,
          type: isMilestone ? 'milestone' : 'maintained',
        });
      }

      // 3. Persist to backend if authenticated
      if (currentUser?.uid) {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          try {
            const cloudUpdated = await recordDailyActivity(currentUser.uid);
            setStreakData(cloudUpdated);
            setStoredStreak(storageKey, cloudUpdated);
          } catch (err) {
            console.warn(
              '[useStreak] Failed to update cloud streak, queuing offline:',
              err,
            );
            addPendingDate(currentUser.uid, todayStr);
          }
        } else {
          // Offline: queue date
          addPendingDate(currentUser.uid, todayStr);
        }
      }
    } finally {
      isRecordingRef.current = false;
    }
  }, [currentUser]);

  return {
    streakData,
    setStreakData,
    celebrationConfig,
    setCelebrationConfig,
    syncInitialStreak,
    handleRecordDailyActivity,
  };
}
