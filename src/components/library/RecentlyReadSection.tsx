import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { GENRES, type Story } from '../../types';
import StoryBookCover from './StoryBookCover';

interface RecentlyReadSectionProps {
  items: {
    story: Story;
    chapterIdx: number;
  }[];
  onSelectStory: (story: Story) => void;
  generatingCoverIds?: Set<string>;
}

const cleanGenreLabel = (label: string) => {
  return label
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();
};

export default function RecentlyReadSection({
  items,
  onSelectStory,
  generatingCoverIds,
}: RecentlyReadSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const currentUser = useAuthStore((state) => state.currentUser);
  const guestCompletedStoryIds = useUIStore(
    (state) => state.guestCompletedStoryIds,
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !items || items.length === 0) return null;

  const visibleItems = isExpanded ? items : items.slice(0, 3);

  return (
    <div className="pb-6 border-b border-tj-border-main space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-tj-primary/80" />
        <h3 className="text-base font-bold text-tj-text-main font-sans tracking-tight">
          Reading
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {visibleItems.map(({ story, chapterIdx }) => {
          const completedByObj = story.completedBy || {};
          let userReadCount = 0;
          if (currentUser?.uid) {
            userReadCount = completedByObj[currentUser.uid] || 0;
          } else if (guestCompletedStoryIds.includes(story.id)) {
            userReadCount = 1;
          }

          const isCompletedUser = userReadCount > 0;
          const currentChapterNum = Math.min(
            chapterIdx + 1,
            story.totalChapters,
          );
          const progressPct = isCompletedUser
            ? 100
            : Math.round((chapterIdx / story.totalChapters) * 100);

          const resolvedGenreLabel = cleanGenreLabel(
            GENRES.find((g) => g.id === story.genre)?.label || story.genre,
          );

          const isGeneratingCover = generatingCoverIds?.has(story.id);

          return (
            <motion.div
              key={story.id}
              whileHover={{ y: -4 }}
              onClick={() => onSelectStory(story)}
              className="flex gap-4 p-4 bg-tj-bg-card border border-tj-border-main hover:border-tj-primary-border rounded-2xl shadow-xs transition-all cursor-pointer relative overflow-hidden group select-none"
            >
              {/* Cover Art Miniature */}
              <div className="relative w-16 h-24 shrink-0 aspect-[3/4.2] overflow-hidden rounded-md shadow-xs border border-black/10 dark:border-white/10">
                <StoryBookCover
                  story={story}
                  size="compact"
                  isGeneratingCover={isGeneratingCover}
                />
              </div>

              {/* Info Column */}
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="text-sm font-serif font-extrabold text-tj-text-main leading-tight line-clamp-2 mb-0.5">
                      {story.title}
                    </h4>
                    {/* CEFR & Language tags */}
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      <span className="text-[7px] font-mono font-bold uppercase py-0.5 px-1 bg-tj-bg-card border border-tj-border-main text-tj-text-muted rounded">
                        {story.cefrLevel}
                      </span>
                      <span className="text-[7px] font-mono font-bold uppercase py-0.5 px-1 bg-tj-bg-card border border-tj-border-main text-tj-text-muted rounded flex items-center">
                        {getLanguageCodeFromName(story.language).toUpperCase()}
                        {story.translationLanguage &&
                          getLanguageCodeFromName(
                            story.translationLanguage,
                          ).toUpperCase() !==
                            getLanguageCodeFromName(
                              story.language,
                            ).toUpperCase() &&
                          `-${getLanguageCodeFromName(story.translationLanguage).toUpperCase()}`}
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] font-mono font-bold text-tj-text-muted/80 tracking-wide uppercase truncate mt-0.5">
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
