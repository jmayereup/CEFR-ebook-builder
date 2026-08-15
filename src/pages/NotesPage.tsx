import {
  ArrowUpRight,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  Download,
  Edit3,
  Highlighter,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { HIGHLIGHT_COLORS } from '../components/reader/HighlightToolbar';
import {
  deleteStoryHighlight,
  fetchAllUserHighlights,
  updateStoryHighlight,
} from '../services/db';
import type { IUser } from '../services/types';
import type { HighlightColor, Story, StoryHighlight } from '../types';

interface NotesPageProps {
  currentUser: IUser | null;
  stories: Story[];
  onSelectStory: (
    story: Story,
    overrideChapterIdx?: number,
    targetParagraphIdx?: number,
  ) => void;
  setActiveTab: (
    tab: 'browse' | 'bookshelf' | 'notes' | 'create' | 'practice' | 'admin' | 'about',
  ) => void;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
}

type SortOption = 'newest' | 'oldest' | 'book' | 'color';

export default function NotesPage({
  currentUser,
  stories,
  onSelectStory,
  setActiveTab,
  onOpenAuth,
}: NotesPageProps) {
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBookId, setSelectedBookId] = useState<string>('all');
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [onlyNotes, setOnlyNotes] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Editing state
  const [editingHighlightId, setEditingHighlightId] = useState<string | null>(
    null,
  );
  const [editingNoteText, setEditingNoteText] = useState<string>('');
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  // Copy feedback state
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [copiedHighlightId, setCopiedHighlightId] = useState<string | null>(
    null,
  );

  // Load all highlights on mount or when user changes
  const loadHighlights = async () => {
    if (!currentUser) {
      setHighlights([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchAllUserHighlights(currentUser.uid);
      setHighlights(data);
    } catch (err) {
      console.error('Failed to load user highlights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHighlights();
  }, [currentUser]);

  // Story lookup map for fast details retrieval
  const storyMap = useMemo(() => {
    const map = new Map<string, Story>();
    for (const s of stories) {
      map.set(s.id, s);
    }
    return map;
  }, [stories]);

  // List of unique books represented in the user's highlights
  const annotatedBooks = useMemo(() => {
    const bookIds = new Set<string>();
    for (const h of highlights) {
      bookIds.add(h.story);
    }
    return Array.from(bookIds).map((id) => {
      const story = storyMap.get(id);
      return {
        id,
        title: story?.title || `Book (${id.substring(0, 8)})`,
        count: highlights.filter((h) => h.story === id).length,
      };
    });
  }, [highlights, storyMap]);

  // Filtered and sorted highlights
  const filteredHighlights = useMemo(() => {
    let result = highlights.filter((h) => {
      // Filter by book
      if (selectedBookId !== 'all' && h.story !== selectedBookId) {
        return false;
      }
      // Filter by color
      if (selectedColor !== 'all' && h.color !== selectedColor) {
        return false;
      }
      // Filter by notes only
      if (onlyNotes && (!h.note || !h.note.trim())) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = h.text.toLowerCase().includes(q);
        const matchesNote = h.note ? h.note.toLowerCase().includes(q) : false;
        const storyTitle = storyMap.get(h.story)?.title?.toLowerCase() || '';
        const matchesStory = storyTitle.includes(q);
        if (!matchesText && !matchesNote && !matchesStory) {
          return false;
        }
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        const timeB = b.created ? new Date(b.created).getTime() : 0;
        const timeA = a.created ? new Date(a.created).getTime() : 0;
        return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
      }
      if (sortBy === 'oldest') {
        const timeB = b.created ? new Date(b.created).getTime() : 0;
        const timeA = a.created ? new Date(a.created).getTime() : 0;
        return (Number.isNaN(timeA) ? 0 : timeA) - (Number.isNaN(timeB) ? 0 : timeB);
      }
      if (sortBy === 'book') {
        const titleA = storyMap.get(a.story)?.title || '';
        const titleB = storyMap.get(b.story)?.title || '';
        const comp = titleA.localeCompare(titleB);
        if (comp !== 0) return comp;
        if (a.chapterIndex !== b.chapterIndex) {
          return a.chapterIndex - b.chapterIndex;
        }
        return a.paragraphIndex - b.paragraphIndex;
      }
      if (sortBy === 'color') {
        return a.color.localeCompare(b.color);
      }
      return 0;
    });

    return result;
  }, [highlights, selectedBookId, selectedColor, onlyNotes, searchQuery, sortBy, storyMap]);

  // Stats
  const totalNotesCount = useMemo(() => {
    return highlights.filter((h) => h.note && h.note.trim()).length;
  }, [highlights]);

  // Actions
  const handleStartEditNote = (h: StoryHighlight) => {
    setEditingHighlightId(h.id);
    setEditingNoteText(h.note || '');
  };

  const handleCancelEditNote = () => {
    setEditingHighlightId(null);
    setEditingNoteText('');
  };

  const handleSaveNote = async (highlightId: string) => {
    if (!currentUser) return;
    setSavingNoteId(highlightId);
    try {
      await updateStoryHighlight(currentUser.uid, highlightId, {
        note: editingNoteText.trim(),
      });
      setHighlights((prev) =>
        prev.map((h) =>
          h.id === highlightId ? { ...h, note: editingNoteText.trim() } : h,
        ),
      );
      setEditingHighlightId(null);
    } catch (err) {
      console.error('Failed to update note:', err);
    } finally {
      setSavingNoteId(null);
    }
  };

  const handleDelete = async (highlightId: string) => {
    if (!currentUser) return;
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this highlight and its note?',
    );
    if (!confirmDelete) return;

    try {
      await deleteStoryHighlight(currentUser.uid, highlightId);
      setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    } catch (err) {
      console.error('Failed to delete highlight:', err);
    }
  };

  // Helper to format chapter label without repeating "Chapter X"
  const formatChapterLabel = (chapterIdx: number, rawTitle?: string) => {
    const chNum = chapterIdx + 1;
    const trimmed = rawTitle?.trim() || '';
    if (
      !trimmed ||
      /^chapter\s*\d+$/i.test(trimmed) ||
      trimmed.toLowerCase() === `chapter ${chNum}`.toLowerCase()
    ) {
      return `Chapter ${chNum}`;
    }
    return `Chapter ${chNum}: ${trimmed}`;
  };

  const handleCopyQuote = (h: StoryHighlight) => {
    let content = `“${h.text}”`;
    if (h.note?.trim()) {
      content += `\nNote: ${h.note}`;
    }
    const story = storyMap.get(h.story);
    if (story) {
      const rawTitle = story.chapters?.[h.chapterIndex]?.title;
      const chLabel = formatChapterLabel(h.chapterIndex, rawTitle);
      content += `\n— ${story.title}, ${chLabel}`;
    }
    navigator.clipboard.writeText(content);
    setCopiedHighlightId(h.id);
    setTimeout(() => setCopiedHighlightId(null), 1500);
  };

  const handleExportMarkdown = () => {
    if (filteredHighlights.length === 0) return;

    let md = '# My Reading Notes & Highlights\n\n';
    md += `*Exported on ${new Date().toLocaleDateString()}*\n\n---\n\n`;

    // Group by book
    const groupedByBook: Record<string, StoryHighlight[]> = {};
    for (const h of filteredHighlights) {
      if (!groupedByBook[h.story]) {
        groupedByBook[h.story] = [];
      }
      groupedByBook[h.story].push(h);
    }

    for (const [storyId, list] of Object.entries(groupedByBook)) {
      const story = storyMap.get(storyId);
      const storyTitle = story?.title || `Book ID: ${storyId}`;
      md += `## 📖 ${storyTitle}\n\n`;

      // Group by chapter
      const groupedByChapter: Record<number, StoryHighlight[]> = {};
      for (const h of list) {
        if (!groupedByChapter[h.chapterIndex]) {
          groupedByChapter[h.chapterIndex] = [];
        }
        groupedByChapter[h.chapterIndex].push(h);
      }

      const chapterIndices = Object.keys(groupedByChapter)
        .map(Number)
        .sort((a, b) => a - b);

      for (const chIdx of chapterIndices) {
        const rawTitle = story?.chapters?.[chIdx]?.title;
        const chHeading = formatChapterLabel(chIdx, rawTitle);
        md += `### ${chHeading}\n\n`;

        for (const h of groupedByChapter[chIdx]) {
          md += `> “${h.text}”\n`;
          if (h.note?.trim()) {
            md += `\n**Note**: ${h.note}\n`;
          }
          md += '\n';
        }
      }
      md += '---\n\n';
    }

    navigator.clipboard.writeText(md);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleJumpToOriginal = (h: StoryHighlight) => {
    const story = storyMap.get(h.story);
    if (!story) return;
    onSelectStory(story, h.chapterIndex, h.paragraphIndex);
  };

  // Safe date formatter for highlights
  const formatHighlightDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  // Color config map with high-readability text and accents
  const colorMap: Record<
    string,
    { label: string; dotClass: string; quoteClass: string }
  > = {
    yellow: {
      label: 'Yellow',
      dotClass: 'bg-amber-400',
      quoteClass:
        'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300/80 dark:border-amber-700/60 border-l-amber-400 text-slate-900 dark:text-amber-100',
    },
    green: {
      label: 'Mint',
      dotClass: 'bg-emerald-400',
      quoteClass:
        'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300/80 dark:border-emerald-700/60 border-l-emerald-400 text-slate-900 dark:text-emerald-100',
    },
    blue: {
      label: 'Sky',
      dotClass: 'bg-sky-400',
      quoteClass:
        'bg-sky-50/90 dark:bg-sky-950/40 border-sky-300/80 dark:border-sky-700/60 border-l-sky-400 text-slate-900 dark:text-sky-100',
    },
    purple: {
      label: 'Lavender',
      dotClass: 'bg-purple-400',
      quoteClass:
        'bg-purple-50/90 dark:bg-purple-950/40 border-purple-300/80 dark:border-purple-700/60 border-l-purple-400 text-slate-900 dark:text-purple-100',
    },
    pink: {
      label: 'Rose',
      dotClass: 'bg-pink-400',
      quoteClass:
        'bg-pink-50/90 dark:bg-pink-950/40 border-pink-300/80 dark:border-pink-700/60 border-l-pink-400 text-slate-900 dark:text-pink-100',
    },
  };

  // GUEST STATE
  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-tj-bg-card border border-tj-border-main rounded-3xl p-8 sm:p-12 shadow-sm space-y-6">
          <div className="w-16 h-16 bg-tj-primary-light dark:bg-tj-primary/20 text-tj-primary rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Highlighter className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Save Notes & Highlights
            </h2>
            <p className="text-sm text-tj-text-muted leading-relaxed">
              Sign in to highlight passages in 5 pastel colors, annotate paragraphs with study notes, and review your highlights across all books in one central place.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onOpenAuth?.('signin')}
              className="px-6 py-2.5 bg-tj-primary hover:bg-tj-primary-hover text-white font-semibold text-sm rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Sign In to Access Notes</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* PAGE HEADER */}
      <header className="bg-tj-bg-card border border-tj-border-main rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <Highlighter className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-serif font-black text-slate-900 dark:text-white tracking-tight">
              My Notes & Highlights
            </h1>
          </div>
          <p className="text-xs text-tj-text-muted flex items-center gap-3 pt-0.5">
            <span>
              <strong>{highlights.length}</strong> total highlights
            </span>
            <span>•</span>
            <span>
              <strong>{totalNotesCount}</strong> personal notes
            </span>
            <span>•</span>
            <span>
              <strong>{annotatedBooks.length}</strong> books annotated
            </span>
          </p>
        </div>

        {/* HEADER ACTIONS */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadHighlights}
            disabled={loading}
            className="p-2 text-tj-text-muted hover:text-tj-text-main bg-tj-bg-recessed border border-tj-border-main rounded-xl text-xs font-semibold cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Refresh notes"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            />
          </button>

          <button
            type="button"
            onClick={handleExportMarkdown}
            disabled={filteredHighlights.length === 0}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-tj-border-main bg-tj-bg-recessed hover:bg-slate-100 dark:hover:bg-slate-800 text-tj-text-main transition-all cursor-pointer flex items-center gap-2 shadow-xs"
            title="Copy notes to clipboard as formatted Markdown"
          >
            {copiedAll ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  Copied Markdown!
                </span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-tj-primary" />
                <span>Export Markdown</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* CONTROLS BAR: SEARCH, FILTERS & SORTS */}
      <section className="bg-tj-bg-card border border-tj-border-main rounded-2xl p-4 shadow-xs space-y-3">
        {/* ROW 1: SEARCH & BOOK SELECTOR */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* SEARCH INPUT */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in quotes, personal notes, or book titles..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-tj-bg-recessed border border-tj-border-main rounded-xl text-tj-text-main placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-tj-primary/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* BOOK FILTER DROPDOWN */}
          <div className="sm:w-64">
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-tj-bg-recessed border border-tj-border-main rounded-xl text-tj-text-main font-medium focus:outline-none focus:ring-2 focus:ring-tj-primary/30 cursor-pointer"
            >
              <option value="all">All Books ({highlights.length})</option>
              {annotatedBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ROW 2: COLOR FILTERS, NOTES ONLY TOGGLE & SORTING */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-tj-border-main/50 text-xs">
          {/* COLOR PILLS */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-tj-text-muted text-[11px] font-semibold uppercase tracking-wider mr-1">
              Color:
            </span>
            <button
              type="button"
              onClick={() => setSelectedColor('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                selectedColor === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-tj-bg-recessed text-tj-text-muted hover:text-tj-text-main'
              }`}
            >
              All
            </button>
            {HIGHLIGHT_COLORS.map((c) => {
              const isSelected = selectedColor === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    setSelectedColor(isSelected ? 'all' : c.id)
                  }
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-tj-primary ring-1 ring-tj-primary shadow-xs'
                      : 'border-transparent hover:bg-tj-bg-recessed text-tj-text-muted'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${colorMap[c.id]?.dotClass || 'bg-amber-400'}`}
                  />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>

          {/* RIGHT CONTROLS: NOTES ONLY & SORT */}
          <div className="flex items-center gap-3">
            {/* ONLY WITH NOTES TOGGLE */}
            <button
              type="button"
              onClick={() => setOnlyNotes((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                onlyNotes
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                  : 'bg-tj-bg-recessed text-tj-text-muted border-tj-border-main hover:text-tj-text-main'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>With Notes Only</span>
            </button>

            {/* SORT SELECTOR */}
            <div className="flex items-center gap-1 text-tj-text-muted">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="py-1 px-2 text-xs bg-tj-bg-recessed border border-tj-border-main rounded-lg text-tj-text-main font-medium focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="book">By Book & Chapter</option>
                <option value="color">By Color</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHTS LIST / CARDS */}
      {loading ? (
        <div className="py-16 text-center text-tj-text-muted space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-tj-primary" />
          <p className="text-xs font-medium">Loading notes and highlights...</p>
        </div>
      ) : filteredHighlights.length === 0 ? (
        /* EMPTY STATE */
        <div className="bg-tj-bg-card border border-tj-border-main rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800/80 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Highlighter className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {highlights.length === 0
                ? 'No Highlights Yet'
                : 'No Matching Highlights Found'}
            </h3>
            <p className="text-xs text-tj-text-muted">
              {highlights.length === 0
                ? 'Select any text inside the reader to highlight phrases, create notes, and look up vocabulary.'
                : 'Try adjusting your filters, search term, or color selection.'}
            </p>
          </div>
          {highlights.length === 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('browse')}
              className="px-4 py-2 bg-tj-primary hover:bg-tj-primary-hover text-white text-xs font-semibold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Explore Library</span>
            </button>
          )}
        </div>
      ) : (
        /* HIGHLIGHT CARDS GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHighlights.map((h) => {
            const story = storyMap.get(h.story);
            const storyTitle = story?.title || `Book ID: ${h.story}`;
            const rawChapterTitle = story?.chapters?.[h.chapterIndex]?.title;
            const chapterLabel = formatChapterLabel(
              h.chapterIndex,
              rawChapterTitle,
            );
            const conf = colorMap[h.color] || colorMap.yellow;
            const isEditing = editingHighlightId === h.id;
            const isCopied = copiedHighlightId === h.id;
            const formattedDate = formatHighlightDate(h.created);

            return (
              <motion.article
                key={h.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-tj-bg-card border border-tj-border-main hover:border-slate-300 dark:hover:border-slate-700 rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3.5 transition-all group"
              >
                <div className="space-y-3">
                  {/* 1. QUOTE BLOCK (PRIMARY FOCUS) */}
                  <div
                    lang={
                      story?.language
                        ? getLanguageCodeFromName(story.language)
                        : undefined
                    }
                    className={`p-3.5 rounded-xl border border-l-4 font-serif text-[14px] leading-relaxed select-text transition-colors shadow-2xs ${conf.quoteClass}`}
                  >
                    “{h.text}”
                  </div>

                  {/* 2. ATTACHED USER NOTE OR INLINE EDITOR */}
                  {isEditing ? (
                    <div className="space-y-2 p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-tj-border-main rounded-xl">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Note:</span>
                      </div>
                      <textarea
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        placeholder="Write your study notes, reflections, or grammar observations..."
                        rows={3}
                        className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-tj-border-main rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-tj-primary resize-none font-sans"
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={handleCancelEditNote}
                          className="px-2.5 py-1 text-xs text-tj-text-muted hover:text-tj-text-main cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveNote(h.id)}
                          disabled={savingNoteId === h.id}
                          className="px-3 py-1 bg-tj-primary hover:bg-tj-primary-hover text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
                        >
                          {savingNoteId === h.id ? 'Saving...' : 'Save Note'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    h.note?.trim() && (
                      <div className="flex items-start gap-2 p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 rounded-xl text-slate-700 dark:text-slate-300 font-sans text-xs">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="whitespace-pre-wrap leading-relaxed flex-1 font-medium">
                          {h.note}
                        </p>
                      </div>
                    )
                  )}

                  {/* 3. SUBTLE BOOK & CHAPTER CITATION */}
                  <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-tj-text-muted">
                    <button
                      type="button"
                      onClick={() => handleJumpToOriginal(h)}
                      className="flex items-center gap-1.5 text-left text-slate-500 dark:text-slate-400 hover:text-tj-primary dark:hover:text-tj-primary transition-colors min-w-0 group/source cursor-pointer"
                      title={`Open "${storyTitle}" in Reader`}
                    >
                      <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover/source:opacity-100" />
                      <span className="font-medium truncate max-w-[180px] sm:max-w-[260px]">
                        {storyTitle}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">
                        •
                      </span>
                      <span className="shrink-0 font-normal text-slate-400 dark:text-slate-500">
                        {chapterLabel}
                      </span>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${conf.dotClass} shadow-xs shrink-0`}
                        title={`Color: ${conf.label}`}
                      />
                      {formattedDate && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                          {formattedDate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* CARD FOOTER ACTIONS */}
                <div className="flex items-center justify-between pt-2 border-t border-tj-border-main/50 text-xs">
                  {/* LEFT: READ IN CONTEXT LINK */}
                  <button
                    type="button"
                    onClick={() => handleJumpToOriginal(h)}
                    className="flex items-center gap-1 text-tj-primary hover:text-tj-primary-hover font-semibold cursor-pointer hover:underline transition-colors"
                  >
                    <span>Read in Context</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>

                  {/* RIGHT: EDIT NOTE, COPY, DELETE */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEditNote(h)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                      title={h.note ? 'Edit note' : 'Add note'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyQuote(h)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                      title={isCopied ? 'Copied!' : 'Copy quote'}
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(h.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer transition-colors"
                      title="Delete highlight"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
