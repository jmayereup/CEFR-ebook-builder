import type { Story } from '../types';
import { buildApiHeaders } from '../utils/modelUtils';
import { cleanCompletedStory } from '../utils/storyCleanup';
import { createStory } from './db';
import {
  getStory,
  removeStory as removeStoryFromOffline,
  saveStory as saveStoryToOffline,
} from './storage/offlineStorage';
import type { IUser } from './types';

/**
 * Ensures an ID conforms to PocketBase custom ID requirements:
 * 15 to 50 lowercase alphanumeric characters (a-z0-9).
 */
export function sanitizePocketBaseId(rawId: string): string {
  if (/^[a-z0-9]{15,50}$/.test(rawId)) {
    return rawId;
  }
  let alphanumeric = rawId.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (alphanumeric.length > 50) {
    alphanumeric = alphanumeric.substring(0, 50);
  } else if (alphanumeric.length < 15) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    while (alphanumeric.length < 15) {
      alphanumeric += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return alphanumeric;
}

export interface TriggerCoverOptions {
  storyId: string;
  force?: boolean;
  onCoverUpdated?: (cover: string, updated: string) => void;
  onRefreshMetadata?: (options: {
    refresh: boolean;
    storyId: string;
  }) => void | Promise<void>;
}

/**
 * Triggers background AI cover generation for a completed story.
 */
export async function triggerStoryCoverGeneration(
  options: TriggerCoverOptions,
): Promise<{ success: boolean; data?: any; error?: string }> {
  const { storyId, force = false, onCoverUpdated, onRefreshMetadata } = options;
  try {
    const res = await fetch('/api/stories/generate-cover/generate', {
      method: 'POST',
      headers: buildApiHeaders(),
      body: JSON.stringify({ storyId, force }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error || 'Failed to generate cover.';
      return { success: false, error: errMsg };
    }
    const data = await res.json();
    const updatedTime = data.updated || new Date().toISOString();
    if (onCoverUpdated) {
      onCoverUpdated(data.cover || '', updatedTime);
    }
    const cachedObj = await getStory(storyId);
    if (cachedObj) {
      if (data.cover) cachedObj.cover = data.cover;
      cachedObj.updated = updatedTime;
      await saveStoryToOffline(cachedObj);
    }
    if (onRefreshMetadata) {
      await onRefreshMetadata({ refresh: true, storyId });
    }
    return { success: true, data };
  } catch (err: any) {
    console.error('Failed to trigger cover generation:', err);
    return { success: false, error: err.message || String(err) };
  }
}

export interface PersistStoryOptions {
  story: Story;
  currentUser?: IUser | null;
  onStoryUpdated?: (updatedStory: Story) => void;
  onRefreshMetadata?: (options: { refresh: boolean; storyId: string }) => void;
  triggerCoverGen?: boolean;
  generatingCoverIds?: Set<string>;
  setGeneratingCoverIds?: (setter: (prev: Set<string>) => Set<string>) => void;
}

export interface PersistStoryResult {
  story: Story;
  success: boolean;
  sanitizedId: string;
  oldId: string;
  error?: any;
}

/**
 * Centralized story persistence handler:
 * 1. Cleans completed story metadata and extracts draft fields.
 * 2. Enforces PocketBase valid custom ID format.
 * 3. Saves locally to IndexedDB immediately.
 * 4. Pushes to PocketBase database.
 * 5. Dispatches background cover generation if story is completed.
 * 6. Handles fallback to unsaved local draft on network failure.
 */
export async function persistStory(
  options: PersistStoryOptions,
): Promise<PersistStoryResult> {
  const {
    story,
    currentUser,
    onStoryUpdated,
    onRefreshMetadata,
    triggerCoverGen = true,
    generatingCoverIds,
    setGeneratingCoverIds,
  } = options;

  const cleaned = cleanCompletedStory(story);
  const oldId = cleaned.id;
  const sanitizedId = sanitizePocketBaseId(oldId);

  const { isUnsaved, ...cleanedStory } = cleaned;
  const storyToSave = {
    ...cleanedStory,
    id: sanitizedId,
    creatorId: currentUser?.uid || cleanedStory.creatorId,
    creatorEmail: currentUser?.email || cleanedStory.creatorEmail,
  } as Story;

  const localStory: Story = {
    ...storyToSave,
    isUnsaved: false,
  };

  // 1. Immediately reflect clean state in UI
  if (onStoryUpdated) {
    onStoryUpdated(localStory);
  }

  // 2. Clean up old offline ID cache if sanitized ID differed
  if (oldId !== sanitizedId) {
    await removeStoryFromOffline(oldId);
  }
  await saveStoryToOffline(localStory);

  // 3. Attempt PocketBase remote persistence
  try {
    await createStory(storyToSave);
    if (onRefreshMetadata) {
      onRefreshMetadata({ refresh: true, storyId: sanitizedId });
    }

    // 4. Background cover generation for completed public stories
    if (
      triggerCoverGen &&
      storyToSave.isCompleted &&
      storyToSave.isPublic !== false &&
      (!generatingCoverIds || !generatingCoverIds.has(sanitizedId))
    ) {
      if (setGeneratingCoverIds) {
        setGeneratingCoverIds((prev) => new Set(prev).add(sanitizedId));
      }
      triggerStoryCoverGeneration({
        storyId: sanitizedId,
        onCoverUpdated: (cover, updated) => {
          if (onStoryUpdated) {
            onStoryUpdated({
              ...localStory,
              cover,
              updated,
            });
          }
        },
        onRefreshMetadata,
      }).finally(() => {
        if (setGeneratingCoverIds) {
          setGeneratingCoverIds((prev) => {
            const next = new Set(prev);
            next.delete(sanitizedId);
            return next;
          });
        }
      });
    }

    return {
      story: localStory,
      success: true,
      sanitizedId,
      oldId,
    };
  } catch (err) {
    console.warn(
      '[PersistStory] PocketBase persistence failed, preserving unsaved local draft:',
      err,
    );
    const fallbackStory: Story = { ...cleaned, isUnsaved: true };
    if (onStoryUpdated) {
      onStoryUpdated(fallbackStory);
    }
    await saveStoryToOffline(fallbackStory);

    return {
      story: fallbackStory,
      success: false,
      sanitizedId,
      oldId,
      error: err,
    };
  }
}
