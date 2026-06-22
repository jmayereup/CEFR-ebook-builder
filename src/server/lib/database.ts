import fs from 'fs';
import path from 'path';
import {
  fetchStoryServer as pbFetchStory,
  getStoriesMetadata as pbGetMetadata,
  initStoriesMetadataListener as pbInitListener,
  saveGenerationLog as pbSaveLog,
  syncUserProfileServer as pbSyncUser,
} from './pocketbase';

const CACHE_FILE_PATH = path.join(process.cwd(), '.metadata-cache-pb.json');

export let storiesMetadataCache: any[] = [];

// Helper to load cache synchronously from disk at startup
function loadCacheFromDiskSync() {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const data = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        storiesMetadataCache = parsed;
      } else if (parsed && Array.isArray(parsed.stories)) {
        storiesMetadataCache = parsed.stories;
      }
      console.log(
        `[Server Database] Synchronously loaded metadata cache for ${storiesMetadataCache.length} stories from disk.`,
      );
    }
  } catch (err) {
    console.error('[Server Database] Failed to load cache from disk:', err);
  }
}

loadCacheFromDiskSync();

export function setStoriesMetadataCache(cache: any[]) {
  storiesMetadataCache = cache;
}

export function getStoriesMetadataSync() {
  return storiesMetadataCache;
}

export function initStoriesMetadataListener() {
  pbInitListener();
}

export async function getStoriesMetadata(options?: any) {
  return pbGetMetadata(options);
}

export async function fetchStoryServer(storyId: string) {
  return pbFetchStory(storyId);
}

export async function saveGenerationLog(log: any) {
  return pbSaveLog(log);
}

export async function syncUserProfileServer(userId: string, updates: any) {
  return pbSyncUser(userId, updates);
}
