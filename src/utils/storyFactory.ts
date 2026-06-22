/**
 * Story object factory helpers.
 *
 * Extracted from useStoryGeneration.ts where the same pattern of building a
 * Story object from a config + chapter data was duplicated for scratch-mode
 * and normal-mode story creation.
 */

import type { StoryConfig } from '../hooks/useStoryGeneration';
import type { Chapter, Story } from '../types';

export interface StoryCreationParams {
  storyId: string;
  config: StoryConfig;
  chapters: Chapter[];
  currentUser: { uid: string; email?: string | null };
  initialCreditsEstimate: number;
  creditsCharged: number;
  /** Override title from API response (e.g. chapter-1 generation returns storyTitle). */
  titleOverride?: string;
}

/**
 * Builds a Story object from the shared creation parameters.
 * Encapsulates the conditional property assignment that was duplicated
 * across scratch-mode and normal-mode story creation.
 */
export const buildStory = (params: StoryCreationParams): Story => {
  const {
    storyId,
    config,
    chapters,
    currentUser,
    initialCreditsEstimate,
    creditsCharged,
    titleOverride,
  } = params;

  const newStory: Story = {
    id: storyId,
    title: titleOverride || config.storyTitle || 'Unnamed Graded Narrative',
    language: config.language,
    cefrLevel: config.cefrLevel,
    genre: config.genre,
    totalChapters: config.totalChapters,
    chapters,
    createdAt: new Date().toISOString(),
    isCompleted: chapters.length >= config.totalChapters,
    creatorId: currentUser.uid,
    isPublic: config.isPublic !== false,
    initialTotalChapters: config.totalChapters,
    initialCreditsEstimate,
    creditsCharged,
    regenerationsCount: 0,
  };

  if (currentUser.email) newStory.creatorEmail = currentUser.email;
  if (config.chapterLength != null)
    newStory.chapterLength = config.chapterLength;
  if (config.outline != null) newStory.outline = config.outline;
  if (config.description != null) newStory.description = config.description;
  if (config.promptNotes != null) newStory.promptNotes = config.promptNotes;
  if (config.model != null) newStory.model = config.model;
  if (config.thinkingLevel != null)
    newStory.thinkingLevel = config.thinkingLevel;
  if (config.thinkingBudget != null)
    newStory.thinkingBudget = config.thinkingBudget;
  if (config.temperature != null) newStory.temperature = config.temperature;
  if (config.translationLanguage != null)
    newStory.translationLanguage = config.translationLanguage;

  return newStory;
};
