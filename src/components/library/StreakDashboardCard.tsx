import { Check, Flame, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import type { UserStreakData } from '../../types';

interface StreakDashboardCardProps {
  streakData: UserStreakData | null;
}

export default function StreakDashboardCard({
  streakData,
}: StreakDashboardCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Fallbacks if streak data isn't loaded
  const currentStreak = streakData?.currentStreak ?? 0;
  const maxStreak = streakData?.maxStreak ?? 0;
  const lastActiveDate = streakData?.lastActiveDate ?? '';
  const activityHistory = streakData?.activityHistory ?? [];

  // 1. Generate last 7 days ending today
  const getLast7Days = () => {
    const days = [];
    const dateNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const dateStr = formatter.format(d);

      days.push({
        name: dateNames[d.getDay()],
        dateStr,
        isToday: i === 0,
      });
    }
    return days;
  };

  const last7Days = getLast7Days();

  // 2. Generate last 42 days for the 6-week heatmap
  const getHeatmapDays = () => {
    const days = [];
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    for (let i = 41; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const dateStr = formatter.format(d);
      days.push(dateStr);
    }
    return days;
  };

  const heatmapDays = getHeatmapDays();

  return (
    <div className="bg-tj-bg-card rounded-2xl border border-tj-border-main p-6 shadow-sm space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-sm text-tj-text-main font-sans">
            Reading Streak Dashboard
          </h3>
          <p className="text-xs text-tj-text-muted">
            Maintain daily reading consistency and track your achievements.
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            className="p-1 text-tj-text-muted hover:text-tj-text-main rounded-full cursor-pointer hover:bg-tj-primary-light"
          >
            <HelpCircle className="w-4.5 h-4.5" />
          </button>
          {showTooltip && (
            <div className="absolute right-0 top-7 w-64 bg-tj-bg-card p-3 rounded-lg border border-tj-border-main shadow-lg text-[10px] text-tj-text-muted z-30 leading-normal">
              <p className="font-bold text-tj-text-main mb-1">
                How streaks work:
              </p>
              <ul className="list-disc pl-3 space-y-1">
                <li>
                  Read a chapter or finish vocabulary exercises to extend your
                  streak.
                </li>
                <li>
                  If you miss a day, your active streak will reset to 0. Keep
                  the momentum going!
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Streak Stats */}
        <div className="flex flex-col justify-between p-5 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100/70 dark:border-slate-800/50 rounded-2xl">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-full ${currentStreak > 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
            >
              <Flame
                className={`w-8 h-8 ${currentStreak > 0 ? 'fill-emerald-500 animate-pulse' : ''}`}
              />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">
                Current Streak
              </p>
              <p className="text-3xl font-black text-tj-text-main font-sans">
                {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
              </p>
            </div>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-850/50 pt-3 mt-4 flex justify-between text-[11px] font-semibold text-tj-text-muted">
            <span>
              Longest Streak:{' '}
              <strong className="text-tj-text-main">{maxStreak}d</strong>
            </span>
            <span>
              Last Active:{' '}
              <strong className="text-tj-text-main">
                {lastActiveDate || 'None'}
              </strong>
            </span>
          </div>
        </div>

        {/* Right Column: Progress & Learning Frequency trackers */}
        <div className="lg:col-span-2 space-y-6">
          {/* 7-Day Checklist */}
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400 block mb-2.5">
              7-Day Progress Tracker
            </span>
            <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100/70 dark:border-slate-800/50 p-4 rounded-xl">
              {last7Days.map((day) => {
                const active = activityHistory.includes(day.dateStr);
                return (
                  <div
                    key={day.dateStr}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={`text-[9px] font-mono font-bold uppercase ${day.isToday ? 'text-tj-primary' : 'text-slate-400'}`}
                    >
                      {day.name}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                        active
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                          : day.isToday
                            ? 'border-tj-primary bg-tj-primary-light text-tj-primary border-dashed font-bold animate-pulse'
                            : 'border-slate-200 dark:border-slate-800 bg-transparent text-transparent'
                      }`}
                    >
                      {active ? (
                        <Check className="w-4.5 h-4.5 stroke-[3]" />
                      ) : (
                        <span className="text-[10px]">•</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Heatmap Grid */}
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-slate-400 block mb-2.5">
              6-Week Learning Frequency
            </span>
            <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100/70 dark:border-slate-800/50 p-4 rounded-xl flex items-center justify-center">
              <div className="grid grid-cols-7 gap-1.5">
                {heatmapDays.map((dateStr) => {
                  const active = activityHistory.includes(dateStr);
                  return (
                    <div
                      key={dateStr}
                      className={`w-4 h-4 rounded-sm transition-all ${
                        active
                          ? 'bg-emerald-600 hover:scale-110 shadow-sm'
                          : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700'
                      }`}
                      title={
                        dateStr + (active ? ' (Learned)' : ' (No activity)')
                      }
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
