import type { Chapter, TargetedEdit } from '../types';

/**
 * Normalizes newlines to '\n'
 */
function normalizeNewlines(str: string): string {
  return str.replace(/\r\n/g, '\n');
}

/**
 * Checks if the findText snippet can be found in the chapter content.
 */
export function checkEditMatch(content: string, findText: string): boolean {
  if (!content || !findText) return false;
  if (content.includes(findText)) return true;

  const normContent = normalizeNewlines(content);
  const normFind = normalizeNewlines(findText);
  if (normContent.includes(normFind)) return true;

  const trimmedFind = normFind.trim();
  if (trimmedFind.length > 0 && normContent.includes(trimmedFind)) return true;

  return false;
}

/**
 * Safely applies a targeted search-and-replace edit to chapter content.
 * Attempts exact match, then newline-normalized match, then trimmed match.
 */
export function applyTargetedEdit(
  content: string,
  findText: string,
  replaceWith: string,
): { updatedContent: string; success: boolean } {
  if (!content || !findText) {
    return { updatedContent: content, success: false };
  }

  // 1. Direct exact match
  if (content.includes(findText)) {
    return {
      updatedContent: content.replace(findText, replaceWith),
      success: true,
    };
  }

  // 2. Newline normalized match
  const normContent = normalizeNewlines(content);
  const normFind = normalizeNewlines(findText);
  const normReplace = normalizeNewlines(replaceWith);

  if (normContent.includes(normFind)) {
    return {
      updatedContent: normContent.replace(normFind, normReplace),
      success: true,
    };
  }

  // 3. Trimmed match
  const trimmedFind = normFind.trim();
  const trimmedReplace = normReplace.trim();
  if (trimmedFind.length > 0 && normContent.includes(trimmedFind)) {
    return {
      updatedContent: normContent.replace(trimmedFind, trimmedReplace),
      success: true,
    };
  }

  return {
    updatedContent: content,
    success: false,
  };
}

/**
 * Applies a batch of accepted targeted edits to an array of chapters.
 */
export function applyBatchEdits(
  chapters: Chapter[],
  editsToApply: TargetedEdit[],
): {
  updatedChapters: Chapter[];
  appliedCount: number;
  failedEdits: TargetedEdit[];
} {
  const updatedChapters = chapters.map((ch) => ({ ...ch }));
  let appliedCount = 0;
  const failedEdits: TargetedEdit[] = [];

  for (const edit of editsToApply) {
    const chapterIndex = updatedChapters.findIndex(
      (c) => c.chapterNumber === edit.chapterNumber,
    );

    if (chapterIndex === -1) {
      failedEdits.push(edit);
      continue;
    }

    const chapter = updatedChapters[chapterIndex];
    const { updatedContent, success } = applyTargetedEdit(
      chapter.content,
      edit.findText,
      edit.replaceWith,
    );

    if (success) {
      updatedChapters[chapterIndex] = {
        ...chapter,
        content: updatedContent,
      };
      appliedCount++;
    } else {
      failedEdits.push(edit);
    }
  }

  return {
    updatedChapters,
    appliedCount,
    failedEdits,
  };
}
