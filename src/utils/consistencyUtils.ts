import type { Chapter, TargetedEdit } from '../types';

/**
 * Normalizes text for robust multi-script comparison:
 * - Unicode NFC composition (essential for combining marks/accents in Thai, Hindi, Vietnamese)
 * - Standardizes CRLF to LF
 * - Normalizes Thai Sara Am (U+0E4D U+0E32 -> U+0E33)
 */
function normalizeScript(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFC')
    .replace(/\r\n/g, '\n')
    .replace(/\u0E4D\u0E32/g, '\u0E33');
}

/**
 * Finds the character span of findText within content, tolerating zero-width
 * characters (such as zero-width spaces U+200B often found in Thai web text).
 */
function findSpanWithInvisible(
  content: string,
  findText: string,
): { start: number; end: number } | null {
  const normContent = normalizeScript(content);
  const normFind = normalizeScript(findText).trim();
  if (!normFind) return null;

  // 1. Direct index in normalized content
  const directIdx = normContent.indexOf(normFind);
  if (directIdx !== -1) {
    return { start: directIdx, end: directIdx + normFind.length };
  }

  // 2. Invisible character tolerant search (e.g. ZWSP \u200B in Thai text)
  const isInvisible = (ch: string) => /[\u200B\u200C\u200D\uFEFF]/.test(ch);
  const cleanFind = normFind.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  if (!cleanFind) return null;

  let fi = 0;
  let matchStart = -1;
  for (let i = 0; i < normContent.length; i++) {
    if (isInvisible(normContent[i])) continue;
    if (normContent[i] === cleanFind[fi]) {
      if (fi === 0) matchStart = i;
      fi++;
      if (fi === cleanFind.length) {
        return { start: matchStart, end: i + 1 };
      }
    } else {
      if (fi > 0) {
        i -= fi;
        fi = 0;
        matchStart = -1;
      }
    }
  }

  return null;
}

/**
 * Checks if the findText snippet can be found in the chapter content.
 * Works seamlessly across unspaced scripts (Thai, Japanese, Chinese) and spaced languages.
 */
export function checkEditMatch(content: string, findText: string): boolean {
  if (!content || !findText) return false;
  if (content.includes(findText)) return true;

  const span = findSpanWithInvisible(content, findText);
  return span !== null;
}

/**
 * Safely applies a targeted search-and-replace edit to chapter content.
 * Works seamlessly on languages without spaces (Thai, Japanese, Chinese)
 * and languages with spaces (English, Spanish, etc.), with automatic
 * Unicode NFC composition and zero-width character tolerance.
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

  // 2. Normalized / invisible-character tolerant match
  const span = findSpanWithInvisible(content, findText);
  if (span) {
    const normContent = normalizeScript(content);
    const updatedContent =
      normContent.slice(0, span.start) +
      normalizeScript(replaceWith).trim() +
      normContent.slice(span.end);
    return {
      updatedContent,
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
