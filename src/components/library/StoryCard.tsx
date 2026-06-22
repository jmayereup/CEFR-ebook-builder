import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Check,
  Cpu,
  Lock,
  Star,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  GENRES,
  getAverageRating,
  getLanguageCodeFromName,
  type RecentlyReadItem,
  type Story,
} from '../../types';
import { getModelDisplayName } from '../../utils/modelUtils';
import { countWords } from '../../utils/wordCounter';

const cleanGenreLabel = (label: string) => {
  return label
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();
};

const getCefrBadgeStyle = () => {
  return 'bg-black/5 dark:bg-white/10 text-current border border-current/20';
};

const getCefrCoverStyles = (cefrLevel: string) => {
  const lvl = cefrLevel.toUpperCase();
  if (lvl.startsWith('A')) {
    // Birch / Parchment / Pale Linen (soft natural paper colors)
    return {
      card: 'bg-gradient-to-br from-[#FAF6EE] to-[#EBE4D5] dark:from-[#2D2B28] dark:to-[#1C1A18] text-[#2D2A26] dark:text-[#EBE4D5] border-[#D0C7B2]/40 dark:border-[#5A5348]/40',
      textMuted: 'text-[#615C54] dark:text-[#9B9384]',
      line: 'border-[#D0C7B2]/30 dark:border-[#5A5348]/30',
      modelText: 'text-[#514D46] dark:text-[#A89F90]',
    };
  }
  if (lvl.startsWith('B')) {
    // Sage / Soft Green Pine / Olive Wood (soft natural green woods)
    return {
      card: 'bg-gradient-to-br from-[#F0F2E8] to-[#DCE0CC] dark:from-[#20231D] dark:to-[#131612] text-[#20291D] dark:text-[#DCE0CC] border-[#C1C9A9]/40 dark:border-[#4C5340]/40',
      textMuted: 'text-[#535F4F] dark:text-[#8F9983]',
      line: 'border-[#C1C9A9]/30 dark:border-[#4C5340]/30',
      modelText: 'text-[#455041] dark:text-[#A2AD95]',
    };
  }
  // Warm Cedar / Oak / Sandalwood / Terracotta (C levels - Advanced)
  return {
    card: 'bg-gradient-to-br from-[#FAF0E3] to-[#EBD7BE] dark:from-[#312318] dark:to-[#1C130D] text-[#3B250D] dark:text-[#EBD7BE] border-[#D9BD9C]/40 dark:border-[#624A35]/40',
    textMuted: 'text-[#7A5A39] dark:text-[#AB9074]',
    line: 'border-[#D9BD9C]/30 dark:border-[#624A35]/30',
    modelText: 'text-[#66492A] dark:text-[#BC9F80]',
  };
};

interface StoryCardProps {
  story: Story;
  currentUser: any;
  onSelect: () => void;
  onDelete: (storyId: string, e: any) => void;
  isSaved?: boolean;
  onToggleSaved?: (storyId: string, e: any) => void;
  isCachedOffline?: boolean;
  recentlyRead?: RecentlyReadItem[];
  key?: any;
}

