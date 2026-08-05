import PocketBaseClass from 'pocketbase';

const PocketBase = (PocketBaseClass as any).default || PocketBaseClass;

import fs from 'node:fs';
import path from 'node:path';
import { countWords } from '../../utils/wordCounter';
import { setStoriesMetadataCache } from './database';

const pbUrl =
  process.env.VITE_POCKETBASE_URL || 'https://blog.teacherjake.com/api';
export const pb = new PocketBase(pbUrl);
pb.autoCancellation(false);

// Admin/User authentication on the server if credentials are provided in env
let isAdminAuthenticated = false;
let authPromise: Promise<void> | null = null;

async function ensureAdminAuth() {
  if (isAdminAuthenticated && pb.authStore.isValid) return;
  if (authPromise) return authPromise;

  const userEmail =
    process.env.POCKETBASE_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
  const userPassword =
    process.env.POCKETBASE_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;

  if (!userEmail || !userPassword) return;

  authPromise = (async () => {
    try {
      if (process.env.POCKETBASE_EMAIL) {
        // Authenticate as app user (with isAdmin=true) to avoid Superuser email alerts
        await pb.collection('users').authWithPassword(userEmail, userPassword);
      } else if (typeof (pb as any).admins !== 'undefined') {
        await (pb as any).admins.authWithPassword(userEmail, userPassword);
      } else {
        await pb
          .collection('_superusers')
          .authWithPassword(userEmail, userPassword);
      }
      isAdminAuthenticated = true;
      console.log(
        `[Server PocketBase] Authenticated successfully as ${process.env.POCKETBASE_EMAIL ? 'User (isAdmin)' : 'Admin/Superuser'}.`,
      );
    } catch (err) {
      console.error('[Server PocketBase] Failed to authenticate:', err);
    } finally {
      authPromise = null;
    }
  })();

  return authPromise;
}

// In-memory cache for stories metadata to avoid high read operations on the database
let storiesMetadataCache: any[] = [];
let lastFetchTime = 0;
let isFetching = false;

function updateStoriesMetadataCache(newCache: any[]) {
  storiesMetadataCache = newCache;
  setStoriesMetadataCache(newCache);
}

const CACHE_FILE_PATH = path.join(process.cwd(), '.metadata-cache-pb.json');

function saveCacheToDisk() {
  try {
    const cachePayload = {
      lastFetchTime,
      stories: storiesMetadataCache,
    };
    fs.writeFileSync(
      CACHE_FILE_PATH,
      JSON.stringify(cachePayload, null, 2),
      'utf-8',
    );
    console.log('[Server PB] Successfully saved metadata cache to disk.');
  } catch (err) {
    console.error('[Server PB] Failed to save metadata cache to disk:', err);
  }
}

function loadCacheFromDisk(): boolean {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const data = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);

      if (Array.isArray(parsed)) {
        updateStoriesMetadataCache(parsed);
        const stats = fs.statSync(CACHE_FILE_PATH);
        lastFetchTime = stats.mtimeMs;
      } else if (parsed && Array.isArray(parsed.stories)) {
        updateStoriesMetadataCache(parsed.stories);
        lastFetchTime = parsed.lastFetchTime ?? Date.now();
      } else {
        return false;
      }

      console.log(
        `[Server PB] Loaded metadata cache for ${storiesMetadataCache.length} stories from disk (age: ${Math.round((Date.now() - lastFetchTime) / 1000 / 60)}min).`,
      );
      return true;
    }
  } catch (err) {
    console.error('[Server PB] Failed to load metadata cache from disk:', err);
  }
  return false;
}

export async function refreshStoriesMetadataCache(_forceAll = false) {
  if (isFetching) return;
  isFetching = true;
  try {
    console.log(
      '[Server PB] Refreshing public stories metadata from PocketBase...',
    );
    const records = await pb.collection('stories').getFullList({
      filter: 'isPublic = true',
      sort: '-createdAt',
    });

    let completions: any[] = [];
    try {
      completions = await pb.collection('story_completions').getFullList({
        fields: 'story,user,timesRead',
      });
    } catch (compError) {
      console.warn('[Server PB] Failed to fetch story completions:', compError);
    }

    const completionsMap: Record<string, number> = {};
    for (const comp of completions) {
      const storyId = comp.story;
      const timesRead = comp.timesRead ?? 0;
      if (storyId) {
        completionsMap[storyId] = (completionsMap[storyId] ?? 0) + timesRead;
      }
    }

    const updated = records
      .filter((record: any) => record.copyrightFlag !== true)
      .map((record: any) => {
        const chapters = record.chapters || [];
        // Calculate word count
        let wordCount = 0;
        for (const ch of chapters) {
          if (ch.content) {
            wordCount += countWords(ch.content, record.language);
          }
        }

        return {
          id: record.id,
          title: record.title || '',
          language: record.language || '',
          translationLanguage: record.translationLanguage || '',
          cefrLevel: record.cefrLevel || '',
          genre: record.genre || '',
          totalChapters: record.totalChapters || 1,
          createdAt:
            record.createdAt || record.created || new Date().toISOString(),
          isCompleted: record.isCompleted || false,
          creatorId: record.creatorId || '',
          model: record.model,
          ratings: record.ratings,
          totalReads: completionsMap[record.id] || 0,
          isPublic: record.isPublic !== false,
          copyrightFlag: false,
          chaptersCount: chapters.length,
          wordCount,
          updated: record.updated || record.updatedAt || '',
        };
      });

    updateStoriesMetadataCache(updated);
    lastFetchTime = Date.now();
    saveCacheToDisk();
    console.log(
      `[Server PB] Cached metadata for ${storiesMetadataCache.length} public stories.`,
    );
  } catch (error) {
    console.error('[Server PB] PocketBase metadata fetch error:', error);
    throw error;
  } finally {
    isFetching = false;
  }
}

