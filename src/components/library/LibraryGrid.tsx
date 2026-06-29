import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  SlidersHorizontal,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import type { RecentlyReadItem, Story } from '../../types';
import type { SortBy } from '../../utils/storyFilters';
import LibraryFilters from './LibraryFilters';
import StoryCard from './StoryCard';

interface LibraryGridProps {
  stories: Story[];
  filteredStories: Story[];
  onSelectStory: (story: Story) => void;
  onDeleteStory: (
    storyId: string,
    e: React.MouseEvent | React.KeyboardEvent | null,
  ) => void;
  setActiveTab: (tab: 'browse' | 'create' | 'practice' | 'admin') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: SortBy;
  setSortBy: (sort: SortBy) => void;
  filterLanguage: string;
  setFilterLanguage: (lang: string) => void;
  filterCefrLevel: string;
  setFilterCefrLevel: (level: string) => void;
  filterGenre: string;
  setFilterGenre: (genre: string) => void;
  filterReadingStatus: string;
  setFilterReadingStatus: (status: string) => void;
  bookshelf: string[];
  onToggleSaved: (
    storyId: string,
    e: React.MouseEvent | React.KeyboardEvent | null,
  ) => void;
  isBookshelf?: boolean;
  cachedStoryIds?: string[];
  onDownloadStory?: (story: Story) => void;
  recentlyRead?: RecentlyReadItem[];
}

