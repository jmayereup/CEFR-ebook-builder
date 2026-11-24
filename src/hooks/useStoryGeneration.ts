/**
 * useStoryGeneration — encapsulates all story generation state and handlers.
 *
 * Extracted from App.tsx to make the component smaller and keep generation
 * logic testable in isolation.
 *
 * Owns:
 *  - isGenerating / isAutoGenerating / generationLogs / generationStatus
 *  - abortControllerRef
 *  - handleInitiateStory
 *  - handleGenerateNextChapter
 *  - handleAutoGenerateRemaining
 *  - handleCancelGeneration
 *
 * Callers supply the ambient context the handlers need (current user, API keys,
 * permission flag) via the options object, plus callbacks for side-effects that
 * belong to the parent (navigating, updating selected story/chapter index).
 */

import { useEffect, useRef, useState } from 'react';
import { createStory, dbService } from '../services/db';
import type { IUser } from '../services/types';
import { useUIStore } from '../store/uiStore';
import type { Chapter, Story } from '../types';
import {
  calculateChapterCreditCost,
  calculateInitialCreditEstimate,
  calculateRemainingCreditCost,
  isFreeModel,
  REGENERATION_CREDIT_COST,
} from '../utils/creditCalculation';
import { fetchWithRetry, sleep } from '../utils/fetchWithRetry';
import { buildApiHeaders, getModelBaseName } from '../utils/modelUtils';
import { checkGenerationPermission } from '../utils/permissionUtils';
import { buildStory, generatePocketBaseId } from '../utils/storyFactory';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface StoryConfig {
  storyId?: string;
  language: string;
  cefrLevel: string;
  genre: string;
  totalChapters: number;
  promptNotes: string;
  chapterLength: number;
  storyTitle?: string;
  outline?: string;
  description?: string;
  model?: string;
  coverModel?: string;
  thinkingLevel?: string;
  thinkingBudget?: number;
  temperature?: number;
  translationLanguage?: string;
  isPublic?: boolean;
  skipChapterGeneration?: boolean;
  copyrightFlag?: boolean;
  copyrightFlagReason?: string;
  embedUrl?: string;
  sourceType?: 'native' | 'gemini_storybook' | 'external';
}

export interface GenerationOptions {
  /** Authenticated user (or null). */
  currentUser: IUser | null;
  isPaid: boolean;
  customOpenRouterKey: string;
  freeModelCount: number;
  monthlyCreditsUsed: number;
  dailyCreditsUsed?: number;
  dailyStoriesCreated?: number;
  onGenerationSuccess?: (
    modelId: string,
    creditsCost: number,
    isNewStory?: boolean,
  ) => void;
  /** Currently open story (needed for next-chapter / auto-generate). */
  selectedStory: Story | null;
  stories: Story[];
  /** Called when the hook wants to show an alert modal. */
  showAlert: (
    title: string,
    message: string,
    type?: 'info' | 'error' | 'warning',
  ) => void;
  /** Called after a new story is created so the parent can navigate. */
  onStoryCreated: (story: Story) => void;

  /** Called inside auto-generate loop so parent's selectedStory state stays fresh. */
  onStoryUpdated: (story: Story) => void;
  /** Called when user needs to log in first. */
  onLoginRequired: () => void;
}

export interface UseStoryGenerationReturn {
  isGenerating: boolean;
  isAutoGenerating: boolean;
  isAutoGenerationPaused: boolean;
  generationLogs: string[];
  generationStatus: string;
  isGeneratingGlossary: boolean;
  glossaryLogs: string[];
  glossaryStatus: string;
  glossaryError: string | null;
  handleInitiateStory: (config: StoryConfig) => Promise<void>;
  handleGenerateNextChapter: (chapterGuidance?: string) => Promise<void>;
  handleRegenerateChapter: (
    chapterIndex: number,
    chapterGuidance?: string,
  ) => Promise<void>;
  handleAutoGenerateRemaining: () => Promise<void>;
  handleGenerateGlossary: (
    story: Story,
    modelId?: string,
    translationLanguage?: string,
    forceRegenerate?: boolean,
    targetChapterNumber?: number,
  ) => Promise<void>;
  handleCancelGeneration: () => void;
}

interface ServerStoryJobSnapshot {
  storyId: string;
  mode: 'initiate' | 'auto-remaining';
  status: 'running' | 'completed' | 'failed' | 'canceled';
  statusMessage: string;
  logs: string[];
  chaptersCount: number;
  totalChapters: number;
  batchesCompleted: number;
  tokensUsed: number;
  completionTokensUsed: number;
  reasoningTokensUsed: number;
  error: string | null;
  startedAt: number;
  updatedAt: number;
  finishedAt: number | null;
}

const JOB_POLL_INTERVAL_MS = 2500;

