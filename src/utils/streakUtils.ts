export const ACTIVITY_HISTORY_RETENTION_DAYS = 60;

export interface StreakCalculationOptions {
  previousMaxStreak?: number;
  previousCurrentStreak?: number;
  previousLastActiveDate?: string;
}

export function formatLocalDateStr(date: Date): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch (_e) {
    return date.toISOString().split('T')[0];
  }
}

export function getLocalTodayStr(): string {
  return formatLocalDateStr(new Date());
}

export function getLocalYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatLocalDateStr(d);
}

export function getHistoryCutoffStr(
  retentionDays = ACTIVITY_HISTORY_RETENTION_DAYS,
): string {
  const d = new Date();
  d.setDate(d.getDate() - retentionDays);
  return formatLocalDateStr(d);
}

/**
 * Keep only the last `retentionDays` of per-day activity dates so PocketBase
 * user records stay small while still supporting the 6-week heatmap.
 */
export function pruneActivityHistory(
  history: string[],
  retentionDays = ACTIVITY_HISTORY_RETENTION_DAYS,
): string[] {
  if (!history) return [];
  const cutoff = getHistoryCutoffStr(retentionDays);
  return history.filter((dateStr) => dateStr >= cutoff);
}

/**
 * Calculate the user's current and max streak from their recent activity
 * history. When the consecutive run reaches the 60-day retention cutoff
 * without a gap and connects to `previousLastActiveDate`, `previousCurrentStreak`
 * is carried forward so streaks can grow indefinitely beyond 60 days.
 */
export function calculateStreakFromHistory(
  history: string[],
  options: StreakCalculationOptions = {},
): { currentStreak: number; maxStreak: number; lastActiveDate: string } {
  const {
    previousMaxStreak = 0,
    previousCurrentStreak = 0,
    previousLastActiveDate = '',
  } = options;

  const cutoff = getHistoryCutoffStr();
  const pruned = history ? history.filter((dateStr) => dateStr >= cutoff) : [];
  const uniqueSorted = Array.from(new Set(pruned)).sort();
  if (uniqueSorted.length === 0) {
    return {
      currentStreak: 0,
      maxStreak: previousMaxStreak,
      lastActiveDate: '',
    };
  }

  const todayStr = getLocalTodayStr();
  const yesterdayStr = getLocalYesterdayStr();
  const lastActiveDate = uniqueSorted[uniqueSorted.length - 1];

  // If last active date is neither today nor yesterday, active streak is broken
  if (lastActiveDate !== todayStr && lastActiveDate !== yesterdayStr) {
    return {
      currentStreak: 0,
      maxStreak: previousMaxStreak,
      lastActiveDate,
    };
  }

  const dateSet = new Set(uniqueSorted);
  let streakCount = 0;
  let reachedCutoff = false;
  let reachedPreviousLastActive = false;
  let daysAfterPreviousLastActive = 0;

  // Start cursor at noon to avoid DST edge cases
  const cursor = new Date(`${lastActiveDate}T12:00:00`);
  while (true) {
    const dateStr = formatLocalDateStr(cursor);

    if (dateStr < cutoff) {
      reachedCutoff = true;
      break;
    }

    if (dateSet.has(dateStr)) {
      streakCount++;
      if (previousLastActiveDate && dateStr === previousLastActiveDate) {
        reachedPreviousLastActive = true;
      } else if (
        !reachedPreviousLastActive &&
        previousLastActiveDate &&
        dateStr > previousLastActiveDate
      ) {
        daysAfterPreviousLastActive++;
      }
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  let currentStreak = streakCount;
  if (reachedCutoff && reachedPreviousLastActive && previousCurrentStreak > 0) {
    currentStreak = Math.max(
      streakCount,
      previousCurrentStreak + daysAfterPreviousLastActive,
    );
  }

  const maxStreak = Math.max(previousMaxStreak, currentStreak);
  return {
    currentStreak,
    maxStreak,
    lastActiveDate,
  };
}