export default function LibraryGrid({
  stories,
  filteredStories,
  onSelectStory,
  onDeleteStory,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  filterLanguage,
  setFilterLanguage,
  filterCefrLevel,
  setFilterCefrLevel,
  filterGenre,
  setFilterGenre,
  filterReadingStatus,
  setFilterReadingStatus,
  bookshelf,
  onToggleSaved,
  isBookshelf = false,
  cachedStoryIds = [],
  onDownloadStory,
  recentlyRead = [],
}: LibraryGridProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  useEffect(() => {
    const updateItemsPerPage = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      if (width >= 1280) {
        setItemsPerPage(10); // 5 columns * 2 rows = 10
      } else if (width >= 640) {
        setItemsPerPage(12); // 4 columns * 3 rows = 12, or 3 columns * 4 rows = 12
      } else {
        setItemsPerPage(8); // 2 columns * 4 rows = 8
      }
    };

    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  // Reset page when filters or sorting change
  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    filterLanguage,
    filterCefrLevel,
    filterGenre,
    filterReadingStatus,
    sortBy,
  ]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterLanguage('All');
    setFilterCefrLevel('All');
    setFilterGenre('All');
    setFilterReadingStatus('All');
  };

  const totalPages = Math.ceil(filteredStories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStories = filteredStories.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  // Helper to generate page numbers with ellipses
  const getPageNumbers = () => {
    const delta = 1;
    const range: number[] = [];
    const rangeWithDots: {
      type: 'page' | 'dots';
      value: number | string;
      key: string;
    }[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push({
            type: 'page',
            value: l + 1,
            key: `page-${l + 1}`,
          });
        } else if (i - l > 2) {
          rangeWithDots.push({
            type: 'dots',
            value: '...',
            key: `dots-${l}-${i}`,
          });
        }
      }
      rangeWithDots.push({
        type: 'page',
        value: i,
        key: `page-${i}`,
      });
      l = i;
    }

    return rangeWithDots;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-tj-text-main font-sans tracking-tight">
            {isBookshelf ? 'My Bookshelf' : 'Narrative Archives'}
          </h2>
          <p className="text-xs text-tj-text-muted">
            {isBookshelf
              ? 'Your personal collection of created and bookmarked graded readers.'
              : 'Graded books open for learning. Read instantly below.'}
          </p>
        </div>
      </div>

      {stories.length === 0 ? (
        isBookshelf ? (
          <div className="bg-tj-bg-card p-12 rounded-lg border border-tj-border-main text-center space-y-4 shadow-none">
            <HelpCircle
              className="w-12 h-12 text-tj-text-muted/50 mx-auto"
              strokeWidth={1.5}
            />
            <div>
              <h4 className="text-tj-text-main font-serif font-extrabold text-base">
                Your Bookshelf is Empty
              </h4>
              <p className="text-xs text-tj-text-muted max-w-sm mx-auto mt-1 leading-relaxed">
                Save books from the library or create your own custom stories to
                start building your reading list!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('browse')}
              className="py-2 px-4 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-semibold text-xs rounded cursor-pointer transition-colors"
            >
              Browse Library
            </button>
          </div>
        ) : (
          <div className="bg-tj-bg-card p-12 rounded-lg border border-tj-border-main text-center space-y-4 shadow-none">
            <HelpCircle
              className="w-12 h-12 text-tj-text-muted/50 mx-auto"
              strokeWidth={1.5}
            />
            <div>
              <h4 className="text-tj-text-main font-serif font-extrabold text-base">
                Graded Library Empty
              </h4>
              <p className="text-xs text-tj-text-muted max-w-sm mx-auto mt-1 leading-relaxed">
                Be the very first contributor to write a story! Configure your
                novel settings under the Create tab.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className="py-2 px-4 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-semibold text-xs rounded cursor-pointer transition-colors"
            >
              Draft First Story
            </button>
          </div>
        )
      ) : (
        <>
          <LibraryFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            filterLanguage={filterLanguage}
            setFilterLanguage={setFilterLanguage}
            filterCefrLevel={filterCefrLevel}
            setFilterCefrLevel={setFilterCefrLevel}
            filterGenre={filterGenre}
            setFilterGenre={setFilterGenre}
            filterReadingStatus={filterReadingStatus}
            setFilterReadingStatus={setFilterReadingStatus}
            filteredStoriesCount={filteredStories.length}
            storiesCount={stories.length}
          />

          {filteredStories.length === 0 ? (
            <div className="bg-tj-bg-card p-12 rounded-lg border border-tj-border-main text-center space-y-4 shadow-none">
              <SlidersHorizontal
                className="w-12 h-12 text-tj-text-muted/50 mx-auto"
                strokeWidth={1.5}
              />
              <div>
                <h4 className="text-tj-text-main font-serif font-extrabold text-base">
                  No Stories Match Your Filters
                </h4>
                <p className="text-xs text-tj-text-muted max-w-sm mx-auto mt-1 leading-relaxed">
                  We couldn't find any books with the active constraint
                  settings. Try relaxing your input terms or filters to browse
                  all other items!
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="py-2 px-4 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-semibold text-xs rounded cursor-pointer transition-colors"
              >
                Reset Advanced Filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-x-6 gap-y-8 justify-items-center">
                {paginatedStories.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    currentUser={currentUser}
                    onSelect={() => onSelectStory(story)}
                    onDelete={onDeleteStory}
                    isSaved={bookshelf.includes(story.id)}
                    onToggleSaved={onToggleSaved}
                    isCachedOffline={cachedStoryIds.includes(story.id)}
                    onDownload={
                      onDownloadStory
                        ? (e) => {
                            e.stopPropagation();
                            onDownloadStory(story);
                          }
                        : undefined
                    }
                    recentlyRead={recentlyRead}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-tj-border-main">
                  <span className="text-xs text-tj-text-muted">
                    Showing{' '}
                    <strong className="font-semibold text-tj-text-main">
                      {startIndex + 1}
                    </strong>{' '}
                    to{' '}
                    <strong className="font-semibold text-tj-text-main">
                      {Math.min(
                        startIndex + itemsPerPage,
                        filteredStories.length,
                      )}
                    </strong>{' '}
                    of{' '}
                    <strong className="font-semibold text-tj-text-main">
                      {filteredStories.length}
                    </strong>{' '}
                    stories
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Previous Page */}
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="p-2 rounded border border-tj-border-main hover:border-tj-text-muted bg-tj-bg-card text-tj-text-muted disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Page Numbers */}
                    {getPageNumbers().map((item) => {
                      if (item.type === 'dots') {
                        return (
                          <span
                            key={item.key}
                            className="min-w-[34px] h-[34px] flex items-center justify-center text-xs font-semibold text-tj-text-muted select-none"
                          >
                            {item.value}
                          </span>
                        );
                      }
                      return (
                        <button
                          type="button"
                          key={item.key}
                          onClick={() => setCurrentPage(item.value as number)}
                          className={`min-w-[34px] h-[34px] flex items-center justify-center text-xs font-semibold rounded transition cursor-pointer ${
                            currentPage === item.value
                              ? 'bg-tj-primary text-tj-bg-main border border-tj-primary shadow-none font-bold'
                              : 'border border-tj-border-main hover:border-tj-text-muted bg-tj-bg-card text-tj-text-muted'
                          }`}
                        >
                          {item.value}
                        </button>
                      );
                    })}

                    {/* Next Page */}
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="p-2 rounded border border-tj-border-main hover:border-tj-text-muted bg-tj-bg-card text-tj-text-muted disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
