import { Loader2 } from 'lucide-react';
import { lazy, Suspense } from 'react';
import type { Story, VocabularyTerm } from '../types';

const VocabularyPractice = lazy(
  () => import('../components/VocabularyPractice'),
);

interface PracticePageProps {
  selectedStory: Story | null;
  savedVocab: VocabularyTerm[];
  handleRemoveSavedWord: (termId: string) => Promise<void>;
  handleRecordDailyActivity: () => Promise<void>;
  onUpdateWordSRS: (term: VocabularyTerm, isCorrect: boolean) => void;
}

export default function PracticePage({
  selectedStory,
  savedVocab,
  handleRemoveSavedWord,
  handleRecordDailyActivity,
  onUpdateWordSRS,
}: PracticePageProps) {
  return (
    <div className="space-y-6">
      <div className="bg-tj-bg-card p-5 rounded-2xl border border-tj-border-main shadow-sm">
        <h2 className="text-base font-bold font-sans text-slate-805 dark:text-white mb-1">
          Graded Vocabulary Companion
        </h2>
        <p className="text-xs text-slate-400">
          {selectedStory ? (
            <span>
              Terms extracted from{' '}
              <strong className="font-serif italic">
                {selectedStory.title}
              </strong>{' '}
              ({selectedStory.language} - {selectedStory.cefrLevel})
            </span>
          ) : (
            <span>Practice your clicked and collected words deck.</span>
          )}
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center p-12 bg-tj-bg-card rounded-2xl border border-tj-border-main shadow-sm text-tj-text-muted">
            <Loader2 className="h-8 w-8 animate-spin text-[#4f46e5] dark:text-[#6366f1] mb-2" />
            <p className="text-sm font-medium">Loading practice deck...</p>
          </div>
        }
      >
        <VocabularyPractice
          story={selectedStory}
          savedVocab={savedVocab}
          onRemoveSavedWord={handleRemoveSavedWord}
          onUpdateWordSRS={onUpdateWordSRS}
          onVocabActivity={() => {
            handleRecordDailyActivity();
          }}
        />
      </Suspense>
    </div>
  );
}
