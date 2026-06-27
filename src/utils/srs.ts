import { type SRSRecord } from '../types';

/**
 * Calculates the next Spaced Repetition state using a simplified SuperMemo-2 (SM-2) algorithm.
 *
 * @param currentSRS The current SRS state of the word (undefined if new)
 * @param isCorrect Whether the user correctly remembered the word
 * @returns The new SRS state
 */
export function calculateNextSRS(
  currentSRS: Partial<SRSRecord> | undefined,
  isCorrect: boolean
): SRSRecord {
  let repetition = currentSRS?.repetition ?? 0;
  let interval = currentSRS?.interval ?? 0;
  let easeFactor = currentSRS?.easeFactor ?? 2.5;

  if (isCorrect) {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
    // Assuming a score of 4 (Good) out of 5 for a correct answer
    const q = 4;
    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  } else {
    repetition = 0;
    interval = 1;
    // Assuming a score of 0 (Blackout) out of 5 for an incorrect answer
    const q = 0;
    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  }

  // Ensure ease factor doesn't drop below 1.3 (SM-2 minimum)
  easeFactor = Math.max(1.3, easeFactor);

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    repetition,
    interval,
    easeFactor,
    nextReviewDate: nextReviewDate.toISOString(),
  };
}
