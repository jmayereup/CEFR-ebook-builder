import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchStory, type RecentlyReadItem } from '../services/db';
import { getStory, saveStory } from '../services/storage/offlineStorage';
import type { IUser } from '../services/types';
import type { Story } from '../types';
import { getStoryIdFromSegment, slugify } from '../utils/slugify';
import type { SortBy } from '../utils/storyFilters';

interface UseUrlRoutingOptions {
  selectedStory: Story | null;
  setSelectedStory: (story: Story | null) => void;
  loadingStoryId?: string | null;
  setLoadingStoryId?: (id: string | null) => void;
  activeChapterIdx: number;
  setActiveChapterIdx: (idx: number) => void;
  activeTab:
    | 'browse'
    | 'bookshelf'
    | 'notes'
    | 'create'
    | 'practice'
    | 'admin'
    | 'about';
  setActiveTab: (
    tab:
      | 'browse'
      | 'bookshelf'
      | 'notes'
      | 'create'
      | 'practice'
      | 'admin'
      | 'about',
  ) => void;
  storiesLoading: boolean;
  isOnline: boolean;
  cachedStoryIds: string[];
  currentUser: IUser | null;
  recentlyRead: RecentlyReadItem[];
  stories?: any[];
  showAlert: (
    title: string,
    message: string,
    type?: 'info' | 'error' | 'warning',
  ) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  filterLanguage?: string[];
  setFilterLanguage?: (lang: string[]) => void;
  filterCefrLevel?: string[];
  setFilterCefrLevel?: (level: string[]) => void;
  sortBy?: SortBy;
  setSortBy?: (sort: SortBy) => void;
}

