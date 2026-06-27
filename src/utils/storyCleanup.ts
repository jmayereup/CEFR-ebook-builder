import type { Story } from '../types';

/**
 * Clears draft/setup fields (promptNotes, outline, storyBible, consistencyAudits, toneRefreshGuidance)
 * from a Story object if it has been marked as completed.
 */
export const cleanCompletedStory = (story: Story): Story => {
  if (!story.isCompleted) return story;
  return {
    ...story,
    promptNotes: '',
    outline: '',
    storyBible: null,
    consistencyAudits: null,
    toneRefreshGuidance: '',
  };
};
