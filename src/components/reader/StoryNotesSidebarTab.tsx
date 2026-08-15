import {
  Check,
  ChevronRight,
  Copy,
  Download,
  Filter,
  Highlighter,
  MessageSquare,
  Search,
  Trash2,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { HighlightColor, Story, StoryHighlight } from '../../types';
import { HIGHLIGHT_COLORS } from './HighlightToolbar';

interface StoryNotesSidebarTabProps {
  story: Story;
  highlights: StoryHighlight[];
  activeChapterIndex: number;
  onSelectChapter: (index: number) => void;
  onJumpToHighlight: (highlight: StoryHighlight) => void;
  onDeleteHighlight: (id: string) => void;
  isLoggedIn: boolean;
}

export default function StoryNotesSidebarTab({
  story,
  highlights,
  activeChapterIndex,
  onSelectChapter,
  onJumpToHighlight,
  onDeleteHighlight,
  isLoggedIn,
}: StoryNotesSidebarTabProps) {
  const [filterChapterOnly, setFilterChapterOnly] = useState<boolean>(false);
  const [filterNotesOnly, setFilterNotesOnly] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<HighlightColor | 'all'>(
    'all',
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  const filteredHighlights = useMemo(() => {
    return highlights.filter((h) => {
      if (filterChapterOnly && h.chapterIndex !== activeChapterIndex) {
        return false;
      }
      if (filterNotesOnly && (!h.note || h.note.trim() === '')) {
        return false;
      }
      if (selectedColor !== 'all' && h.color !== selectedColor) {
        return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchesText = h.text.toLowerCase().includes(q);
        const matchesNote = h.note?.toLowerCase().includes(q);
        if (!matchesText && !matchesNote) {
          return false;
        }
      }
      return true;
    });
  }, [
    highlights,
    filterChapterOnly,
    activeChapterIndex,
    filterNotesOnly,
    selectedColor,
    searchQuery,
  ]);

  const handleExportAllMarkdown = () => {
    if (highlights.length === 0) return;

    let md = `# Notes & Highlights: ${story.title}\n\n`;
    const groupedByChapter: Record<number, StoryHighlight[]> = {};
    for (const h of highlights) {
      if (!groupedByChapter[h.chapterIndex]) {
        groupedByChapter[h.chapterIndex] = [];
      }
      groupedByChapter[h.chapterIndex].push(h);
    }

    const chapterIndices = Object.keys(groupedByChapter)
      .map(Number)
      .sort((a, b) => a - b);

    for (const chIdx of chapterIndices) {
      const rawTitle = story.chapters?.[chIdx]?.title?.trim() || '';
      const chNum = chIdx + 1;
      const isGeneric =
        !rawTitle ||
        /^chapter\s*\d+$/i.test(rawTitle) ||
        rawTitle.toLowerCase() === `chapter ${chNum}`.toLowerCase();
      const chapterHeading = isGeneric
        ? `Chapter ${chNum}`
        : `Chapter ${chNum}: ${rawTitle}`;

      md += `## ${chapterHeading}\n\n`;
      for (const h of groupedByChapter[chIdx]) {
        md += `> “${h.text}”\n`;
        if (h.note?.trim()) {
          md += `\n**Note**: ${h.note}\n`;
        }
        md += '\n---\n\n';
      }
    }

    navigator.clipboard.writeText(md);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const getColorConfig = (color: HighlightColor) => {
    return HIGHLIGHT_COLORS.find((c) => c.id === color) || HIGHLIGHT_COLORS[0];
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* GUEST BANNER */}
      {!isLoggedIn && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs text-amber-800 dark:text-amber-300">
          <p className="font-semibold mb-0.5">Sign in to save notes</p>
          <p className="text-amber-700/80 dark:text-amber-400/80">
            Sign in to your account to save highlights and personal study notes
            across all your devices.
          </p>
        </div>
      )}

      {/* FILTER CONTROLS & SEARCH */}
      <div className="space-y-2.5">
        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search highlights or notes..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-tj-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setFilterChapterOnly((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer border ${
              filterChapterOnly
                ? 'bg-tj-primary-light border-tj-primary-border text-tj-primary dark:bg-slate-800 dark:border-tj-primary-border'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            Ch. {activeChapterIndex + 1} only
          </button>

          <button
            type="button"
            onClick={() => setFilterNotesOnly((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer border flex items-center gap-1 ${
              filterNotesOnly
                ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            Notes only
          </button>

          {/* COLOR FILTER DOTS */}
          <div className="flex items-center gap-1 ml-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setSelectedColor('all')}
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition ${
                selectedColor === 'all'
                  ? 'bg-white dark:bg-slate-700 shadow-xs text-slate-800 dark:text-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All
            </button>
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedColor(c.id)}
                className={`w-3.5 h-3.5 rounded-full border ${c.dotClass} cursor-pointer transition ${
                  selectedColor === c.id
                    ? 'ring-2 ring-tj-primary ring-offset-1 dark:ring-offset-slate-800 scale-110'
                    : 'opacity-70 hover:opacity-100'
                }`}
                title={`Filter ${c.label}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* HEADER ACTIONS: Export All */}
      {highlights.length > 0 && (
        <div className="flex items-center justify-between px-1 text-xs text-slate-500">
          <span>
            {filteredHighlights.length}{' '}
            {filteredHighlights.length === 1 ? 'item' : 'items'}
          </span>
          <button
            type="button"
            onClick={handleExportAllMarkdown}
            className="flex items-center gap-1 text-tj-primary hover:text-tj-primary-hover font-semibold transition cursor-pointer"
            title="Copy all notes formatted in Markdown"
          >
            {copiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">
                  Copied!
                </span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Export Markdown</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* HIGHLIGHTS & NOTES LIST */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 -mr-1">
        {filteredHighlights.length === 0 ? (
          <div className="py-10 px-4 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <Highlighter className="w-8 h-8 mx-auto opacity-40 text-tj-primary" />
            <p className="text-xs font-medium">
              {highlights.length === 0
                ? 'No highlights or notes yet'
                : 'No matching items'}
            </p>
            <p className="text-[11px] max-w-[200px] mx-auto text-slate-400">
              {highlights.length === 0
                ? 'Select any text in the reader to highlight phrases and write study notes.'
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          filteredHighlights.map((h) => {
            const colorConf = getColorConfig(h.color);
            const isCurrentChapter = h.chapterIndex === activeChapterIndex;
            return (
              <div
                key={h.id}
                className={`group p-3 rounded-xl border transition-all text-xs space-y-2 bg-white dark:bg-slate-900 hover:shadow-sm ${
                  isCurrentChapter
                    ? 'border-slate-200 dark:border-slate-800'
                    : 'border-slate-100 dark:border-slate-800/60 opacity-90'
                }`}
              >
                {/* TOP META ROW */}
                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (h.chapterIndex !== activeChapterIndex) {
                        onSelectChapter(h.chapterIndex);
                      }
                      setTimeout(() => onJumpToHighlight(h), 100);
                    }}
                    className="flex items-center gap-1.5 text-tj-primary hover:underline font-semibold cursor-pointer"
                  >
                    <span
                      className={`w-2 h-2 rounded-full border ${colorConf.dotClass}`}
                    />
                    <span>Chapter {h.chapterIndex + 1}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => h.id && onDeleteHighlight(h.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer"
                    title="Delete highlight"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* QUOTE TEXT */}
                {/* biome-ignore lint/a11y/noStaticElementInteractions: jump to highlight on click */}
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: jump to highlight on click */}
                <div
                  onClick={() => {
                    if (h.chapterIndex !== activeChapterIndex) {
                      onSelectChapter(h.chapterIndex);
                    }
                    setTimeout(() => onJumpToHighlight(h), 100);
                  }}
                  className={`p-2.5 rounded-xl border border-l-4 cursor-pointer font-serif text-[12.5px] leading-relaxed select-text transition-all ${colorConf.bgClass} ${colorConf.borderClass}`}
                >
                  “{h.text}”
                </div>

                {/* ATTACHED NOTE */}
                {h.note?.trim() && (
                  <div className="flex items-start gap-1.5 p-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-sans text-xs">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="whitespace-pre-wrap leading-relaxed flex-1">
                      {h.note}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
