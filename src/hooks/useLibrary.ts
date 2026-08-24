import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteStory,
  fetchPrivateStories,
  fetchStoriesMetadata,
  fetchStory,
  rateStory,
  updateStoryVisibility,
} from '../services/db';
import {
  getAllCachedStories,
  getStory,
  saveStory,
} from '../services/storage/offlineStorage';
import type { IUser } from '../services/types';
import type { Story } from '../types';

interface UseLibraryOptions {
  currentUser: IUser | null;
  isPaid: boolean;
  isOnline: boolean;
  cachedStoryIds: string[];
  showAlert: (
    title: string,
    message: string,
    type?: 'info' | 'error' | 'warning',
  ) => void;
  ssrData?: any;
}

/** Minimum milliseconds between metadata fetches (client-side debounce). */
const METADATA_FETCH_TTL_MS = 30_000;

export function useLibrary(options: UseLibraryOptions) {
  const { currentUser, isPaid, isOnline, cachedStoryIds, showAlert, ssrData } =
    options;

  const [publicStories, setPublicStories] = useState<Story[]>(() => {
    if (ssrData?.stories) {
      return ssrData.stories;
    }
    if (
      typeof window !== 'undefined' &&
      (window as any).__PRELOADED_DATA__?.stories
    ) {
      return (window as any).__PRELOADED_DATA__.stories;
    }
    return [];
  });
  const [privateStories, setPrivateStories] = useState<Story[]>([]);
  const [offlineCachedStories, setOfflineCachedStories] = useState<Story[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reload cached stories whenever cached IDs update
  useEffect(() => {
    getAllCachedStories().then((cached) => {
      if (cached && cached.length > 0) {
        setOfflineCachedStories(cached);
      }
    });
  }, [cachedStoryIds]);

  const [storiesLoading, setStoriesLoading] = useState<boolean>(() => {
    if (
      ssrData?.stories ||
      (typeof window !== 'undefined' &&
        (window as any).__PRELOADED_DATA__?.stories)
    ) {
      return false;
    }
    return true;
  });
  const [privateStoriesLoading, setPrivateStoriesLoading] = useState(false);
  const lastMetadataFetchRef = useRef<number>(0);

  const loadStoriesMetadata = useCallback(
    async (
      options: {
        refresh?: boolean;
        storyId?: string;
        deleteId?: string;
        forceAll?: boolean;
      } = {},
    ) => {
      // Skip fetch if within TTL cooldown — unless it's a targeted update or manual refresh/forceAll
      const now = Date.now();
      const isTargeted = !!(
        options.storyId ||
        options.deleteId ||
        options.refresh ||
        options.forceAll
      );
      if (
        !isTargeted &&
        now - lastMetadataFetchRef.current < METADATA_FETCH_TTL_MS
      ) {
        return;
      }

      setStoriesLoading(true);
      try {
        const data = await fetchStoriesMetadata(options);
        setPublicStories(data);
        lastMetadataFetchRef.current = Date.now();
      } catch (error) {
        console.error('Failed to load public stories metadata:', error);
        try {
          const cached = await getAllCachedStories();
          if (cached && cached.length > 0) {
            setOfflineCachedStories(cached);
          }
        } catch (cacheErr) {
          console.error('Failed to load cached stories on fallback:', cacheErr);
        }
      } finally {
        setStoriesLoading(false);
      }
    },
    [],
  );

  /** Fetches private stories on demand (one-time getDocs, no real-time listener). */
  const loadPrivateStories = useCallback(async () => {
    if (!currentUser) {
      setPrivateStories([]);
      return;
    }
    setPrivateStoriesLoading(true);
    try {
      const loaded = await fetchPrivateStories(currentUser.uid);
      setPrivateStories(loaded);
    } catch (error) {
      console.error('Failed to fetch private stories:', error);
    } finally {
      setPrivateStoriesLoading(false);
    }
  }, [currentUser]);

  // Derive and memoize merged stories list to prevent extra renders
  const stories = useMemo(() => {
    const map = new Map<string, Story>();
    // Seed with offline cached stories so offline stories are ALWAYS available
    offlineCachedStories.forEach((s) => {
      map.set(s.id, s);
    });
    // Overlay public stories metadata (fresher when online)
    publicStories.forEach((s) => {
      map.set(s.id, s);
    });
    // Overlay private stories
    privateStories.forEach((s) => {
      map.set(s.id, s);
    });
    const merged = Array.from(map.values());
    return merged.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [publicStories, privateStories, offlineCachedStories]);

  const handleSelectStory = async (story: Story): Promise<Story | null> => {
    setStoriesLoading(true);
    try {
      // Check offline storage first
      const cachedStory = await getStory(story.id);

      // If offline or story is an unsaved draft, return cached version immediately
      if (cachedStory && (cachedStory.isUnsaved || !isOnline)) {
        return cachedStory;
      }

      // Try network fetch if online
      if (isOnline) {
        try {
          const fullStory = await fetchStory(story.id);
          if (fullStory) {
            await saveStory(fullStory);
            setOfflineCachedStories((prev) => {
              const exists = prev.some((p) => p.id === fullStory.id);
              return exists
                ? prev.map((p) => (p.id === fullStory.id ? fullStory : p))
                : [...prev, fullStory];
            });
            return fullStory;
          }
        } catch (fetchErr) {
          console.warn(
            `[Library] Network fetch failed for story "${story.id}", falling back to cache:`,
            fetchErr,
          );
          if (cachedStory) {
            return cachedStory;
          }
        }
      }

      // Fallback to cache if exists
      if (cachedStory) {
        return cachedStory;
      }

      if (!isOnline) {
        showAlert(
          'Story Offline',
          'This story is not saved for offline reading. Please connect to the internet to download it.',
          'warning',
        );
      } else {
        showAlert(
          'Story Not Found',
          'The requested story could not be loaded.',
          'error',
        );
      }
      return null;
    } catch (err) {
      console.error('Error loading story chapters:', err);
      const cachedStory = await getStory(story.id);
      if (cachedStory) {
        return cachedStory;
      }
      showAlert(
        'Error Loading Story',
        'Failed to fetch the story chapters. Please check your connection.',
        'error',
      );
      return null;
    } finally {
      setStoriesLoading(false);
    }
  };

  const handleDeleteStory = async (
    storyId: string,
    e: React.MouseEvent | React.KeyboardEvent | null,
    bypassConfirm = false,
  ) => {
    if (e) e.stopPropagation();
    const story = stories.find((s) => s.id === storyId);
    if (!story) return null;

    const isCreator = currentUser && story.creatorId === currentUser.uid;
    const isAdmin = currentUser?.isAdmin === true;

    if (!isAdmin && !isCreator) {
      showAlert(
        'Access Denied',
        'You are not authorized to delete this story.',
        'error',
      );
      return null;
    }
    if (
      !bypassConfirm &&
      !confirm(
        'Are you absolutely sure you want to delete this story? This cannot be undone.',
      )
    )
      return null;

    try {
      await deleteStory(storyId);
      loadStoriesMetadata({ refresh: true, deleteId: storyId });
      return storyId;
    } catch (error) {
      console.error('Delete error:', error);
      showAlert(
        'Delete Failed',
        'Failed to delete story. Permissions restricted.',
        'error',
      );
      return null;
    }
  };

  const handleToggleStoryPrivacy = async (storyId: string) => {
    const story = stories.find((s) => s.id === storyId);
    if (!story) return false;

    const newIsPublic = story.isPublic === false;

    if (newIsPublic === true && story.copyrightFlag === true) {
      showAlert(
        'Copyright-Restricted Story',
        'This story was flagged as containing copyrighted material and cannot be made public. Please contact admin@teacherjake.com if you believe this is a mistake.',
        'warning',
      );
      return false;
    }

    if (newIsPublic === false) {
      const privateCount = stories.filter(
        (s) =>
          s.creatorId === currentUser?.uid &&
          s.isPublic === false &&
          s.copyrightFlag !== true,
      ).length;
      const limit = isPaid ? 100 : 10;
      if (privateCount >= limit) {
        showAlert(
          'Private Story Limit Reached',
          `You currently have ${privateCount} elective private stories. ${isPaid ? 'Paid' : 'Free'} tier users are allowed up to ${limit} private stories at one time. Copyright-flagged stories do not count toward this limit. Please delete some private stories or make them public to enable toggling.`,
          'warning',
        );
        return false;
      }
    }

    try {
      await updateStoryVisibility(storyId, newIsPublic);
      loadStoriesMetadata({ refresh: true, storyId });
      return newIsPublic;
    } catch (err) {
      console.error('Error updating story privacy:', err);
      showAlert(
        'Update Failed',
        'Failed to update story privacy status.',
        'error',
      );
      return false;
    }
  };

  const handleRateStory = async (storyId: string, rating: number) => {
    if (!currentUser) {
      showAlert(
        'Authentication Required',
        'Please sign in to rate books.',
        'warning',
      );
      return;
    }
    try {
      await rateStory(storyId, currentUser.uid, rating);
      loadStoriesMetadata({ refresh: true, storyId });
    } catch (error) {
      console.error('Rating error:', error);
      showAlert(
        'Rating Failed',
        'Failed to save rating. Permissions restricted or connection error.',
        'error',
      );
    }
  };

  // Load stories metadata on login/logout or tab switch
  // biome-ignore lint/correctness/useExhaustiveDependencies: Refetch metadata on authentication status changes
  useEffect(() => {
    loadStoriesMetadata();
  }, [currentUser?.uid, currentUser?.email, loadStoriesMetadata]);

  // Clear private stories when user logs out
  useEffect(() => {
    if (!currentUser) {
      setPrivateStories([]);
    }
  }, [currentUser]);

  return {
    stories,
    setPublicStories,
    setPrivateStories,
    storiesLoading,
    privateStoriesLoading,
    loadStoriesMetadata,
    loadPrivateStories,
    handleSelectStory,
    handleDeleteStory,
    handleToggleStoryPrivacy,
    handleRateStory,
  };
}