export function initStoriesMetadataListener() {
  console.log(
    '[Server PB] Initializing PocketBase public stories metadata cache...',
  );
  const loaded = loadCacheFromDisk();
  if (!loaded) {
    refreshStoriesMetadataCache(false).catch((err) => {
      console.error(
        '[Server PB] Failed to initialize public stories metadata cache:',
        err,
      );
    });
  }
}

export async function getStoriesMetadata(options: any = {}): Promise<any[]> {
  const { refresh = false, storyId, deleteId, forceAll = false } = options;

  if (deleteId) {
    updateStoriesMetadataCache(
      storiesMetadataCache.filter((s) => s.id !== deleteId),
    );
    saveCacheToDisk();
    return storiesMetadataCache;
  }

  if (storyId) {
    try {
      const record = await pb.collection('stories').getOne(storyId);
      if (record && record.isPublic !== false && record.copyrightFlag !== true) {
        const chapters = record.chapters || [];
        let wordCount = 0;
        for (const ch of chapters) {
          if (ch.content) {
            wordCount += countWords(ch.content, record.language);
          }
        }

        const completedBy: Record<string, number> = {};
        let totalReads = 0;
        try {
          const comps = await pb.collection('story_completions').getFullList({
            filter: `story = "${storyId}"`,
            fields: 'user,timesRead',
          });
          for (const c of comps) {
            totalReads += c.timesRead ?? 0;
            if (c.user) {
              completedBy[c.user] =
                (completedBy[c.user] ?? 0) + (c.timesRead ?? 0);
            }
          }
        } catch (compError) {
          console.warn(
            `[Server PB] Failed to fetch completions for single story ${storyId}:`,
            compError,
          );
        }

        const mapped = {
          id: record.id,
          title: record.title || '',
          language: record.language || '',
          translationLanguage: record.translationLanguage || '',
          cefrLevel: record.cefrLevel || '',
          genre: record.genre || '',
          totalChapters: record.totalChapters || 1,
          createdAt:
            record.createdAt || record.created || new Date().toISOString(),
          isCompleted: record.isCompleted || false,
          creatorId: record.creatorId || '',
          model: record.model,
          ratings: record.ratings,
          totalReads,
          completedBy,
          isPublic: record.isPublic !== false,
          copyrightFlag: false,
          chaptersCount: chapters.length,
          wordCount,
          description: record.description || '',
          updated: record.updated || record.updatedAt || '',
        };
        updateStoriesMetadataCache(
          [
            ...storiesMetadataCache.filter((s) => s.id !== storyId),
            mapped,
          ].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        );
      } else {
        updateStoriesMetadataCache(
          storiesMetadataCache.filter((s) => s.id !== storyId),
        );
      }
      saveCacheToDisk();
    } catch (err) {
      console.error(
        `[Server PB] Failed to update single story cache: ${storyId}`,
        err,
      );
    }
    return storiesMetadataCache;
  }

  const CACHE_TTL_MS = 86400000;
  if (forceAll || refresh || Date.now() - lastFetchTime > CACHE_TTL_MS) {
    await refreshStoriesMetadataCache(forceAll);
  }

  return storiesMetadataCache;
}

export function getStoriesMetadataSync(): any[] {
  return storiesMetadataCache;
}

export async function fetchStoryServer(storyId: string): Promise<any | null> {
  try {
    const record = await pb.collection('stories').getOne(storyId);
    return record;
  } catch (err) {
    console.error(`[Server PB SSR] Error fetching story ${storyId}:`, err);
    return null;
  }
}

export async function saveGenerationLog(log: any) {
  try {
    await ensureAdminAuth();
    const maskedEmail = log.userEmail
      ? (() => {
          const parts = log.userEmail.split('@');
          if (parts.length !== 2) return 'anonymous';
          const [local, domain] = parts;
          if (local.length <= 2) return `${local[0]}***@${domain}`;
          return `${local[0]}***${local[local.length - 1]}@${domain}`;
        })()
      : 'anonymous';

    await pb.collection('generation_logs').create({
      userId: log.userId || 'anonymous',
      userEmail: maskedEmail,
      model: log.model,
      action: log.action,
      promptLength: log.promptLength,
      responseLength: log.responseLength ?? 0,
      duration: log.duration,
      status: log.status,
      errorMessage: log.errorMessage || null,
      tokensUsed: log.tokensUsed ?? null,
      reasoningTokensUsed: log.reasoningTokensUsed ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      '[Server PB] Failed to save generation log to PocketBase:',
      error,
    );
  }
}

export async function syncUserProfileServer(userId: string, updates: any) {
  try {
    await ensureAdminAuth();
    try {
      await pb.collection('users').update(userId, updates);
    } catch (err: any) {
      if (err.status === 404) {
        // Fallback: create the user record with defaults + updates
        const data = {
          id: userId,
          email: '',
          name: 'Learner',
          photoUrl: '',
          isPaid: false,
          isAdmin: false,
          savedVocab: [],
          bookshelf: [],
          recentlyRead: [],
          streak: null,
          ...updates,
        };
        await pb.collection('users').create(data);
      } else {
        throw err;
      }
    }
  } catch (err) {
    console.error(`[Server PB] Error syncing user profile ${userId}:`, err);
    throw err;
  }
}
