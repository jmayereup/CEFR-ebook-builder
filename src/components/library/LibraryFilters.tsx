import { BookOpen, ChevronDown, Search, Tag, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CEFR_LEVELS, GENRES, SUPPORTED_LANGUAGES } from '../../types';
import type { SortBy } from '../../utils/storyFilters';

const getCefrBadgeStyle = (level: string) => {
  const lvl = level.toUpperCase();
  if (lvl.startsWith('A') || lvl.includes('PRE')) {
    return 'bg-[#d3e8d5] text-[#1b1c19] border-[#b8ccba]/40';
  }
  if (lvl.startsWith('B')) {
    return 'bg-[#d2e3f0] text-[#1b1c19] border-[#a2b8cc]/40';
  }
  return 'bg-[#ffdbcf] text-[#1b1c19] border-[#f8b7a2]/40';
};

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
  const [openDropdown, setOpenDropdown] = useState<'genre' | 'status' | null>(
    null,
  );
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const DEFAULT_LANG_CODES: readonly string[] = ['en', 'fr', 'es', 'th'];

  const orderedLanguages = (() => {
    const defaultLangs: typeof SUPPORTED_LANGUAGES = [];
    const otherLangs: typeof SUPPORTED_LANGUAGES = [];
    const byCode = new Map(SUPPORTED_LANGUAGES.map((l) => [l.code, l]));
    DEFAULT_LANG_CODES.forEach((code) => {
      const lang = byCode.get(code);
      if (lang) {
        defaultLangs.push(lang);
        byCode.delete(code);
      }
    });
    for (const lang of byCode.values()) {
      otherLangs.push(lang);
    }
    return [...defaultLangs, ...otherLangs];
  })();

  const defaultSet = new Set(DEFAULT_LANG_CODES);
  const hasNonDefaultSelection = filterLanguage.some(
    (name) =>
      !defaultSet.has(
        SUPPORTED_LANGUAGES.find((l) => l.name === name)?.code ?? '',
      ),
  );
  const showAll = showAllLanguages || hasNonDefaultSelection;
  const visibleLanguages = showAll
    ? orderedLanguages
    : orderedLanguages.filter((l) => defaultSet.has(l.code));

  const isLanguageActive = filterLanguage.length > 0;
  const isCefrActive = filterCefrLevel.length > 0;
  const isGenreActive = filterGenre.length > 0;
  const isStatusActive = filterReadingStatus.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
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
      setFilterCefrLevel(
        filterCefrLevel.filter((level) => level !== levelCode),
      );
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

  const clearLanguages = () => setFilterLanguage([]);
  const clearCefrLevels = () => setFilterCefrLevel([]);

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
              type="button"
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
              onChange={(e) => setSortBy(e.target.value as SortBy)}
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

      {/* VISUAL QUICK FILTERS: Language & CEFR Level */}
      <div className="flex flex-col gap-3 border-t border-tj-border-main pt-3">
        {/* Language Quick Filters */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-tj-text-muted/80 uppercase tracking-wider font-sans">
              Language
            </span>
            {isLanguageActive && (
              <button
                type="button"
                onClick={clearLanguages}
                className="text-[10px] font-bold text-tj-primary hover:underline cursor-pointer flex items-center gap-0.5 bg-transparent border-0 p-0"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {visibleLanguages.map((lang) => {
              const isSelected = filterLanguage.includes(lang.name);
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => toggleLanguage(lang.name)}
                  className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'border-tj-primary bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover ring-2 ring-tj-primary/20'
                      : 'border-tj-border-main hover:border-tj-primary/40 bg-tj-bg-card text-tj-text-main'
                  }`}
                >
                  <span className="text-base sm:text-lg mb-0.5 leading-none">
                    {lang.flag}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-semibold truncate w-full">
                    {lang.name}
                  </span>
                  <span
                    className={`text-[8px] sm:text-[9px] truncate w-full hidden sm:block ${isSelected ? 'text-tj-primary/80' : 'text-tj-text-muted'}`}
                  >
                    {lang.nativeName}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setShowAllLanguages((prev) => !prev)}
            className="w-full py-1.5 px-3 rounded-xl border border-dashed border-tj-border-main text-[11px] font-semibold text-tj-text-muted hover:text-tj-primary hover:border-tj-primary/50 transition-all cursor-pointer text-center bg-transparent"
          >
            {showAll
              ? 'Show Less'
              : `Show More Languages (${orderedLanguages.length - DEFAULT_LANG_CODES.length})`}
          </button>
        </div>

        {/* CEFR Level Quick Filters */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-tj-text-muted/80 uppercase tracking-wider font-sans">
              CEFR Level (Difficulty)
            </span>
            {isCefrActive && (
              <button
                type="button"
                onClick={clearCefrLevels}
                className="text-[10px] font-bold text-tj-primary hover:underline cursor-pointer flex items-center gap-0.5 bg-transparent border-0 p-0"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {CEFR_LEVELS.map((level) => {
              const isSelected = filterCefrLevel.includes(level.code);
              return (
                <button
                  key={level.code}
                  type="button"
                  onClick={() => toggleCefrLevel(level.code)}
                  title={level.description}
                  className={`px-1 py-2 sm:p-2.5 border rounded-xl text-center transition-all duration-200 flex items-center justify-center cursor-pointer font-mono font-bold text-[11px] sm:text-sm tracking-wide ${
                    isSelected
                      ? `${getCefrBadgeStyle(level.code)} border-tj-primary ring-2 ring-tj-primary/20`
                      : 'border-tj-border-main hover:border-tj-primary/40 bg-tj-bg-card text-tj-text-main'
                  }`}
                >
                  {level.code}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECONDARY FILTERS: Genre & Reading Status */}
      <div
        ref={containerRef}
        className="grid grid-cols-1 md:grid-cols-2 gap-2.5 border-t border-tj-border-main pt-3"
      >
        {/* Genre/Theme */}
        <div className="flex flex-col gap-1.5 relative">
          <span className="text-[10px] font-bold text-tj-text-muted/80 uppercase tracking-wider block font-sans">
            Genre / Theme
          </span>
          <button
            type="button"
            onClick={() =>
              setOpenDropdown(openDropdown === 'genre' ? null : 'genre')
            }
            className={`w-full flex items-center justify-between pl-3 pr-3 py-2 border rounded-xl outline-none focus:border-tj-primary focus:ring-0 cursor-pointer transition-all duration-150 font-sans text-left text-[11px] ${
              isGenreActive
                ? 'bg-tj-primary-light dark:bg-tj-primary-light/10 border-tj-primary text-tj-primary font-bold shadow-xs'
                : 'bg-tj-bg-card/60 dark:bg-slate-900/20 border-tj-border-main hover:border-tj-primary/30 text-tj-text-main font-medium'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Tag
                className={`w-3.5 h-3.5 shrink-0 ${isGenreActive ? 'text-tj-primary' : 'text-tj-text-muted/70'}`}
              />
              <span className="truncate">{getGenreLabel()}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              {isGenreActive && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-tj-primary px-1 text-[9px] font-bold text-tj-bg-main">
                  {filterGenre.length}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-tj-text-muted pointer-events-none transition-transform duration-200 ${
                  openDropdown === 'genre' ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>
          {openDropdown === 'genre' && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-tj-bg-card border border-tj-border-main rounded-2xl shadow-xl py-1.5 max-h-60 overflow-y-auto flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setFilterGenre([])}
                className="w-full text-left px-3 py-1.5 text-[11px] text-tj-text-muted hover:text-tj-text-main hover:bg-tj-primary-light font-semibold border-b border-tj-border-main transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>All Genres/Themes</span>
                {filterGenre.length > 0 && (
                  <span className="text-[10px] font-bold text-tj-primary">
                    Clear
                  </span>
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
        <div className="flex flex-col gap-1.5 relative">
          <span className="text-[10px] font-bold text-tj-text-muted/80 uppercase tracking-wider block font-sans">
            Reading Status
          </span>
          <button
            type="button"
            onClick={() =>
              setOpenDropdown(openDropdown === 'status' ? null : 'status')
            }
            className={`w-full flex items-center justify-between pl-3 pr-3 py-2 border rounded-xl outline-none focus:border-tj-primary focus:ring-0 cursor-pointer transition-all duration-150 font-sans text-left text-[11px] ${
              isStatusActive
                ? 'bg-tj-primary-light dark:bg-tj-primary-light/10 border-tj-primary text-tj-primary font-bold shadow-xs'
                : 'bg-tj-bg-card/60 dark:bg-slate-900/20 border-tj-border-main hover:border-tj-primary/30 text-tj-text-main font-medium'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <BookOpen
                className={`w-3.5 h-3.5 shrink-0 ${isStatusActive ? 'text-tj-primary' : 'text-tj-text-muted/70'}`}
              />
              <span className="truncate">{getReadingStatusLabel()}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-1">
              {isStatusActive && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-tj-primary px-1 text-[9px] font-bold text-tj-bg-main">
                  {filterReadingStatus.length}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-tj-text-muted pointer-events-none transition-transform duration-200 ${
                  openDropdown === 'status' ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>
          {openDropdown === 'status' && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-tj-bg-card border border-tj-border-main rounded-2xl shadow-xl py-1.5 max-h-60 overflow-y-auto flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setFilterReadingStatus([])}
                className="w-full text-left px-3 py-1.5 text-[11px] text-tj-text-muted hover:text-tj-text-main hover:bg-tj-primary-light font-semibold border-b border-tj-border-main transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>All Statuses</span>
                {filterReadingStatus.length > 0 && (
                  <span className="text-[10px] font-bold text-tj-primary">
                    Clear
                  </span>
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
              Filtering Active: {filteredStoriesCount} of {storiesCount} stories
              matched
            </span>
          </div>
          <button
            type="button"
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
