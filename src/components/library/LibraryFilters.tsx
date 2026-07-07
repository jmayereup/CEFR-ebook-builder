import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { CEFR_LEVELS, GENRES, SUPPORTED_LANGUAGES } from '../../types';
import type { SortBy } from '../../utils/storyFilters';

interface LibraryFiltersProps {
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
  filterReadingStatus,
  setFilterReadingStatus,
  filteredStoriesCount,
  storiesCount,
}: LibraryFiltersProps) {
  const [openDropdown, setOpenDropdown] = useState<'language' | 'cefr' | 'genre' | 'status' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isFiltering =
    searchQuery ||
    filterLanguage.length > 0 ||
    filterCefrLevel.length > 0 ||
    filterGenre.length > 0 ||
    filterReadingStatus.length > 0;

  const handleReset = () => {
    setSearchQuery('');
    setFilterLanguage([]);
    setFilterCefrLevel([]);
    setFilterGenre([]);
    setFilterReadingStatus([]);
  };

  const toggleLanguage = (langName: string) => {
    if (filterLanguage.includes(langName)) {
      setFilterLanguage(filterLanguage.filter((lang) => lang !== langName));
    } else {
      setFilterLanguage([...filterLanguage, langName]);
    }
  };

  const toggleCefrLevel = (levelCode: string) => {
    if (filterCefrLevel.includes(levelCode)) {
      setFilterCefrLevel(filterCefrLevel.filter((level) => level !== levelCode));
    } else {
      setFilterCefrLevel([...filterCefrLevel, levelCode]);
    }
  };

  const toggleGenre = (genreId: string) => {
    if (filterGenre.includes(genreId)) {
      setFilterGenre(filterGenre.filter((genre) => genre !== genreId));
    } else {
      setFilterGenre([...filterGenre, genreId]);
    }
  };

  const toggleReadingStatus = (status: string) => {
    if (filterReadingStatus.includes(status)) {
      setFilterReadingStatus(filterReadingStatus.filter((s) => s !== status));
    } else {
      setFilterReadingStatus([...filterReadingStatus, status]);
    }
  };

  const getLanguageLabel = () => {
    if (filterLanguage.length === 0) return 'All Languages';
    if (filterLanguage.length === 1) {
      const lang = SUPPORTED_LANGUAGES.find((l) => l.name === filterLanguage[0]);
      return `${lang?.flag || ''} ${filterLanguage[0]}`;
    }
    return `Languages (${filterLanguage.length})`;
  };

  const getCefrLabel = () => {
    if (filterCefrLevel.length === 0) return 'All CEFR Levels';
    if (filterCefrLevel.length === 1) return `CEFR ${filterCefrLevel[0]}`;
    return `CEFR Levels (${filterCefrLevel.length})`;
  };

  const getGenreLabel = () => {
    if (filterGenre.length === 0) return 'All Genres/Themes';
    if (filterGenre.length === 1) {
      const g = GENRES.find((genre) => genre.id === filterGenre[0]);
      return g ? g.label : filterGenre[0];
    }
    return `Genres (${filterGenre.length})`;
  };

  const getReadingStatusLabel = () => {
    if (filterReadingStatus.length === 0) return 'All Reading Statuses';
    if (filterReadingStatus.length === 1) {
      return filterReadingStatus[0] === 'In-Progress'
        ? 'Reading In-Progress'
        : filterReadingStatus[0] === 'Completed'
          ? 'Completed Reading'
          : filterReadingStatus[0];
    }
    return `Statuses (${filterReadingStatus.length})`;
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
            className="w-full pl-9 pr-9 py-2 bg-tj-bg-card/40 dark:bg-slate-900/20 border border-tj-border-main hover:border-slate-355 dark:hover:border-slate-700 text-tj-text-main placeholder-tj-text-muted/60 text-xs rounded-xl focus:border-tj-primary focus:ring-0 focus:outline-none transition-all duration-150 font-sans"
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
      <div
        ref={containerRef}
        className="grid grid-cols-2 md:grid-cols-4 gap-2.5 border-t border-tj-border-main pt-3"
      >
        {/* Language */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'language' ? null : 'language')}
            className="w-full flex items-center justify-between pl-3 pr-3 py-2 bg-tj-bg-card/40 dark:bg-slate-900/20 border border-tj-border-main hover:border-slate-355 dark:hover:border-slate-700 text-tj-text-main text-[11px] font-medium rounded-xl outline-none focus:border-tj-primary focus:ring-0 cursor-pointer transition-colors font-sans text-left"
          >
            <span className="truncate">{getLanguageLabel()}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-tj-text-muted pointer-events-none transition-transform duration-200 ${
                openDropdown === 'language' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {openDropdown === 'language' && (
            <div className="absolute left-0 right-0 mt-1.5 bg-tj-bg-card border border-tj-border-main rounded-2xl shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setFilterLanguage([])}
                className="w-full text-left px-3 py-1.5 text-[11px] text-tj-text-muted hover:text-tj-text-main hover:bg-tj-primary-light font-semibold border-b border-tj-border-main transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>All Languages</span>
                {filterLanguage.length > 0 && (
                  <span className="text-[10px] font-bold text-tj-primary">Clear</span>
                )}
              </button>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = filterLanguage.includes(lang.name);
                return (
                  <button
                    type="button"
                    key={lang.name}
                    onClick={() => toggleLanguage(lang.name)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-tj-text-main hover:bg-tj-primary-light transition-colors text-left cursor-pointer"
                  >
                    <span className="truncate">
                      {lang.flag} {lang.name}
                    </span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded border-tj-border-main text-tj-primary focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-tj-primary"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CEFR Level */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'cefr' ? null : 'cefr')}
            className="w-full flex items-center justify-between pl-3 pr-3 py-2 bg-tj-bg-card/40 dark:bg-slate-900/20 border border-tj-border-main hover:border-slate-355 dark:hover:border-slate-700 text-tj-text-main text-[11px] font-medium rounded-xl outline-none focus:border-tj-primary focus:ring-0 cursor-pointer transition-colors font-sans text-left"
          >
            <span className="truncate">{getCefrLabel()}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-tj-text-muted pointer-events-none transition-transform duration-200 ${
                openDropdown === 'cefr' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {openDropdown === 'cefr' && (
            <div className="absolute left-0 right-0 mt-1.5 bg-tj-bg-card border border-tj-border-main rounded-2xl shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setFilterCefrLevel([])}
                className="w-full text-left px-3 py-1.5 text-[11px] text-tj-text-muted hover:text-tj-text-main hover:bg-tj-primary-light font-semibold border-b border-tj-border-main transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>All CEFR Levels</span>
                {filterCefrLevel.length > 0 && (
                  <span className="text-[10px] font-bold text-tj-primary">Clear</span>
                )}
              </button>
              {CEFR_LEVELS.map((level) => {
                const isSelected = filterCefrLevel.includes(level.code);
                return (
                  <button
                    type="button"
                    key={level.code}
                    onClick={() => toggleCefrLevel(level.code)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-tj-text-main hover:bg-tj-primary-light transition-colors text-left cursor-pointer"
                  >
                    <span className="truncate" title={level.description}>
                      CEFR {level.code}
                    </span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded border-tj-border-main text-tj-primary focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-tj-primary"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Genre/Theme */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'genre' ? null : 'genre')}
            className="w-full flex items-center justify-between pl-3 pr-3 py-2 bg-tj-bg-card/40 dark:bg-slate-900/20 border border-tj-border-main hover:border-slate-355 dark:hover:border-slate-700 text-tj-text-main text-[11px] font-medium rounded-xl outline-none focus:border-tj-primary focus:ring-0 cursor-pointer transition-colors font-sans text-left"
          >
            <span className="truncate">{getGenreLabel()}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-tj-text-muted pointer-events-none transition-transform duration-200 ${
                openDropdown === 'genre' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {openDropdown === 'genre' && (
            <div className="absolute left-0 right-0 mt-1.5 bg-tj-bg-card border border-tj-border-main rounded-2xl shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setFilterGenre([])}
                className="w-full text-left px-3 py-1.5 text-[11px] text-tj-text-muted hover:text-tj-text-main hover:bg-tj-primary-light font-semibold border-b border-tj-border-main transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>All Genres/Themes</span>
                {filterGenre.length > 0 && (
                  <span className="text-[10px] font-bold text-tj-primary">Clear</span>
                )}
              </button>
              {GENRES.map((g) => {
                const isSelected = filterGenre.includes(g.id);
                return (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => toggleGenre(g.id)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-tj-text-main hover:bg-tj-primary-light transition-colors text-left cursor-pointer"
                  >
                    <span className="truncate">{g.label}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded border-tj-border-main text-tj-primary focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-tj-primary"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Reading Status */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
            className="w-full flex items-center justify-between pl-3 pr-3 py-2 bg-tj-bg-card/40 dark:bg-slate-900/20 border border-tj-border-main hover:border-slate-355 dark:hover:border-slate-700 text-tj-text-main text-[11px] font-medium rounded-xl outline-none focus:border-tj-primary focus:ring-0 cursor-pointer transition-colors font-sans text-left"
          >
            <span className="truncate">{getReadingStatusLabel()}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-tj-text-muted pointer-events-none transition-transform duration-200 ${
                openDropdown === 'status' ? 'rotate-180' : ''
              }`}
            />
          </button>
          {openDropdown === 'status' && (
            <div className="absolute left-0 right-0 mt-1.5 bg-tj-bg-card border border-tj-border-main rounded-2xl shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setFilterReadingStatus([])}
                className="w-full text-left px-3 py-1.5 text-[11px] text-tj-text-muted hover:text-tj-text-main hover:bg-tj-primary-light font-semibold border-b border-tj-border-main transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>All Statuses</span>
                {filterReadingStatus.length > 0 && (
                  <span className="text-[10px] font-bold text-tj-primary">Clear</span>
                )}
              </button>
              {['Unread', 'In-Progress', 'Completed'].map((status) => {
                const isSelected = filterReadingStatus.includes(status);
                return (
                  <button
                    type="button"
                    key={status}
                    onClick={() => toggleReadingStatus(status)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-tj-text-main hover:bg-tj-primary-light transition-colors text-left cursor-pointer"
                  >
                    <span className="truncate">
                      {status === 'In-Progress'
                        ? 'Reading In-Progress'
                        : status === 'Completed'
                          ? 'Completed Reading'
                          : status}
                    </span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded border-tj-border-main text-tj-primary focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-tj-primary"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active filter counter summary */}
      {isFiltering && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-tj-bg-card p-2 px-3 rounded-xl border border-tj-border-main transition">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-tj-primary animate-pulse shrink-0"></span>
            <span className="text-[10px] font-bold text-tj-text-main uppercase tracking-wider font-mono">
              Filtering Active: {filteredStoriesCount} of {storiesCount} stories matched
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
