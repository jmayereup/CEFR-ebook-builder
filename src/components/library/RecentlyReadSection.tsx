import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { GENRES, getLanguageCodeFromName, type Story } from '../../types';

interface RecentlyReadSectionProps {
  items: {
    story: Story;
    chapterIdx: number;
  }[];
  onSelectStory: (story: Story) => void;
}

const cleanGenreLabel = (label: string) => {
  return label
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();
};

const getCefrCoverStyles = (cefrLevel: string) => {
  const lvl = cefrLevel.toUpperCase();
  if (lvl.startsWith('A')) {
    return {
      card: 'bg-gradient-to-br from-[#FAF6EE] to-[#EBE4D5] dark:from-[#2D2B28] dark:to-[#1C1A18] text-[#2D2A26] dark:text-[#EBE4D5] border-[#D0C7B2]/40 dark:border-[#5A5348]/40',
      textMuted: 'text-[#615C54] dark:text-[#9B9384]',
      line: 'border-[#D0C7B2]/30 dark:border-[#5A5348]/30',
    };
  }
  if (lvl.startsWith('B')) {
    return {
      card: 'bg-gradient-to-br from-[#F0F2E8] to-[#DCE0CC] dark:from-[#20231D] dark:to-[#131612] text-[#20291D] dark:text-[#DCE0CC] border-[#C1C9A9]/40 dark:border-[#4C5340]/40',
      textMuted: 'text-[#535F4F] dark:text-[#8F9983]',
      line: 'border-[#C1C9A9]/30 dark:border-[#4C5340]/30',
    };
  }
  return {
    card: 'bg-gradient-to-br from-[#FAF0E3] to-[#EBD7BE] dark:from-[#312318] dark:to-[#1C130D] text-[#3B250D] dark:text-[#EBD7BE] border-[#D9BD9C]/40 dark:border-[#624A35]/40',
    textMuted: 'text-[#7A5A39] dark:text-[#AB9074]',
    line: 'border-[#D9BD9C]/30 dark:border-[#624A35]/30',
  };
};

export default function RecentlyReadSection({
  items,
  onSelectStory,
}: RecentlyReadSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);

  if (!items || items.length === 0) return null;

  const visibleItems = isExpanded ? items : items.slice(0, 3);

  return (
    <div className="pb-6 border-b border-tj-border-main space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-tj-primary/80" />
        <h3 className="text-base font-bold text-tj-text-main font-sans tracking-tight">
          Recently Read
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {visibleItems.map(({ story, chapterIdx }) => {
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

          const isCompletedUser = userReadCount > 0;
          const currentChapterNum = Math.min(
            chapterIdx + 1,
            story.totalChapters,
          );
          const progressPct = isCompletedUser
            ? 100
            : Math.round((chapterIdx / story.totalChapters) * 100);

          const coverStyle = getCefrCoverStyles(story.cefrLevel);
          const resolvedGenreLabel = cleanGenreLabel(
            GENRES.find((g) => g.id === story.genre)?.label || story.genre,
          );

          return (
            <motion.div
              key={story.id}
              whileHover={{ y: -4 }}
              onClick={() => onSelectStory(story)}
              className="flex gap-4 p-4 bg-tj-bg-card border border-tj-border-main hover:border-tj-primary-border rounded-2xl shadow-xs transition-all cursor-pointer relative overflow-hidden group select-none"
            >
              {/* Cover Art Miniature */}
              <div className="relative w-16 h-24 shrink-0 aspect-[3/4.2] overflow-hidden rounded-md shadow-xs">
                <div
                  className={`absolute inset-0 ${coverStyle.card} border flex flex-col justify-between p-2 text-center`}
                >
                  {/* Left Spine Fold / Crease */}
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/10 via-black/[0.02] to-transparent pointer-events-none rounded-l-md z-20" />
                  <div className="absolute left-2 top-0 bottom-0 w-[1px] bg-black/[0.06] dark:bg-white/[0.05] pointer-events-none z-20" />

                  {/* Top tags */}
                  <div className="flex justify-center gap-0.5 z-10">
                    <span className="text-[6px] font-mono font-bold uppercase py-0.5 px-1 bg-black/5 dark:bg-white/10 rounded border border-current/10">
                      {story.cefrLevel}
                    </span>
                    <span className="text-[6px] font-mono font-bold uppercase py-0.5 px-1 bg-black/5 dark:bg-white/10 rounded border border-current/10 flex items-center">
                      {getLanguageCodeFromName(story.language).toUpperCase()}
                      {story.translationLanguage &&
                        getLanguageCodeFromName(story.translationLanguage).toUpperCase() !==
                          getLanguageCodeFromName(story.language).toUpperCase() &&
                        `-${getLanguageCodeFromName(story.translationLanguage).toUpperCase()}`}
                    </span>
                  </div>

                  {/* Title Mini */}
                  <h4
                    lang={getLanguageCodeFromName(story.language)}
                    className="text-[9px] font-serif font-black leading-tight line-clamp-3 my-auto z-10 px-0.5"
                  >
                    {story.title}
                  </h4>

                  {/* Empty footer spacing for spine */}
                  <div className="h-1" />
                </div>
              </div>

              {/* Info Column */}
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <h4 className="text-sm font-serif font-extrabold text-tj-text-main leading-tight line-clamp-2 mb-0.5">
                    {story.title}
                  </h4>
                  <p className="text-[9px] font-mono font-bold text-tj-text-muted/80 tracking-wide uppercase truncate">
                    {resolvedGenreLabel} • {story.language}
                  </p>
                </div>

                <div className="mt-2">
                  <div className="flex items-center justify-between text-[9px] font-bold text-tj-text-muted font-mono">
                    <span className="uppercase tracking-wider">Progress</span>
                    <span className="flex items-center gap-0.5 font-sans">
                      {isCompletedUser ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-tj-success" />
                          <span className="text-tj-success font-semibold">
                            Completed
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold">
                          Ch. {currentChapterNum} / {story.totalChapters}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200/50 dark:bg-slate-700/50 h-1 rounded-full overflow-hidden mt-1.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      className="bg-tj-success h-full rounded-full"
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Bottom link on hover */}
                <div className="text-[10px] font-semibold text-tj-success flex items-center gap-0.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>
                    {isCompletedUser ? 'Read Again' : 'Resume Reading'}
                  </span>
                  <ChevronRight className="w-3 h-3 translate-x-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {items.length > 3 && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold
              text-tj-text-muted hover:text-tj-primary
              bg-tj-bg-card border border-tj-border-main
              rounded-full transition-all duration-200
              hover:border-tj-primary-border hover:shadow-xs cursor-pointer"
          >
            {isExpanded ? (
              <>
                Show Less
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                Show More ({items.length - 3} more)
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
