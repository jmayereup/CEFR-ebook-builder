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
import type { Story } from '../types';
import { countWords } from '../utils/wordCounter';

interface UseLibraryOptions {
  currentUser: { uid: string; email: string | null } | null;
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
    publicStories.forEach((s) => {
      map.set(s.id, s);
    });
    privateStories.forEach((s) => {
      map.set(s.id, s);
    });
    const merged = Array.from(map.values());
    return merged.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [publicStories, privateStories]);

  const handleSelectStory = async (story: Story): Promise<Story | null> => {
    if (!isOnline && !cachedStoryIds.includes(story.id)) {
      showAlert(
        'Story Offline',
        'This story is not saved for offline reading. Please connect to the internet to download it.',
        'warning',
      );
      return null;
    }
    setStoriesLoading(true);
    try {
      const cacheKey = `cefr_story_cache_${story.id}`;
      const cachedStoryStr = localStorage.getItem(cacheKey);
      if (cachedStoryStr) {
        try {
          const cachedStory = JSON.parse(cachedStoryStr) as Story;
          if (cachedStory?.isUnsaved) {
            console.log(
              `[Cache Hit] Loading unsaved draft story ${story.id} ("${story.title}") from localStorage cache.`,
            );
            return cachedStory;
          }
          if (cachedStory?.chapters) {
            const cachedChaptersCount = cachedStory.chapters.length;
            const cachedWordCount = cachedStory.chapters.reduce(
              (sum, ch) => sum + countWords(ch.content, cachedStory.language),
              0,
            );

            const refChaptersCount =
              story.chaptersCount !== undefined
                ? story.chaptersCount
                : story.chapters
                  ? story.chapters.length
                  : 0;

            const refWordCount =
              story.wordCount !== undefined
                ? story.wordCount
                : story.chapters
                  ? story.chapters.reduce(
                      (sum, ch) => sum + countWords(ch.content, story.language),
                      0,
                    )
                  : 0;

            if (
              cachedChaptersCount === refChaptersCount &&
              cachedWordCount === refWordCount
            ) {
              console.log(
                `[Cache Hit] Loading story ${story.id} ("${story.title}") from localStorage cache.`,
              );
              return cachedStory;
            } else {
              console.log(
                `[Cache Mismatch] Story ${story.id} cache mismatch. Cached chapters: ${cachedChaptersCount}, ref: ${refChaptersCount}. Cached wordCount: ${cachedWordCount}, ref: ${refWordCount}.`,
              );
            }
          }
        } catch (e) {
          console.error(`Failed to parse cached story ${story.id}:`, e);
        }
      }

      const fullStory = await fetchStory(story.id);
      if (!fullStory) {
        showAlert(
          'Story Not Found',
          'The requested story could not be loaded.',
          'error',
        );
        return null;
      }
      localStorage.setItem(cacheKey, JSON.stringify(fullStory));
      return fullStory;
    } catch (err) {
      console.error('Error loading story chapters:', err);
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
    const isAdmin = currentUser?.email === 'jmayereup@gmail.com';

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

    if (newIsPublic === false) {
      const privateCount = stories.filter(
        (s) => s.creatorId === currentUser?.uid && s.isPublic === false,
      ).length;
      const limit = isPaid ? 100 : 10;
      if (privateCount >= limit) {
        showAlert(
          'Private Story Limit Reached',
          `You currently have ${privateCount} private stories. ${isPaid ? 'Paid' : 'Free'} tier users are allowed up to ${limit} private stories at one time. Please delete some private stories or make them public to enable toggling.`,
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
