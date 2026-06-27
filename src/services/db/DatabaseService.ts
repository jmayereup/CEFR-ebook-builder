/**
 * IDatabaseService — provider-agnostic database interface.
 *
 * All story, user-profile, and streak operations go through this interface.
 * Any backend (PocketBase, Supabase, etc.) must implement it.
 */

import type {
  ConsistencyAudit,
  GenerationLimitData,
  LookupLimitData,
  RecentlyReadItem,
  Story,
  StoryBible,
  UserProfileData,
  UserStreakData,
  VocabularyTerm,
} from '../types';

// ---------------------------------------------------------------------------
// Shared option / payload types
// ---------------------------------------------------------------------------

export interface MetadataOptions {
  refresh?: boolean;
  storyId?: string;
  deleteId?: string;
  forceAll?: boolean;
}

export interface ProfileUpdatePayload {
  savedVocab?: VocabularyTerm[];
  bookshelf?: string[];
  recentlyRead?: RecentlyReadItem[];
  lookupLimitData?: LookupLimitData | null;
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IDatabaseService {
  // ── Stories ──────────────────────────────────────────────────────────────

  /** Persist a newly created story document. */
  createStory(story: Story): Promise<void>;

  /** Fetch a single story by ID. Returns null if not found. */
  fetchStory(storyId: string): Promise<Story | null>;

  /** Fetch the authenticated user's private stories. */
  fetchPrivateStories(userId: string): Promise<Story[]>;

  /**
   * Fetch public story metadata.
   * On the default implementation this hits the Express server cache,
   * not the database directly.
   */
  fetchStoriesMetadata(options?: MetadataOptions): Promise<Story[]>;

  /** Append a chapter to an existing story, updating completion status. */
  appendChapterToStory(
    storyId: string,
    updatedChapters: Story['chapters'],
    totalChapters: number,
    creditsCharged?: number,
  ): Promise<void>;

  /** Update chapters array and optional metadata fields on a story. */
  updateStoryChaptersAndTitle(
    storyId: string,
    chapters: Story['chapters'],
    title?: string,
    totalChapters?: number,
    isCompleted?: boolean,
    description?: string,
    regenerationsCount?: number,
    creditsCharged?: number,
  ): Promise<void>;

  /** Toggle a story's public/private visibility. */
  updateStoryVisibility(storyId: string, isPublic: boolean): Promise<void>;

  /** Update the active writing model for a story. */
  updateStoryModel(storyId: string, model: string): Promise<void>;

  /** Replace the story bible. */
  updateStoryBible(storyId: string, bible: StoryBible): Promise<void>;

  /** Update the story's chapter outline. */
  updateStoryOutline(storyId: string, outline: string): Promise<void>;

  /** Update the tone-refresh guidance instruction. */
  updateToneRefreshGuidance(storyId: string, guidance: string): Promise<void>;

  /** Append a consistency audit entry. */
  addConsistencyAudit(storyId: string, audit: ConsistencyAudit): Promise<void>;

  /** Save a user's star rating on a story. */
  rateStory(storyId: string, userId: string, rating: number): Promise<void>;

  /** Record that a user has finished reading a story. */
  incrementStoryCompletion(storyId: string, userId: string): Promise<void>;

  /** Undo or decrement a user's completion of a story. */
  decrementStoryCompletion(storyId: string, userId: string): Promise<void>;

  /** Delete a story document. */
  deleteStory(storyId: string): Promise<void>;

  // ── User profile ──────────────────────────────────────────────────────────

  /** Fetch a user's full profile. */
  fetchUserProfile(userId: string): Promise<UserProfileData | null>;

  /** Fetch the user's saved vocabulary from the saved_words collection. */
  fetchUserVocab(userId: string): Promise<VocabularyTerm[]>;

  /** Save a single word to the saved_words collection, or update it if it exists. Returns the new/updated term. */
  saveWord(userId: string, term: VocabularyTerm): Promise<VocabularyTerm>;

  /** Remove a saved word from the saved_words collection */
  deleteWord(userId: string, wordText: string): Promise<void>;

  /** Update the daily lookup counter. */
  saveUserLookupLimit(userId: string, data: LookupLimitData): Promise<void>;

  /**
   * Debounced version of saveUserLookupLimit (3 s delay).
   * Includes a .flush() method to force-write immediately (e.g. on unload).
   */
  saveUserLookupLimitDebounced: ((
    userId: string,
    data: LookupLimitData,
  ) => void) & { flush(): void };

  /** Update the daily/monthly generation counter. */
  saveUserGenerationLimit(
    userId: string,
    data: GenerationLimitData,
  ): Promise<void>;

  /** Persist the bookshelf array. */
  saveUserBookshelf(userId: string, bookshelf: string[]): Promise<void>;

  /** Persist the recently-read list. */
  saveUserRecentlyRead(
    userId: string,
    recentlyRead: RecentlyReadItem[],
  ): Promise<void>;

  /** Persist vocab, bookshelf, recently-read and lookup data in one write. */
  saveUserProfileData(
    userId: string,
    data: ProfileUpdatePayload,
  ): Promise<void>;

  // ── Streaks ───────────────────────────────────────────────────────────────

  /** Return today's date as a YYYY-MM-DD string in the user's local timezone. */
  getLocalTodayStr(): string;

  /** Return yesterday's date as a YYYY-MM-DD string in the user's local timezone. */
  getLocalYesterdayStr(): string;

  /**
   * Check the user's streak state on app load, applying freeze or triggering
   * a repair challenge as needed.
   */
  checkAndSyncStreakState(userId: string): Promise<UserStreakData>;

  /** Record daily reading activity and extend the active streak. */
  recordDailyActivity(userId: string): Promise<UserStreakData>;

  /** Directly update the user streak data. */
  updateStreak(userId: string, streak: UserStreakData): Promise<void>;
}
