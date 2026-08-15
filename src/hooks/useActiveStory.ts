import {
  type Dispatch,
  type MouseEvent,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createStory, type RecentlyReadItem } from '../services/db';
import type { IUser } from '../services/types';
import type { Chapter, Story, VocabularyTerm } from '../types';
import { getStoryIdFromSegment } from '../utils/slugify';
import { cleanCompletedStory } from '../utils/storyCleanup';

interface UseActiveStoryOptions {
  currentUser: IUser | null;
  recentlyRead: RecentlyReadItem[];
  setRecentlyRead: Dispatch<SetStateAction<RecentlyReadItem[]>>;
  isUserDataLoaded?: boolean;
  libHandleSelectStory: (story: Story) => Promise<Story | null>;
  libHandleDeleteStory: (
    storyId: string,
    e: MouseEvent | null,
    bypassConfirm?: boolean,
  ) => Promise<string | null>;
  libHandleToggleStoryPrivacy: (storyId: string) => Promise<boolean>;
  libHandleRateStory: (storyId: string, rating: number) => Promise<void>;
  loadStoriesMetadata: (options?: {
    refresh?: boolean;
    storyId?: string;
    deleteId?: string;
    forceAll?: boolean;
  }) => void;
  showAlert: (
    title: string,
    message: string,
    type?: 'info' | 'error' | 'warning',
  ) => void;
  isPaid: boolean;
  ssrPath?: string;
  ssrData?: any;
}

