export interface VocabularyTerm {
  word: string;
  partOfSpeech: string;
  definition: string;
  contextSentence: string;
  language?: string;
  transliteration?: string;
}

export interface Chapter {
  chapterNumber: number;
  title: string;
  content: string;
  vocabulary: VocabularyTerm[];
  summary?: string;
}

export interface CharacterProfile {
  name: string;
  description: string;
}

export interface StoryBible {
  characterProfiles: CharacterProfile[];
  rulesOfThree: string[];
  activePlotPoints: string[];
  lastUpdatedChapter: number;
}

export interface ConsistencyAudit {
  chapterRange: string;
  auditText: string;
  createdAt: string;
}

export interface Story {
  id: string;
  title: string;
  language: string;
  cefrLevel: string;
  genre: string;
  totalChapters: number;
  chapters?: Chapter[];
  chaptersCount?: number;
  wordCount?: number;
  createdAt: string;
  isCompleted: boolean;
  promptNotes?: string;
  chapterLength?: number;
  outline?: string;
  description?: string;
  creatorId: string;
  creatorEmail?: string;
  model?: string;
  thinkingLevel?: string;
  thinkingBudget?: number;
  temperature?: number;
  ratings?: Record<string, number>;
  translationLanguage?: string;
  isPublic?: boolean;
  initialTotalChapters?: number;
  initialCreditsEstimate?: number;
  creditsCharged?: number;
  regenerationsCount?: number;
  storyBible?: StoryBible;
  consistencyAudits?: ConsistencyAudit[];
  toneRefreshGuidance?: string;
  isUnsaved?: boolean;
  completedBy?: Record<string, number>;
}

export interface Language {
  code: string;
  name: string;
  flag: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español' },
  { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français' },
  { code: 'de', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', flag: '🇮🇹', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', nativeName: 'Português' },
  { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
  { code: 'th', name: 'Thai', flag: '🇹🇭', nativeName: 'ภาษาไทย' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷', nativeName: '한국어' },
];

export const getLanguageCodeFromName = (
  langName: string | undefined | null,
): string => {
  if (!langName) return 'en';
  const nameLower = langName.toLowerCase();
  const found = SUPPORTED_LANGUAGES.find(
    (l) =>
      nameLower.includes(l.name.toLowerCase()) ||
      l.name.toLowerCase().includes(nameLower),
  );
  return found ? found.code : 'en';
};

export interface CEFRLevel {
  code: string;
  name: string;
  description: string;
}

export const CEFR_LEVELS: CEFRLevel[] = [
  {
    code: 'Pre-A1',
    name: 'Pre-A1 - Novice',
    description: 'Extremely basic words and word-by-word translations.',
  },
  {
    code: 'A1',
    name: 'A1 - Beginner',
    description: 'Very basic phrases and simple sentences.',
  },
  {
    code: 'A2',
    name: 'A2 - Elementary',
    description: 'Simple everyday conversations and expressions.',
  },
  {
    code: 'B1',
    name: 'B1 - Intermediate',
    description: 'Understand main points and write simple connected texts.',
  },
  {
    code: 'B2',
    name: 'B2 - Upper Intermediate',
    description: 'Detailed arguments, complex texts, and fluid interaction.',
  },
  {
    code: 'C1',
    name: 'C1 - Advanced',
    description: 'Express ideas fluently, understand implicit meanings.',
  },
  {
    code: 'C2',
    name: 'C2 - Mastery',
    description: 'Understand with ease virtually everything heard or read.',
  },
];

export const GENRES = [
  { id: 'mystery', label: 'Detective & Mystery 🔍' },
  { id: 'scifi', label: 'Sci-Fi & Fantasy 🚀' },
  { id: 'adventure', label: 'Adventure & Exploration 🗺️' },
  { id: 'sliceoflife', label: 'Slice of Life & Culture ☕' },
  { id: 'romance', label: 'Romance & Drama 💖' },
  { id: 'folklore', label: 'Folklore & Legend 🐉' },
  { id: 'philosophy', label: 'Spirituality & Philosophy 🧘' },
  { id: 'historical', label: 'Historical Fiction 🏛️' },
  { id: 'nonfiction', label: 'Non-Fiction 📖' },
];

export const getAverageRating = (
  ratings?: Record<string, number> | null,
): number => {
  if (!ratings) return 0;
  const values = Object.values(ratings);
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
};

export interface UserStreakData {
  currentStreak: number;
  maxStreak: number;
  lastActiveDate: string; // "YYYY-MM-DD" local date string
  activityHistory: string[]; // Array of "YYYY-MM-DD" local dates user read/practiced
}

export interface LookupLimitData {
  count: number;
  date: string;
}

export interface GenerationLimitData {
  freeModelCount: number;
  monthlyCreditsUsed: number;
  monthlyCreditsMonth: string;
  date: string;
}

export interface RecentlyReadItem {
  storyId: string;
  chapterIdx: number;
}

export interface UserProfileData {
  savedVocab: VocabularyTerm[];
  lookupLimitData: LookupLimitData | null;
  bookshelf: string[];
  isPaid: boolean;
  generationLimitData: GenerationLimitData | null;
  recentlyRead?: RecentlyReadItem[];
  streak?: UserStreakData | null;
}
