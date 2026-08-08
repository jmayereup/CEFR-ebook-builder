import {
  BookCheck,
  Bookmark,
  BookmarkCheck,
  BookOpenText,
  ChevronDown,
  Cloud,
  Flag,
  Lock,
  ShieldAlert,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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

const getCefrCoverStyles = (cefrLevel: string) => {
  const lvl = cefrLevel.toUpperCase();
  if (lvl.startsWith('A')) {
    // Birch / Parchment / Pale Linen (soft natural paper colors)
    return {
      card: 'bg-gradient-to-br from-[#FAF6EE] to-[#EBE4D5] dark:from-[#2D2B28] dark:to-[#1C1A18] text-[#2D2A26] dark:text-[#EBE4D5] border-[#D0C7B2]/40 dark:border-[#5A5348]/40',
      textMuted: 'text-[#615C54] dark:text-[#9B9384]',
      line: 'border-[#D0C7B2]/30 dark:border-[#5A5348]/30',
    };
  }
  if (lvl.startsWith('B')) {
    // Sage / Soft Green Pine / Olive Wood (soft natural green woods)
    return {
      card: 'bg-gradient-to-br from-[#F0F2E8] to-[#DCE0CC] dark:from-[#20231D] dark:to-[#131612] text-[#20291D] dark:text-[#DCE0CC] border-[#C1C9A9]/40 dark:border-[#4C5340]/40',
      textMuted: 'text-[#535F4F] dark:text-[#8F9983]',
      line: 'border-[#C1C9A9]/30 dark:border-[#4C5340]/30',
    };
  }
  // Warm Cedar / Oak / Sandalwood / Terracotta (C levels - Advanced)
  return {
    card: 'bg-gradient-to-br from-[#FAF0E3] to-[#EBD7BE] dark:from-[#312318] dark:to-[#1C130D] text-[#3B250D] dark:text-[#EBD7BE] border-[#D9BD9C]/40 dark:border-[#624A35]/40',
    textMuted: 'text-[#7A5A39] dark:text-[#AB9074]',
    line: 'border-[#D9BD9C]/30 dark:border-[#624A35]/30',
  };
};

export interface StoryCardProps {
  story: Story;
  currentUser: any;
  onSelect: () => void;
  onDelete: (storyId: string, e: any) => void;
  onFlagStory?: (story: Story) => void;
  isSaved?: boolean;
  onToggleSaved?: (storyId: string, e: any) => void;
  isCachedOffline?: boolean;
  onDownload?: (e: React.MouseEvent) => void;
  recentlyRead?: RecentlyReadItem[];
  isGeneratingCover?: boolean;
  key?: any;
  className?: string;
}

export default function StoryCard({
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
  isGeneratingCover = false,
  className = '',
}: StoryCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
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

  const _progressPct = Math.round((chaptersCount / story.totalChapters) * 100);
  const resolvedGenreLabel = cleanGenreLabel(
    GENRES.find((g) => g.id === story.genre)?.label || story.genre,
  );
  const coverStyle = getCefrCoverStyles(story.cefrLevel);
  const [imgError, setImgError] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [loadedDescription, setLoadedDescription] = useState<string | null>(
    story.description || null,
  );
  const [loadingDescription, setLoadingDescription] = useState(false);
  const hasCoverImage = !imgError && !isGeneratingCover;
  const cardThemeClass = hasCoverImage
    ? 'text-[#F9F6F0] dark:text-[#EBE4D5] border-black/15 dark:border-white/10'
    : coverStyle.card;
  const textMutedClass = hasCoverImage
    ? 'text-[#F9F6F0]/70 dark:text-[#EBE4D5]/70'
    : coverStyle.textMuted;

  // Sync loadedDescription if story object gets updated
  React.useEffect(() => {
    if (story.description) {
      setLoadedDescription(story.description);
    }
  }, [story.description]);

  // Reset image error state when story is updated or cover finishes generating
  React.useEffect(() => {
    setImgError(false);
  }, [story.updated, isGeneratingCover]);

  // Close details overlay when card is scrolled completely out of view
  React.useEffect(() => {
    if (!showDescription || !cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            setShowDescription(false);
          }
        }
      },
      { threshold: 0 },
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
    };
  }, [showDescription]);

  const handleToggleIntro = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showDescription && !loadedDescription && !loadingDescription) {
      setLoadingDescription(true);
      try {
        const res = await fetch(`/api/stories/metadata?storyId=${story.id}`);
        if (res.ok) {
          const data = await res.json();
          const found = Array.isArray(data)
            ? data.find((s: any) => s.id === story.id)
            : data;
          if (found?.description) {
            setLoadedDescription(found.description);
          }
        }
      } catch (err) {
        console.error('Failed to fetch story description on-demand:', err);
      } finally {
        setLoadingDescription(false);
      }
    }
    setShowDescription(!showDescription);
  };

  const handleCardClick = (_e: React.MouseEvent) => {
    onSelect();
  };

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

  const isRead = userReadCount > 0;

  // 2. Global completion count
  const globalReadCount =
    story.totalReads !== undefined
      ? story.totalReads
      : Object.values(completedByObj).reduce(
          (sum: number, count: number) => sum + count,
          0,
        );

  const mainLangCode = getLanguageCodeFromName(story.language).toUpperCase();
  const transLangCode = story.translationLanguage
    ? getLanguageCodeFromName(story.translationLanguage).toUpperCase()
    : '';
  const showBilingualTag = transLangCode && transLangCode !== mainLangCode;

  const totalReads = Math.max(globalReadCount, userReadCount);

  const inRecentlyRead = recentlyRead.some((item) => item.storyId === story.id);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Click triggers reading story
    // biome-ignore lint/a11y/noStaticElementInteractions: Click triggers reading story
    <div
      ref={cardRef}
      className={`flex flex-col group w-full max-w-[240px] sm:max-w-[260px] mx-auto cursor-pointer ${className}`}
      onClick={handleCardClick}
    >
      {/* 3D Book Cover Wrapper */}
      <div className="relative w-full aspect-[3/4.2] flex-shrink-0">
        {/* 3D Pages Stack Effects (behind card, moves slightly less on hover to look like book cover lifting) */}
        <div className="absolute right-[-3px] top-1.5 bottom-1.5 w-1.5 bg-[#faf9f6] dark:bg-[#323330] border-y border-r border-[#e3dfd3] dark:border-[#424546] rounded-r-md z-0 shadow-xs transition-all duration-300 group-hover:translate-x-[0.5px]" />
        <div className="absolute right-[-6px] top-3 bottom-3 w-1.5 bg-[#f4ebd9] dark:bg-[#282927] border-y border-r border-[#dacfae]/70 dark:border-[#383a3b] rounded-r-md z-[-1] shadow-xs transition-all duration-300 group-hover:translate-x-[1px]" />

        {/* Main Book Card */}
        <motion.div
          whileHover={{
            scale: 1.02,
            boxShadow:
              '4px 12px 24px -5px rgba(0,0,0,0.18), 1px 4px 8px -1px rgba(0,0,0,0.06)',
          }}
          transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
          className={`relative ${cardThemeClass} border rounded-l-md rounded-r-lg flex flex-col justify-between h-full w-full select-none shadow-[4px_6px_12px_-5px_rgba(0,0,0,0.12),_1px_2px_4px_-1px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300 ${
            hasCoverImage ? 'p-2 sm:p-3' : 'p-3 sm:p-4'
          }`}
        >
          {isGeneratingCover && (
            <div className="absolute inset-0 z-20 bg-black/45 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center text-white">
              <div className="w-6 h-6 border-2 border-white/80 border-t-transparent rounded-full animate-spin mb-1.5" />
              <span className="text-[10px] font-bold tracking-wide font-sans drop-shadow-xs">
                Generating Cover...
              </span>
            </div>
          )}

          {hasCoverImage && (
            <img
              src={
                story.cover
                  ? `https://pb.teacherjake.com/api/files/stories/${story.id}/${story.cover}`
                  : `/covers/${story.id}.jpg?t=${story.updated ? new Date(story.updated).getTime() : ''}`
              }
              onError={() => setImgError(true)}
              className="absolute inset-0 w-full h-full object-cover z-0"
              alt=""
            />
          )}

          {/* Left Spine Fold / Crease (adds beautiful book texture) */}
          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-black/10 via-black/[0.02] to-transparent pointer-events-none rounded-l-md z-20" />
          <div className="absolute left-2.5 top-0 bottom-0 w-[1px] bg-black/[0.06] dark:bg-white/[0.05] pointer-events-none z-20" />

          {/* Centerpiece Cover Art / Title Block */}
          <div
            className={`flex-1 flex flex-col text-center z-10 relative rounded-xl transition-all duration-300 ${
              hasCoverImage ? 'justify-end mt-2 mb-0.5' : 'justify-start my-0.5'
            }`}
          >
            {hasCoverImage ? null : (
              // Original behavior for gradient cards
              <div className="transition-all duration-500 ease-out rounded-xl px-1.5 py-1.5 sm:px-2.5 sm:py-2.5">
                <h3
                  lang={getLanguageCodeFromName(story.language)}
                  className="text-xs sm:text-sm md:text-base font-serif font-extrabold tracking-tight leading-tight line-clamp-2 mb-0.5 hyphens-auto"
                >
                  {story.title}
                </h3>
                <p
                  className={`text-[8px] sm:text-[9px] uppercase tracking-wider font-mono font-bold ${textMutedClass}`}
                >
                  Theme: {resolvedGenreLabel}
                </p>
                {loadedDescription && (
                  <p
                    className={`text-[9px] sm:text-[10px] ${textMutedClass} leading-relaxed font-sans italic opacity-90 px-0.5 text-left line-clamp-4 sm:line-clamp-6 mt-1.5 sm:mt-2.5`}
                  >
                    "{loadedDescription}"
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Intro Modal (Rendered via Portal for easy viewing without clipping) */}
      {showDescription &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
            onClick={(e) => {
              e.stopPropagation();
              setShowDescription(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-tj-bg-card border border-tj-border-main rounded-2xl p-5 sm:p-6 max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative text-tj-text-main"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Title and Close Button */}
              <div className="flex items-start justify-between gap-3 border-b border-tj-border-main pb-3 mb-3">
                <div>
                  <h3
                    lang={getLanguageCodeFromName(story.language)}
                    className="text-base sm:text-lg font-serif font-extrabold text-tj-text-main leading-snug"
                  >
                    {story.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap font-mono text-[10px] font-bold">
                    <span className="px-1.5 py-0.5 bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-text-main rounded border border-tj-border-main/60 uppercase">
                      {story.cefrLevel}
                    </span>
                    <span className="text-tj-text-muted uppercase">
                      {mainLangCode}
                      {showBilingualTag && `-${transLangCode}`}
                    </span>
                    <span className="text-tj-text-muted/60">•</span>
                    <span className="text-tj-text-muted uppercase">
                      Theme: {resolvedGenreLabel}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDescription(false)}
                  className="p-1.5 hover:bg-tj-primary-light dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer text-tj-text-muted hover:text-tj-text-main shrink-0"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Stats Bar */}
              <div className="flex items-center justify-between py-2 px-3 bg-tj-bg-recessed border border-tj-border-main/60 rounded-xl mb-3 text-xs font-mono">
                <div>
                  {story.isCompleted || chaptersCount === story.totalChapters ? (
                    <span className="font-bold text-tj-text-main">
                      {(Math.round(wordCount / 50) * 50).toLocaleString()} WORDS
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 font-sans uppercase text-xs font-bold text-amber-600 dark:text-amber-400">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      IN PROGRESS ({chaptersCount}/{story.totalChapters} CH)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-tj-text-muted text-[11px]">
                  {totalReads > 0 && <span>READS: {totalReads}</span>}

                  {story.ratings && Object.keys(story.ratings).length > 0 ? (
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
                            className={`w-3 h-3 ${
                              isFilled
                                ? 'fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400'
                                : 'opacity-25'
                            }`}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <span className="opacity-50 text-[10px]">NO RATINGS</span>
                  )}
                </div>
              </div>

              {/* Description Body */}
              <div className="flex-1 overflow-y-auto pr-1 my-1">
                {loadingDescription ? (
                  <div className="py-12 text-center text-xs font-mono text-tj-text-muted opacity-60 animate-pulse">
                    Loading Intro narrative...
                  </div>
                ) : loadedDescription ? (
                  <p className="text-xs sm:text-sm font-sans text-tj-text-main leading-relaxed opacity-90 whitespace-pre-line">
                    {loadedDescription}
                  </p>
                ) : (
                  <p className="py-8 text-xs font-sans text-center text-tj-text-muted opacity-60 italic">
                    No narrative description provided for this story.
                  </p>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-tj-border-main">
                <button
                  type="button"
                  onClick={() => setShowDescription(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-tj-text-muted hover:text-tj-text-main rounded-xl border border-tj-border-main hover:bg-tj-primary-light transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDescription(false);
                    onSelect();
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-tj-bg-main bg-tj-primary hover:bg-tj-primary-hover rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Start Reading</span>
                  <BookOpenText className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </div>,
          document.body,
        )}

      {/* Metadata Row Outside Book Cover */}
      <div className="mt-2 px-1 flex items-center justify-between text-xs font-mono w-full min-w-0 select-none">
        {/* Left Block: CEFR, Language, and Lock Icon */}
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          <span className="px-1 py-0.5 bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-text-main rounded text-[9px] sm:text-[10px] font-bold border border-tj-border-main/60 uppercase">
            {story.cefrLevel}
          </span>
          <span className="text-[9px] sm:text-[10px] text-tj-text-muted font-bold uppercase">
            {mainLangCode}
            {showBilingualTag && `-${transLangCode}`}
          </span>
          {story.isPublic === false && (
            <span
              title="Private Story"
              className="text-tj-text-muted opacity-60"
            >
              <Lock className="w-3 h-3" />
            </span>
          )}
          {story.copyrightFlag === true && (
            <span
              title={
                story.copyrightFlagReason
                  ? `Copyright-restricted: ${story.copyrightFlagReason}`
                  : 'Copyright-restricted — private only'
              }
              className="text-amber-600 dark:text-amber-400"
            >
              <ShieldAlert className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* Center Block: Intro Button */}
        <button
          type="button"
          onClick={handleToggleIntro}
          className={`cursor-pointer text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-colors underline underline-offset-2 px-1 ${
            showDescription
              ? 'text-tj-primary decoration-tj-primary'
              : 'text-tj-text-muted hover:text-tj-text-main decoration-tj-text-muted/50 hover:decoration-tj-text-main'
          }`}
          title="View Description"
        >
          Intro
        </button>

        {/* Right Block: Action Icons */}
        <div className="flex items-center gap-1 shrink-0">
          {!isCachedOffline && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onDownload) {
                  onDownload(e);
                }
              }}
              className="p-0.5 hover:bg-tj-primary-light dark:hover:bg-tj-primary-light/10 rounded cursor-pointer transition-all flex items-center justify-center border-0 bg-transparent text-tj-text-muted hover:text-tj-text-main"
              title="Download for offline reading"
            >
              <Cloud className="w-3.5 h-3.5" />
            </button>
          )}
          {isRead ? (
            <span title="Completed reading" className="text-tj-text-muted">
              <BookCheck className="w-3.5 h-3.5" />
            </span>
          ) : inRecentlyRead ? (
            <span title="Currently Reading" className="text-tj-text-muted">
              <BookOpenText className="w-3.5 h-3.5" />
            </span>
          ) : null}
          {onToggleSaved && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSaved(story.id, e);
              }}
              className="p-0.5 rounded transition-all cursor-pointer text-tj-text-muted hover:text-tj-text-main hover:bg-tj-primary-light dark:hover:bg-tj-primary-light/10"
              title={
                isSaved ? 'Remove from Bookshelf' : 'Save to Bookshelf'
              }
            >
              {isSaved ? (
                <BookmarkCheck className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          {currentUser?.isAdmin === true ? (
            <button
              type="button"
              onClick={(e) => onDelete(story.id, e)}
              className="p-0.5 rounded transition-all cursor-pointer text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
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
              className="p-0.5 rounded transition-all cursor-pointer text-tj-text-muted hover:text-rose-500 hover:bg-rose-500/10"
              title="Flag Story for Deletion"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
