import { useEffect, useMemo, useState } from 'react';
import type { IUser } from '../services/types';
import { useUIStore } from '../store/uiStore';
import type { Story } from '../types';
import { filterAndSortStories, type SortBy } from '../utils/storyFilters';

interface UseFiltersOptions {
  stories: Story[];
  bookshelf: string[];
  recentlyRead: { storyId: string; chapterIdx: number }[];
  currentUser: IUser | null;
  ssrPath?: string;
}

function getSearchString(ssrPath?: string): string {
  if (typeof window !== 'undefined') {
    return window.location.search;
  }
  if (ssrPath) {
    const qIdx = ssrPath.indexOf('?');
    return qIdx !== -1 ? ssrPath.substring(qIdx) : '';
  }
  return '';
}

export function useFilters(options: UseFiltersOptions) {
  const { stories, bookshelf, recentlyRead, currentUser, ssrPath } = options;
  const guestCompletedStoryIds = useUIStore(
    (state) => state.guestCompletedStoryIds,
  );

  const queryParams = useMemo(() => {
    const searchStr = getSearchString(ssrPath);
    if (!searchStr) return { cefr: null, lang: null, q: null, sort: null };
    const params = new URLSearchParams(searchStr);
    const cefr = params.get('cefr') ? params.get('cefr')?.split(',') : null;
    const lang = params.get('lang') ? params.get('lang')?.split(',') : null;
    const q = params.get('q') || null;
    const sort = params.get('sort') || null;
    return { cefr, lang, q, sort };
  }, [ssrPath]);

  const [searchQuery, setSearchQuery] = useState(() => queryParams.q || '');
  const [filterLanguage, setFilterLanguage] = useState<string[]>(() => {
    if (queryParams.lang) return queryParams.lang;
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('library_filter_language');
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
      if (parsed === 'All') return [];
      return [parsed];
    } catch {
      const val = localStorage.getItem('library_filter_language');
      if (val === 'All' || !val) return [];
      return [val];
    }
  });
  const [filterCefrLevel, setFilterCefrLevel] = useState<string[]>(() => {
    if (queryParams.cefr) return queryParams.cefr;
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('library_filter_cefr_level');
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
      if (parsed === 'All') return [];
      return [parsed];
    } catch {
      const val = localStorage.getItem('library_filter_cefr_level');
      if (val === 'All' || !val) return [];
      return [val];
    }
  });
  const [filterGenre, setFilterGenre] = useState<string[]>([]);
  const [filterReadingStatus, setFilterReadingStatus] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    if (queryParams.sort) return queryParams.sort as SortBy;
    return 'newest';
  });

  // Remember library filters
  useEffect(() => {
    localStorage.setItem(
      'library_filter_language',
      JSON.stringify(filterLanguage),
    );
  }, [filterLanguage]);

  useEffect(() => {
    localStorage.setItem(
      'library_filter_cefr_level',
      JSON.stringify(filterCefrLevel),
    );
  }, [filterCefrLevel]);

  // Filter public stories or user owned private stories for Browse tab
  const visibleStories = useMemo(() => {
    return stories.filter((story) => {
      const isOwner = currentUser && story.creatorId === currentUser.uid;
      const isAdmin = currentUser?.isAdmin === true;
      if (story.copyrightFlag === true) {
        return isOwner || isAdmin;
      }
      return story.isPublic !== false || (currentUser && (isOwner || isAdmin));
    });
  }, [stories, currentUser]);

  // Filtered stories compilation (for Browse tab)
  const filteredStories = useMemo(
    () =>
      filterAndSortStories(visibleStories, {
        searchQuery,
        filterLanguage,
        filterCefrLevel,
        filterGenre,
        filterReadingStatus,
        sortBy,
        currentUser,
        recentlyRead,
        guestCompletedStoryIds,
      }),
    [
      visibleStories,
      searchQuery,
      filterLanguage,
      filterCefrLevel,
      filterGenre,
      filterReadingStatus,
      sortBy,
      currentUser,
      recentlyRead,
      guestCompletedStoryIds,
    ],
  );

  // Compiled bookshelf stories (created by user OR explicitly saved to bookshelf)
  const bookshelfStories = useMemo(() => {
    return stories.filter((story) => {
      const isOwner = currentUser && story.creatorId === currentUser.uid;
      const isSaved = bookshelf.includes(story.id);
      const isAdmin = currentUser?.isAdmin === true;
      if (story.copyrightFlag === true && !isOwner && !isAdmin) {
        return false;
      }
      const canRead = story.isPublic !== false || isOwner || isAdmin;
      return (isOwner || isSaved) && canRead;
    });
  }, [stories, bookshelf, currentUser]);

  // Filtered bookshelf stories compilation
  const filteredBookshelfStories = useMemo(
    () =>
      filterAndSortStories(bookshelfStories, {
        searchQuery,
        filterLanguage,
        filterCefrLevel,
        filterGenre,
        filterReadingStatus,
        sortBy,
        currentUser,
        recentlyRead,
        guestCompletedStoryIds,
      }),
    [
      bookshelfStories,
      searchQuery,
      filterLanguage,
      filterCefrLevel,
      filterGenre,
      filterReadingStatus,
      sortBy,
      currentUser,
      recentlyRead,
      guestCompletedStoryIds,
    ],
  );

  // Filter/order the 9 most recently read stories with chapter progress details.
  // Exclude stories the current user has marked as finished, so the "Reading"
  // section only surfaces books they are still working through.
  const recentlyReadStories = useMemo(() => {
    return recentlyRead
      .map((item) => {
        const story = stories.find((s) => s.id === item.storyId);
        if (!story) return null;
        const isCompletedByUser =
          (currentUser && (story.completedBy?.[currentUser.uid] || 0) > 0) ||
          guestCompletedStoryIds.includes(story.id);
        if (isCompletedByUser) return null;
        return {
          story,
          chapterIdx: item.chapterIdx,
        };
      })
      .filter((item): item is { story: Story; chapterIdx: number } => !!item)
      .slice(0, 9);
  }, [recentlyRead, stories, currentUser, guestCompletedStoryIds]);

  return {
    searchQuery,
    setSearchQuery,
    filterLanguage,
    setFilterLanguage,
    filterCefrLevel,
    setFilterCefrLevel,
    filterGenre,
    setFilterGenre,
    filterReadingStatus,
    setFilterReadingStatus,
    sortBy,
    setSortBy,
    visibleStories,
    filteredStories,
    bookshelfStories,
    filteredBookshelfStories,
    recentlyReadStories,
  };
}
