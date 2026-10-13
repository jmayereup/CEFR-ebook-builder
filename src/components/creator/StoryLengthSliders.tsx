import { BookText, Layers, Minus, Plus } from 'lucide-react';

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

  const handleDecrementChapters = () => {
    onTotalChaptersChange(Math.max(1, totalChapters - 1));
  };

  const handleIncrementChapters = () => {
    onTotalChaptersChange(Math.min(maxChapters, totalChapters + 1));
  };

  const handleDecrementWordCount = () => {
    onChapterLengthChange(Math.max(100, chapterLength - 25));
  };

  const handleIncrementWordCount = () => {
    onChapterLengthChange(Math.min(500, chapterLength + 25));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Chapters / Sections Adjustments */}
      <div>
        <label
          htmlFor="story-total-chapters-slider"
          className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          <Layers className="w-4 h-4 text-tj-primary" />
          Book Length ({isNarrative ? 'Chapters' : 'Sections'})
        </label>
        <div className="flex items-center gap-3">
          <input
            id="story-total-chapters-slider"
            type="range"
            min="1"
            max={maxChapters}
            step="1"
            value={totalChapters}
            onChange={(e) =>
              onTotalChaptersChange(parseInt(e.target.value, 10))
            }
            className="w-full accent-tj-primary dark:accent-tj-primary cursor-pointer"
          />
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
            <button
              type="button"
              onClick={handleDecrementChapters}
              disabled={totalChapters <= 1}
              aria-label={`Decrease ${isNarrative ? 'chapters' : 'sections'}`}
              title={`Decrease ${isNarrative ? 'chapters' : 'sections'}`}
              className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-tj-primary dark:hover:text-tj-primary hover:bg-white dark:hover:bg-slate-700 active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 disabled:cursor-not-allowed disabled:active:scale-100 transition-all cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 font-mono px-2 py-0.5 min-w-[2rem] text-center select-none">
              {totalChapters}
            </span>
            <button
              type="button"
              onClick={handleIncrementChapters}
              disabled={totalChapters >= maxChapters}
              aria-label={`Increase ${isNarrative ? 'chapters' : 'sections'}`}
              title={`Increase ${isNarrative ? 'chapters' : 'sections'}`}
              className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-tj-primary dark:hover:text-tj-primary hover:bg-white dark:hover:bg-slate-700 active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 disabled:cursor-not-allowed disabled:active:scale-100 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Select from 1 to {maxChapters} {isNarrative ? 'chapters' : 'sections'}
          .
        </p>
      </div>

      {/* Chapter / Section Word Count */}
      <div>
        <label
          htmlFor="story-chapter-length-slider"
          className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          <BookText className="w-4 h-4 text-tj-primary" />
          {isNarrative ? 'Chapter' : 'Section'} Word Count
        </label>
        <div className="flex items-center gap-3">
          <input
            id="story-chapter-length-slider"
            type="range"
            min="100"
            max="500"
            step="25"
            value={chapterLength}
            onChange={(e) =>
              onChapterLengthChange(parseInt(e.target.value, 10))
            }
            className="w-full accent-tj-primary dark:accent-tj-primary cursor-pointer"
          />
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
            <button
              type="button"
              onClick={handleDecrementWordCount}
              disabled={chapterLength <= 100}
              aria-label="Decrease word count"
              title="Decrease word count by 25 words"
              className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-tj-primary dark:hover:text-tj-primary hover:bg-white dark:hover:bg-slate-700 active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 disabled:cursor-not-allowed disabled:active:scale-100 transition-all cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 font-mono px-2 py-0.5 min-w-[5.25rem] text-center select-none">
              {chapterLength} words
            </span>
            <button
              type="button"
              onClick={handleIncrementWordCount}
              disabled={chapterLength >= 500}
              aria-label="Increase word count"
              title="Increase word count by 25 words"
              className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-tj-primary dark:hover:text-tj-primary hover:bg-white dark:hover:bg-slate-700 active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 disabled:cursor-not-allowed disabled:active:scale-100 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          A1 & A2 are recommended around 100-250 words.
        </p>
      </div>
    </div>
  );
}