export function useActiveStory(options: UseActiveStoryOptions) {
  const {
    currentUser,
    recentlyRead,
    setRecentlyRead,
    isUserDataLoaded,
    libHandleSelectStory,
    libHandleDeleteStory,
    libHandleToggleStoryPrivacy,
    libHandleRateStory,
    loadStoriesMetadata,
    showAlert,
    isPaid,
    ssrPath,
    ssrData,
  } = options;

  const [selectedStory, setSelectedStory] = useState<Story | null>(() => {
    if (ssrPath && ssrData?.story) {
      const bookMatch = ssrPath.match(/^\/book\/([^/]+)/);
      if (bookMatch) {
        const storyId = getStoryIdFromSegment(bookMatch[1]);
        if (storyId === ssrData.story.id) {
          return ssrData.story;
        }
      }
    } else if (
      typeof window !== 'undefined' &&
      (window as any).__PRELOADED_DATA__?.story
    ) {
      const bookMatch = window.location.pathname.match(/^\/book\/([^/]+)/);
      if (bookMatch) {
        const storyId = getStoryIdFromSegment(bookMatch[1]);
        if (storyId === (window as any).__PRELOADED_DATA__.story.id) {
          return (window as any).__PRELOADED_DATA__.story;
        }
      }
    }
    return null;
  });

  const [activeChapterIdx, setActiveChapterIdx] = useState<number>(() => {
    let pathVal = ssrPath;
    if (!pathVal && typeof window !== 'undefined') {
      pathVal = window.location.pathname;
    }
    if (pathVal) {
      const bookChapterMatch = pathVal.match(
        /^\/book\/([^/]+)\/chapter\/(\d+)/,
      );
      if (bookChapterMatch) {
        const chapterNum = parseInt(bookChapterMatch[2], 10);
        return chapterNum > 0 ? chapterNum - 1 : 0;
      }
    }
    return 0;
  });

  const hasRestoredChapterRef = useRef<string | null>(null);

  // When recentlyRead loads/updates from cloud, if the active story's chapter was at default 0
  // and the user did not explicitly request a specific chapter via URL, restore the chapter from recentlyRead.
  useEffect(() => {
    if (!selectedStory) {
      hasRestoredChapterRef.current = null;
      return;
    }

    const pathname =
      typeof window !== 'undefined' ? window.location.pathname : ssrPath || '';
    const explicitChapterMatch = pathname.match(
      /^\/book\/[^/]+\/chapter\/(\d+)/,
    );

    if (
      hasRestoredChapterRef.current === selectedStory.id &&
      explicitChapterMatch
    ) {
      return;
    }

    const syncedItem = recentlyRead.find(
      (item) => item.storyId === selectedStory.id,
    );
    if (syncedItem && syncedItem.chapterIdx >= 0) {
      const validIdx =
        syncedItem.chapterIdx < (selectedStory.chapters?.length ?? 0)
          ? syncedItem.chapterIdx
          : 0;
      if (
        validIdx !== activeChapterIdx &&
        (!explicitChapterMatch ||
          hasRestoredChapterRef.current !== selectedStory.id)
      ) {
        setActiveChapterIdx(validIdx);
        hasRestoredChapterRef.current = selectedStory.id;
      }
    }
  }, [selectedStory?.id, recentlyRead, isUserDataLoaded]);

  const [cachedStoryIds, setCachedStoryIds] = useState<string[]>(() => {
    const local =
      typeof window !== 'undefined'
        ? localStorage.getItem('cefr_cached_story_ids')
        : null;
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        console.error('Error parsing cached story IDs:', e);
      }
    }
    return [];
  });

  const handleSelectStory = async (
    story: Story,
    overrideChapterIdx?: number,
    targetParagraphIdx?: number,
  ) => {
    const fullStory = await libHandleSelectStory(story);
    if (!fullStory) return;

    setSelectedStory(fullStory);
    setCachedStoryIds((prev) => {
      if (prev.includes(story.id)) return prev;
      const updated = [...prev, story.id];
      localStorage.setItem('cefr_cached_story_ids', JSON.stringify(updated));
      return updated;
    });

    if (
      targetParagraphIdx !== undefined &&
      typeof window !== 'undefined'
    ) {
      sessionStorage.setItem(
        'target_highlight_paragraph',
        targetParagraphIdx.toString(),
      );
    }

    let idx = 0;
    if (overrideChapterIdx !== undefined) {
      idx = overrideChapterIdx;
    } else {
      const syncedItem = recentlyRead.find((item) => item.storyId === story.id);
      if (syncedItem) {
        idx = syncedItem.chapterIdx;
      } else {
        const savedIdx =
          typeof window !== 'undefined'
            ? localStorage.getItem(`last_read_chapter_${story.id}`)
            : null;
        idx = savedIdx ? parseInt(savedIdx, 10) : 0;
      }
    }

    const validIdx =
      idx >= 0 && idx < (fullStory.chapters?.length ?? 0) ? idx : 0;
    setActiveChapterIdx(validIdx);
    hasRestoredChapterRef.current = story.id;
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `last_read_chapter_${story.id}`,
        validIdx.toString(),
      );
    }
  };

  const handleDeleteStory = async (
    storyId: string,
    e: any,
    bypassConfirm = false,
  ) => {
    const deletedId = await libHandleDeleteStory(storyId, e, bypassConfirm);
    if (!deletedId) return;

    // Clean up local state
    setCachedStoryIds((prev) => {
      const updated = prev.filter((id) => id !== storyId);
      localStorage.setItem('cefr_cached_story_ids', JSON.stringify(updated));
      return updated;
    });
    localStorage.removeItem(`cefr_story_cache_${storyId}`);
    localStorage.removeItem(`last_read_chapter_${storyId}`);
    if (selectedStory?.id === storyId) {
      setSelectedStory(null);
    }
    setRecentlyRead((prev) => {
      const updated = prev.filter((item) => item.storyId !== storyId);
      localStorage.setItem('recently_read', JSON.stringify(updated));
      return updated;
    });
  };

  const handleToggleStoryPrivacy = async (storyId: string) => {
    const newIsPublic = await libHandleToggleStoryPrivacy(storyId);
    setSelectedStory((prev) => {
      if (prev && prev.id === storyId) {
        const updated = { ...prev, isPublic: newIsPublic !== false };
        localStorage.setItem(
          `cefr_story_cache_${storyId}`,
          JSON.stringify(updated),
        );
        return updated;
      }
      return prev;
    });
  };

  const handleRateStory = async (storyId: string, rating: number) => {
    await libHandleRateStory(storyId, rating);
  };

  const handleDeleteChapter = async (chapterIndex: number) => {
    if (!selectedStory) return;
    try {
      const updatedChapters = (selectedStory.chapters ?? []).filter(
        (_, i) => i !== chapterIndex,
      );
      const reindexedChapters = updatedChapters.map((ch, i) => ({
        ...ch,
        chapterNumber: i + 1,
      }));

      const newTotal = Math.max(1, selectedStory.totalChapters - 1);
      const isCompleted = reindexedChapters.length >= newTotal;

      const wasUnsaved = !!selectedStory.isUnsaved;
      const updatedStory = cleanCompletedStory({
        ...selectedStory,
        chapters: reindexedChapters,
        totalChapters: newTotal,
        isCompleted,
        isUnsaved: wasUnsaved,
      });
      setSelectedStory(updatedStory);
      localStorage.setItem(
        `cefr_story_cache_${updatedStory.id}`,
        JSON.stringify(updatedStory),
      );

      if (!wasUnsaved) {
        await createStory(updatedStory);
      }

      if (activeChapterIdx >= reindexedChapters.length) {
        const newIdx = Math.max(0, reindexedChapters.length - 1);
        setActiveChapterIdx(newIdx);
        if (currentUser) {
          localStorage.setItem(
            `last_read_chapter_${selectedStory.id}`,
            newIdx.toString(),
          );
        }
      }
    } catch (err) {
      console.error('Failed to delete chapter:', err);
      const message = err instanceof Error ? err.message : String(err);
      showAlert(
        'Delete Failed',
        `Failed to delete chapter: ${message}`,
        'error',
      );
    }
  };

  const handleSaveNewChapter = async (
    title: string,
    content: string,
    vocabulary: VocabularyTerm[],
  ) => {
    if (!selectedStory) return;
    try {
      const nextChapterNumber = (selectedStory.chapters?.length ?? 0) + 1;
      const isAdmin = currentUser?.isAdmin === true;
      if (!isPaid && !isAdmin && nextChapterNumber > 10) {
        showAlert(
          'Chapter Limit Reached',
          'Free members are limited to a maximum of 10 chapters per story. Upgrade to the Paid Tier to add more chapters.',
          'warning',
        );
        throw new Error('Chapter limit exceeded');
      }

      const newChapter: Chapter = {
        chapterNumber: nextChapterNumber,
        title,
        content,
        vocabulary,
      };

      const updatedChapters = [...(selectedStory.chapters ?? []), newChapter];
      const newTotal = Math.max(
        selectedStory.totalChapters,
        updatedChapters.length,
      );
      const isCompleted = updatedChapters.length >= newTotal;

      const wasUnsaved = !!selectedStory.isUnsaved;
      const updatedStory = cleanCompletedStory({
        ...selectedStory,
        chapters: updatedChapters,
        totalChapters: newTotal,
        isCompleted,
        isUnsaved: wasUnsaved,
      });
      setSelectedStory(updatedStory);
      localStorage.setItem(
        `cefr_story_cache_${updatedStory.id}`,
        JSON.stringify(updatedStory),
      );

      if (!wasUnsaved) {
        await createStory(updatedStory);
      }

      const newIdx = updatedChapters.length - 1;
      setActiveChapterIdx(newIdx);
      if (currentUser) {
        localStorage.setItem(
          `last_read_chapter_${selectedStory.id}`,
          newIdx.toString(),
        );
      }
    } catch (err) {
      console.error('Failed to add custom chapter:', err);
      const message = err instanceof Error ? err.message : String(err);
      showAlert(
        'Error Adding Chapter',
        `Failed to add custom chapter: ${message}`,
        'error',
      );
      throw err;
    }
  };

  const handleDownloadStory = async (story: Story) => {
    const fullStory = await libHandleSelectStory(story);
    if (!fullStory) return;

    setCachedStoryIds((prev) => {
      if (prev.includes(story.id)) return prev;
      const updated = [...prev, story.id];
      localStorage.setItem('cefr_cached_story_ids', JSON.stringify(updated));
      return updated;
    });

    showAlert(
      'Download Complete',
      `"${story.title}" has been saved for offline reading.`,
      'info',
    );
  };

  return {
    selectedStory,
    setSelectedStory,
    activeChapterIdx,
    setActiveChapterIdx,
    cachedStoryIds,
    setCachedStoryIds,
    handleSelectStory,
    handleDownloadStory,
    handleDeleteStory,
    handleToggleStoryPrivacy,
    handleRateStory,
    handleDeleteChapter,
    handleSaveNewChapter,
  };
}