const sanitizeChapter = (ch: Partial<Chapter>): Chapter => {
  return {
    chapterNumber: ch.chapterNumber ?? 1,
    title: ch.title || `Chapter ${ch.chapterNumber ?? 1}`,
    content: ch.content || '',
    vocabulary: (ch.vocabulary || []).map((v: any) => ({
      word: v?.word || '',
      partOfSpeech: v?.partOfSpeech || '',
      definition: v?.definition || '',
      contextSentence: v?.contextSentence || '',
      transliteration: v?.transliteration || '',
    })),
    summary: ch.summary || '',
  };
};

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export const useStoryGeneration = (
  opts: GenerationOptions,
): UseStoryGenerationReturn => {
  const {
    currentUser,
    isPaid,
    customOpenRouterKey,
    freeModelCount,
    monthlyCreditsUsed,
    dailyCreditsUsed = 0,
    dailyStoriesCreated = 0,
    onGenerationSuccess,
    selectedStory,
    stories,
    showAlert,
    onStoryCreated,

    onStoryUpdated,
    onLoginRequired,
  } = opts;

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [isAutoGenerationPaused, setIsAutoGenerationPaused] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<string[]>([]);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [isGeneratingGlossary, setIsGeneratingGlossary] = useState(false);
  const [glossaryStatus, setGlossaryStatus] = useState<string>('');
  const [glossaryLogs, setGlossaryLogs] = useState<string[]>([]);
  const [glossaryError, setGlossaryError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const glossaryAbortControllerRef = useRef<AbortController | null>(null);
  const pollAbortControllerRef = useRef<AbortController | null>(null);
  const activeJobStoryIdRef = useRef<string | null>(null);

  // Stop client-side polling and single-request fetches on unmount.
  // Intentionally does NOT cancel server-side background story jobs so they
  // finish cleanly even if the user navigates away or closes the tab.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      glossaryAbortControllerRef.current?.abort();
      pollAbortControllerRef.current?.abort();
    };
  }, []);

  const observeServerJob = async (params: {
    storyId: string;
    mode: 'initiate' | 'auto-remaining';
    baseStory: Story;
    initialChapterCount: number;
    isNewStory: boolean;
  }): Promise<void> => {
    const { storyId, mode, baseStory, initialChapterCount, isNewStory } = params;

    pollAbortControllerRef.current?.abort();
    const pollController = new AbortController();
    pollAbortControllerRef.current = pollController;
    const pollSignal = pollController.signal;
    activeJobStoryIdRef.current = storyId;

    if (mode === 'initiate') {
      setIsGenerating(true);
    } else {
      setIsAutoGenerating(true);
    }
    setIsAutoGenerationPaused(false);

    let lastSyncedChapters = initialChapterCount;
    let hasNotifiedCreated = !isNewStory;
    let runningCreditsCharged = baseStory.creditsCharged ?? 0;
    let consecutivePollErrors = 0;

    const syncStoryFromServer = async () => {
      try {
        const freshStory = await dbService.fetchStory(storyId);
        if (!freshStory) return;

        const freshCount = freshStory.chapters?.length ?? 0;
        if (freshCount > lastSyncedChapters) {
          let deltaCredits = 0;
          if (!isFreeModel(freshStory.model || baseStory.model)) {
            for (let chNum = lastSyncedChapters + 1; chNum <= freshCount; chNum++) {
              const chapterCost = calculateChapterCreditCost(
                chNum,
                chNum - 1,
                freshStory.chapterLength || baseStory.chapterLength || 300,
                freshStory.model ?? baseStory.model ?? '',
                freshStory.initialCreditsEstimate ?? baseStory.initialCreditsEstimate,
                runningCreditsCharged,
              );
              deltaCredits += chapterCost;
              runningCreditsCharged += chapterCost;
            }
          }

          if (onGenerationSuccess) {
            onGenerationSuccess(
              freshStory.model || baseStory.model || '~deepseek/deepseek-flash-latest',
              deltaCredits,
              !hasNotifiedCreated,
            );
          }

          const mergedStory: Story = {
            ...baseStory,
            ...freshStory,
            creditsCharged: runningCreditsCharged,
            isUnsaved: false,
          };

          lastSyncedChapters = freshCount;
          if (!hasNotifiedCreated) {
            hasNotifiedCreated = true;
            onStoryCreated(mergedStory);
          } else {
            onStoryUpdated(mergedStory);
          }
        }
      } catch (syncErr) {
        console.warn('[useStoryGeneration] Failed to sync story from PocketBase:', syncErr);
      }
    };

    try {
      while (!pollSignal.aborted) {
        const headers = buildApiHeaders(customOpenRouterKey);
        let job: ServerStoryJobSnapshot | null = null;

        try {
          const res = await fetch(`/api/stories/jobs/${encodeURIComponent(storyId)}`, {
            method: 'GET',
            headers,
            signal: pollSignal,
          });
          if (!res.ok) {
            throw new Error(`Status check failed (${res.status})`);
          }
          const data = await res.json();
          job = (data?.job as ServerStoryJobSnapshot | null) ?? null;
          consecutivePollErrors = 0;
        } catch (pollErr: unknown) {
          if (pollSignal.aborted || (pollErr as { name?: string })?.name === 'AbortError') {
            return;
          }
          consecutivePollErrors++;
          if (consecutivePollErrors >= 6) {
            throw pollErr;
          }
          await sleep(JOB_POLL_INTERVAL_MS, pollSignal);
          continue;
        }

        if (!job) {
          // Job no longer in server memory (e.g., server restarted or expired);
          // sync whatever chapters were saved to PocketBase and stop polling.
          await syncStoryFromServer();
          break;
        }

        if (job.statusMessage) {
          setGenerationStatus(job.statusMessage);
        }
        if (Array.isArray(job.logs) && job.logs.length > 0) {
          setGenerationLogs(job.logs);
        }

        if (job.chaptersCount > lastSyncedChapters) {
          await syncStoryFromServer();
        }

        if (job.status === 'completed') {
          await syncStoryFromServer();
          break;
        }

        if (job.status === 'failed') {
          await syncStoryFromServer();
          showAlert(
            mode === 'initiate' ? 'Story Initiation Failed' : 'Auto-Write Interrupted',
            job.error || 'Server-side generation failed.',
            'error',
          );
          break;
        }

        if (job.status === 'canceled') {
          await syncStoryFromServer();
          showAlert(
            mode === 'initiate' ? 'Generation Canceled' : 'Auto-Write Canceled',
            'Story generation was canceled.',
            'info',
          );
          break;
        }

        await sleep(JOB_POLL_INTERVAL_MS, pollSignal);
      }
    } catch (err: unknown) {
      if (pollSignal.aborted || (err as { name?: string })?.name === 'AbortError') {
        return;
      }
      const e = err as { message?: string };
      showAlert(
        'Connection Lost',
        `Lost connection while tracking progress (${e.message || 'network error'}). Generation will continue on the server — reopen this story to check progress.`,
        'warning',
      );
    } finally {
      if (activeJobStoryIdRef.current === storyId) {
        activeJobStoryIdRef.current = null;
      }
      if (pollAbortControllerRef.current === pollController) {
        pollAbortControllerRef.current = null;
      }
      setIsGenerating(false);
      setIsAutoGenerating(false);
      setGenerationStatus('');
      setGenerationLogs([]);
    }
  };

  // Re-attach to any running server-side job when the user opens or reloads a story
  useEffect(() => {
    const storyId = selectedStory?.id;
    if (!storyId || !currentUser) return;
    if (activeJobStoryIdRef.current === storyId) return;

    let cancelled = false;
    const checkExistingJob = async () => {
      try {
        const headers = buildApiHeaders(customOpenRouterKey);
        const res = await fetch(
          `/api/stories/jobs/${encodeURIComponent(storyId)}`,
          { method: 'GET', headers },
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const job = data?.job as ServerStoryJobSnapshot | null;
        if (!cancelled && job && job.status === 'running') {
          void observeServerJob({
            storyId,
            mode: job.mode,
            baseStory: selectedStory,
            initialChapterCount: selectedStory.chapters?.length ?? 0,
            isNewStory: (selectedStory.chapters?.length ?? 0) === 0,
          });
        }
      } catch {
        // Ignore transient status check errors on mount
      }
    };

    void checkExistingJob();
    return () => {
      cancelled = true;
    };
  }, [selectedStory?.id, currentUser?.uid]);

  const runNarrativeMaintenance = async (
    story: Story,
    _nextChapterNum: number,
    _headers: Record<string, string>,
  ): Promise<Story> => {
    // Automated milestones are disabled to simplify story generation and avoid model confusion.
    return story;
  };

  // ---------------------------------------------------------------------------
  // Cancel helper
  // ---------------------------------------------------------------------------

  const handleCancelGeneration = () => {
    const activeJobId = activeJobStoryIdRef.current;
    if (activeJobId) {
      const headers = buildApiHeaders(customOpenRouterKey);
      void fetch(`/api/stories/jobs/${encodeURIComponent(activeJobId)}/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: currentUser?.uid }),
      }).catch((err) => {
        console.warn('[useStoryGeneration] Failed to cancel server job:', err);
      });
      activeJobStoryIdRef.current = null;
    }
    pollAbortControllerRef.current?.abort();
    pollAbortControllerRef.current = null;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsGenerating(false);
    setIsAutoGenerating(false);
    setIsAutoGenerationPaused(false);
    setGenerationStatus('');
    setGenerationLogs([]);
    setIsGeneratingGlossary(false);
    setGlossaryStatus('');
    setGlossaryLogs([]);
    setGlossaryError(null);
  };

  // ---------------------------------------------------------------------------
  // Create story + generate Chapter 1
  // ---------------------------------------------------------------------------

  const handleInitiateStory = async (config: StoryConfig): Promise<void> => {
    if (!currentUser) {
      onLoginRequired();
      return;
    }

    if (config.embedUrl) {
      try {
        setIsGenerating(true);
        const newStoryId = config.storyId || generatePocketBaseId();
        const newStory = buildStory({
          storyId: newStoryId,
          config: {
            ...config,
            totalChapters: 1,
            sourceType: config.sourceType || 'gemini_storybook',
          },
          chapters: [],
          currentUser,
          initialCreditsEstimate: 0,
          creditsCharged: 0,
        });
        newStory.isCompleted = true;
        newStory.isUnsaved = true;

        await dbService.createStory(newStory);
        newStory.isUnsaved = false;
        onStoryCreated(newStory);
      } catch (err: any) {
        showAlert(
          'Story Import Failed',
          err.message || 'Failed to save embedded Gemini story.',
          'error',
        );
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    const isAdmin = currentUser?.isAdmin === true;
    if (
      !isPaid &&
      !isAdmin &&
      !customOpenRouterKey &&
      config.totalChapters > 10
    ) {
      showAlert(
        'Chapter Limit Reached',
        'Free tier members are limited to a maximum of 10 chapters per story. Configure your own OpenRouter API key in Settings for longer stories.',
        'warning',
      );
      return;
    }

    const batchCount = Math.min(5, config.totalChapters);
    const freeModel = isFreeModel(config.model);
    const chapterLength = config.chapterLength || 300;

    const initialCreditsEstimate = calculateInitialCreditEstimate(
      config.totalChapters,
      chapterLength,
      config.model ?? '',
    );

    let estimatedCreditsCost = 0;
    if (!freeModel) {
      for (let i = 0; i < batchCount; i++) {
        const chNum = 1 + i;
        estimatedCreditsCost += calculateChapterCreditCost(
          chNum,
          chNum - 1,
          chapterLength,
          config.model ?? '',
          initialCreditsEstimate,
          0,
        );
      }
    }

    const denied = checkGenerationPermission(
      config.model,
      isPaid,
      isAdmin,
      customOpenRouterKey,
      freeModelCount,
      dailyCreditsUsed,
      estimatedCreditsCost,
      batchCount,
      currentUser?.emailVerified ?? true,
      dailyStoriesCreated,
      true,
    );
    if (denied) {
      showAlert(denied.title, denied.message, 'warning');
      return;
    }

    if (config.isPublic === false && !isAdmin) {
      const privateCount = stories.filter(
        (s) =>
          s.creatorId === currentUser.uid &&
          s.isPublic === false &&
          s.copyrightFlag !== true,
      ).length;
      const limit = isPaid ? 100 : 10;
      if (privateCount >= limit) {
        showAlert(
          'Private Story Limit Reached',
          `You currently have ${privateCount} elective private stories. ${isPaid ? 'Paid' : 'Free'} tier users are allowed up to ${limit} private stories at one time. Copyright-flagged stories do not count toward this limit. Please delete some private stories or make them public to generate a new private story.`,
          'warning',
        );
        return;
      }
    }

    const modelBaseName = getModelBaseName(config.model);
    setIsGenerating(true);
    setIsAutoGenerationPaused(false);
    setGenerationLogs([
      'Analyzing target language guidelines...',
      `Contacting ${modelBaseName} model to draft initial ${batchCount} chapters...`,
    ]);

    // ---------------------------------------------------------------------------
    // Scratch mode: Create the story shell with an empty chapters array so the
    // user can generate chapters one-by-one from the reader.
    // ---------------------------------------------------------------------------
    if (config.skipChapterGeneration) {
      try {
        const newStoryId = config.storyId || generatePocketBaseId();
        const emptyChapter: Chapter = {
          chapterNumber: 1,
          title: 'Chapter 1',
          content: '',
          vocabulary: [],
          summary: '',
        };

        const newStory = buildStory({
          storyId: newStoryId,
          config,
          chapters: [emptyChapter],
          currentUser,
          initialCreditsEstimate,
          creditsCharged: 0,
        });
        newStory.isUnsaved = true;

        if (onGenerationSuccess) {
          onGenerationSuccess(config.model || 'openrouter/free', 0);
        }
        onStoryCreated(newStory);
      } catch (err: unknown) {
        const e = err as { name?: string; message?: string };
        showAlert(
          'Story Creation Failed',
          e.message || 'Verification Error',
          'error',
        );
      } finally {
        setIsGenerating(false);
        setGenerationLogs([]);
      }
      return;
    }

    try {
      const newStoryId = config.storyId || generatePocketBaseId();
      const headers = buildApiHeaders(customOpenRouterKey);

      // Persist the story shell to PocketBase first so server-side generation
      // can save chapters directly even if the user navigates away or closes the tab.
      const shellStory = buildStory({
        storyId: newStoryId,
        config,
        chapters: [],
        currentUser,
        initialCreditsEstimate,
        creditsCharged: 0,
        titleOverride: config.storyTitle,
      });
      await dbService.createStory(shellStory);

      const startRes = await fetch('/api/stories/jobs', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          storyId: newStoryId,
          mode: 'initiate',
          language: config.language,
          cefrLevel: config.cefrLevel,
          genre: config.genre,
          totalChapters: config.totalChapters,
          storyTitle: config.storyTitle || shellStory.title || '',
          outline: config.outline || '',
          promptNotes: config.promptNotes || '',
          previousChapters: [],
          chapterLength: config.chapterLength,
          model: config.model,
          thinkingLevel: config.thinkingLevel,
          thinkingBudget: config.thinkingBudget,
          temperature: config.temperature,
          translationLanguage:
            config.translationLanguage ||
            useUIStore.getState().translationTargetLanguage ||
            'English',
          userId: currentUser?.uid,
          userEmail: currentUser?.email,
        }),
      });

      const startData = await startRes.json().catch(() => ({}));
      if (!startRes.ok || startData.error) {
        throw new Error(
          startData.error ||
            `Failed to start server-side story generation (${startRes.status})`,
        );
      }

      await observeServerJob({
        storyId: newStoryId,
        mode: 'initiate',
        baseStory: shellStory,
        initialChapterCount: 0,
        isNewStory: true,
      });
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === 'AbortError') {
        showAlert(
          'Generation Canceled',
          'Story generation was canceled by user.',
          'info',
        );
      } else {
        showAlert(
          'Story Initiation Failed',
          e.message || 'Verification Error',
          'error',
        );
      }
      setIsGenerating(false);
      setGenerationLogs([]);
    }
  };

  // ---------------------------------------------------------------------------
  // Generate the next single chapter
  // ---------------------------------------------------------------------------

  const handleGenerateNextChapter = async (
    chapterGuidance?: string,
  ): Promise<void> => {
    if (!selectedStory) return;
    if (!currentUser) {
      showAlert(
        'Authentication Required',
        'Please log in to continue writing chapters.',
        'warning',
      );
      return;
    }

    const isAdmin = currentUser?.isAdmin === true;
    const currentChapters = selectedStory.chapters?.length ?? 0;
    const nextChapterNumber = currentChapters + 1;

    if (!isPaid && !isAdmin && !customOpenRouterKey && nextChapterNumber > 10) {
      showAlert(
        'Chapter Limit Reached',
        'Free tier members are limited to a maximum of 10 chapters per story. Configure your own OpenRouter API key in Settings to add more chapters.',
        'warning',
      );
      return;
    }

    const actualCharge = isFreeModel(selectedStory.model)
      ? 0
      : calculateChapterCreditCost(
          nextChapterNumber,
          currentChapters,
          selectedStory.chapterLength || 300,
          selectedStory.model ?? '',
          selectedStory.initialCreditsEstimate,
          selectedStory.creditsCharged,
        );

    const denied = checkGenerationPermission(
      selectedStory.model,
      isPaid,
      isAdmin,
      customOpenRouterKey,
      freeModelCount,
      dailyCreditsUsed,
      actualCharge,
      1,
      currentUser?.emailVerified ?? true,
      dailyStoriesCreated,
      false,
    );
    if (denied) {
      showAlert(denied.title, denied.message, 'warning');
      return;
    }

    setIsGenerating(true);
    setIsAutoGenerationPaused(false);
    setGenerationStatus(`Writing Chapter ${nextChapterNumber}...`);

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const headers = buildApiHeaders(customOpenRouterKey);

      // Run Narrative Maintenance milestones (Bible, Audits, Tone Refresh)
      const maintenanceStory = await runNarrativeMaintenance(
        selectedStory,
        nextChapterNumber,
        headers,
      );

      const response = await fetchWithRetry(
        '/api/stories/generate-chapter',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            storyId: maintenanceStory.id,
            language: maintenanceStory.language,
            cefrLevel: maintenanceStory.cefrLevel,
            genre: maintenanceStory.genre,
            totalChapters: maintenanceStory.totalChapters,
            chapterNumber: nextChapterNumber,
            storyTitle: maintenanceStory.title,
            outline: maintenanceStory.outline || '',
            chapterGuidance: chapterGuidance || '',
            previousChapters: maintenanceStory.chapters || [],
            promptNotes: maintenanceStory.promptNotes || '',
            chapterLength: maintenanceStory.chapterLength || 300,
            model: maintenanceStory.model,
            thinkingLevel: maintenanceStory.thinkingLevel,
            thinkingBudget: maintenanceStory.thinkingBudget,
            temperature: maintenanceStory.temperature,
            translationLanguage:
              maintenanceStory.translationLanguage ||
              useUIStore.getState().translationTargetLanguage ||
              'English',
            storyBible: maintenanceStory.storyBible || null,
            toneRefreshGuidance: maintenanceStory.toneRefreshGuidance || '',
            consistencyAudits: maintenanceStory.consistencyAudits || [],
            userId: currentUser?.uid,
            userEmail: currentUser?.email,
          }),
        },
        {
          maxRetries: 6,
          initialDelay: 4000,
          factor: 2,
          signal,
          onAttemptStart: (attempt) => {
            setGenerationStatus(
              `Writing Chapter ${nextChapterNumber} (Attempt ${attempt}/7)...`,
            );
          },
          onRetry: (attempt, remainingMs, error) => {
            const seconds = Math.ceil(remainingMs / 1000);
            setGenerationStatus(
              `Attempt ${attempt} failed: ${(error as Error).message}. Retrying in ${seconds}s...`,
            );
          },
        },
      );

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      const newChapter: Chapter = sanitizeChapter({
        chapterNumber: nextChapterNumber,
        title: data.chapterTitle,
        content: data.content,
        vocabulary: data.vocabulary,
        summary: data.summary,
      });
      const updatedChapters = [
        ...(maintenanceStory.chapters || []),
        newChapter,
      ].sort((a, b) => a.chapterNumber - b.chapterNumber);
      const updatedCreditsCharged =
        (maintenanceStory.creditsCharged ?? 0) + actualCharge;
      if (onGenerationSuccess) {
        onGenerationSuccess(
          maintenanceStory.model || '~deepseek/deepseek-flash-latest',
          actualCharge,
        );
      }

      onStoryUpdated({
        ...maintenanceStory,
        chapters: updatedChapters,
        isCompleted: updatedChapters.length >= maintenanceStory.totalChapters,
        creditsCharged: updatedCreditsCharged,
        isUnsaved: true,
      });
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === 'AbortError') {
        showAlert(
          'Generation Canceled',
          `Writing chapter ${nextChapterNumber} was canceled by user.`,
          'info',
        );
      } else {
        showAlert(
          'Generation Failed',
          `Failed to write chapter ${nextChapterNumber}: ${e.message}`,
          'error',
        );
      }
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
      abortControllerRef.current = null;
    }
  };

  // ---------------------------------------------------------------------------
  // Regenerate an existing chapter
  // ---------------------------------------------------------------------------

  const handleRegenerateChapter = async (
    chapterIndex: number,
    chapterGuidance?: string,
  ): Promise<void> => {
    if (!selectedStory) return;
    if (!currentUser) {
      showAlert(
        'Authentication Required',
        'Please log in to continue regenerating chapters.',
        'warning',
      );
      return;
    }

    const isAdmin = currentUser?.isAdmin === true;
    const chapterNumber = chapterIndex + 1;
    const regenerationsCount = selectedStory.regenerationsCount ?? 0;

    const baseCost = isFreeModel(selectedStory.model)
      ? 0
      : calculateChapterCreditCost(
          chapterNumber,
          chapterNumber - 1,
          selectedStory.chapterLength || 300,
          selectedStory.model ?? '',
          selectedStory.initialCreditsEstimate,
          selectedStory.creditsCharged,
        );

    const actualCharge = REGENERATION_CREDIT_COST;

    const denied = checkGenerationPermission(
      selectedStory.model,
      isPaid,
      isAdmin,
      customOpenRouterKey,
      freeModelCount,
      dailyCreditsUsed,
      actualCharge,
      1,
      currentUser?.emailVerified ?? true,
      dailyStoriesCreated,
      false,
    );
    if (denied) {
      showAlert(denied.title, denied.message, 'warning');
      return;
    }

    setIsGenerating(true);
    setIsAutoGenerationPaused(false);
    setGenerationStatus(`Regenerating Chapter ${chapterNumber}...`);

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const headers = buildApiHeaders(customOpenRouterKey);

      const response = await fetchWithRetry(
        '/api/stories/generate-chapter',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            storyId: selectedStory.id,
            language: selectedStory.language,
            cefrLevel: selectedStory.cefrLevel,
            genre: selectedStory.genre,
            totalChapters: selectedStory.totalChapters,
            chapterNumber: chapterNumber,
            storyTitle: selectedStory.title,
            outline: selectedStory.outline || '',
            chapterGuidance: chapterGuidance || '',
            previousChapters: (selectedStory.chapters || []).slice(
              0,
              chapterIndex,
            ),
            promptNotes: selectedStory.promptNotes || '',
            chapterLength: selectedStory.chapterLength || 300,
            model: selectedStory.model,
            thinkingLevel: selectedStory.thinkingLevel,
            thinkingBudget: selectedStory.thinkingBudget,
            temperature: selectedStory.temperature,
            translationLanguage:
              selectedStory.translationLanguage ||
              useUIStore.getState().translationTargetLanguage ||
              'English',
            storyBible: selectedStory.storyBible || null,
            toneRefreshGuidance: selectedStory.toneRefreshGuidance || '',
            consistencyAudits: selectedStory.consistencyAudits || [],
            userId: currentUser?.uid,
            userEmail: currentUser?.email,
          }),
        },
        {
          maxRetries: 6,
          initialDelay: 4000,
          factor: 2,
          signal,
          onAttemptStart: (attempt) => {
            setGenerationStatus(
              `Regenerating Chapter ${chapterNumber} (Attempt ${attempt}/7)...`,
            );
          },
          onRetry: (attempt, remainingMs, error) => {
            const seconds = Math.ceil(remainingMs / 1000);
            setGenerationStatus(
              `Attempt ${attempt} failed: ${(error as Error).message}. Retrying in ${seconds}s...`,
            );
          },
        },
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const regeneratedChapter: Chapter = sanitizeChapter({
        chapterNumber: chapterNumber,
        title: data.chapterTitle,
        content: data.content,
        vocabulary: data.vocabulary,
        summary: data.summary,
      });

      const updatedChapters = [...(selectedStory.chapters || [])];
      updatedChapters[chapterIndex] = regeneratedChapter;
      updatedChapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

      const updatedRegenerationsCount =
        (selectedStory.regenerationsCount ?? 0) + 1;
      const storyTitleUpdate =
        chapterNumber === 1 && data.storyTitle ? data.storyTitle : undefined;
      if (onGenerationSuccess) {
        onGenerationSuccess(
          selectedStory.model || '~deepseek/deepseek-flash-latest',
          actualCharge,
        );
      }

      onStoryUpdated({
        ...selectedStory,
        chapters: updatedChapters,
        ...(storyTitleUpdate ? { title: storyTitleUpdate } : {}),
        regenerationsCount: updatedRegenerationsCount,
        isUnsaved: true,
      });
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === 'AbortError') {
        showAlert(
          'Generation Canceled',
          `Regenerating chapter ${chapterNumber} was canceled by user.`,
          'info',
        );
      } else {
        showAlert(
          'Generation Failed',
          `Failed to regenerate chapter ${chapterNumber}: ${e.message}`,
          'error',
        );
      }
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
      abortControllerRef.current = null;
    }
  };

  // ---------------------------------------------------------------------------
  // Auto-generate all remaining chapters
  // ---------------------------------------------------------------------------

  const handleAutoGenerateRemaining = async (): Promise<void> => {
    if (!selectedStory) return;
    if (!currentUser) {
      showAlert('Authentication Required', 'Please log in first.', 'warning');
      return;
    }

    const remainingChapters =
      selectedStory.totalChapters - (selectedStory.chapters?.length ?? 0);
    const currentChapters = selectedStory.chapters?.length ?? 0;
    const isAdmin = currentUser?.isAdmin === true;

    if (
      !isPaid &&
      !isAdmin &&
      !customOpenRouterKey &&
      selectedStory.totalChapters > 10
    ) {
      showAlert(
        'Chapter Limit Reached',
        'Free tier members are limited to a maximum of 10 chapters per story. Configure your own OpenRouter API key in Settings to auto-write longer stories.',
        'warning',
      );
      return;
    }

    const actualCreditsCost = isFreeModel(selectedStory.model)
      ? 0
      : calculateRemainingCreditCost(
          currentChapters,
          selectedStory.totalChapters,
          selectedStory.chapterLength || 300,
          selectedStory.model ?? '',
          selectedStory.initialCreditsEstimate,
          selectedStory.creditsCharged,
        );

    const denied = checkGenerationPermission(
      selectedStory.model,
      isPaid,
      isAdmin,
      customOpenRouterKey,
      freeModelCount,
      dailyCreditsUsed,
      actualCreditsCost,
      remainingChapters,
      currentUser?.emailVerified ?? true,
      dailyStoriesCreated,
      false,
    );
    if (denied) {
      showAlert(denied.title, denied.message, 'warning');
      return;
    }

    setIsAutoGenerating(true);
    setIsAutoGenerationPaused(false);
    setGenerationStatus('Starting server-side auto-write...');

    try {
      // Ensure the story exists in PocketBase before starting the server job
      if (selectedStory.isUnsaved) {
        await dbService.createStory(selectedStory);
      }

      const headers = buildApiHeaders(customOpenRouterKey);
      const startRes = await fetch('/api/stories/jobs', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          storyId: selectedStory.id,
          mode: 'auto-remaining',
          language: selectedStory.language,
          cefrLevel: selectedStory.cefrLevel,
          genre: selectedStory.genre,
          totalChapters: selectedStory.totalChapters,
          storyTitle: selectedStory.title,
          outline: selectedStory.outline || '',
          promptNotes: selectedStory.promptNotes || '',
          previousChapters: selectedStory.chapters || [],
          chapterLength: selectedStory.chapterLength || 300,
          model: selectedStory.model,
          thinkingLevel: selectedStory.thinkingLevel,
          thinkingBudget: selectedStory.thinkingBudget,
          temperature: selectedStory.temperature,
          translationLanguage:
            selectedStory.translationLanguage ||
            useUIStore.getState().translationTargetLanguage ||
            'English',
          userId: currentUser?.uid,
          userEmail: currentUser?.email,
        }),
      });

      const startData = await startRes.json().catch(() => ({}));
      if (!startRes.ok || startData.error) {
        throw new Error(
          startData.error ||
            `Failed to start server-side auto-write (${startRes.status})`,
        );
      }

      await observeServerJob({
        storyId: selectedStory.id,
        mode: 'auto-remaining',
        baseStory: selectedStory,
        initialChapterCount: selectedStory.chapters?.length ?? 0,
        isNewStory: false,
      });
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === 'AbortError') {
        showAlert(
          'Auto-Write Canceled',
          'Auto-write remaining chapters was canceled by user.',
          'info',
        );
      } else {
        showAlert(
          'Auto-Write Interrupted',
          `Auto-write interrupted: ${e.message}`,
          'error',
        );
      }
      setIsAutoGenerating(false);
      setGenerationStatus('');
    }
  };

  // ---------------------------------------------------------------------------
  // Generate glossary for all completed chapters (deferred post-completion)
  // ---------------------------------------------------------------------------

  const handleGenerateGlossary = async (
    story: Story,
    modelId?: string,
    translationLanguage?: string,
    forceRegenerate: boolean = false,
    targetChapterNumber?: number,
  ): Promise<void> => {
    if (!currentUser) {
      showAlert('Authentication Required', 'Please log in first.', 'warning');
      return;
    }

    const chapters = story.chapters ?? [];
    const isBilingualStory =
      story.cefrLevel === 'A1' || story.cefrLevel === 'Pre-A1';

    let chaptersNeedingGlossary: Chapter[] = [];
    if (typeof targetChapterNumber === 'number') {
      chaptersNeedingGlossary = chapters.filter(
        (ch) => !isBilingualStory && ch.chapterNumber === targetChapterNumber,
      );
    } else if (forceRegenerate) {
      chaptersNeedingGlossary = chapters.filter((ch) => !isBilingualStory);
    } else {
      chaptersNeedingGlossary = chapters.filter(
        (ch) =>
          !isBilingualStory && (!ch.vocabulary || ch.vocabulary.length === 0),
      );
    }

    if (chaptersNeedingGlossary.length === 0) {
      showAlert(
        'Glossary Up To Date',
        'All selected chapters already have vocabulary terms.',
        'info',
      );
      return;
    }

    setIsGeneratingGlossary(true);
    setGlossaryError(null);
    setGlossaryLogs([
      `Generating glossary for ${chaptersNeedingGlossary.length} chapter(s)...`,
    ]);

    glossaryAbortControllerRef.current?.abort();
    glossaryAbortControllerRef.current = new AbortController();
    const signal = glossaryAbortControllerRef.current.signal;
    const headers = buildApiHeaders(customOpenRouterKey);

    try {
      const updatedChapters = [...chapters];
      const targetModel =
        modelId ||
        useUIStore.getState().defaultGlossaryModel ||
        '~z-ai/glm-flash-latest';
      const targetTransLang =
        translationLanguage ||
        story.translationLanguage ||
        useUIStore.getState().translationTargetLanguage ||
        'English';

      let completedCount = 0;

      if (chaptersNeedingGlossary.length === 1) {
        // Single chapter mode
        const ch = chaptersNeedingGlossary[0];
        setGlossaryStatus(
          `Generating vocabulary for Chapter ${ch.chapterNumber}...`,
        );

        const accumulatedWords = forceRegenerate
          ? []
          : updatedChapters
              .filter((c) => c.chapterNumber !== ch.chapterNumber)
              .flatMap((c) => c.vocabulary ?? [])
              .map((v) => v.word.toLowerCase().trim())
              .filter(Boolean);

        const res = await fetch('/api/stories/generate-glossary', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            storyId: story.id,
            chapterNumber: ch.chapterNumber,
            content: ch.content,
            language: story.language,
            cefrLevel: story.cefrLevel,
            existingWords: accumulatedWords,
            userId: currentUser?.uid,
            userEmail: currentUser?.email,
            model: targetModel,
            translationLanguage: targetTransLang,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Glossary request for Chapter ${ch.chapterNumber} failed with status ${res.status}`,
          );
        }

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const vocab = data.vocabulary;
        if (vocab && Array.isArray(vocab)) {
          const chIdx = updatedChapters.findIndex(
            (c) => c.chapterNumber === ch.chapterNumber,
          );
          if (chIdx !== -1) {
            updatedChapters[chIdx] = {
              ...updatedChapters[chIdx],
              vocabulary: vocab as Chapter['vocabulary'],
            };
          }
          completedCount = 1;
          setGlossaryLogs((prev) => [
            ...prev,
            `Glossary generated for Chapter ${ch.chapterNumber} (${vocab.length} terms).`,
          ]);
        }
      } else {
        // Multi-chapter BATCH mode (1 LLM request for all chapters)
        setGlossaryStatus(
          `Generating batch vocabulary for ${chaptersNeedingGlossary.length} chapters at once...`,
        );

        const targetNums = new Set(
          chaptersNeedingGlossary.map((c) => c.chapterNumber),
        );
        const accumulatedWords = forceRegenerate
          ? []
          : updatedChapters
              .filter((c) => !targetNums.has(c.chapterNumber))
              .flatMap((c) => c.vocabulary ?? [])
              .map((v) => v.word.toLowerCase().trim())
              .filter(Boolean);

        const res = await fetch('/api/stories/generate-glossary', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            storyId: story.id,
            chapters: chaptersNeedingGlossary.map((ch) => ({
              chapterNumber: ch.chapterNumber,
              content: ch.content,
            })),
            language: story.language,
            cefrLevel: story.cefrLevel,
            existingWords: accumulatedWords,
            userId: currentUser?.uid,
            userEmail: currentUser?.email,
            model: targetModel,
            translationLanguage: targetTransLang,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Batch glossary request failed with status ${res.status}`,
          );
        }

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const chapterVocabMap = data.chapterVocabulary || {};
        for (const ch of chaptersNeedingGlossary) {
          const vocab = chapterVocabMap[ch.chapterNumber];
          if (vocab && Array.isArray(vocab)) {
            const chIdx = updatedChapters.findIndex(
              (c) => c.chapterNumber === ch.chapterNumber,
            );
            if (chIdx !== -1) {
              updatedChapters[chIdx] = {
                ...updatedChapters[chIdx],
                vocabulary: vocab as Chapter['vocabulary'],
              };
            }
            completedCount++;
            setGlossaryLogs((prev) => [
              ...prev,
              `Glossary generated for Chapter ${ch.chapterNumber} (${vocab.length} terms).`,
            ]);
          } else {
            setGlossaryLogs((prev) => [
              ...prev,
              `[Warning] No glossary returned for Chapter ${ch.chapterNumber}.`,
            ]);
          }
        }
      }

      onStoryUpdated({
        ...story,
        chapters: [...updatedChapters],
        translationLanguage: targetTransLang,
        isUnsaved: true,
      });

      setIsGeneratingGlossary(false);
      setGlossaryStatus('');
      setGlossaryLogs([]);
      setGlossaryError(null);

      showAlert(
        'Glossary Complete',
        `Vocabulary terms have been generated for ${completedCount} chapter(s).`,
        'info',
      );
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e.name === 'AbortError') {
        showAlert(
          'Generation Canceled',
          'Glossary generation was canceled by user.',
          'info',
        );
        setIsGeneratingGlossary(false);
        setGlossaryStatus('');
        setGlossaryLogs([]);
        setGlossaryError(null);
      } else {
        setGlossaryError(
          e.message || 'An error occurred while generating the glossary.',
        );
      }
    } finally {
      glossaryAbortControllerRef.current = null;
    }
  };

  return {
    isGenerating,
    isAutoGenerating,
    isAutoGenerationPaused,
    generationLogs,
    generationStatus,
    isGeneratingGlossary,
    glossaryStatus,
    glossaryLogs,
    glossaryError,
    handleInitiateStory,
    handleGenerateNextChapter,
    handleRegenerateChapter,
    handleAutoGenerateRemaining,
    handleGenerateGlossary,
    handleCancelGeneration,
  };
};
