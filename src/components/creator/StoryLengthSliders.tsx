import { BookText, Layers } from 'lucide-react';
import type React from 'react';

interface StoryLengthSlidersProps {
  totalChapters: number;
  onTotalChaptersChange: (chapters: number) => void;
  chapterLength: number;
  onChapterLengthChange: (length: number) => void;
  writingType: string;
  maxChapters: number;
}

export default function StoryLengthSliders({
  totalChapters,
  onTotalChaptersChange,
  chapterLength,
  onChapterLengthChange,
  writingType,
  maxChapters,
}: StoryLengthSlidersProps) {
  const isNarrative = writingType === 'narrative';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Chapters / Sections Adjustments */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          <Layers className="w-4 h-4 text-tj-primary" />
          Book Length ({isNarrative ? 'Chapters' : 'Sections'})
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="1"
            max={maxChapters}
            step="1"
            value={totalChapters}
            onChange={(e) => onTotalChaptersChange(parseInt(e.target.value, 10))}
            className="w-full accent-tj-primary dark:accent-tj-primary"
          />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg shrink-0">
            {totalChapters} {totalChapters === 1 ? 'part' : 'parts'}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Select from 1 to {maxChapters}{' '}
          {isNarrative ? 'chapters' : 'sections'}.
        </p>
      </div>

      {/* Chapter / Section Word Count */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          <BookText className="w-4 h-4 text-tj-primary" />
          {isNarrative ? 'Chapter' : 'Section'} Word Count
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="100"
            max="500"
            step="25"
            value={chapterLength}
            onChange={(e) => onChapterLengthChange(parseInt(e.target.value, 10))}
            className="w-full accent-tj-primary dark:accent-tj-primary"
          />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg shrink-0">
            {chapterLength} words
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          A1 & A2 are recommended around 100-250 words.
        </p>
      </div>
    </div>
  );
}
