import {
  BookCheck,
  Bookmark,
  BookmarkCheck,
  BookOpenText,
  Cloud,
  Lock,
  Star,
} from 'lucide-react';
import { motion } from 'motion/react';
import React, { useState } from 'react';
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

interface StoryCardProps {
  story: Story;
  currentUser: any;
  onSelect: () => void;
  onDelete: (storyId: string, e: any) => void;
  isSaved?: boolean;
  onToggleSaved?: (storyId: string, e: any) => void;
  isCachedOffline?: boolean;
  onDownload?: (e: React.MouseEvent) => void;
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
  onDownload,
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

  const _progressPct = Math.round((chaptersCount / story.totalChapters) * 100);
  const resolvedGenreLabel = cleanGenreLabel(
    GENRES.find((g) => g.id === story.genre)?.label || story.genre,
  );
  const coverStyle = getCefrCoverStyles(story.cefrLevel);
  const [imgError, setImgError] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showMobileOverlay, setShowMobileOverlay] = useState(false);
  const hasCoverImage = !imgError;
  const cardThemeClass = hasCoverImage
    ? 'text-[#F9F6F0] dark:text-[#EBE4D5] border-black/15 dark:border-white/10'
    : coverStyle.card;
  const textMutedClass = hasCoverImage
    ? 'text-[#F9F6F0]/70 dark:text-[#EBE4D5]/70'
    : coverStyle.textMuted;

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }
  }, []);

  const handleCardClick = (e: React.MouseEvent) => {
    if (hasCoverImage && isTouchDevice) {
      if (!showMobileOverlay) {
        e.stopPropagation();
        setShowMobileOverlay(true);
        return;
      }
    }
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
  const globalReadCount = Object.values(completedByObj).reduce(
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
    <div className="relative group w-full max-w-[360px] min-w-[340px] mx-auto aspect-[3/4.2] min-h-[476px] cursor-pointer">
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
        onClick={handleCardClick}
        onMouseLeave={() => setShowMobileOverlay(false)}
        className={`relative ${cardThemeClass} border rounded-l-md rounded-r-lg flex flex-col justify-between h-full w-full select-none shadow-[4px_6px_12px_-5px_rgba(0,0,0,0.12),_1px_2px_4px_-1px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300 ${
          hasCoverImage ? 'p-3.5' : 'p-5'
        }`}
      >
        {hasCoverImage && (
          <img
            src={`/covers/${story.id}.webp`}
            onError={() => setImgError(true)}
            className="absolute inset-0 w-full h-full object-cover z-0"
            alt=""
          />
        )}

        {/* Left Spine Fold / Crease (adds beautiful book texture) */}
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-black/10 via-black/[0.02] to-transparent pointer-events-none rounded-l-md z-20" />
        <div className="absolute left-2.5 top-0 bottom-0 w-[1px] bg-black/[0.06] dark:bg-white/[0.05] pointer-events-none z-20" />

        <div className="relative z-10">
          <div className="flex items-center justify-between pl-2.5 mb-2.5 w-full">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase py-0.5 text-current">
                {story.cefrLevel}
              </span>
              <div className="flex items-center">
                <span
                  className={`text-[10px] font-mono font-bold uppercase py-0.5 ${textMutedClass}`}
                >
                  {mainLangCode}
                </span>
                {showBilingualTag && (
                  <span
                    className={`text-[10px] font-mono font-bold uppercase py-0.5 ${textMutedClass}`}
                  >
                    -{transLangCode}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {story.isPublic === false && (
                <span title="Private Story">
                  <Lock
                    className={`w-3.5 h-3.5 ${textMutedClass} opacity-60`}
                  />
                </span>
              )}
              {!isCachedOffline && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDownload) {
                      onDownload(e);
                    }
                  }}
                  className="p-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded cursor-pointer transition-all flex items-center justify-center border-0 bg-transparent text-current"
                  title="Download for offline reading"
                >
                  <Cloud
                    className={`w-3.5 h-3.5 ${textMutedClass} opacity-60 hover:opacity-100`}
                  />
                </button>
              )}
              {isRead ? (
                <span title="Completed reading">
                  <BookCheck
                    className={`w-3.5 h-3.5 ${textMutedClass} opacity-60`}
                  />
                </span>
              ) : inRecentlyRead ? (
                <span title="Recently Read (In Progress)">
                  <BookOpenText
                    className={`w-3.5 h-3.5 ${textMutedClass} opacity-60`}
                  />
                </span>
              ) : null}
              {onToggleSaved && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSaved(story.id, e);
                  }}
                  className={`p-0.5 rounded transition-all cursor-pointer ${textMutedClass} opacity-50 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5`}
                  title={
                    isSaved ? 'Remove from Bookshelf' : 'Save to Bookshelf'
                  }
                >
                  {isSaved ? (
                    <BookmarkCheck className="w-3.5 h-3.5 fill-current opacity-100" />
                  ) : (
                    <Bookmark className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Centerpiece Cover Art / Title Block */}
        <div 
          className={`flex-1 flex flex-col text-center z-10 relative rounded-xl transition-all duration-300 ${
            hasCoverImage 
              ? 'justify-end mt-2 mb-0.5'
              : 'justify-start my-1'
          }`}
        >
          {hasCoverImage ? (
            // For covers, we only render the description box on hover near the bottom
            story.description && (
              <div
                className={`transition-all duration-500 ease-out rounded-xl px-3 py-3 bg-black/45 dark:bg-black/65 backdrop-blur-md border border-white/10 shadow-lg mx-1 overflow-hidden ${
                  showMobileOverlay
                    ? 'opacity-100 max-h-64'
                    : 'opacity-0 max-h-0 line-clamp-none group-hover:opacity-100 group-hover:max-h-64'
                }`}
              >
                <p className={`text-[10px] ${textMutedClass} leading-relaxed font-sans italic opacity-90 px-0.5 text-left`}>
                  "{story.description}"
                </p>
                {/* Mobile tap-to-read instruction */}
                <p className="text-[8px] uppercase tracking-wider font-mono font-bold text-center mt-2 opacity-75 text-white/90 animate-pulse block md:hidden">
                  Tap again to read
                </p>
              </div>
            )
          ) : (
            // Original behavior for gradient cards
            <div className="transition-all duration-500 ease-out rounded-xl px-3 py-3">
              <h3
                lang={getLanguageCodeFromName(story.language)}
                className="text-base md:text-lg font-serif font-extrabold tracking-tight leading-tight line-clamp-2 mb-0.5 hyphens-auto"
              >
                {story.title}
              </h3>
              <p
                className={`text-[9px] uppercase tracking-wider font-mono font-bold ${textMutedClass}`}
              >
                Theme: {resolvedGenreLabel}
              </p>
              {story.description && (
                <p
                  className={`text-[10px] ${textMutedClass} leading-relaxed font-sans italic opacity-90 px-0.5 text-left line-clamp-8 mt-2.5`}
                >
                  "{story.description}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Area */}
        <div className={`z-10 relative ${hasCoverImage ? 'pt-1.5 mt-1' : 'pt-2.5'}`}>
          <div className="text-[9px] font-mono font-bold">
            {/* Line: Word Count, Ratings & Reads */}
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <div className={`${textMutedClass}`}>
                {story.isCompleted || chaptersCount === story.totalChapters ? (
                  <span className="whitespace-nowrap">
                    {(Math.round(wordCount / 50) * 50).toLocaleString()} WORDS
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-sans uppercase text-[8px] tracking-wide whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                    In Progress
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {story.ratings && Object.keys(story.ratings).length > 0 && (
                  <div
                    className={`flex items-center gap-0.5 ${textMutedClass}`}
                    title={`Avg: ${getAverageRating(story.ratings).toFixed(1)}`}
                  >
                    {[1, 2, 3, 4, 5].map((starValue) => {
                      const ratingVal = getAverageRating(story.ratings);
                      const isFilled = starValue <= Math.round(ratingVal);
                      return (
                        <Star
                          key={starValue}
                          className={`w-2 h-2 ${isFilled ? 'fill-current' : 'opacity-30'}`}
                        />
                      );
                    })}
                  </div>
                )}

                {totalReads > 0 && (
                  <span className={`${textMutedClass} whitespace-nowrap`}>
                    READS: {totalReads}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