export default function StoryCard({
  story,
  currentUser,
  onSelect,
  onDelete,
  isSaved = false,
  onToggleSaved,
  isCachedOffline = false,
  recentlyRead = [],
}: StoryCardProps) {
  const wordCount =
    story.wordCount !== undefined
      ? story.wordCount
      : story.chapters
        ? story.chapters.reduce(
            (cnt, ch) => cnt + countWords(ch.content, story.language),
            0,
          )
        : 0;

  const chaptersCount =
    story.chaptersCount !== undefined
      ? story.chaptersCount
      : story.chapters
        ? story.chapters.length
        : 0;

  const progressPct = Math.round((chaptersCount / story.totalChapters) * 100);
  const resolvedGenreLabel = cleanGenreLabel(
    GENRES.find((g) => g.id === story.genre)?.label || story.genre,
  );
  const coverStyle = getCefrCoverStyles(story.cefrLevel);

  // 1. User completion count (logged-in count + guest fallback)
  const completedByObj = story.completedBy || {};
  let userReadCount = 0;
  if (currentUser?.uid) {
    userReadCount = completedByObj[currentUser.uid] || 0;
  } else if (typeof window !== 'undefined') {
    const isLocalRead =
      localStorage.getItem(`completed_story_${story.id}`) === 'true';
    if (isLocalRead) {
      userReadCount = 1;
    }
  }

  // Fall back to recentlyRead if we don't have database count but they completed it
  if (userReadCount === 0 && recentlyRead) {
    const rrItem = recentlyRead.find((item) => item.storyId === story.id);
    if (rrItem && rrItem.chapterIdx + 1 >= story.totalChapters) {
      userReadCount = 1;
    }
  }

  const isRead = userReadCount > 0;

  // 2. Global completion count
  const globalReadCount = Object.values(completedByObj).reduce(
    (sum: number, count: number) => sum + count,
    0,
  );

  return (
    <div className="relative group w-full max-w-[245px] mx-auto aspect-[3/4.2] min-h-[343px] cursor-pointer">
      {/* 3D Pages Stack Effects (behind card, moves slightly less on hover to look like book cover lifting) */}
      <div className="absolute right-[-3px] top-1.5 bottom-1.5 w-1.5 bg-[#faf9f6] dark:bg-[#323330] border-y border-r border-[#e3dfd3] dark:border-[#424546] rounded-r-md z-0 shadow-xs transition-all duration-300 group-hover:translate-x-[0.5px]" />
      <div className="absolute right-[-6px] top-3 bottom-3 w-1.5 bg-[#f4ebd9] dark:bg-[#282927] border-y border-r border-[#dacfae]/70 dark:border-[#383a3b] rounded-r-md z-[-1] shadow-xs transition-all duration-300 group-hover:translate-x-[1px]" />

      {/* Main Book Card */}
      <motion.div
        whileHover={{
          y: -6,
          x: -2,
          boxShadow:
            '10px 15px 30px -10px rgba(0,0,0,0.18), 2px 4px 8px -2px rgba(0,0,0,0.06)',
        }}
        onClick={onSelect}
        className={`relative ${coverStyle.card} border rounded-l-md rounded-r-lg p-5 transition-all duration-300 flex flex-col justify-between h-full w-full select-none shadow-[4px_6px_12px_-5px_rgba(0,0,0,0.12),_1px_2px_4px_-1px_rgba(0,0,0,0.04)] overflow-hidden`}
      >
        {/* Left Spine Fold / Crease (adds beautiful book texture) */}
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-black/10 via-black/[0.02] to-transparent pointer-events-none rounded-l-md z-20" />
        <div className="absolute left-2.5 top-0 bottom-0 w-[1px] bg-black/[0.06] dark:bg-white/[0.05] pointer-events-none z-20" />

        <div>
          <div className="flex flex-wrap items-center gap-1.5 pl-2.5 mb-2.5 z-10">
            <span
              className={`text-[8px] font-mono font-bold uppercase py-0.5 px-1.5 rounded-sm ${getCefrBadgeStyle()}`}
            >
              {story.cefrLevel}
            </span>
            <span
              className={`text-[8px] font-mono font-semibold uppercase py-0.5 px-1.5 bg-black/5 dark:bg-white/10 rounded border border-current/10 ${coverStyle.textMuted}`}
            >
              {story.language}
            </span>
            {isCachedOffline && (
              <span className="text-[8px] font-mono font-bold uppercase py-0.5 px-1.5 bg-emerald-500/10 dark:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 rounded-sm border border-emerald-500/20 flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5" />
                Offline Ready
              </span>
            )}
            {story.ratings && Object.keys(story.ratings).length > 0 ? (
              <span className="flex items-center gap-0.5 text-amber-500 font-semibold text-[8px] py-0.5 px-1 bg-amber-500/5 dark:bg-amber-500/10 rounded border border-amber-500/20">
                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                {getAverageRating(story.ratings).toFixed(1)}
              </span>
            ) : (
              <span
                className={`flex items-center gap-0.5 opacity-60 text-[8px] py-0.5 px-1 bg-black/5 dark:bg-white/10 rounded border border-current/10 ${coverStyle.textMuted}`}
              >
                <Star className="w-2.5 h-2.5" />
                unrated
              </span>
            )}
            {story.isPublic === false && (
              <span className="text-[8px] font-mono font-bold uppercase py-0.5 px-1 bg-rose-50 dark:bg-rose-955/40 text-rose-655 dark:text-rose-400 rounded flex items-center gap-0.5">
                <Lock className="w-2 h-2" />
                Private
              </span>
            )}
            {(story.isCompleted || chaptersCount === story.totalChapters) && (
              <span className="text-[8px] font-mono font-bold uppercase py-0.5 px-1.5 bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover rounded-sm border border-tj-primary-border/20 flex items-center gap-0.5">
                <BookOpen className="w-2.5 h-2.5" />
                eBook Ready
              </span>
            )}
            {isRead && (
              <span className="text-[8px] font-mono font-bold uppercase py-0.5 px-1.5 bg-emerald-500/10 dark:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 rounded-sm border border-emerald-500/20 flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
                {userReadCount > 1 ? `Read ${userReadCount}x` : 'Read'}
              </span>
            )}
          </div>
        </div>

        {/* Centerpiece Cover Art / Title Block */}
        <div className="flex-1 flex flex-col justify-center text-center px-2 py-3 z-10">
          <h3
            lang={getLanguageCodeFromName(story.language)}
            className="text-sm md:text-base font-serif font-extrabold tracking-tight leading-tight line-clamp-2 mb-1 hyphens-auto"
          >
            {story.title}
          </h3>
          <p
            className={`text-[9px] uppercase tracking-wider font-mono font-bold ${coverStyle.textMuted} mt-0.5`}
          >
            Theme: {resolvedGenreLabel}
          </p>

          {story.description && (
            <p
              className={`text-[10px] ${coverStyle.textMuted} mt-2.5 line-clamp-5 leading-relaxed font-sans italic opacity-85 px-0.5`}
            >
              "{story.description}"
            </p>
          )}
        </div>

        {/* Footer Area */}
        <div className={`z-10 pt-2.5 border-t ${coverStyle.line}`}>
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-1.5 text-[8px] font-bold tracking-wide uppercase font-mono ${coverStyle.modelText}`}
            >
              <Cpu className="w-2.5 h-2.5 opacity-80 text-current" />
              <span
                className="truncate max-w-[100px]"
                title={getModelDisplayName(story.model)}
              >
                {getModelDisplayName(story.model)}
              </span>
            </div>

            <div
              className={`text-[9px] font-mono font-bold ${coverStyle.textMuted}`}
            >
              {story.isCompleted || chaptersCount === story.totalChapters ? (
                <div className="flex flex-col items-end">
                  <span>
                    ~{(Math.round(wordCount / 50) * 50).toLocaleString()} words
                  </span>
                  {globalReadCount > 0 && (
                    <span className="text-[7.5px] opacity-75 font-sans mt-0.5 text-right font-medium">
                      {globalReadCount}{' '}
                      {globalReadCount === 1 ? 'read' : 'reads'}
                    </span>
                  )}
                </div>
              ) : (
                <span className="flex items-center gap-1 font-sans uppercase text-[8px] tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                  In Progress
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Saved / Bookmark Button overlay */}
        {onToggleSaved && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSaved(story.id, e);
            }}
            className={`absolute top-3 right-3 p-1 rounded transition-all cursor-pointer ${coverStyle.textMuted} opacity-25 group-hover:opacity-60 hover:!opacity-100 z-30 hover:bg-black/5 dark:hover:bg-white/5`}
            title={isSaved ? 'Remove from Bookshelf' : 'Save to Bookshelf'}
          >
            {isSaved ? (
              <BookmarkCheck className="w-3.5 h-3.5 fill-tj-tertiary text-tj-tertiary opacity-100" />
            ) : (
              <Bookmark className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </motion.div>
    </div>
  );
}
