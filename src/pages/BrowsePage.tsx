import type React from 'react';
import LibraryGrid from '../components/library/LibraryGrid';
import RecentlyReadSection from '../components/library/RecentlyReadSection';
import type { RecentlyReadItem, Story } from '../types';
import type { SortBy } from '../utils/storyFilters';

interface BrowsePageProps {
  cachedStoryIds: string[];
  visibleStories: Story[];
  filteredStories: Story[];
  bookshelf: string[];
  recentlyReadStories: { story: Story; chapterIdx: number }[];
  recentlyRead: RecentlyReadItem[];
  handleToggleBookshelf: (id: string) => void;
  handleSelectStory: (story: Story) => void;
  onDownloadStory?: (story: Story) => void;
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
  filterStatus: string;
  setFilterStatus: (status: string) => void;
}

export default function BrowsePage({
  cachedStoryIds,
  visibleStories,
  filteredStories,
  bookshelf,
  recentlyReadStories,
  recentlyRead,
  handleToggleBookshelf,
  handleSelectStory,
  onDownloadStory,
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
  filterStatus,
  setFilterStatus,
}: BrowsePageProps) {
  return (
    <div className="space-y-8">
      <RecentlyReadSection
        items={recentlyReadStories}
        onSelectStory={handleSelectStory}
      />
      <LibraryGrid
        cachedStoryIds={cachedStoryIds}
        stories={visibleStories}
        filteredStories={filteredStories}
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
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
      />
    </div>
  );
}
