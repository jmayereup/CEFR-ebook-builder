import { Check } from 'lucide-react';
import type { IUser } from '../../../services/types';
import type { HighlightColor, StoryHighlight } from '../../../types';
import ToastActionButtons from './ToastActionButtons';
import ToastFormFields from './ToastFormFields';
import ToastHighlightSection from './ToastHighlightSection';
import ToastWordControls from './ToastWordControls';
import type { SelectedWordData } from './types';

interface ToastExpandedContentProps {
  selectedWord: SelectedWordData;
  languageCode: string;
  currentUser: IUser | null;
  isOnline?: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onPlayWord: (word: string) => void;
  onClose: () => void;
  onResumeChapterFromWord?: () => void;
  autoPlayWord?: boolean;
  setAutoPlayWord?: (enabled: boolean) => void;
  selectedWordRange?: [number, number] | null;
  canShrinkRight?: boolean;
  canExtendRight?: boolean;
  onShrinkRight?: () => void;
  onExtendRight?: () => void;
  activeHighlight?: StoryHighlight | null;
  onSelectHighlightColor?: (color: HighlightColor) => void;
  onSaveHighlightNote?: (note: string) => void;
  onDeleteHighlight?: () => void;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  onChangeWord: (updated: SelectedWordData) => void;
  handleFetchTranslation: () => void;
  handleSaveWordRecord: () => void;
  isSaved?: boolean;
  handleRemoveWordRecord?: () => void;
}

export default function ToastExpandedContent({
  selectedWord,
  languageCode,
  currentUser,
  isOnline = true,
  hasPrev,
  hasNext,
  onNavigatePrev,
  onNavigateNext,
  onPlayWord,
  onClose,
  onResumeChapterFromWord,
  autoPlayWord = true,
  setAutoPlayWord,
  selectedWordRange = null,
  canShrinkRight = false,
  canExtendRight = false,
  onShrinkRight,
  onExtendRight,
  activeHighlight,
  onSelectHighlightColor,
  onSaveHighlightNote,
  onDeleteHighlight,
  onOpenAuth,
  onChangeWord,
  handleFetchTranslation,
  handleSaveWordRecord,
  isSaved = false,
  handleRemoveWordRecord,
}: ToastExpandedContentProps) {
  return (
    <div className="flex-1 overflow-y-auto overscroll-contain px-3.5 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 md:pb-5">
      {selectedWord.saveSuccess ? (
        <div className="py-3 flex flex-col items-center justify-center space-y-2">
          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-955/20 text-emerald-500 rounded-full flex items-center justify-center">
            <Check className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-white">
            Word Added Successfully!
          </p>
          <p className="text-xs text-slate-400">
            Saved to your vocabulary practices collection.
          </p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-start gap-3 lg:gap-6">
          {/* SECTION 1: WORD INFO with nav arrows & HIGHLIGHT CONTROLS */}
          <div className="flex flex-col gap-2.5 min-w-[240px] lg:w-96 lg:max-w-md">
            <ToastWordControls
              selectedWord={selectedWord}
              languageCode={languageCode}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onNavigatePrev={onNavigatePrev}
              onNavigateNext={onNavigateNext}
              onPlayWord={onPlayWord}
              onClose={onClose}
              onResumeChapterFromWord={onResumeChapterFromWord}
              autoPlayWord={autoPlayWord}
              setAutoPlayWord={setAutoPlayWord}
              selectedWordRange={selectedWordRange}
              canShrinkRight={canShrinkRight}
              canExtendRight={canExtendRight}
              onShrinkRight={onShrinkRight}
              onExtendRight={onExtendRight}
            />

            <ToastHighlightSection
              currentUser={currentUser}
              isOnline={isOnline}
              activeHighlight={activeHighlight}
              onSelectHighlightColor={onSelectHighlightColor}
              onSaveHighlightNote={onSaveHighlightNote}
              onDeleteHighlight={onDeleteHighlight}
              onOpenAuth={onOpenAuth}
              onClose={onClose}
            />
          </div>

          {/* SECTION 2: INPUT FIELDS (Compact 2-Column on Mobile) */}
          <ToastFormFields
            selectedWord={selectedWord}
            onChangeWord={onChangeWord}
          />

          {/* SECTION 3: TRANSLATE + SAVE / REMOVE BUTTONS */}
          <ToastActionButtons
            currentUser={currentUser}
            isOnline={isOnline}
            isFetching={selectedWord.isFetching}
            translation={selectedWord.translation}
            isSaved={isSaved}
            onFetchTranslation={handleFetchTranslation}
            onSaveWordRecord={handleSaveWordRecord}
            onRemoveWordRecord={handleRemoveWordRecord}
          />
        </div>
      )}
    </div>
  );
}
