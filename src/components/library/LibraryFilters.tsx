import { ChevronDown, Search, X } from 'lucide-react';
import { CEFR_LEVELS, GENRES, SUPPORTED_LANGUAGES } from '../../types';
import type { SortBy } from '../../utils/storyFilters';

interface LibraryFiltersProps {
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
  filteredStoriesCount: number;
  storiesCount: number;
}

export default function LibraryFilters({
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
  filteredStoriesCount,
  storiesCount,
}: LibraryFiltersProps) {
  const isFiltering =
    searchQuery ||
    filterLanguage !== 'All' ||
    filterCefrLevel !== 'All' ||
    filterGenre !== 'All' ||
    filterStatus !== 'All';

  const handleReset = () => {
    setSearchQuery('');
    setFilterLanguage('All');
    setFilterCefrLevel('All');
    setFilterGenre('All');
    setFilterStatus('All');
  };

  return (
    <div className="flex flex-col gap-3 bg-tj-bg-recessed p-4 rounded-2xl border border-tj-border-main shadow-none">
      <div className="flex flex-col md:flex-row gap-3">
        {/* SEARCH INPUT */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tj-text-muted" />
          <input
            type="text"
            placeholder="Search CEFR Stories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-tj-bg-card/40 dark:bg-slate-900/20 border border-tj-border-main hover:border-slate-350 dark:hover:border-slate-700 text-tj-text-main placeholder-tj-text-muted/60 text-xs rounded-xl focus:border-tj-primary focus:ring-0 focus:outline-none transition-all duration-150 font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-tj-primary-light text-tj-text-muted hover:text-tj-text-main rounded-full cursor-pointer transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* SORT BY */}
        <div className="w-full md:w-48">
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2 bg-tj-bg-card/40 dark:bg-slate-900/20 border border-tj-border-main hover:border-slate-355 dark:hover:border-slate-700 text-tj-text-main text-xs rounded-xl outline-none focus:border-tj-primary focus:ring-0 cursor-pointer transition-colors font-sans"
            >
              <option value="newest" className="dark:bg-slate-900">
                Sort: Newest First
              </option>
              <option value="oldest" className="dark:bg-slate-900">
                Sort: Oldest First
              </option>
              <option value="popularity" className="dark:bg-slate-900">
                Sort: Popularity (Reads)
              </option>
              <option value="chapters" className="dark:bg-slate-900">
                Sort: Length (Chapters)
              </option>
              <option value="title" className="dark:bg-slate-900">
                Sort: Alphabetical (A-Z)
              </option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tj-text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      {/* SELECT FILTERS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 border-t border-tj-border-main pt-3">
        {/* Language */}
        <div className="relative">
          <select
            value={filterLanguage}
            onChange={(e) => setFilterLanguage(e.target.value)}
            className="w-full appearance-none pl-3 pr-8 py-2 bg-tj-bg-card/40 dark:bg-slate-900/20 border border-tj-border-main hover:border-slate-355 dark:hover:border-slate-700 text-tj-text-main text-[11px] font-medium rounded-xl outline-none focus:border-tj-primary focus:ring-0 cursor-pointer transition-colors font-sans"
          >
            <option value="All" className="dark:bg-slate-900">
              All Languages
            </option>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option
                key={lang.name}
                value={lang.name}
                className="dark:bg-slate-900"
              >
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tj-text-muted pointer-events-none" />
        </div>

        {/* CEFR Level */}
        <div className="relative">
          <select
            value={filterCefrLevel}
            onChange={(e) => setFilterCefrLevel(e.target.value)}
            className="w-full appearance-none pl-3 pr-8 py-2 bg-tj-bg-card/40 dark:bg-slate-900/20 border border-tj-border-main hover:border-slate-355 dark:hover:border-slate-700 text-tj-text-main text-[11px] font-medium rounded-xl outline-none focus:border-tj-primary focus:ring-0 cursor-pointer transition-colors font-sans"
          >
            <option value="All" className="dark:bg-slate-900">
              All CEFR Levels
            </option>
            {CEFR_LEVELS.map((level) => (
              <option
                key={level.code}
                value={level.code}
                className="dark:bg-slate-900"
              >
                CEFR {level.code} ({level.name.split(' - ')[1]})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tj-text-muted pointer-events-none" />
        </div>

        {/* Genre/Theme */}
        <div className="relative">
          <select
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
            className="w-full appearance-none pl-3 pr-8 py-2 bg-tj-bg-card/40 dark:bg-slate-900/20 border border-tj-border-main hover:border-slate-355 dark:hover:border-slate-700 text-tj-text-main text-[11px] font-medium rounded-xl outline-none focus:border-tj-primary focus:ring-0 cursor-pointer transition-colors font-sans"
          >
            <option value="All" className="dark:bg-slate-900">
              All Genres/Themes
            </option>
            {GENRES.map((g) => (
              <option key={g.id} value={g.id} className="dark:bg-slate-900">
                {g.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tj-text-muted pointer-events-none" />
        </div>

        {/* Progress Status */}
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full appearance-none pl-3 pr-8 py-2 bg-tj-bg-card/40 dark:bg-slate-900/20 border border-tj-border-main hover:border-slate-355 dark:hover:border-slate-700 text-tj-text-main text-[11px] font-medium rounded-xl outline-none focus:border-tj-primary focus:ring-0 cursor-pointer transition-colors font-sans"
          >
            <option value="All" className="dark:bg-slate-900">
              All Statuses
            </option>
            <option value="Completed" className="dark:bg-slate-900">
              Completed Books
            </option>
            <option value="In-Progress" className="dark:bg-slate-900">
              In Progress
            </option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tj-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Active filter counter summary */}
      {isFiltering && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-tj-bg-card p-2 px-3 rounded-xl border border-tj-border-main transition">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-tj-primary animate-pulse shrink-0"></span>
            <span className="text-[10px] font-bold text-tj-text-main uppercase tracking-wider font-mono">
              Filtering Active: {filteredStoriesCount} of {storiesCount} stories
              matched
            </span>
          </div>
          <button
            onClick={handleReset}
            className="text-[10px] hover:text-tj-primary text-tj-text-muted transition-colors cursor-pointer font-bold flex items-center gap-1 bg-transparent border-0"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      )}
    </div>
  );
}
