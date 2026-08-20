import { createStore, del, entries, get, keys, set } from 'idb-keyval';
import type { Story } from '../../types';

// Custom IndexedDB stores
// IndexedDB is only initialized in browser environments (SSR safe)
const storyStore =
  typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
    ? createStore('tj-books-offline-db', 'stories')
    : null;

const metaStore =
  typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
    ? createStore('tj-books-offline-db', 'meta')
    : null;

const GUEST_COMPLETED_KEY = 'guest_completed_story_ids';

/**
 * Get a cached story from IndexedDB.
 */
export async function getStory(id: string): Promise<Story | undefined> {
  if (!storyStore || !id) return undefined;
  try {
    return await get<Story>(id, storyStore);
  } catch (error) {
    console.error(
      `[OfflineStorage] Failed to get story "${id}" from IndexedDB:`,
      error,
    );
    return undefined;
  }
}

/**
 * Save or update a story in IndexedDB.
 */
export async function saveStory(story: Story): Promise<void> {
  if (!storyStore || !story?.id) return;
  try {
    await set(story.id, story, storyStore);
  } catch (error) {
    console.error(
      `[OfflineStorage] Failed to save story "${story.id}" to IndexedDB:`,
      error,
    );
  }
}

/**
 * Remove a cached story from IndexedDB.
 */
export async function removeStory(id: string): Promise<void> {
  if (!storyStore || !id) return;
  try {
    await del(id, storyStore);
  } catch (error) {
    console.error(
      `[OfflineStorage] Failed to remove story "${id}" from IndexedDB:`,
      error,
    );
  }
}

/**
 * Retrieve all story IDs currently cached in IndexedDB.
 */
export async function getAllCachedStoryIds(): Promise<string[]> {
  if (!storyStore) return [];
  try {
    const allKeys = await keys(storyStore);
    return allKeys.map((k) => String(k));
  } catch (error) {
    console.error(
      '[OfflineStorage] Failed to get cached story keys from IndexedDB:',
      error,
    );
    return [];
  }
}

/**
 * Get all cached stories as an array.
 */
export async function getAllCachedStories(): Promise<Story[]> {
  if (!storyStore) return [];
  try {
    const allEntries = await entries<string, Story>(storyStore);
    return allEntries.map(([_, story]) => story);
  } catch (error) {
    console.error(
      '[OfflineStorage] Failed to get all cached stories from IndexedDB:',
      error,
    );
    return [];
  }
}

/**
 * Clear all cached stories from IndexedDB.
 */
export async function clearAllStories(): Promise<void> {
  if (!storyStore) return;
  try {
    const allKeys = await keys(storyStore);
    for (const key of allKeys) {
      await del(key, storyStore);
    }
  } catch (error) {
    console.error('[OfflineStorage] Failed to clear story cache:', error);
  }
}

/**
 * Retrieve guest-completed story IDs from IndexedDB.
 */
export async function getGuestCompletedStoryIds(): Promise<string[]> {
  if (!metaStore) return [];
  try {
    const ids = await get<string[]>(GUEST_COMPLETED_KEY, metaStore);
    return Array.isArray(ids) ? ids : [];
  } catch (error) {
    console.error(
      '[OfflineStorage] Failed to get guest completed story IDs:',
      error,
    );
    return [];
  }
}

/**
 * Persist guest-completed story IDs to IndexedDB.
 */
export async function saveGuestCompletedStoryIds(ids: string[]): Promise<void> {
  if (!metaStore) return;
  try {
    await set(GUEST_COMPLETED_KEY, ids, metaStore);
  } catch (error) {
    console.error(
      '[OfflineStorage] Failed to save guest completed story IDs:',
      error,
    );
  }
}

/**
 * Request persistent browser storage to prevent automatic eviction by the OS/browser.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    navigator.storage.persist
  ) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        console.log(`[OfflineStorage] Persistent storage granted: ${granted}`);
        return granted;
      }
      return true;
    } catch (e) {
      console.warn('[OfflineStorage] Failed to request persistent storage:', e);
    }
  }
  return false;
}

/**
 * One-time migration helper:
 * Scans localStorage for legacy `cefr_story_cache_*`, `cefr_cached_story_ids`,
 * `completed_story_*`, and `last_read_chapter_*` keys.
 * Copies stories & completed states into IndexedDB and purges them from localStorage.
 */
export async function migrateFromLocalStorage(): Promise<{
  migratedStories: number;
  migratedCompletions: number;
}> {
  if (typeof window === 'undefined' || !storyStore) {
    return { migratedStories: 0, migratedCompletions: 0 };
  }

  let migratedStories = 0;
  let migratedCompletions = 0;

  try {
    const keysToRemoveFromLocal: string[] = [];
    const storiesToMigrate: Story[] = [];
    const legacyCompletedIds: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // 1. Migrate full stories: cefr_story_cache_<id>
      if (key.startsWith('cefr_story_cache_')) {
        keysToRemoveFromLocal.push(key);
        const storyRaw = localStorage.getItem(key);
        if (storyRaw) {
          try {
            const parsed = JSON.parse(storyRaw) as Story;
            if (parsed && parsed.id) {
              storiesToMigrate.push(parsed);
            }
          } catch (e) {
            console.error(
              `[OfflineStorage] Failed to parse legacy cached story for key ${key}:`,
              e,
            );
          }
        }
      }

      // 2. Collect legacy completed story keys: completed_story_<id>
      else if (key.startsWith('completed_story_')) {
        keysToRemoveFromLocal.push(key);
        const storyId = key.replace('completed_story_', '');
        if (storyId && localStorage.getItem(key) === 'true') {
          legacyCompletedIds.push(storyId);
        }
      }

      // 3. Remove obsolete fragmented keys: last_read_chapter_*
      else if (key.startsWith('last_read_chapter_')) {
        keysToRemoveFromLocal.push(key);
      }

      // 4. Remove obsolete cached IDs list from localStorage
      else if (key === 'cefr_cached_story_ids') {
        keysToRemoveFromLocal.push(key);
      }
    }

    // Save stories into IndexedDB
    for (const story of storiesToMigrate) {
      await saveStory(story);
      migratedStories++;
    }

    // Merge legacy completed IDs with existing guest completed IDs
    if (legacyCompletedIds.length > 0) {
      const existing = await getGuestCompletedStoryIds();
      const merged = Array.from(new Set([...existing, ...legacyCompletedIds]));
      await saveGuestCompletedStoryIds(merged);
      migratedCompletions = legacyCompletedIds.length;
    }

    // Purge migrated keys from localStorage to free up the 5MB quota
    for (const key of keysToRemoveFromLocal) {
      localStorage.removeItem(key);
    }

    if (migratedStories > 0 || keysToRemoveFromLocal.length > 0) {
      console.log(
        `[OfflineStorage] Migration completed: ${migratedStories} stories and ${migratedCompletions} completions migrated to IndexedDB. ${keysToRemoveFromLocal.length} legacy keys removed from localStorage.`,
      );
    }
  } catch (error) {
    console.error(
      '[OfflineStorage] Error during localStorage migration:',
      error,
    );
  }

  return { migratedStories, migratedCompletions };
}
