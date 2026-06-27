import { useEffect, useMemo, useState } from 'react';
import type { Story } from '../types';
import { filterAndSortStories, type SortBy } from '../utils/storyFilters';

interface UseFiltersOptions {
  stories: Story[];
  bookshelf: string[];
  recentlyRead: { storyId: string; chapterIdx: number }[];
  currentUser: { uid: string; email: string | null } | null;
}

export function useFilters(options: UseFiltersOptions) {
  const { stories, bookshelf, recentlyRead, currentUser } = options;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'All';
    return localStorage.getItem('library_filter_language') || 'All';
  });
  const [filterCefrLevel, setFilterCefrLevel] = useState(() => {
    if (typeof window === 'undefined') return 'All';
    return localStorage.getItem('library_filter_cefr_level') || 'All';
  });
  const [filterGenre, setFilterGenre] = useState('All');
  const [filterReadingStatus, setFilterReadingStatus] = useState('All');
  const [sortBy, setSortBy] = useState<SortBy>('newest');

  // Remember library filters
  useEffect(() => {
    localStorage.setItem('library_filter_language', filterLanguage);
  }, [filterLanguage]);

  useEffect(() => {
    localStorage.setItem('library_filter_cefr_level', filterCefrLevel);
  }, [filterCefrLevel]);

  // Filter public stories or user owned private stories for Browse tab
  const visibleStories = useMemo(() => {
    return stories.filter((story) => {
      return (
        story.isPublic !== false ||
        (currentUser &&
          (story.creatorId === currentUser.uid ||
            currentUser.email === 'jmayereup@gmail.com'))
      );
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
    ],
  );

  // Compiled bookshelf stories (created by user OR explicitly saved to bookshelf)
  const bookshelfStories = useMemo(() => {
    return stories.filter((story) => {
      const isOwner = currentUser && story.creatorId === currentUser.uid;
      const isSaved = bookshelf.includes(story.id);
      const canRead =
        story.isPublic !== false ||
        isOwner ||
        currentUser?.email === 'jmayereup@gmail.com';
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
    ],
  );

  // Filter/order the 9 most recently read stories with chapter progress details
  const recentlyReadStories = useMemo(() => {
    return recentlyRead
      .map((item) => {
        const story = stories.find((s) => s.id === item.storyId);
        if (!story) return null;
        return {
          story,
          chapterIdx: item.chapterIdx,
        };
      })
      .filter((item): item is { story: Story; chapterIdx: number } => !!item)
      .slice(0, 9);
  }, [recentlyRead, stories]);

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
