import { debounce } from '../../utils/debounce';
import { pb } from '../pocketbase';
import type {
  Chapter,
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
import type {
  SavedWordsResponse,
  StoriesResponse,
  UsersResponse,
} from './pocketbase-types';

type AppUsersResponse = UsersResponse<
  any, // beginnerLessons
  string[], // bookshelf
  GenerationLimitData, // generationLimitData
  any, // personalWordBank
  any, // playlist
  RecentlyReadItem[], // recentlyRead
  VocabularyTerm[], // savedVocab
  UserStreakData // streak
>;

type AppStoriesResponse = StoriesResponse<
  Chapter[], // chapters
  ConsistencyAudit[], // consistencyAudits
  Record<string, number>, // ratings
  StoryBible // storyBible
>;

export class PocketBaseService implements IDatabaseService {
  // ── Stories ────────────────────────────────────────────────────────────────

  async createStory(story: Story): Promise<void> {
    // Strip client-only fields (e.g., isUnsaved)
    const { isUnsaved, ...pbStory } = story as any;

    if (pbStory.isCompleted) {
      pbStory.promptNotes = '';
      pbStory.outline = '';
      pbStory.storyBible = null;
      pbStory.consistencyAudits = null;
      pbStory.toneRefreshGuidance = '';
    }

    try {
      const { id, ...updateData } = pbStory;
      await pb.collection('stories').update(pbStory.id, updateData);
    } catch (error: any) {
      if (error.status === 404) {
        // PocketBase allows explicit record ID creation if provided
        console.log(
          '[PocketBase] Creating story with id:',
          pbStory.id,
          'payload keys:',
          Object.keys(pbStory),
        );
        try {
          await pb.collection('stories').create(pbStory);
        } catch (createError: any) {
          console.error(
            '[PocketBase] 400 create error response:',
            JSON.stringify(
              createError?.response ?? createError?.data ?? createError,
              null,
              2,
            ),
          );
          console.error(
            '[PocketBase] Payload that failed:',
            JSON.stringify(pbStory, null, 2),
          );

          const responseData =
            createError?.response?.data || createError?.data || {};
          if (responseData?.id?.code === 'validation_not_unique') {
            throw new Error('You do not have permission to edit this story.');
          }
          throw createError;
        }
      } else {
        throw error;
      }
    }
  }

  async fetchStory(storyId: string): Promise<Story | null> {
    try {
      const record = await pb
        .collection('stories')
        .getOne<AppStoriesResponse>(storyId);
      return record as unknown as Story;
    } catch (error: any) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async fetchPrivateStories(userId: string): Promise<Story[]> {
    const records = await pb
      .collection('stories')
      .getFullList<AppStoriesResponse>({
        filter: `creatorId = "${userId}" && isPublic = false`,
        sort: '-createdAt',
      });
    return records as unknown as Story[];
  }

  async fetchStoriesMetadata(options: MetadataOptions = {}): Promise<Story[]> {
    const params = new URLSearchParams();
    if (options.refresh) params.append('refresh', 'true');
    if (options.storyId) params.append('storyId', options.storyId);
    if (options.deleteId) params.append('deleteId', options.deleteId);
    if (options.forceAll) params.append('forceAll', 'true');

    const queryString = params.toString();
    const url = queryString
      ? `/api/stories/metadata?${queryString}`
      : '/api/stories/metadata';

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stories metadata cache.');
    }

    return response.json();
  }

  async appendChapterToStory(
    storyId: string,
    updatedChapters: Story['chapters'],
    totalChapters: number,
    creditsCharged?: number,
  ): Promise<void> {
    const isCompleted = (updatedChapters || []).length >= totalChapters;
    const updates: Record<string, any> = {
      chapters: updatedChapters,
      isCompleted,
    };
    if (creditsCharged !== undefined) {
      updates.creditsCharged = creditsCharged;
    }
    if (isCompleted) {
      updates.promptNotes = '';
      updates.outline = '';
      updates.storyBible = null;
      updates.consistencyAudits = null;
      updates.toneRefreshGuidance = '';
    }
    await pb.collection('stories').update(storyId, updates);
  }

  async updateStoryChaptersAndTitle(
    storyId: string,
    chapters: Story['chapters'],
    title?: string,
    totalChapters?: number,
    isCompleted?: boolean,
    description?: string,
    regenerationsCount?: number,
    creditsCharged?: number,
  ): Promise<void> {
    const updates: Record<string, any> = {
      chapters,
    };
    if (title !== undefined) updates.title = title;
    if (totalChapters !== undefined) updates.totalChapters = totalChapters;
    if (isCompleted !== undefined) updates.isCompleted = isCompleted;
    if (description !== undefined) updates.description = description;
    if (regenerationsCount !== undefined)
      updates.regenerationsCount = regenerationsCount;
    if (creditsCharged !== undefined) updates.creditsCharged = creditsCharged;

    if (updates.isCompleted) {
      updates.promptNotes = '';
      updates.outline = '';
      updates.storyBible = null;
      updates.consistencyAudits = null;
      updates.toneRefreshGuidance = '';
    }
    await pb.collection('stories').update(storyId, updates);
  }

  async updateStoryVisibility(
    storyId: string,
    isPublic: boolean,
  ): Promise<void> {
    await pb.collection('stories').update(storyId, { isPublic });
  }

  async updateStoryModel(storyId: string, model: string): Promise<void> {
    await pb.collection('stories').update(storyId, { model });
  }

  async updateStoryBible(storyId: string, bible: StoryBible): Promise<void> {
    await pb.collection('stories').update(storyId, { storyBible: bible });
  }

  async updateStoryOutline(storyId: string, outline: string): Promise<void> {
    await pb.collection('stories').update(storyId, { outline });
  }

  async updateToneRefreshGuidance(
    storyId: string,
    guidance: string,
  ): Promise<void> {
    await pb
      .collection('stories')
      .update(storyId, { toneRefreshGuidance: guidance });
  }

  async addConsistencyAudit(
    storyId: string,
    audit: ConsistencyAudit,
  ): Promise<void> {
    const record = await pb
      .collection('stories')
      .getOne<AppStoriesResponse>(storyId, { fields: 'consistencyAudits' });
    const audits = [...(record.consistencyAudits ?? []), audit];
    await pb
      .collection('stories')
      .update(storyId, { consistencyAudits: audits });
  }

  async rateStory(
    storyId: string,
    userId: string,
    rating: number,
  ): Promise<void> {
    const record = await pb
      .collection('stories')
      .getOne<AppStoriesResponse>(storyId, { fields: 'ratings' });
    const ratings = { ...(record.ratings ?? {}), [userId]: rating };
    await pb.collection('stories').update(storyId, { ratings });
  }

  async incrementStoryCompletion(
    storyId: string,
    userId: string,
  ): Promise<void> {
    try {
      const records = await pb.collection('story_completions').getList(1, 1, {
        filter: `story = "${storyId}" && user = "${userId}"`,
      });

      if (records.items.length > 0) {
        const existing = records.items[0];
        const timesRead = (existing.timesRead ?? 0) + 1;
        await pb.collection('story_completions').update(existing.id, {
          timesRead,
        });
      } else {
        await pb.collection('story_completions').create({
          story: storyId,
          user: userId,
          timesRead: 1,
        });
      }
    } catch (error: any) {
      console.error(
        '[PocketBaseService] Failed to increment story completion:',
        error,
      );
      throw error;
    }
  }

  async decrementStoryCompletion(
    storyId: string,
    userId: string,
  ): Promise<void> {
    try {
      const records = await pb.collection('story_completions').getList(1, 1, {
        filter: `story = "${storyId}" && user = "${userId}"`,
      });

      if (records.items.length > 0) {
        const existing = records.items[0];
        const timesRead = (existing.timesRead ?? 0) - 1;
        if (timesRead > 0) {
          await pb.collection('story_completions').update(existing.id, {
            timesRead,
          });
        } else {
          await pb.collection('story_completions').delete(existing.id);
        }
      }
    } catch (error: any) {
      console.error(
        '[PocketBaseService] Failed to decrement story completion:',
        error,
      );
      throw error;
    }
  }

  async deleteStory(storyId: string): Promise<void> {
    await pb.collection('stories').delete(storyId);
  }

  // ── User profile ───────────────────────────────────────────────────────────

  async fetchUserProfile(userId: string): Promise<UserProfileData | null> {
    try {
      const record = await pb
        .collection('users')
        .getOne<AppUsersResponse>(userId);

      const parseJsonField = (field: any) => {
        if (field === null || field === undefined || field === '') return null;
        if (typeof field === 'object') return field;
        if (typeof field === 'string') {
          try {
            return JSON.parse(field);
          } catch (_e) {
            return null;
          }
        }
        return null;
      };

      return {
        savedVocab: [], // No longer pulled from users JSON field, handled by fetchUserVocab
        lookupLimitData: parseJsonField(record.lookupLimitData),
        bookshelf: Array.isArray(record.bookshelf)
          ? record.bookshelf
          : (parseJsonField(record.bookshelf) ?? []),
        isPaid: record.isPaid === true,
        generationLimitData: parseJsonField(record.generationLimitData),
        recentlyRead: Array.isArray(record.recentlyRead)
          ? record.recentlyRead
          : (parseJsonField(record.recentlyRead) ?? []),
        streak: parseJsonField(record.streak),
      };
    } catch (error: any) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async fetchUserVocab(userId: string): Promise<VocabularyTerm[]> {
    try {
      const records = await pb
        .collection('saved_words')
        .getFullList<SavedWordsResponse>({
          filter: `user = "${userId}"`,
          sort: '-id',
        });

      return records.map((record) => ({
        id: record.id,
        word: record.word,
        partOfSpeech: record.partOfSpeech || '',
        definition: record.definition,
        contextSentence: record.contextSentence || '',
        language: record.language || '',
        transliteration: record.transliteration || '',
        nextReviewDate: record.nextReviewDate || undefined,
        repetition: record.repetition,
        interval: record.interval,
        easeFactor: record.easeFactor,
      }));
    } catch (error: any) {
      console.error('[PocketBaseService] fetchUserVocab error:', error);
      return [];
    }
  }

  async saveWord(
    userId: string,
    term: VocabularyTerm,
  ): Promise<VocabularyTerm> {
    const payload = {
      user: userId,
      word: term.word,
      partOfSpeech: term.partOfSpeech,
      definition: term.definition,
      contextSentence: term.contextSentence,
      language: term.language,
      transliteration: term.transliteration,
      nextReviewDate: term.nextReviewDate,
      repetition: term.repetition,
      interval: term.interval,
      easeFactor: term.easeFactor,
    };

    if (term.id) {
      const updated = await pb
        .collection('saved_words')
        .update<SavedWordsResponse>(term.id, payload);
      return { ...term, id: updated.id };
    } else {
      // Check if it already exists to avoid duplicates
      const existing = await pb
        .collection('saved_words')
        .getList<SavedWordsResponse>(1, 1, {
          filter: `user = "${userId}" && word = "${term.word.toLowerCase()}"`,
        });
      if (existing.items.length > 0) {
        const updated = await pb
          .collection('saved_words')
          .update<SavedWordsResponse>(existing.items[0].id, payload);
        return { ...term, id: updated.id };
      }
      const created = await pb
        .collection('saved_words')
        .create<SavedWordsResponse>(payload);
      return { ...term, id: created.id };
    }
  }

  async deleteWord(userId: string, wordText: string): Promise<void> {
    const existing = await pb
      .collection('saved_words')
      .getList<SavedWordsResponse>(1, 1, {
        filter: `user = "${userId}" && word = "${wordText.toLowerCase()}"`,
      });
    if (existing.items.length > 0) {
      await pb.collection('saved_words').delete(existing.items[0].id);
    }
  }

  async saveUserLookupLimit(
    userId: string,
    data: LookupLimitData,
  ): Promise<void> {
    await pb
      .collection('users')
      .update(userId, { lookupLimitData: JSON.stringify(data) });
  }

  saveUserLookupLimitDebounced: ((
    userId: string,
    data: LookupLimitData,
  ) => void) & { flush(): void } = debounce(
    (userId: string, data: LookupLimitData) => {
      this.saveUserLookupLimit(userId, data).catch((err) => {
        console.error('Error saving user lookup limit (debounced):', err);
      });
    },
    3000,
  );

  async saveUserGenerationLimit(
    userId: string,
    data: GenerationLimitData,
  ): Promise<void> {
    await pb.collection('users').update(userId, { generationLimitData: data });
  }

  async saveUserBookshelf(userId: string, bookshelf: string[]): Promise<void> {
    await pb.collection('users').update(userId, { bookshelf });
  }

  async saveUserRecentlyRead(
    userId: string,
    recentlyRead: RecentlyReadItem[],
  ): Promise<void> {
    await pb.collection('users').update(userId, { recentlyRead });
  }

  async saveUserProfileData(
    userId: string,
    data: ProfileUpdatePayload,
  ): Promise<void> {
    await pb.collection('users').update(userId, {
      bookshelf: data.bookshelf,
      recentlyRead: data.recentlyRead,
      lookupLimitData: data.lookupLimitData
        ? JSON.stringify(data.lookupLimitData)
        : null,
    });
  }

  async updateStreak(userId: string, streak: UserStreakData): Promise<void> {
    await pb.collection('users').update(userId, { streak });
  }

  // ── Streaks ────────────────────────────────────────────────────────────────

  getLocalTodayStr(): string {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const d = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(d);
    } catch (_e) {
      return new Date().toISOString().split('T')[0];
    }
  }

  getLocalYesterdayStr(): string {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(d);
    } catch (_e) {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    }
  }

  pruneActivityHistory(history: string[]): string[] {
    if (!history) return [];
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const d = new Date();
      d.setDate(d.getDate() - 60);
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const cutoff = formatter.format(d);
      return history.filter((dateStr) => dateStr >= cutoff);
    } catch (_e) {
      const d = new Date();
      d.setDate(d.getDate() - 60);
      const cutoff = d.toISOString().split('T')[0];
      return history.filter((dateStr) => dateStr >= cutoff);
    }
  }

  async checkAndSyncStreakState(userId: string): Promise<UserStreakData> {
    const record = await pb
      .collection('users')
      .getOne<AppUsersResponse>(userId);
    const todayStr = this.getLocalTodayStr();
    const yesterdayStr = this.getLocalYesterdayStr();

    const currentStreakData: UserStreakData = record.streak || {
      currentStreak: 0,
      maxStreak: 0,
      lastActiveDate: '',
      activityHistory: [],
    };

    const updated = { ...currentStreakData };
    updated.activityHistory = this.pruneActivityHistory(
      updated.activityHistory ?? [],
    );
    const lastActive = updated.lastActiveDate;

    if (!lastActive) {
      return currentStreakData;
    }

    if (lastActive === todayStr || lastActive === yesterdayStr) {
      return updated;
    }

    if (updated.currentStreak > 0) {
      updated.currentStreak = 0;
      await pb.collection('users').update(userId, { streak: updated });
    }
    return updated;
  }

  async recordDailyActivity(userId: string): Promise<UserStreakData> {
    const record = await pb
      .collection('users')
      .getOne<AppUsersResponse>(userId);
    const todayStr = this.getLocalTodayStr();
    const yesterdayStr = this.getLocalYesterdayStr();

    const currentStreakData: UserStreakData = record.streak || {
      currentStreak: 0,
      maxStreak: 0,
      lastActiveDate: '',
      activityHistory: [],
    };

    const updated = { ...currentStreakData };

    if (!updated.activityHistory.includes(todayStr)) {
      updated.activityHistory.push(todayStr);
    }
    updated.activityHistory = this.pruneActivityHistory(
      updated.activityHistory,
    );

    if (updated.lastActiveDate === todayStr) {
      return updated;
    }

    if (
      updated.lastActiveDate === yesterdayStr ||
      updated.currentStreak === 0
    ) {
      updated.currentStreak += 1;
      updated.lastActiveDate = todayStr;
    } else {
      updated.currentStreak = 1;
      updated.lastActiveDate = todayStr;
    }

    if (updated.currentStreak > updated.maxStreak) {
      updated.maxStreak = updated.currentStreak;
    }

    await pb.collection('users').update(userId, { streak: updated });
    return updated;
  }
}
