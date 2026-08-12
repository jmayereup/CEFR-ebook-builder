import {
  BookCheck,
  Bookmark,
  BookmarkCheck,
  BookOpenText,
  ChevronDown,
  ChevronUp,
  Cloud,
  Flag,
  Lock,
  ShieldAlert,
  Star,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import type React from 'react';
import { useState } from 'react';
import {
  GENRES,
  getAverageRating,
  getLanguageCodeFromName,
  type RecentlyReadItem,
  type Story,
} from '../../types';
import { countWords } from '../../utils/wordCounter';

const cleanGenreLabel = (label: string) => {
  return label
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();
};

interface StoryCondensedRowProps {
  story: Story;
  currentUser: { uid: string; isAdmin?: boolean } | null;
  onSelect: () => void;
  // biome-ignore lint/suspicious/noExplicitAny: Matches parent onDelete signature
  onDelete: (storyId: string, e: any) => void;
  onFlagStory?: (story: Story) => void;
  isSaved?: boolean;
  // biome-ignore lint/suspicious/noExplicitAny: Matches parent onToggleSaved signature
  onToggleSaved?: (storyId: string, e: any) => void;
  isCachedOffline?: boolean;
  onDownload?: (e: React.MouseEvent) => void;
  recentlyRead?: RecentlyReadItem[];
  key?: any;
  className?: string;
}

export default function StoryCondensedRow({
  story,
  currentUser,
  onSelect,
  onDelete,
  onFlagStory,
  isSaved = false,
  onToggleSaved,
  isCachedOffline = false,
  onDownload,
  recentlyRead = [],
  className = '',
}: StoryCondensedRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const resolvedGenreLabel = cleanGenreLabel(
    GENRES.find((g) => g.id === story.genre)?.label || story.genre,
  );

  // User completion logic
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
  const isRead = userReadCount > 0;

  // Global reads count
  const globalReadCount =
    story.totalReads !== undefined
      ? story.totalReads
      : Object.values(completedByObj).reduce(
          (sum: number, count: number) => sum + count,
          0,
        );
  const totalReads = Math.max(globalReadCount, userReadCount);

  const mainLangCode = getLanguageCodeFromName(story.language).toUpperCase();
  const transLangCode = story.translationLanguage
    ? getLanguageCodeFromName(story.translationLanguage).toUpperCase()
    : '';
  const showBilingualTag = transLangCode && transLangCode !== mainLangCode;

  const inRecentlyRead = recentlyRead.some((item) => item.storyId === story.id);

  return (
    <motion.div
      whileHover={{
        scale: 1.001,
        boxShadow:
          '0 4px 12px -2px rgba(0,0,0,0.04), 0 2px 4px -1px rgba(0,0,0,0.02)',
      }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`w-full flex flex-col p-3.5 bg-tj-bg-card border border-tj-border-main hover:border-tj-text-muted/40 rounded-xl transition duration-150 select-none relative gap-1.5 ${className}`}
    >
      {/* Title Line */}
      <div className="flex items-center justify-between gap-3 w-full">
        {/* Clickable Header Area */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: Click triggers reading story */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: Click triggers reading story */}
        <div
          onClick={onSelect}
          className="flex flex-wrap items-center gap-2 min-w-0 cursor-pointer group/title flex-1"
        >
          <h3
            lang={getLanguageCodeFromName(story.language)}
            className="text-sm font-serif font-bold text-tj-text-main leading-tight truncate group-hover/title:text-tj-primary transition-colors"
          >
            {story.title}
          </h3>

          {/* Language and Level Labels */}
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
            <span className="text-tj-text-main">{story.cefrLevel}</span>
            <span className="text-tj-text-muted">
              {mainLangCode}
              {showBilingualTag && `-${transLangCode}`}
            </span>
          </div>

          {(story.sourceType === 'gemini_storybook' || story.embedUrl) && (
            <span
              className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-sm border border-emerald-500/30 flex items-center gap-1 font-bold"
              title="Interactive Gemini Storybook Link"
            >
              Gemini ✨
            </span>
          )}

          {story.isPublic === false && (
            <span
              className="text-[9px] bg-tj-primary-light/50 text-tj-text-muted px-1.5 py-0.5 rounded-sm border border-tj-border-main flex items-center gap-1"
              title="Private Story"
            >
              <Lock className="w-2.5 h-2.5 opacity-60" /> Private
            </span>
          )}
          {story.copyrightFlag === true && (
            <span
              className="text-[9px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-sm border border-amber-300/60 dark:border-amber-800/60 flex items-center gap-1 font-bold"
              title={
                story.copyrightFlagReason
                  ? `Copyright-restricted: ${story.copyrightFlagReason}`
                  : 'Copyright-restricted — private only'
              }
            >
              <ShieldAlert className="w-2.5 h-2.5" /> Restricted
            </span>
          )}
        </div>

        {/* Subtle Toggle Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="p-1 hover:bg-tj-primary-light text-tj-text-muted hover:text-tj-text-main border border-transparent hover:border-tj-border-main rounded-lg cursor-pointer transition-all flex items-center gap-1 text-[10px] font-bold font-mono tracking-wide uppercase bg-transparent shrink-0"
        >
          <span>{isExpanded ? 'Hide' : 'Info'}</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Description Line (if loaded) - Clickable to open reader */}
      {story.description && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: Click triggers reading story
        // biome-ignore lint/a11y/noStaticElementInteractions: Click triggers reading story
        <div onClick={onSelect} className="cursor-pointer pr-14 group/desc">
          <p className="text-xs text-tj-text-muted line-clamp-1 italic leading-relaxed group-hover/desc:text-tj-text-main transition-colors">
            "{story.description}"
          </p>
        </div>
      )}

      {/* Expanded Panel for Details & Action Buttons */}
      {isExpanded && (
        <div className="mt-2.5 pt-3 border-t border-tj-border-main/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[10px] text-tj-text-muted font-mono">
          {/* Metadata info */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {story.isCompleted || chaptersCount === story.totalChapters ? (
              <span className="whitespace-nowrap font-bold">
                {(Math.round(wordCount / 50) * 50).toLocaleString()} WORDS
              </span>
            ) : (
              <span className="flex items-center gap-1 font-sans text-[9px] tracking-wide text-amber-600 dark:text-amber-500 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                IN PROGRESS ({chaptersCount}/{story.totalChapters} CH)
              </span>
            )}
            <span className="opacity-40">•</span>
            <span>Theme: {resolvedGenreLabel}</span>
            {totalReads > 0 && (
              <>
                <span className="opacity-40">•</span>
                <span className="uppercase">Reads: {totalReads}</span>
              </>
            )}

            {/* Rating Stars */}
            {story.ratings && Object.keys(story.ratings).length > 0 && (
              <>
                <span className="opacity-40">•</span>
                <div
                  className="flex items-center gap-0.5"
                  title={`Avg: ${getAverageRating(story.ratings).toFixed(1)}`}
                >
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const ratingVal = getAverageRating(story.ratings);
                    const isFilled = starValue <= Math.round(ratingVal);
                    return (
                      <Star
                        key={starValue}
                        className={`w-2.5 h-2.5 ${
                          isFilled
                            ? 'text-amber-500 fill-current'
                            : 'text-tj-text-muted opacity-30'
                        }`}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Action buttons / Status */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Status indicators */}
            {isRead ? (
              <span
                title="Completed reading"
                className="p-1 text-tj-success/80 dark:text-tj-mint-dark flex items-center gap-1 font-sans text-[9px] font-bold"
              >
                <BookCheck className="w-4 h-4" /> Completed
              </span>
            ) : inRecentlyRead ? (
              <span
                title="Currently Reading"
                className="p-1 text-amber-500 flex items-center gap-1 font-sans text-[9px] font-bold"
              >
                <BookOpenText className="w-4 h-4 animate-pulse" /> Reading
              </span>
            ) : null}

            {/* Download offline */}
            {!isCachedOffline && onDownload && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(e);
                }}
                className="p-1.5 hover:bg-tj-primary-light text-tj-text-muted hover:text-tj-text-main border border-tj-border-main hover:border-tj-text-muted rounded-xl cursor-pointer transition flex items-center justify-center bg-transparent"
                title="Download for offline reading"
              >
                <Cloud className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Save to Bookshelf */}
            {onToggleSaved && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSaved(story.id, e);
                }}
                className={`p-1.5 border rounded-xl transition cursor-pointer flex items-center justify-center ${
                  isSaved
                    ? 'bg-tj-primary/5 border-tj-primary text-tj-primary'
                    : 'border-tj-border-main hover:border-tj-text-muted text-tj-text-muted hover:text-tj-text-main hover:bg-tj-primary-light bg-transparent'
                }`}
                title={isSaved ? 'Remove from Bookshelf' : 'Save to Bookshelf'}
              >
                {isSaved ? (
                  <BookmarkCheck className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {/* Admin Delete vs Non-Admin Flag */}
            {currentUser?.isAdmin === true ? (
              <button
                type="button"
                onClick={(e) => onDelete(story.id, e)}
                className="p-1.5 border border-rose-500/30 rounded-xl transition cursor-pointer text-rose-500 hover:bg-rose-500/10 flex items-center justify-center"
                title="Delete Story (Admin)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : currentUser && onFlagStory ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFlagStory(story);
                }}
                className="p-1.5 border border-tj-border-main hover:border-rose-500/40 rounded-xl transition cursor-pointer text-tj-text-muted hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center"
                title="Flag Story for Deletion"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      )}
    </motion.div>
  );
}