export function useUrlRouting(options: UseUrlRoutingOptions) {
  const {
    selectedStory,
    setSelectedStory,
    loadingStoryId,
    setLoadingStoryId,
    activeChapterIdx,
    setActiveChapterIdx,
    activeTab,
    setActiveTab,
    isOnline,
    currentUser,
    recentlyRead,
    stories = [],
    showAlert,
    searchQuery,
    setSearchQuery,
    filterLanguage,
    setFilterLanguage,
    filterCefrLevel,
    setFilterCefrLevel,
    sortBy,
    setSortBy,
  } = options;

  const [pendingNavigation, setPendingNavigation] = useState<{
    storyId: string;
    chapterNum: number | null;
  } | null>(() => {
    if (typeof window !== 'undefined') {
      const bookChapterMatch = window.location.pathname.match(
        /^\/book\/([^/]+)\/chapter\/(\d+)/,
      );
      const bookMatch = window.location.pathname.match(/^\/book\/([^/]+)/);
      if (bookChapterMatch) {
        return {
          storyId: getStoryIdFromSegment(bookChapterMatch[1]),
          chapterNum: parseInt(bookChapterMatch[2], 10),
        };
      }
      if (bookMatch) {
        return {
          storyId: getStoryIdFromSegment(bookMatch[1]),
          chapterNum: null,
        };
      }
    }
    return null;
  });

  const isFirstRender = useRef(true);
  const loadingStoryIdRef = useRef(loadingStoryId);
  useEffect(() => {
    loadingStoryIdRef.current = loadingStoryId;
  }, [loadingStoryId]);

  // Cancel pending deep-link navigation if loadingStoryId is cleared (e.g. user navigated to a tab)
  useEffect(() => {
    if (!loadingStoryId && pendingNavigation) {
      setPendingNavigation(null);
    }
  }, [loadingStoryId, pendingNavigation]);

  // Helper to parse current URL and update states accordingly
  const handleUrlRouting = useCallback(() => {
    const path = window.location.pathname;

    const bookChapterMatch = path.match(/^\/book\/([^/]+)\/chapter\/(\d+)/);
    const bookMatch = path.match(/^\/book\/([^/]+)/);
    const tabMatch = path.match(
      /^\/(browse|bookshelf|notes|create|practice|admin|about)/,
    );

    // Sync search/filters from URL query parameters
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlCefr = searchParams.get('cefr')
        ? searchParams.get('cefr')?.split(',')
        : [];
      const urlLang = searchParams.get('lang')
        ? searchParams.get('lang')?.split(',')
        : [];
      const urlQ = searchParams.get('q') || '';
      const urlSort = (searchParams.get('sort') || 'newest') as SortBy;

      if (
        setFilterCefrLevel &&
        JSON.stringify(filterCefrLevel) !== JSON.stringify(urlCefr)
      ) {
        setFilterCefrLevel(urlCefr ?? []);
      }
      if (
        setFilterLanguage &&
        JSON.stringify(filterLanguage) !== JSON.stringify(urlLang)
      ) {
        setFilterLanguage(urlLang ?? []);
      }
      if (setSearchQuery && searchQuery !== urlQ) {
        setSearchQuery(urlQ);
      }
      if (setSortBy && sortBy !== urlSort) {
        setSortBy(urlSort);
      }
    }

    if (bookChapterMatch) {
      const storyId = getStoryIdFromSegment(bookChapterMatch[1]);
      const chapterNum = parseInt(bookChapterMatch[2], 10);

      if (
        selectedStory &&
        selectedStory.id === storyId &&
        selectedStory.chapters &&
        selectedStory.chapters.length > 0
      ) {
        const chapterIdx = chapterNum > 0 ? chapterNum - 1 : 0;
        const validIdx =
          chapterIdx < selectedStory.chapters.length ? chapterIdx : 0;
        setActiveChapterIdx(validIdx);
      } else {
        setLoadingStoryId?.(storyId);
        setPendingNavigation({ storyId, chapterNum });
      }
    } else if (bookMatch) {
      const storyId = getStoryIdFromSegment(bookMatch[1]);
      if (
        selectedStory &&
        selectedStory.id === storyId &&
        selectedStory.chapters &&
        selectedStory.chapters.length > 0
      ) {
        const syncedItem = recentlyRead.find(
          (item) => item.storyId === selectedStory.id,
        );
        const idx = syncedItem ? syncedItem.chapterIdx : 0;
        const validIdx =
          idx >= 0 && idx < selectedStory.chapters.length ? idx : 0;
        setActiveChapterIdx(validIdx);
      } else {
        setLoadingStoryId?.(storyId);
        setPendingNavigation({ storyId, chapterNum: null });
      }
    } else if (tabMatch) {
      const tab = tabMatch[1] as
        | 'browse'
        | 'bookshelf'
        | 'notes'
        | 'create'
        | 'practice'
        | 'admin'
        | 'about';
      setLoadingStoryId?.(null);
      setPendingNavigation(null);
      setActiveTab(tab);
      setSelectedStory(null);
    } else {
      setLoadingStoryId?.(null);
      setPendingNavigation(null);
      setActiveTab('browse');
      setSelectedStory(null);
    }
  }, [
    selectedStory,
    setActiveChapterIdx,
    setActiveTab,
    setSelectedStory,
    setLoadingStoryId,
    searchQuery,
    setSearchQuery,
    filterLanguage,
    setFilterLanguage,
    filterCefrLevel,
    setFilterCefrLevel,
    sortBy,
    setSortBy,
    recentlyRead,
  ]);

  const handleUrlRoutingRef = useRef(handleUrlRouting);
  useEffect(() => {
    handleUrlRoutingRef.current = handleUrlRouting;
  });

  // 1. Run routing logic once on initial page load
  useEffect(() => {
    handleUrlRoutingRef.current();
  }, []);

  // 2. Setup popstate listener to handle browser back/forward buttons
  useEffect(() => {
    const onPopState = () => {
      handleUrlRoutingRef.current();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // 3. Resolve pending navigation when stories list updates or finishes loading
  useEffect(() => {
    if (!pendingNavigation) return;
    const { storyId, chapterNum } = pendingNavigation;

    // Abort if loading was cancelled or loadingStoryId no longer matches
    if (!loadingStoryId || loadingStoryId !== storyId) {
      setPendingNavigation(null);
      return;
    }

    let active = true;
    (async () => {
      // Check offline storage first
      let directStory = await getStory(storyId);

      // If online and not an unsaved draft, attempt fetch from DB
      if (isOnline && !directStory?.isUnsaved) {
        try {
          const fetched = await fetchStory(storyId);
          if (fetched) {
            directStory = fetched;
            await saveStory(directStory);
          }
        } catch (fetchErr) {
          console.warn(
            `[Router] Network fetch failed for story "${storyId}", using cached version if available:`,
            fetchErr,
          );
        }
      }

      if (!active || loadingStoryIdRef.current !== storyId) return;

      if (directStory && !directStory.cover) {
        const meta = stories.find((s) => s.id === storyId);
        if (meta?.cover) {
          directStory = { ...directStory, cover: meta.cover };
          await saveStory(directStory);
        }
      }

      if (directStory) {
        const isOwner =
          currentUser && directStory.creatorId === currentUser.uid;
        const isAdmin = currentUser?.isAdmin === true;
        const isCopyrightBlocked = directStory.copyrightFlag === true;
        const isAllowed =
          !isCopyrightBlocked &&
          (directStory.isPublic !== false || isOwner || isAdmin || !isOnline);

        if (isAllowed) {
          if (!active || loadingStoryIdRef.current !== storyId) return;
          setSelectedStory(directStory);
          setLoadingStoryId?.(null);
          if (chapterNum !== null) {
            const chapterIdx = chapterNum > 0 ? chapterNum - 1 : 0;
            const validIdx =
              chapterIdx < (directStory.chapters?.length ?? 0) ? chapterIdx : 0;
            setActiveChapterIdx(validIdx);
          } else {
            const syncedItem = recentlyRead.find(
              (item) => item.storyId === directStory.id,
            );
            const idx = syncedItem ? syncedItem.chapterIdx : 0;
            const validIdx =
              idx >= 0 && idx < (directStory.chapters?.length ?? 0) ? idx : 0;
            setActiveChapterIdx(validIdx);
          }
          setPendingNavigation(null);
          return;
        }
      }

      if (!active || loadingStoryIdRef.current !== storyId) return;

      // If story is not found or user is not allowed to read it
      if (!isOnline) {
        showAlert(
          'Story Offline',
          'This story is not saved for offline reading. Please connect to the internet to download it.',
          'warning',
        );
      } else {
        showAlert(
          'Story Not Found',
          'The requested story could not be found or you do not have permission to view it.',
          'error',
        );
      }
      setLoadingStoryId?.(null);
      setPendingNavigation(null);
      window.history.replaceState(null, '', '/');
      setActiveTab('browse');
      setSelectedStory(null);
    })();

    return () => {
      active = false;
    };
  }, [
    pendingNavigation,
    loadingStoryId,
    currentUser,
    isOnline,
    showAlert,
    recentlyRead,
    setSelectedStory,
    setLoadingStoryId,
    setActiveChapterIdx,
    setActiveTab,
    stories,
  ]);

  // Redirect unsigned-in users away from the bookshelf
  useEffect(() => {
    if (activeTab === 'bookshelf' && !currentUser) {
      setActiveTab('browse');
      setSelectedStory(null);
      window.history.replaceState(null, '', '/');
    }
  }, [activeTab, currentUser, setActiveTab, setSelectedStory]);

  // 4. Synchronize React state changes back to the browser URL
  useEffect(() => {
    // Avoid updating the URL while actively navigating a deep link for this story
    if (pendingNavigation && loadingStoryId === pendingNavigation.storyId)
      return;

    let targetPath = '/';
    const queryParams = new URLSearchParams();

    if (selectedStory) {
      const slug = slugify(selectedStory.title);
      const slugSegment = slug
        ? `${slug}-${selectedStory.id}`
        : selectedStory.id;
      targetPath = `/book/${slugSegment}/chapter/${activeChapterIdx + 1}`;
    } else {
      if (activeTab !== 'browse') {
        targetPath = `/${activeTab}`;
      } else {
        targetPath = '/';
        // Add browse page filters to query params
        if (filterCefrLevel && filterCefrLevel.length > 0) {
          queryParams.set('cefr', filterCefrLevel.join(','));
        }
        if (filterLanguage && filterLanguage.length > 0) {
          queryParams.set('lang', filterLanguage.join(','));
        }
        if (searchQuery) {
          queryParams.set('q', searchQuery);
        }
        if (sortBy && sortBy !== 'newest') {
          queryParams.set('sort', sortBy);
        }
      }
    }

    const queryString = queryParams.toString();
    const targetUrl = queryString ? `${targetPath}?${queryString}` : targetPath;

    if (window.location.pathname + window.location.search !== targetUrl) {
      if (isFirstRender.current) {
        window.history.replaceState(null, '', targetUrl);
      } else {
        window.history.pushState(null, '', targetUrl);
      }
    }
    isFirstRender.current = false;
  }, [
    selectedStory,
    activeChapterIdx,
    activeTab,
    pendingNavigation,
    loadingStoryId,
    searchQuery,
    filterLanguage,
    filterCefrLevel,
    sortBy,
  ]);
}
