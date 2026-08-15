import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createStoryHighlight,
  deleteStoryHighlight,
  fetchStoryHighlights,
  updateStoryHighlight,
} from '../services/db';
import type { HighlightColor, StoryHighlight } from '../types';

interface UseStoryHighlightsOptions {
  storyId?: string;
  currentUser: { uid: string } | null;
  onUnauthorized?: () => void;
}

export function useStoryHighlights({
  storyId,
  currentUser,
  onUnauthorized,
}: UseStoryHighlightsOptions) {
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [isLoadingHighlights, setIsLoadingHighlights] =
    useState<boolean>(false);

  const userId = currentUser?.uid;

  useEffect(() => {
    if (!storyId || !userId) {
      setHighlights([]);
      setIsLoadingHighlights(false);
      return;
    }

    let isMounted = true;
    setIsLoadingHighlights(true);

    fetchStoryHighlights(userId, storyId)
      .then((data) => {
        if (isMounted) {
          setHighlights(data);
          setIsLoadingHighlights(false);
        }
      })
      .catch((err) => {
        console.error('[useStoryHighlights] Error loading highlights:', err);
        if (isMounted) {
          setIsLoadingHighlights(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [storyId, userId]);

  const addHighlight = useCallback(
    async (params: {
      chapterIndex: number;
      paragraphIndex: number;
      startOffset: number;
      endOffset: number;
      text: string;
      color: HighlightColor;
      note?: string;
    }): Promise<StoryHighlight | null> => {
      if (!userId || !storyId) {
        onUnauthorized?.();
        return null;
      }

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newHighlight: StoryHighlight = {
        id: tempId,
        user: userId,
        story: storyId,
        chapterIndex: params.chapterIndex,
        paragraphIndex: params.paragraphIndex,
        startOffset: params.startOffset,
        endOffset: params.endOffset,
        text: params.text,
        color: params.color,
        note: params.note || '',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      // Optimistic addition
      setHighlights((prev) => [...prev, newHighlight]);

      try {
        const persisted = await createStoryHighlight(userId, {
          user: userId,
          story: storyId,
          chapterIndex: params.chapterIndex,
          paragraphIndex: params.paragraphIndex,
          startOffset: params.startOffset,
          endOffset: params.endOffset,
          text: params.text,
          color: params.color,
          note: params.note || '',
        });

        setHighlights((prev) =>
          prev.map((h) => (h.id === tempId ? persisted : h)),
        );
        return persisted;
      } catch (error) {
        console.error(
          '[useStoryHighlights] Failed to persist highlight:',
          error,
        );
        // Rollback
        setHighlights((prev) => prev.filter((h) => h.id !== tempId));
        return null;
      }
    },
    [userId, storyId, onUnauthorized],
  );

  const updateHighlight = useCallback(
    async (
      highlightId: string,
      updates: { color?: HighlightColor; note?: string; text?: string },
    ): Promise<void> => {
      if (!userId) {
        onUnauthorized?.();
        return;
      }

      const prevHighlight = highlights.find((h) => h.id === highlightId);
      if (!prevHighlight) return;

      // Optimistic update
      setHighlights((prev) =>
        prev.map((h) =>
          h.id === highlightId
            ? { ...h, ...updates, updated: new Date().toISOString() }
            : h,
        ),
      );

      try {
        await updateStoryHighlight(userId, highlightId, updates);
      } catch (error) {
        console.error(
          '[useStoryHighlights] Failed to update highlight:',
          error,
        );
        // Rollback
        setHighlights((prev) =>
          prev.map((h) => (h.id === highlightId ? prevHighlight : h)),
        );
      }
    },
    [userId, highlights, onUnauthorized],
  );

  const removeHighlight = useCallback(
    async (highlightId: string): Promise<void> => {
      if (!userId) {
        onUnauthorized?.();
        return;
      }

      const prevHighlight = highlights.find((h) => h.id === highlightId);
      if (!prevHighlight) return;

      // Optimistic remove
      setHighlights((prev) => prev.filter((h) => h.id !== highlightId));

      try {
        await deleteStoryHighlight(userId, highlightId);
      } catch (error) {
        console.error(
          '[useStoryHighlights] Failed to delete highlight:',
          error,
        );
        // Rollback
        setHighlights((prev) => [...prev, prevHighlight]);
      }
    },
    [userId, highlights, onUnauthorized],
  );

  const getHighlightsForParagraph = useCallback(
    (chapterIdx: number, pIdx: number): StoryHighlight[] => {
      return highlights
        .filter(
          (h) => h.chapterIndex === chapterIdx && h.paragraphIndex === pIdx,
        )
        .sort((a, b) => a.startOffset - b.startOffset);
    },
    [highlights],
  );

  const chapterHighlightsCount = useMemo(() => {
    return highlights.reduce<Record<number, number>>((acc, h) => {
      acc[h.chapterIndex] = (acc[h.chapterIndex] || 0) + 1;
      return acc;
    }, {});
  }, [highlights]);

  return {
    highlights,
    isLoadingHighlights,
    addHighlight,
    updateHighlight,
    removeHighlight,
    getHighlightsForParagraph,
    chapterHighlightsCount,
  };
}
