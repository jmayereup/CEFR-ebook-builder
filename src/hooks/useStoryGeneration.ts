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
import { useUIStore } from '../store/uiStore';
import type { Chapter, Story } from '../types';
import {
  calculateChapterCreditCost,
  calculateInitialCreditEstimate,
  calculateRemainingCreditCost,
  isFreeModel,
} from '../utils/creditCalculation';
import { fetchWithRetry } from '../utils/fetchWithRetry';
import { buildApiHeaders, getModelBaseName } from '../utils/modelUtils';
import { checkGenerationPermission } from '../utils/permissionUtils';
import { buildStory } from '../utils/storyFactory';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

function generatePocketBaseId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 's'; // Start with 's' to distinguish stories from other records, and ensure it starts with a letter
  for (let i = 0; i < 14; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export interface StoryConfig {
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
  thinkingLevel?: string;
  thinkingBudget?: number;
  temperature?: number;
  translationLanguage?: string;
  isPublic?: boolean;
  skipChapterGeneration?: boolean;
}

export interface GenerationOptions {
  /** Authenticated user (or null). */
  currentUser: { uid: string; email?: string | null } | null;
  isPaid: boolean;
  customOpenRouterKey: string;
  freeModelCount: number;
  monthlyCreditsUsed: number;
  onGenerationSuccess?: (modelId: string, creditsCost: number) => void;
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
  ) => Promise<void>;
  handleCancelGeneration: () => void;
}

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

  // Abort any in-flight request when the hook is unmounted
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

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

    const isAdmin = currentUser?.email === 'jmayereup@gmail.com';
    if (!isPaid && !isAdmin && config.totalChapters > 10) {
      showAlert(
        'Chapter Limit Reached',
        'Free tier members are limited to a maximum of 10 chapters per story. Upgrade to the Paid Tier to write longer stories.',
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
      config.model,
    );

    let estimatedCreditsCost = 0;
    if (!freeModel) {
      for (let i = 0; i < batchCount; i++) {
        const chNum = 1 + i;
        estimatedCreditsCost += calculateChapterCreditCost(
          chNum,
          chNum - 1,
          chapterLength,
          config.model,
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
      monthlyCreditsUsed,
      estimatedCreditsCost,
      batchCount,
    );
    if (denied) {
      showAlert(denied.title, denied.message, 'warning');
      return;
    }

    if (config.isPublic === false) {
      const privateCount = stories.filter(
        (s) => s.creatorId === currentUser.uid && s.isPublic === false,
      ).length;
      const limit = isPaid ? 100 : 10;
      if (privateCount >= limit) {
        showAlert(
          'Private Story Limit Reached',
          `You currently have ${privateCount} private stories. ${isPaid ? 'Paid' : 'Free'} tier users are allowed up to ${limit} private stories at one time. Please delete some private stories or make them public to generate a new private story.`,
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
        const newStoryId = generatePocketBaseId();
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

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const headers = buildApiHeaders(customOpenRouterKey);

      const response = await fetchWithRetry(
        '/api/stories/generate-batch',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            language: config.language,
            cefrLevel: config.cefrLevel,
            genre: config.genre,
            totalChapters: config.totalChapters,
            startChapterNumber: 1,
            storyTitle: config.storyTitle || '',
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
              useUIStore.getState().translationTargetLanguage,
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
            if (attempt === 1) {
              setGenerationLogs([
                'Analyzing target language guidelines...',
                `Contacting ${modelBaseName} model to draft initial ${batchCount} chapters...`,
              ]);
            } else {
              setGenerationLogs((prev) => [
                ...prev,
                `[Attempt ${attempt}/7] Contacting ${modelBaseName} model to draft initial ${batchCount} chapters...`,
              ]);
            }
          },
          onRetry: (attempt, remainingMs, error) => {
            const seconds = Math.ceil(remainingMs / 1000);
            const text = `[Warning] Attempt ${attempt} failed: ${(error as Error).message}. Retrying in ${seconds}s...`;
            setGenerationLogs((prev) => {
              if (
                prev.length > 0 &&
                prev[prev.length - 1].startsWith(
                  `[Warning] Attempt ${attempt} failed`,
                )
              ) {
                return [...prev.slice(0, -1), text];
              }
              return [...prev, text];
            });
          },
        },
      );

      const data = await response.json();
      setGenerationLogs((prev) => [
        ...prev,
        `Chapters 1–${batchCount} successfully graded.`,
        'Saving drafted story to database...',
      ]);

      const newStoryId = generatePocketBaseId();
      const initialChapters: Chapter[] = (data.chapters ?? [])
        .map((ch: any) =>
          sanitizeChapter({
            chapterNumber: ch.chapterNumber,
            title: ch.chapterTitle,
            content: ch.content,
            vocabulary: [],
            summary: ch.summary,
          }),
        )
        .sort((a, b) => a.chapterNumber - b.chapterNumber);

      const newStory = buildStory({
        storyId: newStoryId,
        config,
        chapters: initialChapters,
        currentUser,
        initialCreditsEstimate,
        creditsCharged: estimatedCreditsCost,
        titleOverride: config.storyTitle,
      });
      newStory.isUnsaved = true;

      if (onGenerationSuccess) {
        onGenerationSuccess(
          config.model || 'deepseek/deepseek-v4-flash',
          estimatedCreditsCost,
        );
      }
      setIsGenerating(false);
      setGenerationLogs([]);
      onStoryCreated(newStory);
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
    } finally {
      setIsGenerating(false);
      setGenerationLogs([]);
      abortControllerRef.current = null;
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

    const isAdmin = currentUser?.email === 'jmayereup@gmail.com';
    const currentChapters = selectedStory.chapters?.length ?? 0;
    const nextChapterNumber = currentChapters + 1;

    if (!isPaid && !isAdmin && nextChapterNumber > 10) {
      showAlert(
        'Chapter Limit Reached',
        'Free tier members are limited to a maximum of 10 chapters per story. Upgrade to the Paid Tier to add more chapters.',
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
          selectedStory.model,
          selectedStory.initialCreditsEstimate,
          selectedStory.creditsCharged,
        );

    const denied = checkGenerationPermission(
      selectedStory.model,
      isPaid,
      isAdmin,
      customOpenRouterKey,
      freeModelCount,
      monthlyCreditsUsed,
      actualCharge,
      1,
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
              useUIStore.getState().translationTargetLanguage,
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
          maintenanceStory.model || 'deepseek/deepseek-v4-flash',
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

    const isAdmin = currentUser?.email === 'jmayereup@gmail.com';
    const chapterNumber = chapterIndex + 1;
    const regenerationsCount = selectedStory.regenerationsCount ?? 0;

    const baseCost = isFreeModel(selectedStory.model)
      ? 0
      : calculateChapterCreditCost(
          chapterNumber,
          chapterNumber - 1,
          selectedStory.chapterLength || 300,
          selectedStory.model,
          selectedStory.initialCreditsEstimate,
          selectedStory.creditsCharged,
        );

    // First 3 regenerations are free
    const actualCharge = regenerationsCount < 3 ? 0 : baseCost;

    const denied = checkGenerationPermission(
      selectedStory.model,
      isPaid,
      isAdmin,
      customOpenRouterKey,
      freeModelCount,
      monthlyCreditsUsed,
      actualCharge,
      1,
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
              useUIStore.getState().translationTargetLanguage,
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
          selectedStory.model || 'deepseek/deepseek-v4-flash',
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
    const isAdmin = currentUser?.email === 'jmayereup@gmail.com';

    if (!isPaid && !isAdmin && selectedStory.totalChapters > 10) {
      showAlert(
        'Chapter Limit Reached',
        'Free tier members are limited to a maximum of 10 chapters per story. Upgrade to the Paid Tier to auto-write longer stories.',
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
          selectedStory.model,
          selectedStory.initialCreditsEstimate,
          selectedStory.creditsCharged,
        );

    const denied = checkGenerationPermission(
      selectedStory.model,
      isPaid,
      isAdmin,
      customOpenRouterKey,
      freeModelCount,
      monthlyCreditsUsed,
      actualCreditsCost,
      remainingChapters,
    );
    if (denied) {
      showAlert(denied.title, denied.message, 'warning');
      return;
    }

    setIsAutoGenerating(true);
    setIsAutoGenerationPaused(false);
    let activeStory = selectedStory;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const BATCH_SIZE = 5;

    try {
      while ((activeStory.chapters?.length ?? 0) < activeStory.totalChapters) {
        if (signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        const startChapterNumber = (activeStory.chapters?.length ?? 0) + 1;
        const remaining =
          activeStory.totalChapters - (activeStory.chapters?.length ?? 0);
        const batchCount = Math.min(BATCH_SIZE, remaining);
        const endChapterNumber = startChapterNumber + batchCount - 1;

        setGenerationStatus(
          `Writing Chapters ${startChapterNumber}–${endChapterNumber} of ${activeStory.totalChapters}...`,
        );

        const headers = buildApiHeaders(customOpenRouterKey);

        const targetRange = `Chapters 1-${startChapterNumber - 1}`;
        const auditExistsBefore = activeStory.consistencyAudits?.some(
          (a) => a.chapterRange === targetRange,
        );
        const willRunAudit =
          (startChapterNumber - 1) % 10 === 0 &&
          startChapterNumber > 1 &&
          !auditExistsBefore;

        activeStory = await runNarrativeMaintenance(
          activeStory,
          startChapterNumber,
          headers,
        );

        const auditExistsAfter = activeStory.consistencyAudits?.some(
          (a) => a.chapterRange === targetRange,
        );
        const auditWasPerformed = willRunAudit && auditExistsAfter;

        if (auditWasPerformed) {
          // Persist the updated story (with the new audit) so that resuming
          // auto-write doesn't re-trigger the same audit in an infinite loop.
          onStoryUpdated(activeStory);
          setIsAutoGenerationPaused(true);
          setGenerationLogs((prev) => [
            ...prev,
            `Auto-write paused for Consistency Audit review.`,
          ]);
          break;
        }

        const response = await fetchWithRetry(
          '/api/stories/generate-batch',
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              language: activeStory.language,
              cefrLevel: activeStory.cefrLevel,
              genre: activeStory.genre,
              totalChapters: activeStory.totalChapters,
              startChapterNumber,
              storyTitle: activeStory.title,
              outline: activeStory.outline || '',
              promptNotes: activeStory.promptNotes || '',
              previousChapters: activeStory.chapters || [],
              chapterLength: activeStory.chapterLength || 300,
              model: activeStory.model,
              thinkingLevel: activeStory.thinkingLevel,
              thinkingBudget: activeStory.thinkingBudget,
              temperature: activeStory.temperature,
              translationLanguage:
                activeStory.translationLanguage ||
                useUIStore.getState().translationTargetLanguage,
              storyBible: activeStory.storyBible || null,
              toneRefreshGuidance: activeStory.toneRefreshGuidance || '',
              consistencyAudits: activeStory.consistencyAudits || [],
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
                `Writing Chapters ${startChapterNumber}–${endChapterNumber} of ${activeStory.totalChapters} (Attempt ${attempt}/7)...`,
              );
            },
            onRetry: (attempt, remainingMs, error) => {
              const seconds = Math.ceil(remainingMs / 1000);
              setGenerationStatus(
                `Batch ${startChapterNumber}–${endChapterNumber} (Attempt ${attempt}/7) failed: ${(error as Error).message}. Retrying in ${seconds}s...`,
              );
            },
          },
        );

        const data = await response.json();
        const newChapters: Chapter[] = (data.chapters ?? []).map((ch: any) =>
          sanitizeChapter({
            chapterNumber: ch.chapterNumber,
            title: ch.chapterTitle,
            content: ch.content,
            vocabulary: [],
            summary: ch.summary,
          }),
        );

        if (newChapters.length === 0) {
          throw new Error('Batch response contained no chapters.');
        }

        const updatedChapters = [
          ...(activeStory.chapters || []),
          ...newChapters,
        ].sort((a, b) => a.chapterNumber - b.chapterNumber);

        let batchCreditsCost = 0;
        if (!isFreeModel(activeStory.model)) {
          for (let i = 0; i < newChapters.length; i++) {
            const chNum = startChapterNumber + i;
            batchCreditsCost += calculateChapterCreditCost(
              chNum,
              chNum - 1,
              activeStory.chapterLength || 300,
              activeStory.model,
              activeStory.initialCreditsEstimate,
              activeStory.creditsCharged,
            );
          }
        }

        const updatedCreditsCharged =
          (activeStory.creditsCharged ?? 0) + batchCreditsCost;

        if (onGenerationSuccess) {
          onGenerationSuccess(
            activeStory.model || 'deepseek/deepseek-v4-flash',
            batchCreditsCost,
          );
        }

        activeStory = {
          ...activeStory,
          chapters: updatedChapters,
          isCompleted: updatedChapters.length >= activeStory.totalChapters,
          creditsCharged: updatedCreditsCharged,
          isUnsaved: true,
        };

        setGenerationLogs((prev) => [
          ...prev,
          `Chapters ${startChapterNumber}–${endChapterNumber} written successfully.`,
        ]);

        onStoryUpdated(activeStory);
      }
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
    } finally {
      setIsAutoGenerating(false);
      setGenerationStatus('');
      abortControllerRef.current = null;
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
  ): Promise<void> => {
    if (!currentUser) {
      showAlert('Authentication Required', 'Please log in first.', 'warning');
      return;
    }

    const chapters = story.chapters ?? [];
    const isBilingualStory =
      story.cefrLevel === 'A1' || story.cefrLevel === 'Pre-A1';
    const chaptersNeedingGlossary = forceRegenerate
      ? chapters.filter((ch) => !isBilingualStory)
      : chapters.filter(
          (ch) =>
            !isBilingualStory && (!ch.vocabulary || ch.vocabulary.length === 0),
        );

    if (chaptersNeedingGlossary.length === 0) {
      showAlert(
        'Glossary Up To Date',
        'All chapters already have vocabulary terms.',
        'info',
      );
      return;
    }

    setIsGeneratingGlossary(true);
    setGlossaryError(null);
    setGlossaryLogs([
      `Generating glossary for ${chaptersNeedingGlossary.length} chapter(s)...`,
    ]);

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    const headers = buildApiHeaders(customOpenRouterKey);

    try {
      const updatedChapters = [...chapters];

      setGlossaryStatus(
        `Generating vocabulary for ${chaptersNeedingGlossary.length} chapter(s) in one call...`,
      );

      // Collect all existing words to avoid duplicates across chapters
      const existingWords = forceRegenerate
        ? []
        : updatedChapters
            .flatMap((c) => c.vocabulary ?? [])
            .map((v) => v.word.toLowerCase().trim())
            .filter(Boolean);

      // Single batch call for all chapters needing glossary.
      const res = await fetch('/api/stories/generate-glossary', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
          chapters: chaptersNeedingGlossary.map((ch) => ({
            chapterNumber: ch.chapterNumber,
            content: ch.content,
          })),
          language: story.language,
          cefrLevel: story.cefrLevel,
          existingWords,
          userId: currentUser?.uid,
          userEmail: currentUser?.email,
          model: modelId,
          translationLanguage:
            translationLanguage ||
            story.translationLanguage ||
            useUIStore.getState().translationTargetLanguage,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const chapterVocabulary: Record<number, unknown[]> =
          data.chapterVocabulary ?? {};

        for (const ch of chaptersNeedingGlossary) {
          const vocab = chapterVocabulary[ch.chapterNumber];
          if (vocab) {
            const chIdx = updatedChapters.findIndex(
              (c) => c.chapterNumber === ch.chapterNumber,
            );
            if (chIdx !== -1) {
              updatedChapters[chIdx] = {
                ...updatedChapters[chIdx],
                vocabulary: vocab as Chapter['vocabulary'],
              };
            }
            setGlossaryLogs((prev) => [
              ...prev,
              `Glossary generated for Chapter ${ch.chapterNumber}.`,
            ]);
          } else {
            setGlossaryLogs((prev) => [
              ...prev,
              `[Warning] No glossary returned for Chapter ${ch.chapterNumber}.`,
            ]);
          }
        }

        setIsGeneratingGlossary(false);
        setGlossaryStatus('');
        setGlossaryLogs([]);
        setGlossaryError(null);

        onStoryUpdated({
          ...story,
          chapters: updatedChapters,
          translationLanguage:
            translationLanguage ||
            story.translationLanguage ||
            useUIStore.getState().translationTargetLanguage,
          isUnsaved: true,
        });

        showAlert(
          'Glossary Complete',
          `Vocabulary terms have been generated for all ${chaptersNeedingGlossary.length} chapter(s).`,
          'info',
        );
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Glossary request failed with status ${res.status}`,
        );
      }
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
      abortControllerRef.current = null;
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
