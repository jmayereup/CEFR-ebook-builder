import {
  BookOpen,
  Check,
  Copy,
  MessageSquare,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { HighlightColor, StoryHighlight } from '../../types';

export const HIGHLIGHT_COLORS: {
  id: HighlightColor;
  label: string;
  dotClass: string;
  bgClass: string;
  borderClass: string;
}[] = [
  {
    id: 'yellow',
    label: 'Yellow',
    dotClass: 'bg-amber-300 border-amber-400',
    bgClass:
      'bg-amber-100/80 dark:bg-amber-900/40 text-amber-950 dark:text-amber-100',
    borderClass: 'border-amber-400/60 dark:border-amber-500/40',
  },
  {
    id: 'green',
    label: 'Mint',
    dotClass: 'bg-emerald-300 border-emerald-400',
    bgClass:
      'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-950 dark:text-emerald-100',
    borderClass: 'border-emerald-400/60 dark:border-emerald-500/40',
  },
  {
    id: 'blue',
    label: 'Sky',
    dotClass: 'bg-sky-300 border-sky-400',
    bgClass: 'bg-sky-100/80 dark:bg-sky-900/40 text-sky-950 dark:text-sky-100',
    borderClass: 'border-sky-400/60 dark:border-sky-500/40',
  },
  {
    id: 'purple',
    label: 'Lavender',
    dotClass: 'bg-purple-300 border-purple-400',
    bgClass:
      'bg-purple-100/80 dark:bg-purple-900/40 text-purple-950 dark:text-purple-100',
    borderClass: 'border-purple-400/60 dark:border-purple-500/40',
  },
  {
    id: 'pink',
    label: 'Rose',
    dotClass: 'bg-pink-300 border-pink-400',
    bgClass:
      'bg-pink-100/80 dark:bg-pink-900/40 text-pink-950 dark:text-pink-100',
    borderClass: 'border-pink-400/60 dark:border-pink-500/40',
  },
];

export const HIGHLIGHT_STYLE_MAP: Record<
  string,
  { bgClass: string; borderClass: string }
> = {
  yellow: {
    bgClass:
      'bg-amber-200/70 dark:bg-amber-500/30 text-amber-950 dark:text-amber-100',
    borderClass:
      'border-b-2 border-dashed border-amber-600/70 dark:border-amber-400/70',
  },
  green: {
    bgClass:
      'bg-emerald-200/70 dark:bg-emerald-500/30 text-emerald-950 dark:text-emerald-100',
    borderClass:
      'border-b-2 border-dashed border-emerald-600/70 dark:border-emerald-400/70',
  },
  blue: {
    bgClass: 'bg-sky-200/70 dark:bg-sky-500/30 text-sky-950 dark:text-sky-100',
    borderClass:
      'border-b-2 border-dashed border-sky-600/70 dark:border-sky-400/70',
  },
  purple: {
    bgClass:
      'bg-purple-200/70 dark:bg-purple-500/30 text-purple-950 dark:text-purple-100',
    borderClass:
      'border-b-2 border-dashed border-purple-600/70 dark:border-purple-400/70',
  },
  pink: {
    bgClass:
      'bg-pink-200/70 dark:bg-pink-500/30 text-pink-950 dark:text-pink-100',
    borderClass:
      'border-b-2 border-dashed border-pink-600/70 dark:border-pink-400/70',
  },
};

interface HighlightToolbarProps {
  activeHighlight?: StoryHighlight | null;
  position: { x: number; y: number } | null;
  onSelectColor: (color: HighlightColor) => void;
  onSaveNote: (note: string) => void;
  onDeleteHighlight?: () => void;
  onTranslate?: () => void;
  onCopy?: () => void;
  onClose: () => void;
  isLoggedIn: boolean;
}

export default function HighlightToolbar({
  activeHighlight,
  position,
  onSelectColor,
  onSaveNote,
  onDeleteHighlight,
  onTranslate,
  onCopy,
  onClose,
  isLoggedIn,
}: HighlightToolbarProps) {
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeHighlight?.note) {
      setNoteText(activeHighlight.note);
    } else {
      setNoteText('');
    }
    // If opening an existing highlight with a note, open note view
    if (activeHighlight?.note) {
      setIsEditingNote(true);
    } else {
      setIsEditingNote(false);
    }
  }, [activeHighlight]);

  // Click outside listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!position) return null;

  const handleCopyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSaveNote(noteText.trim());
    setIsEditingNote(false);
  };

  // Adjust toolbar position so it stays within viewport
  const viewportWidth =
    typeof window !== 'undefined' ? window.innerWidth : 1000;
  const toolbarEstimatedWidth = isEditingNote ? 340 : (activeHighlight ? 360 : 310);
  let leftPos = position.x - toolbarEstimatedWidth / 2;
  if (leftPos < 12) leftPos = 12;
  if (leftPos + toolbarEstimatedWidth > viewportWidth - 12) {
    leftPos = viewportWidth - toolbarEstimatedWidth - 12;
  }
  const topPos = Math.max(16, position.y - (isEditingNote ? 195 : 56));

  return (
    <motion.div
      ref={toolbarRef}
      initial={{ opacity: 0, scale: 0.92, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 6 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="fixed z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-2xl rounded-2xl p-1.5 flex flex-col gap-2 select-none w-max max-w-[calc(100vw-24px)]"
      style={{
        left: `${leftPos}px`,
        top: `${topPos}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* TOP TOOLBAR ROW: Color dots & actions */}
      <div className="flex items-center gap-1.5 px-0.5 py-0.5">
        {/* COLOR PALETTE */}
        <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
          {HIGHLIGHT_COLORS.map((c) => {
            const isSelected = activeHighlight?.color === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectColor(c.id);
                }}
                className={`w-6 h-6 rounded-full border ${c.dotClass} flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-xs ${
                  isSelected
                    ? 'ring-2 ring-tj-primary ring-offset-1 dark:ring-offset-slate-900 scale-105'
                    : ''
                }`}
                title={`Highlight in ${c.label}`}
              >
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-slate-800 dark:text-slate-900 stroke-[3]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

        {/* ACTIONS GROUP */}
        <div className="flex items-center gap-0.5">
          {/* NOTE TOGGLE BUTTON */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingNote((prev) => !prev);
            }}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isEditingNote || activeHighlight?.note
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={activeHighlight?.note ? 'Edit Note' : 'Add Note'}
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* TRANSLATE / DICTIONARY BUTTON */}
          {onTranslate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTranslate();
                onClose();
              }}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Dictionary / Translation"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          )}

          {/* COPY SNIPPET */}
          {onCopy && (
            <button
              type="button"
              onClick={handleCopyClick}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title={copied ? 'Copied!' : 'Copy text'}
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

        {/* RIGHT SIDE ACTIONS: TRASH & CLOSE */}
        <div className="flex items-center gap-0.5">
          {activeHighlight && onDeleteHighlight && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteHighlight();
                onClose();
              }}
              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
              title="Remove Highlight"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
            title="Close toolbar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* NOTE EDITING POPDOWN */}
      <AnimatePresence>
        {isEditingNote && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSaveNoteSubmit}
            className="border-t border-slate-100 dark:border-slate-800 pt-2 px-1 pb-1 flex flex-col gap-2"
          >
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add your study note or thoughts..."
              rows={3}
              // biome-ignore lint/a11y/noAutofocus: popover note editor requires focus
              autoFocus
              className="w-full text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-tj-primary resize-none font-sans"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-400">
                {noteText.length > 0
                  ? `${noteText.length} chars`
                  : 'Markdown supported'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingNote(false)}
                  className="px-2 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isLoggedIn}
                  className="px-3 py-1 bg-tj-primary hover:bg-tj-primary-hover text-white rounded-lg text-xs font-semibold cursor-pointer transition shadow-sm disabled:opacity-50"
                >
                  {isLoggedIn ? 'Save Note' : 'Sign in to save'}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
