import { getLanguageCodeFromName, SUPPORTED_LANGUAGES } from '../types';

/**
 * Normalizes a language name or code to a standard two-letter code.
 */
export function normalizeLangCode(lang: string | undefined | null): string {
  if (!lang) return 'en';
  const clean = lang.trim().toLowerCase();

  // Direct code match
  const codeMatch = SUPPORTED_LANGUAGES.find((l) => l.code === clean);
  if (codeMatch) return codeMatch.code;

  // Fallback to name resolution
  return getLanguageCodeFromName(lang);
}

/**
 * Calculates a lightweight, highly accurate word count estimate.
 * Uses Intl.Segmenter for native dictionary/heuristic based segmenting
 * in Asian and space-less languages (e.g. Thai, Chinese, Japanese), with
 * character-based ratio fallbacks if the native API is unavailable.
 */
export function countWords(
  text: string | undefined | null,
  lang: string | undefined | null,
): number {
  if (!text) return 0;

  const code = normalizeLangCode(lang);

  // Try to use native Intl.Segmenter
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter !== 'undefined') {
    try {
      const segmenter = new Intl.Segmenter(code, { granularity: 'word' });
      const segments = segmenter.segment(text);
      let count = 0;
      for (const segment of segments) {
        if (segment.isWordLike) {
          count++;
        }
      }
      return count;
    } catch (e) {
      console.warn('Intl.Segmenter word segmentation failed:', e);
    }
  }

  // Fallback heuristics for space-less/Asian languages when Intl.Segmenter is not supported:
  if (code === 'zh') {
    // 1.5 characters roughly equal 1 word
    const cleanText = text.replace(/[\s\p{P}]/gu, '');
    return Math.ceil(cleanText.length / 1.5);
  } else if (code === 'ja') {
    // 2 characters roughly equal 1 word
    const cleanText = text.replace(/[\s\p{P}]/gu, '');
    return Math.ceil(cleanText.length / 2);
  } else if (code === 'th') {
    // 4 characters (consonants/vowels/marks) roughly equal 1 word
    const cleanText = text.replace(/[\s\p{P}]/gu, '');
    return Math.ceil(cleanText.length / 4);
  }

  // Standard whitespace splitting for space-separated languages
  return text.trim().split(/\s+/).filter(Boolean).length;
}
