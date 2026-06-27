import { RefreshCw } from 'lucide-react';
import type React from 'react';
import LibraryGrid from '../components/library/LibraryGrid';
import StreakDashboardCard from '../components/library/StreakDashboardCard';
import type { GenerationLimitData } from '../services/db';
import type { RecentlyReadItem, Story, UserStreakData } from '../types';
import type { SortBy } from '../utils/storyFilters';

interface BookshelfPageProps {
  streakData: UserStreakData | null;
  isPaid: boolean;
  generationLimitData: GenerationLimitData;
  currentUser: { uid: string; email: string | null } | null;
  handleSelectStory: (story: Story) => void;
  onDownloadStory?: (story: Story) => void;
  cachedStoryIds: string[];
  bookshelfStories: Story[];
  filteredBookshelfStories: Story[];
  bookshelf: string[];
  recentlyRead: RecentlyReadItem[];
  handleToggleBookshelf: (id: string) => void;
  handleDeleteStory: (
    storyId: string,
    e: React.MouseEvent | null,
    bypass?: boolean,
  ) => void;
  setActiveTab: (
    tab: 'browse' | 'bookshelf' | 'create' | 'practice' | 'admin',
  ) => void;
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
  onRefreshPrivateStories: () => Promise<void>;
  privateStoriesLoading: boolean;
}

export default function BookshelfPage({
  streakData,
  isPaid,
  generationLimitData,
  currentUser,
  handleSelectStory,
  onDownloadStory,
  cachedStoryIds,
  bookshelfStories,
  filteredBookshelfStories,
  bookshelf,
  recentlyRead,
  handleToggleBookshelf,
  handleDeleteStory,
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
  onRefreshPrivateStories,
  privateStoriesLoading,
}: BookshelfPageProps) {
  return (
    <div className="space-y-8">
      {/* Reading Streak Panel */}
      {currentUser && (
        <div id="streak-dashboard-section">
          <StreakDashboardCard streakData={streakData} />
        </div>
      )}

      {/* Refresh Private Stories Button */}
      {currentUser && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onRefreshPrivateStories}
            disabled={privateStoriesLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium
              text-tj-text-muted hover:text-tj-primary
              bg-tj-bg-card border border-tj-border-main
              rounded-xl transition-all duration-200
              hover:border-tj-primary-border hover:shadow-sm
              disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${privateStoriesLoading ? 'animate-spin' : ''}`}
            />
            {privateStoriesLoading ? 'Syncing…' : 'Refresh Private Stories'}
          </button>
        </div>
      )}

      <LibraryGrid
        cachedStoryIds={cachedStoryIds}
        isBookshelf={true}
        stories={bookshelfStories}
        filteredStories={filteredBookshelfStories}
        bookshelf={bookshelf}
        recentlyRead={recentlyRead}
        onToggleSaved={(id, e) => {
          e.stopPropagation();
          handleToggleBookshelf(id);
        }}
        onSelectStory={handleSelectStory}
        onDownloadStory={onDownloadStory}
        onDeleteStory={handleDeleteStory}
        setActiveTab={setActiveTab}
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
      />
    </div>
  );
}
