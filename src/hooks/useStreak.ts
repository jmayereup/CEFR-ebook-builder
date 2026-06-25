import { useCallback, useEffect, useState } from 'react';
import {
  checkAndSyncStreakState,
  getLocalTodayStr,
  getLocalYesterdayStr,
  recordDailyActivity,
  updateStreak,
} from '../services/db';
import type { UserStreakData } from '../types';

interface CelebrationConfig {
  isOpen: boolean;
  streak: number;
  type: 'maintained' | 'repaired' | 'milestone';
}

interface UseStreakOptions {
  currentUser: { uid: string } | null;
}

export function useStreak(options: UseStreakOptions) {
  const { currentUser } = options;

  const [streakData, setStreakData] = useState<UserStreakData | null>(null);
  const [celebrationConfig, setCelebrationConfig] =
    useState<CelebrationConfig | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setStreakData(null);
      localStorage.removeItem('cefr_guest_streak');
    }
  }, [currentUser]);

  const _getDaysBetween = useCallback((d1: string, d2: string) => {
    const diff = Math.abs(new Date(d2).getTime() - new Date(d1).getTime());
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }, []);

  const pruneActivityHistory = useCallback((history: string[]): string[] => {
    if (!history) return [];
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const d = new Date();
      d.setDate(d.getDate() - 60);
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const cutoff = formatter.format(d);
      return history.filter((dateStr) => dateStr >= cutoff);
    } catch (_e) {
      const d = new Date();
      d.setDate(d.getDate() - 60);
      const cutoff = d.toISOString().split('T')[0];
      return history.filter((dateStr) => dateStr >= cutoff);
    }
  }, []);

  const checkAndSyncGuestStreak = useCallback(() => {
    const todayStr = getLocalTodayStr();
    const yesterdayStr = getLocalYesterdayStr();
    const local = localStorage.getItem('cefr_guest_streak');

    let streak: UserStreakData = {
      currentStreak: 0,
      maxStreak: 0,
      lastActiveDate: '',
      activityHistory: [],
    };

    if (local) {
      try {
        streak = JSON.parse(local);
      } catch (e) {
        console.error('Error parsing guest streak:', e);
      }
    }

    const lastActive = streak.lastActiveDate;
    if (!lastActive) {
      setStreakData(streak);
      return streak;
    }

    if (lastActive === todayStr || lastActive === yesterdayStr) {
      setStreakData(streak);
      return streak;
    }

    if (streak.currentStreak > 0) {
      streak.currentStreak = 0;
      localStorage.setItem('cefr_guest_streak', JSON.stringify(streak));
    }

    setStreakData(streak);
    return streak;
  }, []);

  const _recordGuestActivity = () => {
    const todayStr = getLocalTodayStr();
    const yesterdayStr = getLocalYesterdayStr();
    const local = localStorage.getItem('cefr_guest_streak');

    let streak: UserStreakData = {
      currentStreak: 0,
      maxStreak: 0,
      lastActiveDate: '',
      activityHistory: [],
    };

    if (local) {
      try {
        streak = JSON.parse(local);
      } catch (_e) {
        // ignore parse errors
      }
    }

    if (!streak.activityHistory.includes(todayStr)) {
      streak.activityHistory.push(todayStr);
    }
    streak.activityHistory = pruneActivityHistory(streak.activityHistory);

    if (streak.lastActiveDate === todayStr) {
      setStreakData(streak);
      return;
    }

    const oldStreak = streak.currentStreak;

    if (streak.lastActiveDate === yesterdayStr || streak.currentStreak === 0) {
      streak.currentStreak += 1;
      streak.lastActiveDate = todayStr;
    } else {
      streak.currentStreak = 1;
      streak.lastActiveDate = todayStr;
    }

    if (streak.currentStreak > streak.maxStreak) {
      streak.maxStreak = streak.currentStreak;
    }

    const isMilestone =
      streak.currentStreak > 0 &&
      (streak.currentStreak % 7 === 0 ||
        streak.currentStreak === 30 ||
        streak.currentStreak === 50 ||
        streak.currentStreak === 100);

    localStorage.setItem('cefr_guest_streak', JSON.stringify(streak));
    setStreakData(streak);

    if (oldStreak !== streak.currentStreak) {
      setCelebrationConfig({
        isOpen: true,
        streak: streak.currentStreak,
        type: isMilestone ? 'milestone' : 'maintained',
      });
    }
  };

  const mergeGuestStreakWithCloud = useCallback(
    async (userId: string, dbStreak: UserStreakData) => {
      const local = localStorage.getItem('cefr_guest_streak');
      if (!local) return dbStreak;

      try {
        const guestStreak: UserStreakData = JSON.parse(local);
        localStorage.removeItem('cefr_guest_streak');

        if (
          !guestStreak.activityHistory ||
          guestStreak.activityHistory.length === 0
        ) {
          return dbStreak;
        }

        const mergedHistory = pruneActivityHistory(
          Array.from(
            new Set([
              ...(dbStreak.activityHistory || []),
              ...(guestStreak.activityHistory || []),
            ]),
          ),
        );

        const current = Math.max(
          dbStreak.currentStreak,
          guestStreak.currentStreak,
        );
        const max = Math.max(dbStreak.maxStreak, guestStreak.maxStreak);

        const mergedStreak: UserStreakData = {
          ...dbStreak,
          currentStreak: current,
          maxStreak: max,
          lastActiveDate:
            guestStreak.lastActiveDate &&
            new Date(guestStreak.lastActiveDate) >
              new Date(dbStreak.lastActiveDate || 0)
              ? guestStreak.lastActiveDate
              : dbStreak.lastActiveDate || getLocalTodayStr(),
          activityHistory: mergedHistory,
        };

        console.log(
          `[Database Client WRITE] updateStreak (useStreak merge): users/${userId}`,
        );
        await updateStreak(userId, mergedStreak);
        return mergedStreak;
      } catch (e) {
        console.error('Error merging guest streak:', e);
        return dbStreak;
      }
    },
    [pruneActivityHistory],
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
      const syncedStreak = await checkAndSyncStreakState(userId);
      setStreakData(syncedStreak);
      return syncedStreak;
    },
    [mergeGuestStreakWithCloud],
  );

  const handleRecordDailyActivity = useCallback(async () => {
    if (!streakData) return;
    if (currentUser) {
      const todayStr = getLocalTodayStr();
      if (
        streakData.lastActiveDate === todayStr ||
        streakData.activityHistory?.includes(todayStr)
      ) {
        // Daily activity already recorded today, skip write
        return;
      }
      try {
        const oldStreak = streakData?.currentStreak ?? 0;
        const updated = await recordDailyActivity(currentUser.uid);
        setStreakData(updated);

        if (updated.currentStreak > oldStreak) {
          const isMilestone =
            updated.currentStreak > 0 &&
            (updated.currentStreak % 7 === 0 ||
              updated.currentStreak === 30 ||
              updated.currentStreak === 50 ||
              updated.currentStreak === 100);
          setCelebrationConfig({
            isOpen: true,
            streak: updated.currentStreak,
            type: isMilestone ? 'milestone' : 'maintained',
          });
        }
      } catch (err) {
        console.error('Error recording daily activity:', err);
      }
    }
  }, [streakData, currentUser]);

  return {
    streakData,
    setStreakData,
    celebrationConfig,
    setCelebrationConfig,
    syncInitialStreak,
    checkAndSyncGuestStreak,
    handleRecordDailyActivity,
  };
}
