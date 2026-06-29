export interface VocabularyTerm {
  id?: string; // PocketBase record ID (if saved)
  word: string;
  partOfSpeech: string;
  definition: string;
  contextSentence: string;
  language?: string;
  transliteration?: string;
  // SRS Fields
  nextReviewDate?: string;
  repetition?: number;
  interval?: number;
  easeFactor?: number;
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
  storyBible?: StoryBible | null;
  consistencyAudits?: ConsistencyAudit[] | null;
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
    description:
      'Can recognize and read extremely basic isolated words, names, and numbers. Suitable for readers starting with word-by-word decoding and visual support.',
  },
  {
    code: 'A1',
    name: 'A1 - Beginner',
    description:
      'Can read short, simple texts sentence-by-sentence. Can find basic information in familiar messages and narratives using high-frequency vocabulary.',
  },
  {
    code: 'A2',
    name: 'A2 - Elementary',
    description:
      'Can read short, simple stories and find specific, predictable info in everyday materials. Understands basic tenses and simple sentence connectors.',
  },
  {
    code: 'B1',
    name: 'B1 - Intermediate',
    description:
      'Can read straightforward factual texts and follow clear narratives on familiar topics. Transitioning to independent reading with occasional dictionary help.',
  },
  {
    code: 'B2',
    name: 'B2 - Upper Intermediate',
    description:
      'Can read complex, detailed narratives, reports, and modern literature. Understands writer viewpoints, implicit styles, subtext, and idiomatic phrases.',
  },
  {
    code: 'C1',
    name: 'C1 - Advanced',
    description:
      'Can read a wide range of long, demanding texts, highly stylized literature, and nuanced analytical works. Comprehends implicit meanings and specialized terms.',
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
  translationTargetLanguage?: string | null;
  readerFontSize?: number;
  readerUseSerif?: boolean;
}

export interface SRSRecord {
  repetition: number;
  interval: number;
  easeFactor: number;
  nextReviewDate: string;
}
