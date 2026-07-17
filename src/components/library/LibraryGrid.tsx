import {
  ChevronUp,
  HelpCircle,
  LayoutGrid,
  List,
  SlidersHorizontal,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import type { RecentlyReadItem, Story } from '../../types';
import type { SortBy } from '../../utils/storyFilters';
import LibraryFilters from './LibraryFilters';
import StoryCard from './StoryCard';
import StoryCondensedRow from './StoryCondensedRow';

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
  filterLanguage: string[];
  setFilterLanguage: (lang: string[]) => void;
  filterCefrLevel: string[];
  setFilterCefrLevel: (level: string[]) => void;
  filterGenre: string[];
  setFilterGenre: (genre: string[]) => void;
  filterReadingStatus: string[];
  setFilterReadingStatus: (status: string[]) => void;
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
  const [viewMode, setViewMode] = useState<'grid' | 'condensed'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('library_view_mode');
      return saved === 'condensed' ? 'condensed' : 'grid';
    }
    return 'grid';
  });

  const handleToggleViewMode = (mode: 'grid' | 'condensed') => {
    setViewMode(mode);
    localStorage.setItem('library_view_mode', mode);
  };

  useEffect(() => {
    const updateItemsPerPage = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      if (width >= 1280) {
        setItemsPerPage(12); // 3 columns * 4 rows = 12, or 4 columns * 3 rows = 12 (multiple of 3 to avoid blank spots)
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

  // Reset page when filters, sorting or view mode change
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
    viewMode,
  ]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterLanguage([]);
    setFilterCefrLevel([]);
    setFilterGenre([]);
    setFilterReadingStatus([]);
  };

  const itemsPerPageVal = viewMode === 'condensed' ? 15 : itemsPerPage;
  const paginatedStories = filteredStories.slice(
    0,
    currentPage * itemsPerPageVal,
  );
  const hasMore = currentPage * itemsPerPageVal < filteredStories.length;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          setTimeout(() => {
            setCurrentPage((prev) => prev + 1);
            setIsLoadingMore(false);
          }, 250);
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore]);

  useEffect(() => {
    const topSentinel = topSentinelRef.current;
    if (!topSentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        setShowBackToTop(!first.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(topSentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-tj-text-main font-sans tracking-tight">
            {isBookshelf ? 'My Bookshelf' : 'Library'}
          </h2>
          <p className="text-xs text-tj-text-muted">
            {isBookshelf
              ? 'Your personal collection of created and bookmarked graded readers.'
              : 'Graded books open for learning. Read instantly below.'}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-tj-bg-recessed p-0.5 rounded-xl border border-tj-border-main self-start sm:self-auto shadow-none shrink-0">
          <button
            type="button"
            onClick={() => handleToggleViewMode('grid')}
            className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-tj-bg-card text-tj-text-main shadow-xs border border-tj-border-main'
                : 'text-tj-text-muted hover:text-tj-text-main border border-transparent'
            }`}
            title="Grid View"
            aria-label="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleToggleViewMode('condensed')}
            className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              viewMode === 'condensed'
                ? 'bg-tj-bg-card text-tj-text-main shadow-xs border border-tj-border-main'
                : 'text-tj-text-muted hover:text-tj-text-main border border-transparent'
            }`}
            title="Condensed View"
            aria-label="Condensed View"
          >
            <List className="w-4 h-4" />
          </button>
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
            <div className="space-y-6 relative">
              <div
                ref={topSentinelRef}
                className="h-0 w-0 pointer-events-none absolute top-0"
              />

              {viewMode === 'condensed' ? (
                <div className="flex flex-col gap-2">
                  {paginatedStories.map((story, index) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: Math.min((index % itemsPerPageVal) * 0.03, 0.3),
                      }}
                    >
                      <StoryCondensedRow
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
                        className={index >= 12 ? 'story-row-deferred' : ''}
                      />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-x-6 gap-y-8 justify-items-center">
                  {paginatedStories.map((story, index) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.25,
                        delay: Math.min((index % itemsPerPageVal) * 0.04, 0.4),
                      }}
                      className="w-full flex justify-center"
                    >
                      <StoryCard
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
                        className={index >= 12 ? 'story-card-deferred' : ''}
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Scroll Sentinel for Infinite Loading */}
              <div
                ref={sentinelRef}
                className="h-4 w-full pointer-events-none"
              />

              {/* Progress & Loading State Indicators */}
              <div className="flex flex-col items-center justify-center gap-3 pt-8 border-t border-tj-border-main text-xs text-tj-text-muted">
                <span>
                  Showing{' '}
                  <strong className="font-semibold text-tj-text-main">
                    {Math.min(
                      currentPage * itemsPerPageVal,
                      filteredStories.length,
                    )}
                  </strong>{' '}
                  of{' '}
                  <strong className="font-semibold text-tj-text-main">
                    {filteredStories.length}
                  </strong>{' '}
                  stories
                </span>

                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-tj-primary py-2 font-medium">
                    <span className="w-1.5 h-1.5 bg-tj-primary rounded-full animate-ping" />
                    <span>Loading more…</span>
                  </div>
                )}

                {!hasMore && filteredStories.length > 0 && (
                  <span className="text-tj-text-muted/60 mt-1">
                    You've reached the end of the library.
                  </span>
                )}
              </div>

              {/* Back to Top Floating Action Button */}
              <AnimatePresence>
                {showBackToTop && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    onClick={() =>
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }
                    className="fixed bottom-6 right-6 p-3 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main rounded-xl shadow-lg cursor-pointer transition-all duration-200 z-40 border border-tj-primary-border flex items-center justify-center"
                    aria-label="Back to top"
                    title="Back to top"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  );
}
