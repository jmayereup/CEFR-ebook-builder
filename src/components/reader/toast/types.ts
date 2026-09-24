import type { IUser } from '../../../services/types';
import type { HighlightColor, Story, StoryHighlight } from '../../../types';

export interface SelectedWordData {
  word: string;
  context: string;
  translation: string;
  partOfSpeech: string;
  definition: string;
  isFetching: boolean;
  saveSuccess: boolean;
}

export interface TranslationToastProps {
  selectedWord: SelectedWordData | null;
  setSelectedWord: (word: SelectedWordData | null) => void;
  story: Story;
  currentUser: IUser | null;
  handleFetchTranslation: () => void;
  handleSaveWordRecord: () => void;
  handlePlayWord: (word: string) => void;
  isSaved?: boolean;
  handleRemoveWordRecord?: () => void;
  isOnline?: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  selectedWordRange?: [number, number] | null;
  canShrinkRight?: boolean;
  canExtendRight?: boolean;
  onShrinkRight?: () => void;
  onExtendRight?: () => void;
  activeHighlight?: StoryHighlight | null;
  onSelectHighlightColor?: (color: HighlightColor) => void;
  onSaveHighlightNote?: (note: string) => void;
  onDeleteHighlight?: () => void;
  autoPlayWord?: boolean;
  setAutoPlayWord?: (enabled: boolean) => void;
  onResumeChapterFromWord?: () => void;
  isExpanded?: boolean;
  setIsExpanded?: (expanded: boolean) => void;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
}
