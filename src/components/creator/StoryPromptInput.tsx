import { HelpCircle, Lock, ShieldAlert, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type React from 'react';
import { useState } from 'react';
import { GENRE_INSPIRATIONS } from './storyConfigConstants';

interface StoryPromptInputProps {
  promptNotes: string;
  onPromptNotesChange: (notes: string) => void;
  writingType: string;
  genre: string;
  isPublic: boolean;
  onIsPublicChange: (isPublic: boolean) => void;
  copyrightFlag: boolean;
  copyrightFlagReason: string;
}

export default function StoryPromptInput({
  promptNotes,
  onPromptNotesChange,
  writingType,
  genre,
  isPublic,
  onIsPublicChange,
  copyrightFlag,
  copyrightFlagReason,
}: StoryPromptInputProps) {
  const [showPrivateTooltip, setShowPrivateTooltip] = useState(false);

  const getPlaceholder = () => {
    switch (writingType) {
      case 'narrative':
        return 'e.g., A time traveler named Leo lands in Paris 1889 and meets a mysterious clockmaker. Or: focus on food and dining vocabulary.';
      case 'expository':
        return 'e.g., Explain how solar panels work, ancient aqueducts, or how coffee is cultivated and roasted. Cover key facts and real-world examples.';
      case 'analytical':
        return 'e.g., Examine the causes of urbanization, renewable energy trade-offs, or social media impacts on modern communication.';
      case 'descriptive':
      default:
        return 'e.g., Describe a bustling night market in Tokyo, a quiet mountain shrine, or traditional bread-making with rich sensory details.';
    }
  };

  const getLabel = () => {
    switch (writingType) {
      case 'narrative':
        return 'Story Prompt & Character Ideas (Optional)';
      case 'expository':
        return 'Topic Focus & Concepts to Explain (Optional)';
      case 'analytical':
        return 'Analytical Questions & Arguments (Optional)';
      case 'descriptive':
      default:
        return 'Sensory Focus & Scene Details (Optional)';
    }
  };

  const inspirations =
    GENRE_INSPIRATIONS[genre] || GENRE_INSPIRATIONS[writingType] || [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          <Sparkles className="w-4 h-4 text-tj-primary" />
          {getLabel()}
        </label>

        {/* Public / Private Story Toggle */}
        {copyrightFlag ? (
          <span
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 select-none cursor-help"
            title={
              copyrightFlagReason
                ? `Copyright-restricted: ${copyrightFlagReason}. This story will be saved as private and cannot be shared publicly.`
                : 'Copyright-restricted — this story will be saved as private.'
            }
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Restricted (private only)</span>
          </span>
        ) : (
          <label className="relative flex items-center gap-3 select-none cursor-pointer group">
            <input
              type="checkbox"
              checked={!isPublic}
              onChange={(e) => onIsPublicChange(!e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-tj-primary dark:peer-checked:bg-tj-primary shrink-0 relative"></div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              Private Story
              <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </span>
            <div className="relative inline-flex items-center">
              <HelpCircle
                className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 hover:text-tj-primary cursor-pointer transition-colors"
                onMouseEnter={() => setShowPrivateTooltip(true)}
                onMouseLeave={() => setShowPrivateTooltip(false)}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowPrivateTooltip(!showPrivateTooltip);
                }}
              />
              <AnimatePresence>
                {showPrivateTooltip && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="absolute z-50 bottom-full right-0 mb-2 p-3 bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 text-[10px] rounded-lg shadow-xl border border-slate-700/50 w-56 leading-normal pointer-events-none text-left"
                  >
                    Only you will be able to view and read this story. Quotas:
                    Free tier allows up to 10 elective private stories,
                    Paid/Premium allows up to 100. Stories flagged as containing
                    copyrighted material are automatically kept private and
                    don't count toward this limit.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </label>
        )}
      </div>

      <textarea
        placeholder={getPlaceholder()}
        value={promptNotes}
        onChange={(e) => onPromptNotesChange(e.target.value)}
        rows={6}
        className="w-full p-3 rounded-xl border border-tj-border-main bg-tj-bg-card text-tj-text-main text-sm placeholder:text-tj-text-muted/50 focus:border-tj-primary focus:outline-none focus:ring-1 focus:ring-tj-primary resize-y"
      />

      {/* Prompt Inspiration Starters */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] text-tj-text-muted font-bold uppercase tracking-wider mr-1">
          Inspirations:
        </span>
        {inspirations.map((idea) => (
          <button
            key={idea}
            type="button"
            onClick={() => onPromptNotesChange(idea)}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-tj-bg-recessed hover:bg-tj-primary/10 hover:text-tj-primary dark:hover:bg-slate-800 dark:hover:text-tj-primary-hover border border-tj-border-main hover:border-tj-primary/30 transition-all text-tj-text-muted cursor-pointer font-medium select-none text-left"
          >
            + {idea}
          </button>
        ))}
      </div>
    </div>
  );
}
