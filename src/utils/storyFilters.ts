/**
 * Shared story filtering and sorting logic.
 *
 * Extracted from App.tsx where the same filter/sort pipeline was duplicated
 * for `filteredStories` and `filteredBookshelfStories`.
 */

import type { RecentlyReadItem, Story } from '../types';
import { GENRES } from '../types';
import { getModelDisplayName } from './modelUtils';

export type SortBy = 'newest' | 'oldest' | 'chapters' | 'title' | 'popularity';

export interface StoryFilters {
  filterLanguage: string;
  filterCefrLevel: string;
  filterGenre: string;
  filterReadingStatus: string;
  searchQuery: string;
  sortBy: SortBy;
  currentUser: { uid: string } | null;
  recentlyRead: RecentlyReadItem[];
}

/** Returns the resolved chapter count for a story (handles metadata-only stories). */
export const getChaptersCount = (story: Story): number =>
  story.chaptersCount !== undefined
    ? story.chaptersCount
    : story.chapters
      ? story.chapters.length
      : 0;

/**
 * Filters and sorts an array of stories according to the given criteria.
 * This is the single source of truth for library / bookshelf filtering.
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
  } = filters;

  return stories
    .filter((story) => {
      // 1. Language filter
      if (filterLanguage !== 'All' && story.language !== filterLanguage)
        return false;

      // 2. CEFR level filter
      if (filterCefrLevel !== 'All' && story.cefrLevel !== filterCefrLevel)
        return false;

      // 3. Genre filter
      if (filterGenre !== 'All') {
        const gObj = GENRES.find(
          (g) => g.id === filterGenre || g.label === filterGenre,
        );
        const sGenre = story.genre.toLowerCase();
        const matchId = gObj ? gObj.id.toLowerCase() === sGenre : false;
        const matchLabel = gObj ? gObj.label.toLowerCase() === sGenre : false;
        const matchDirect = filterGenre.toLowerCase() === sGenre;
        if (!matchId && !matchLabel && !matchDirect) return false;
      }

      // 4b. Reading Status filter
      if (filterReadingStatus !== 'All') {
        let isRead = false;
        if (currentUser) {
          isRead = (story.completedBy?.[currentUser.uid] || 0) > 0;
        } else {
          isRead =
            typeof window !== 'undefined' &&
            localStorage.getItem(`completed_story_${story.id}`) === 'true';
        }

        const isInProgress =
          recentlyRead.some((item) => item.storyId === story.id) && !isRead;

        if (filterReadingStatus === 'Completed' && !isRead) return false;
        if (filterReadingStatus === 'In-Progress' && !isInProgress)
          return false;
        if (filterReadingStatus === 'Unread' && (isRead || isInProgress))
          return false;
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
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
};
