import { AlertCircle, Check, MessageSquare, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { IUser } from '../../../services/types';
import type { HighlightColor, StoryHighlight } from '../../../types';
import { HIGHLIGHT_COLORS } from '../HighlightToolbar';

interface ToastHighlightSectionProps {
  currentUser: IUser | null;
  isOnline?: boolean;
  activeHighlight?: StoryHighlight | null;
  onSelectHighlightColor?: (color: HighlightColor) => void;
  onSaveHighlightNote?: (note: string) => void;
  onDeleteHighlight?: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  onClose: () => void;
}

export default function ToastHighlightSection({
  currentUser,
  isOnline = true,
  activeHighlight,
  onSelectHighlightColor,
  onSaveHighlightNote,
  onDeleteHighlight,
  onOpenAuth,
  onClose,
}: ToastHighlightSectionProps) {
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>('');

  useEffect(() => {
    if (activeHighlight?.note) {
      setNoteText(activeHighlight.note);
      setIsEditingNote(true);
    } else {
      setNoteText('');
      setIsEditingNote(false);
    }
  }, [activeHighlight]);

  return (
    <>
      {/* 1-TAP HIGHLIGHTING & STUDY NOTES BAR */}
      {onSelectHighlightColor && (
        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-tj-border-main/60">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Highlight & Notes
            </span>
            {activeHighlight && onDeleteHighlight && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteHighlight();
                }}
                className="text-[10px] text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-semibold cursor-pointer transition flex items-center gap-1"
                title="Remove highlight"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 5 Color buttons */}
            <div className="flex items-center gap-1.5 bg-tj-bg-recessed p-1 rounded-xl border border-tj-border-main/50">
              {HIGHLIGHT_COLORS.map((c) => {
                const isSelected = activeHighlight?.color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectHighlightColor(c.id);
                    }}
                    className={`w-5 h-5 md:w-6 md:h-6 rounded-full border ${c.dotClass
                      } flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-2xs ${isSelected
                        ? 'ring-2 ring-tj-primary ring-offset-1 dark:ring-offset-slate-900 scale-105'
                        : ''
                      }`}
                    title={`Highlight in ${c.label}`}
                  >
                    {isSelected && (
                      <Check className="w-2.5 h-2.5 md:w-3 md:h-3 text-slate-800 dark:text-slate-900 stroke-[3]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Note Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingNote((prev) => !prev);
              }}
              className={`p-1 px-2 md:p-1.5 md:px-2.5 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${isEditingNote || activeHighlight?.note
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                : 'bg-tj-bg-recessed text-tj-text-muted border-tj-border-main hover:text-tj-text-main'
                }`}
              title={
                activeHighlight?.note ? 'Edit study note' : 'Add study note'
              }
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-[11px]">
                {activeHighlight?.note ? 'Note' : '+ Note'}
              </span>
            </button>

            {/* Action button (Done Check) */}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!activeHighlight && onSelectHighlightColor) {
                    onSelectHighlightColor('yellow');
                  }
                  if (isEditingNote && noteText.trim()) {
                    onSaveHighlightNote?.(noteText.trim());
                  }
                  onClose();
                }}
                className="px-2.5 py-1 bg-tj-primary/10 hover:bg-tj-primary/20 dark:bg-tj-primary/20 dark:hover:bg-tj-primary/30 text-tj-primary dark:text-tj-primary-hover border border-tj-primary/30 rounded-xl text-xs font-bold cursor-pointer transition flex items-center gap-1 shadow-2xs"
                title="Done & Close (Default Yellow)"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark</span>
              </button>
            </div>
          </div>

          {/* Inline Note Editor */}
          <AnimatePresence>
            {isEditingNote && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-1 flex flex-col gap-1.5 overflow-hidden"
              >
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add your study note or thoughts..."
                  rows={2}
                  className="w-full text-xs p-2 rounded-xl bg-tj-bg-recessed border border-tj-border-main text-tj-text-main placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-tj-primary resize-none font-sans"
                />
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">
                    {noteText.length > 0
                      ? `${noteText.length} chars`
                      : 'Markdown supported'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingNote(false);
                      }}
                      className="px-2 py-0.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!currentUser) {
                          onOpenAuth?.('signin');
                          return;
                        }
                        onSaveHighlightNote?.(noteText.trim());
                        setIsEditingNote(false);
                      }}
                      className="px-2.5 py-1 bg-tj-primary hover:bg-tj-primary-hover text-white rounded-lg font-semibold cursor-pointer transition shadow-2xs"
                    >
                      {currentUser ? 'Save Note' : 'Sign in to save'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Alert/Status banner */}
      {!isOnline ? (
        <div className="p-2 bg-rose-50 dark:bg-rose-955/20 text-rose-700 dark:text-rose-350 text-[10px] rounded-xl border border-rose-100 dark:border-rose-900/10 flex items-start gap-1.5 leading-tight">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
          <span>
            Offline: AI translation requires connection. You can enter
            translations manually.
          </span>
        </div>
      ) : !currentUser ? (
        <div className="p-2 bg-amber-50 dark:bg-amber-955/20 text-slate-700 dark:text-slate-355 text-[10px] rounded-xl border border-amber-100 dark:border-amber-900/10 flex items-start gap-1.5 leading-tight">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
          <span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAuth?.('signin');
              }}
              className="font-bold underline underline-offset-2 text-tj-primary hover:text-tj-primary-hover cursor-pointer"
            >
              Sign in
            </button>{' '}
            to enable highlighting, AI translations, and vocabulary lists!
          </span>
        </div>
      ) : null}
    </>
  );
}
