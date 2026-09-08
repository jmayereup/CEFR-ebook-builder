import React, { useEffect, useState } from 'react';
import { GENRES, getLanguageCodeFromName } from '../../types';
import {
  getCefrCoverStyles,
  getStoryCoverUrl,
  hasCustomCover,
} from '../../utils/coverUtils';

export interface StoryBookCoverProps {
  story: {
    id: string;
    title: string;
    genre?: string;
    cefrLevel?: string;
    language?: string;
    translationLanguage?: string;
    cover?: string;
    collectionId?: string;
    updated?: string | Date;
  };
  size?: 'card' | 'compact' | 'hero';
  isGeneratingCover?: boolean;
  className?: string;
}

const cleanGenreLabel = (label: string) => {
  return label
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();
};

export default function StoryBookCover({
  story,
  size = 'card',
  isGeneratingCover = false,
  className = '',
}: StoryBookCoverProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error whenever story or cover updates
  useEffect(() => {
    setImgError(false);
  }, [story.cover, story.updated, isGeneratingCover]);

  const isCustom = hasCustomCover(story);
  const coverUrl = getStoryCoverUrl(story);
  const coverStyle = getCefrCoverStyles(story.cefrLevel);
  const resolvedGenreLabel = cleanGenreLabel(
    GENRES.find((g) => g.id === story.genre)?.label || story.genre || 'Story',
  );

  const isCompact = size === 'compact';
  const isHero = size === 'hero';

  // If image errored out completely (offline network error)
  if (imgError && !isGeneratingCover) {
    return (
      <div
        className={`relative w-full h-full flex flex-col justify-between overflow-hidden select-none border ${coverStyle.card} ${
          isCompact ? 'p-1.5' : isHero ? 'p-6' : 'p-3 sm:p-4'
        } ${className}`}
      >
        {/* Spine crease */}
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-black/10 via-black/[0.02] to-transparent pointer-events-none rounded-l-md z-20" />
        <div className="absolute left-2.5 top-0 bottom-0 w-[1px] bg-black/[0.06] dark:bg-white/[0.05] pointer-events-none z-20" />

        {/* Fallback Text Cover */}
        <div className="flex-1 flex flex-col justify-center text-center z-10">
          <h3
            lang={getLanguageCodeFromName(story.language)}
            className={`font-['Lora',serif] font-bold tracking-normal leading-snug line-clamp-3 mb-1 break-words ${
              isCompact
                ? 'text-[11px]'
                : isHero
                  ? 'text-2xl sm:text-3xl'
                  : 'text-sm sm:text-base md:text-[17px]'
            }`}
          >
            {story.title}
          </h3>
          <p
            className={`uppercase tracking-wider font-mono font-bold ${coverStyle.textMuted} ${
              isCompact
                ? 'text-[7px]'
                : isHero
                  ? 'text-xs'
                  : 'text-[8px] sm:text-[9px]'
            }`}
          >
            {resolvedGenreLabel}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none bg-stone-900 ${className}`}
    >
      {/* Background Image (Custom AI Cover or Generic Genre Cover) */}
      <img
        src={coverUrl}
        alt={isCustom ? `${story.title} Cover` : ''}
        onError={() => setImgError(true)}
        className="absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-300"
        loading={isHero ? 'eager' : 'lazy'}
      />

      {/* Book Spine Fold & Shadow (gives physical book depth to both cover types) */}
      <div
        className={`absolute left-0 top-0 bottom-0 pointer-events-none z-20 bg-gradient-to-r from-black/35 via-black/10 to-transparent ${
          isCompact ? 'w-2' : isHero ? 'w-5' : 'w-3.5'
        }`}
      />
      <div
        className={`absolute top-0 bottom-0 w-[1px] bg-white/10 pointer-events-none z-20 ${
          isCompact ? 'left-2' : isHero ? 'left-5' : 'left-3.5'
        }`}
      />

      {/* Option A Text Overlay for Generic Covers: Title on Top, CEFR Level on Bottom */}
      {!isCustom && !isGeneratingCover && (
        <div
          className={`absolute inset-0 bg-gradient-to-b from-black/85 via-black/15 to-black/85 z-10 flex flex-col justify-between select-none ${
            isCompact ? 'p-1.5' : isHero ? 'p-6 sm:p-8' : 'p-3.5 sm:p-4.5'
          }`}
        >
          {/* Top Section: Title */}
          <div className="pt-1.5 sm:pt-2 text-center px-1 z-10 w-full">
            <h3
              lang={getLanguageCodeFromName(story.language)}
              className={`font-['Lora',serif] font-bold text-white leading-snug tracking-normal drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] line-clamp-3 break-words ${
                isCompact
                  ? 'text-[11px] line-clamp-2 leading-tight'
                  : isHero
                    ? 'text-2xl sm:text-3xl md:text-4xl leading-tight sm:leading-snug'
                    : 'text-[15px] sm:text-base md:text-[17px]'
              }`}
            >
              {story.title}
            </h3>
          </div>

          {/* Bottom Section: CEFR Level */}
          <div className="pb-1 sm:pb-1.5 text-center z-10 w-full">
            <span
              className={`font-['Lora',serif] tracking-widest uppercase font-bold text-amber-100 drop-shadow-[0_1px_6px_rgba(0,0,0,0.95)] ${
                isCompact
                  ? 'text-[9px]'
                  : isHero
                    ? 'text-sm sm:text-base'
                    : 'text-xs sm:text-[13px]'
              }`}
            >
              CEFR {story.cefrLevel || 'A1'}
            </span>
          </div>
        </div>
      )}

      {/* Generating Cover Spinner Overlay */}
      {isGeneratingCover && (
        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center text-white">
          <div
            className={`border-2 border-white/80 border-t-transparent rounded-full animate-spin ${
              isCompact
                ? 'w-4 h-4 mb-1'
                : isHero
                  ? 'w-8 h-8 mb-2'
                  : 'w-6 h-6 mb-1.5'
            }`}
          />
          {!isCompact && (
            <span
              className={`font-bold tracking-wide font-sans drop-shadow-xs ${
                isHero ? 'text-xs' : 'text-[10px]'
              }`}
            >
              Generating Cover...
            </span>
          )}
        </div>
      )}
    </div>
  );
}
