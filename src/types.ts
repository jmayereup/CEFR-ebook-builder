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
  cover?: string;
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
  copyrightFlag?: boolean;
  copyrightFlagReason?: string;
  copyrightFlagSource?: 'ai' | 'admin' | 'backfill' | 'user';
  copyrightFlaggedAt?: string;
  initialTotalChapters?: number;
  initialCreditsEstimate?: number;
  creditsCharged?: number;
  regenerationsCount?: number;
  storyBible?: StoryBible | null;
  consistencyAudits?: ConsistencyAudit[] | null;
  toneRefreshGuidance?: string;
  isUnsaved?: boolean;
  totalReads?: number;
  completedBy?: Record<string, number>;
  updated?: string;
  embedUrl?: string;
  sourceType?: 'native' | 'gemini_storybook' | 'external';
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

export interface GenreOption {
  id: string;
  label: string;
}

export const WRITING_TYPE_GENRES: Record<string, GenreOption[]> = {
  narrative: [
    { id: 'adventure', label: 'Adventure & Exploration 🗺️' },
    { id: 'mystery', label: 'Detective & Mystery 🔍' },
    { id: 'scifi', label: 'Science Fiction 🚀' },
    { id: 'fantasy', label: 'Fantasy 🧙' },
    { id: 'scifi_fantasy', label: 'Sci-Fi & Fantasy (Blended) 🌌' },
    { id: 'sliceoflife', label: 'Slice of Life & Culture ☕' },
    { id: 'romance', label: 'Romance & Drama 💖' },
    { id: 'folklore', label: 'Folklore & Legend 🐉' },
    { id: 'historical', label: 'Historical Fiction 🏛️' },
    { id: 'horror', label: 'Horror & Thriller 👻' },
    { id: 'comedy', label: 'Comedy & Humor 😹' },
    { id: 'fairy', label: 'Fairy Tales & Fables 🦄' },
  ],
  expository: [
    { id: 'science_nature', label: 'Science & Nature 🌿' },
    { id: 'technology', label: 'Technology & Innovation 💻' },
    { id: 'history_biography', label: 'History & Biography 📜' },
    { id: 'culture_society', label: 'Culture & World Traditions 🌍' },
    { id: 'health_wellness', label: 'Health & Everyday Science 🍎' },
    { id: 'geography_travel', label: 'Geography & Places 🏔️' },
    { id: 'howto_hobbies', label: 'Practical Guides & How-To 🛠️' },
    { id: 'nonfiction', label: 'General Non-Fiction 📖' },
  ],
  analytical: [
    { id: 'science_tech_analysis', label: 'Science & Tech Breakdown 🔬' },
    { id: 'historical_analysis', label: 'Historical Cause & Effect ⏳' },
    { id: 'social_cultural_issues', label: 'Social & Cultural Insights 📊' },
    { id: 'philosophy', label: 'Ethics & Philosophy 🧘' },
    { id: 'meditative', label: 'Meditative & Contemplative ☕' },
    { id: 'environmental_systems', label: 'Climate & Ecosystems 🌎' },
  ],
  descriptive: [
    { id: 'nature_wildlife', label: 'Nature & Landscapes 🌲' },
    { id: 'cities_architecture', label: 'Cities & Architecture 🏙️' },
    { id: 'food_culture', label: 'Food, Cuisine & Craft 🍲' },
    { id: 'art_music', label: 'Art, Music & Performance 🎨' },
    { id: 'daily_life_portraits', label: 'People & Daily Scenes 📸' },
  ],
};

export const GENRES: GenreOption[] = [
  ...WRITING_TYPE_GENRES.narrative,
  ...WRITING_TYPE_GENRES.expository,
  ...WRITING_TYPE_GENRES.analytical,
  ...WRITING_TYPE_GENRES.descriptive,
];

export function isNonFictionGenre(genreId?: string): boolean {
  if (!genreId) return false;
  const genreLower = genreId.toLowerCase().trim();
  if (genreLower === 'nonfiction') return true;
  const nonFictionOptions = [
    ...WRITING_TYPE_GENRES.expository,
    ...WRITING_TYPE_GENRES.analytical,
    ...WRITING_TYPE_GENRES.descriptive,
  ];
  return nonFictionOptions.some(
    (g) =>
      g.id.toLowerCase() === genreLower ||
      g.label.toLowerCase().includes(genreLower),
  );
}

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
  dailyCreditsUsed?: number;
  dailyCreditsDate?: string;
  freeModelCount: number;
  monthlyCreditsUsed: number;
  monthlyCreditsMonth: string;
  date: string;
}

export interface DeletionFlag {
  id?: string;
  storyId: string;
  storyTitle: string;
  flaggerId: string;
  flaggerEmail: string;
  reason: 'inappropriate' | 'quality' | 'formatting' | 'duplicate' | 'other';
  comment: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
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

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'purple' | 'pink';

export interface StoryHighlight {
  id?: string;
  user?: string;
  story: string;
  chapterIndex: number;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  color: HighlightColor;
  note?: string;
  created?: string;
  updated?: string;
}
