/**
 * Database service factory and named re-exports.
 *
 * All application code should import DB helpers from HERE, not from
 * any provider-specific module directly.
 *
 * To switch providers, replace the active `PocketBaseService` instance with
 * a new implementation class — nothing else needs to change.
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
import type {
  IDatabaseService,
  MetadataOptions,
  ProfileUpdatePayload,
} from './DatabaseService';
import { PocketBaseService } from './PocketBaseService';

// ---------------------------------------------------------------------------
// Active provider instance
// ---------------------------------------------------------------------------

const dbService: IDatabaseService = new PocketBaseService();

// ---------------------------------------------------------------------------
// Named function re-exports (matching the database interface signatures)
// so every call-site only needs to update its import path.
// ---------------------------------------------------------------------------

// Stories
export const createStory = (story: Story) => dbService.createStory(story);
export const fetchStory = (id: string) => dbService.fetchStory(id);
export const fetchPrivateStories = (userId: string) =>
  dbService.fetchPrivateStories(userId);
export const fetchStoriesMetadata = (options?: MetadataOptions) =>
  dbService.fetchStoriesMetadata(options);
export const appendChapterToStory = (
  storyId: string,
  updatedChapters: Story['chapters'],
  totalChapters: number,
  creditsCharged?: number,
) =>
  dbService.appendChapterToStory(
    storyId,
    updatedChapters,
    totalChapters,
    creditsCharged,
  );
export const updateStoryChaptersAndTitle = (
  storyId: string,
  chapters: Story['chapters'],
  title?: string,
  totalChapters?: number,
  isCompleted?: boolean,
  description?: string,
  regenerationsCount?: number,
  creditsCharged?: number,
) =>
  dbService.updateStoryChaptersAndTitle(
    storyId,
    chapters,
    title,
    totalChapters,
    isCompleted,
    description,
    regenerationsCount,
    creditsCharged,
  );
export const updateStoryVisibility = (storyId: string, isPublic: boolean) =>
  dbService.updateStoryVisibility(storyId, isPublic);
export const updateStoryModel = (storyId: string, model: string) =>
  dbService.updateStoryModel(storyId, model);
export const updateStoryBible = (storyId: string, bible: StoryBible) =>
  dbService.updateStoryBible(storyId, bible);
export const updateStoryOutline = (storyId: string, outline: string) =>
  dbService.updateStoryOutline(storyId, outline);
export const updateToneRefreshGuidance = (storyId: string, guidance: string) =>
  dbService.updateToneRefreshGuidance(storyId, guidance);
export const addConsistencyAudit = (storyId: string, audit: ConsistencyAudit) =>
  dbService.addConsistencyAudit(storyId, audit);
export const rateStory = (storyId: string, userId: string, rating: number) =>
  dbService.rateStory(storyId, userId, rating);
export const incrementStoryCompletion = (storyId: string, userId: string) =>
  dbService.incrementStoryCompletion(storyId, userId);
export const decrementStoryCompletion = (storyId: string, userId: string) =>
  dbService.decrementStoryCompletion(storyId, userId);
export const deleteStory = (storyId: string) => dbService.deleteStory(storyId);

// User profile
export const fetchUserProfile = (userId: string) =>
  dbService.fetchUserProfile(userId);
export const fetchUserVocab = (userId: string) =>
  dbService.fetchUserVocab(userId);
export const saveWord = (userId: string, term: VocabularyTerm) =>
  dbService.saveWord(userId, term);
export const deleteWord = (userId: string, wordText: string) =>
  dbService.deleteWord(userId, wordText);
export const saveUserLookupLimit = (userId: string, data: LookupLimitData) =>
  dbService.saveUserLookupLimit(userId, data);
/** Debounced lookup-limit write — call .flush() in beforeunload handlers. */
export const saveUserLookupLimitDebounced =
  dbService.saveUserLookupLimitDebounced;
export const saveUserGenerationLimit = (
  userId: string,
  data: GenerationLimitData,
) => dbService.saveUserGenerationLimit(userId, data);
export const saveUserBookshelf = (userId: string, bookshelf: string[]) =>
  dbService.saveUserBookshelf(userId, bookshelf);
export const saveUserRecentlyRead = (
  userId: string,
  recentlyRead: RecentlyReadItem[],
) => dbService.saveUserRecentlyRead(userId, recentlyRead);
export const saveUserProfileData = (
  userId: string,
  data: ProfileUpdatePayload,
) => dbService.saveUserProfileData(userId, data);

// Streaks
export const getLocalTodayStr = () => dbService.getLocalTodayStr();
export const getLocalYesterdayStr = () => dbService.getLocalYesterdayStr();
export const checkAndSyncStreakState = (userId: string) =>
  dbService.checkAndSyncStreakState(userId);
export const recordDailyActivity = (userId: string) =>
  dbService.recordDailyActivity(userId);
export const updateStreak = (userId: string, streak: UserStreakData) =>
  dbService.updateStreak(userId, streak);

// Export types so callers can import from a single location
export type {
  GenerationLimitData,
  IDatabaseService,
  LookupLimitData,
  MetadataOptions,
  ProfileUpdatePayload,
  RecentlyReadItem,
  UserProfileData,
  UserStreakData,
};

// Export the active service instance for advanced use
export { dbService };
