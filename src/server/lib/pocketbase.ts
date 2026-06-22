import PocketBaseClass from 'pocketbase';

const PocketBase = (PocketBaseClass as any).default || PocketBaseClass;

import fs from 'fs';
import path from 'path';
import { setStoriesMetadataCache } from './database';

const pbUrl =
  process.env.VITE_POCKETBASE_URL || 'https://blog.teacherjake.com/api';
export const pb = new PocketBase(pbUrl);
pb.autoCancellation(false);

// Admin authentication on the server if credentials are provided in env
let isAdminAuthenticated = false;
async function ensureAdminAuth() {
  if (isAdminAuthenticated && pb.authStore.isValid) return;
  const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
  const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    try {
      await pb.admins.authWithPassword(adminEmail, adminPassword);
      isAdminAuthenticated = true;
      console.log('[Server PocketBase] Authenticated successfully as Admin.');
    } catch (err) {
      console.error(
        '[Server PocketBase] Failed to authenticate as Admin:',
        err,
      );
    }
  }
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

export async function refreshStoriesMetadataCache(forceAll = false) {
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

    const completionsMap: Record<string, Record<string, number>> = {};
    for (const comp of completions) {
      const storyId = comp.story;
      const userId = comp.user;
      const timesRead = comp.timesRead ?? 0;
      if (storyId && userId) {
        if (!completionsMap[storyId]) {
          completionsMap[storyId] = {};
        }
        completionsMap[storyId][userId] =
          (completionsMap[storyId][userId] ?? 0) + timesRead;
      }
    }

    const updated = records.map((record: any) => {
      const chapters = record.chapters || [];
      // Calculate word count
      let wordCount = 0;
      for (const ch of chapters) {
        if (ch.content) {
          wordCount += ch.content.trim().split(/\s+/).length;
        }
      }

      return {
        id: record.id,
        title: record.title || '',
        language: record.language || '',
        cefrLevel: record.cefrLevel || '',
        genre: record.genre || '',
        totalChapters: record.totalChapters || 1,
        createdAt:
          record.createdAt || record.created || new Date().toISOString(),
        isCompleted: record.isCompleted || false,
        description: record.description,
        creatorId: record.creatorId || '',
        creatorEmail: record.creatorEmail,
        model: record.model,
        ratings: record.ratings,
        completedBy: completionsMap[record.id] || {},
        isPublic: record.isPublic !== false,
        chaptersCount: chapters.length,
        wordCount,
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
      if (record && record.isPublic !== false) {
        const chapters = record.chapters || [];
        let wordCount = 0;
        for (const ch of chapters) {
          if (ch.content) {
            wordCount += ch.content.trim().split(/\s+/).length;
          }
        }

        const completedBy: Record<string, number> = {};
        try {
          const comps = await pb.collection('story_completions').getFullList({
            filter: `story = "${storyId}"`,
            fields: 'user,timesRead',
          });
          for (const c of comps) {
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
          cefrLevel: record.cefrLevel || '',
          genre: record.genre || '',
          totalChapters: record.totalChapters || 1,
          createdAt:
            record.createdAt || record.created || new Date().toISOString(),
          isCompleted: record.isCompleted || false,
          description: record.description,
          creatorId: record.creatorId || '',
          creatorEmail: record.creatorEmail,
          model: record.model,
          ratings: record.ratings,
          completedBy,
          isPublic: record.isPublic !== false,
          chaptersCount: chapters.length,
          wordCount,
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
