import { FileSignature, Info, Sparkles } from 'lucide-react';
import type React from 'react';
import { WRITING_TYPE_GENRES } from '../../types';

export const WRITING_TYPES = [
  {
    id: 'narrative',
    label: 'Narrative',
    emoji: '📖',
    desc: 'Storytelling, plot-driven, fictional or personal account.',
  },
  {
    id: 'expository',
    label: 'Expository',
    emoji: '💡',
    desc: 'Explaining, informing, or describing a specific topic with facts.',
  },
  {
    id: 'analytical',
    label: 'Analytical',
    emoji: '🔍',
    desc: 'Breaking down concepts, examining relationships or arguments.',
  },
  {
    id: 'descriptive',
    label: 'Descriptive',
    emoji: '🎨',
    desc: 'Focusing on vivid sensory details, imagery, and mood.',
  },
];

interface GenreSelectorProps {
  writingType: string;
  onWritingTypeChange: (type: string) => void;
  genre: string;
  onGenreChange: (genre: string) => void;
}

export default function GenreSelector({
  writingType,
  onWritingTypeChange,
  genre,
  onGenreChange,
}: GenreSelectorProps) {
  const currentGenres = WRITING_TYPE_GENRES[writingType] || [];

  const handleTypeSelect = (typeId: string) => {
    onWritingTypeChange(typeId);
    const available = WRITING_TYPE_GENRES[typeId];
    if (available && available.length > 0) {
      if (!available.some((g) => g.id === genre)) {
        onGenreChange(available[0].id);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Writing Style / Type */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          <FileSignature className="w-4 h-4 text-tj-primary" />
          Writing Style / Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          {WRITING_TYPES.map((wt) => {
            const isSelected = writingType === wt.id;
            return (
              <button
                key={wt.id}
                type="button"
                onClick={() => handleTypeSelect(wt.id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                  isSelected
                    ? 'border-tj-primary bg-tj-primary-light/50 dark:bg-tj-primary-light/10 text-slate-900 dark:text-white ring-2 ring-tj-primary/30 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{wt.emoji}</span>
                    <span className="font-bold text-sm leading-tight">
                      {wt.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    {wt.desc}
                  </p>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 text-tj-primary">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Genre Picker */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Genre / Category
          </label>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            Filtered by {writingType}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {currentGenres.map((g) => {
            const isSelected = genre === g.id;
            const emojiMatch = g.label.match(
              /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F9FF}]/u,
            );
            const emoji = emojiMatch ? emojiMatch[0] : '';
            const text = g.label.replace(emoji, '').trim();
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => onGenreChange(g.id)}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isSelected
                    ? 'border-tj-primary bg-tj-primary text-white shadow-sm font-semibold'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                {emoji && <span className="text-base">{emoji}</span>}
                <span className="text-xs">{text}</span>
              </button>
            );
          })}
        </div>

        {genre === 'nonfiction' && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              Non-fiction narratives automatically use grounded factual
              temperature settings to maintain accuracy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
