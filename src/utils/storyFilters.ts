/**
 * Shared story filtering and sorting logic.
 *
 * Extracted from App.tsx where the same filter/sort pipeline was duplicated
 * for `filteredStories` and `filteredBookshelfStories`.
 */

import type { RecentlyReadItem, Story } from '../types';
import { GENRES, getAverageRating } from '../types';
import { getModelDisplayName } from './modelUtils';

export type SortBy =
  | 'newest'
  | 'oldest'
  | 'chapters'
  | 'title'
  | 'popularity'
  | 'rating';

export interface StoryFilters {
  filterLanguage: string[];
  filterCefrLevel: string[];
  filterGenre: string[];
  filterReadingStatus: string[];
  searchQuery: string;
  sortBy: SortBy;
  currentUser: { uid: string } | null;
  recentlyRead: RecentlyReadItem[];
  guestCompletedStoryIds?: string[];
}

/** Returns the resolved chapter count for a story (handles metadata-only stories). */
export const getChaptersCount = (story: Story): number =>
  story.chaptersCount !== undefined
    ? story.chaptersCount
    : story.chapters
      ? story.chapters.length
      : 0;

/**
 * A "swappable bilingual" story is an A1 book that was generated with a paired
 * translation language, allowing the reader view to flip the primary and TTS
 * languages. Pre-A1 is excluded because it has inserted scaffolding words that
 * would desync the bilingual pairing if swapped.
 */
export const isSwappableBilingual = (story: Story): boolean =>
  story.cefrLevel === 'A1' && !!story.translationLanguage;

/**
 * Returns true if a story matches the user's selected language filter.
 *
 * - Single language selected: matches only by primary `story.language` (so
 *   `EN-DE` matches English, `DE-EN` matches German, and neither matches the
 *   other).
 * - Multiple languages selected (e.g. English + German): requires the story's
 *   language pair (`story.language` and `story.translationLanguage`) to
 *   contain all selected languages (so both `EN-DE` and `DE-EN` match,
 *   including Pre-A1 and A1, while `EN-FR` does not).
 */
export const matchesLanguageFilter = (
  story: Story,
  filterLanguage: string[],
): boolean => {
  if (filterLanguage.length === 0) return true;

  const normalizedFilters = Array.from(
    new Set(filterLanguage.map((fl) => fl.toLowerCase())),
  );
  const primaryLang = story.language.toLowerCase();

  if (normalizedFilters.length === 1) {
    return primaryLang === normalizedFilters[0];
  }

  const transLang = story.translationLanguage?.toLowerCase();
  const storyLangs = new Set(
    transLang ? [primaryLang, transLang] : [primaryLang],
  );
  return normalizedFilters.every((fl) => storyLangs.has(fl));
};

/**
 * Filters and sorts an array of stories according to the provided criteria.
 */
export const filterAndSortStories = (
  stories: Story[],
  filters: StoryFilters,
): Story[] => {
  const {
    filterLanguage,
    filterCefrLevel,
    filterGenre,
    filterReadingStatus,
    searchQuery,
    sortBy,
    currentUser,
    recentlyRead,
    guestCompletedStoryIds = [],
  } = filters;

  return stories
    .filter((story) => {
      // 1. Language filter
      if (!matchesLanguageFilter(story, filterLanguage)) return false;

      // 2. CEFR Level filter
      if (
        filterCefrLevel.length > 0 &&
        !filterCefrLevel.some(
          (fcl) => story.cefrLevel.toLowerCase() === fcl.toLowerCase(),
        )
      ) {
        return false;
      }

      // 3. Genre filter
      if (filterGenre.length > 0) {
        const match = filterGenre.some((fg) => {
          const gObj = GENRES.find((g) => g.id === fg || g.label === fg);
          const sGenre = story.genre.toLowerCase();
          const matchId = gObj ? gObj.id.toLowerCase() === sGenre : false;
          const matchLabel = gObj ? gObj.label.toLowerCase() === sGenre : false;
          const matchDirect = fg.toLowerCase() === sGenre;
          return matchId || matchLabel || matchDirect;
        });
        if (!match) return false;
      }

      // 4b. Reading Status filter
      if (filterReadingStatus.length > 0) {
        let isRead = false;
        if (currentUser) {
          isRead = (story.completedBy?.[currentUser.uid] || 0) > 0;
        } else if (guestCompletedStoryIds.length > 0) {
          isRead = guestCompletedStoryIds.includes(story.id);
        }

        const isInProgress =
          recentlyRead.some((item) => item.storyId === story.id) && !isRead;

        const match = filterReadingStatus.some((frs) => {
          if (frs === 'Completed' && isRead) return true;
          if (frs === 'In-Progress' && isInProgress) return true;
          if (frs === 'Unread' && !isRead && !isInProgress) return true;
          return false;
        });
        if (!match) return false;
      }

      // 5. Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = story.title.toLowerCase().includes(query);
        const genreMatch = story.genre.toLowerCase().includes(query);
        const languageMatch = story.language.toLowerCase().includes(query);
        const levelMatch = story.cefrLevel.toLowerCase().includes(query);
        const creatorMatch =
          story.creatorEmail?.toLowerCase().includes(query) || false;
        const modelMatch = getModelDisplayName(story.model)
          .toLowerCase()
          .includes(query);
        const descriptionMatch =
          story.description?.toLowerCase().includes(query) || false;

        const genreObj = GENRES.find((g) => g.id === story.genre);
        const genreLabelMatch = genreObj
          ? genreObj.label.toLowerCase().includes(query)
          : false;

        if (
          !titleMatch &&
          !genreMatch &&
          !languageMatch &&
          !levelMatch &&
          !creatorMatch &&
          !modelMatch &&
          !genreLabelMatch &&
          !descriptionMatch
        )
          return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
        case 'oldest':
          return (
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
          );
        case 'chapters':
          return getChaptersCount(b) - getChaptersCount(a);
        case 'popularity': {
          const popularityA = Object.values(a.completedBy || {}).reduce(
            (sum, val) => sum + val,
            0,
          );
          const popularityB = Object.values(b.completedBy || {}).reduce(
            (sum, val) => sum + val,
            0,
          );
          if (popularityA !== popularityB) {
            return popularityB - popularityA;
          }
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
        }
        case 'rating': {
          const avgA = getAverageRating(a.ratings);
          const avgB = getAverageRating(b.ratings);
          if (avgA !== avgB) {
            return avgB - avgA;
          }
          const countA = Object.keys(a.ratings || {}).length;
          const countB = Object.keys(b.ratings || {}).length;
          if (countA !== countB) {
            return countB - countA;
          }
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
        }
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
};
