import {
  type Dispatch,
  type MouseEvent,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createStory, type RecentlyReadItem } from '../services/db';
import {
  getAllCachedStoryIds,
  removeStory as removeStoryFromOffline,
  saveStory as saveStoryToOffline,
} from '../services/storage/offlineStorage';
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

  const [loadingStoryId, setLoadingStoryId] = useState<string | null>(() => {
    let pathVal = ssrPath;
    if (!pathVal && typeof window !== 'undefined') {
      pathVal = window.location.pathname;
    }
    if (pathVal) {
      const bookMatch = pathVal.match(/^\/book\/([^/]+)/);
      if (bookMatch) {
        const storyId = getStoryIdFromSegment(bookMatch[1]);
        if (
          (ssrData?.story && ssrData.story.id === storyId) ||
          (typeof window !== 'undefined' &&
            (window as any).__PRELOADED_DATA__?.story?.id === storyId)
        ) {
          return null;
        }
        return storyId;
      }
    }
    return null;
  });

  const [loadingStory, setLoadingStory] = useState<Partial<Story> | null>(null);

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

  // Sync active chapter index from recentlyRead when story loads
  useEffect(() => {
    if (!selectedStory || !isUserDataLoaded) return;
    const syncedItem = recentlyRead.find(
      (item) => item.storyId === selectedStory.id,
    );
    if (syncedItem) {
      const currentPath =
        typeof window !== 'undefined' ? window.location.pathname : '';
      const explicitChapterMatch = currentPath.match(
        /^\/book\/[^/]+\/chapter\/\d+/,
      );

      const validIdx =
        syncedItem.chapterIdx >= 0 &&
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

  const [cachedStoryIds, setCachedStoryIds] = useState<string[]>([]);

  useEffect(() => {
    getAllCachedStoryIds().then(setCachedStoryIds);
  }, []);

  const loadingStoryIdRef = useRef(loadingStoryId);
  useEffect(() => {
    loadingStoryIdRef.current = loadingStoryId;
  }, [loadingStoryId]);

  const handleSelectStory = async (
    story: Story,
    overrideChapterIdx?: number,
    targetParagraphIdx?: number,
  ) => {
    setLoadingStory(story);
    setLoadingStoryId(story.id);
    loadingStoryIdRef.current = story.id;
    try {
      const fullStory = await libHandleSelectStory(story);
      // Abort if user navigated away or cleared selection while fetching
      if (loadingStoryIdRef.current !== story.id) {
        return;
      }
      if (!fullStory) {
        setLoadingStory(null);
        setLoadingStoryId(null);
        return;
      }

      setSelectedStory(fullStory);
      setLoadingStory(null);
      setLoadingStoryId(null);
      await saveStoryToOffline(fullStory);
      setCachedStoryIds((prev) => {
        if (prev.includes(story.id)) return prev;
        return [...prev, story.id];
      });

      if (targetParagraphIdx !== undefined && typeof window !== 'undefined') {
        sessionStorage.setItem(
          'target_highlight_paragraph',
          targetParagraphIdx.toString(),
        );
      }

      let idx = 0;
      if (overrideChapterIdx !== undefined) {
        idx = overrideChapterIdx;
      } else {
        const syncedItem = recentlyRead.find(
          (item) => item.storyId === story.id,
        );
        idx = syncedItem ? syncedItem.chapterIdx : 0;
      }

      const validIdx =
        idx >= 0 && idx < (fullStory.chapters?.length ?? 0) ? idx : 0;
      setActiveChapterIdx(validIdx);
      hasRestoredChapterRef.current = story.id;
    } catch (err) {
      if (loadingStoryIdRef.current === story.id) {
        setLoadingStory(null);
        setLoadingStoryId(null);
      }
      throw err;
    }
  };

  const handleDeleteStory = async (
    storyId: string,
    e: any,
    bypassConfirm = false,
  ) => {
    const deletedId = await libHandleDeleteStory(storyId, e, bypassConfirm);
    if (!deletedId) return;

    // Clean up offline storage and local state
    await removeStoryFromOffline(storyId);
    setCachedStoryIds((prev) => prev.filter((id) => id !== storyId));
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
        saveStoryToOffline(updated);
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
      await saveStoryToOffline(updatedStory);

      if (!wasUnsaved) {
        await createStory(updatedStory);
      }

      if (activeChapterIdx >= reindexedChapters.length) {
        const newIdx = Math.max(0, reindexedChapters.length - 1);
        setActiveChapterIdx(newIdx);
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
          'Free members are limited to a maximum of 10 chapters per story. Configure your own OpenRouter API key in Settings to add more chapters.',
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
      await saveStoryToOffline(updatedStory);

      if (!wasUnsaved) {
        await createStory(updatedStory);
      }

      const newIdx = updatedChapters.length - 1;
      setActiveChapterIdx(newIdx);
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

    await saveStoryToOffline(fullStory);
    setCachedStoryIds((prev) => {
      if (prev.includes(story.id)) return prev;
      return [...prev, story.id];
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
    loadingStory,
    setLoadingStory,
    loadingStoryId,
    setLoadingStoryId,
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
