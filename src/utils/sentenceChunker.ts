import { stripMarkdown } from './segmenter';

export interface SentenceChunk {
  /** Unique id for keying, e.g. "p0-s0" */
  id: string;
  /** Index of the paragraph */
  pIdx: number;
  /** Index of the sentence within the paragraph */
  sIdx: number;
  /** Cleaned text for TTS to speak */
  speechText: string;
  /** Raw segment text */
  rawText: string;
  /** Start character index in the paragraph's cleanText */
  startChar: number;
  /** End character index in the paragraph's cleanText */
  endChar: number;
}

export interface ChapterSentence extends SentenceChunk {
  /** Global sequential index across all sentences in the chapter */
  globalIndex: number;
}

/**
 * Parses markdown markers (bold, italics, headers, blockquotes)
 * to get the exact clean text and character offsets matching InteractiveParagraph.
 */
export function getParagraphCleanText(rawParagraphText: string): string {
  let raw = rawParagraphText || '';
  if (/^>\s+/.test(raw)) {
    raw = raw.replace(/^>\s+/, '');
  } else if (/^#+\s+/.test(raw)) {
    raw = raw.replace(/^#+\s+/, '');
  }

  const pattern =
    /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*[\s\S]+?\*|___[\s\S]+?___|__[\s\S]+?__|_\b[\s\S]+?\b_)/g;
  let lastIndex = 0;
  let cleanText = '';
  const matches = Array.from(raw.matchAll(pattern));

  for (const match of matches) {
    const matchIndex = match.index ?? 0;
    cleanText += raw.substring(lastIndex, matchIndex);
    const matchedStr = match[0];
    let innerText = '';

    if (matchedStr.startsWith('***') && matchedStr.endsWith('***')) {
      innerText = matchedStr.slice(3, -3);
    } else if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
      innerText = matchedStr.slice(2, -2);
    } else if (matchedStr.startsWith('__') && matchedStr.endsWith('__')) {
      innerText = matchedStr.slice(2, -2);
    } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      innerText = matchedStr.slice(1, -1);
    } else if (matchedStr.startsWith('_') && matchedStr.endsWith('_')) {
      innerText = matchedStr.slice(1, -1);
    }

    cleanText += innerText;
    lastIndex = matchIndex + matchedStr.length;
  }

  cleanText += raw.substring(lastIndex);
  return cleanText;
}

/**
 * Segments a paragraph's clean text into sentence chunks.
 */
export function segmentParagraphIntoSentences(
  cleanText: string,
  pIdx: number,
  langCode: string,
): SentenceChunk[] {
  if (!cleanText || !cleanText.trim()) return [];

  const chunks: SentenceChunk[] = [];

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const segmenter = new Intl.Segmenter(langCode, {
        granularity: 'sentence',
      });
      const rawSegments = Array.from(segmenter.segment(cleanText));

      let sIdx = 0;
      for (const seg of rawSegments) {
        const trimmed = seg.segment.trim();
        if (!trimmed) continue;

        // Find trimmed offsets within seg.segment
        const trimStart = seg.segment.indexOf(trimmed);
        const startChar = seg.index + (trimStart >= 0 ? trimStart : 0);
        const endChar = startChar + trimmed.length;
        const speechText = stripMarkdown(trimmed);

        if (speechText) {
          chunks.push({
            id: `p${pIdx}-s${sIdx}`,
            pIdx,
            sIdx,
            speechText,
            rawText: trimmed,
            startChar,
            endChar,
          });
          sIdx++;
        }
      }

      if (chunks.length > 0) {
        return chunks;
      }
    } catch (e) {
      console.warn(
        'Intl.Segmenter sentence segmentation error, falling back to regex:',
        e,
      );
    }
  }

  // Regex fallback: split on terminal punctuation (. ! ? 。 ！？) followed by whitespace or end-of-string
  // In Thai, space can also denote clause/sentence boundaries
  const isThai = langCode === 'th' || langCode.startsWith('th-');
  const sentencePattern = isThai
    ? /([.!?。！？]+|\s{2,}|\n+)/
    : /([.!?。！？]+["'”’]?\s+|\n+)/;

  const parts = cleanText.split(sentencePattern);
  let currPos = 0;
  let accumulated = '';
  let accStart = 0;
  let sIdx = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (part.match(sentencePattern)) {
      accumulated += part;
      const trimmed = accumulated.trim();
      if (trimmed) {
        const trimOffset = accumulated.indexOf(trimmed);
        const startChar = accStart + (trimOffset >= 0 ? trimOffset : 0);
        const endChar = startChar + trimmed.length;
        const speechText = stripMarkdown(trimmed);

        if (speechText) {
          chunks.push({
            id: `p${pIdx}-s${sIdx}`,
            pIdx,
            sIdx,
            speechText,
            rawText: trimmed,
            startChar,
            endChar,
          });
          sIdx++;
        }
      }
      currPos += part.length;
      accumulated = '';
      accStart = currPos;
    } else {
      if (!accumulated) {
        accStart = currPos;
      }
      accumulated += part;
      currPos += part.length;
    }
  }

  if (accumulated.trim()) {
    const trimmed = accumulated.trim();
    const trimOffset = accumulated.indexOf(trimmed);
    const startChar = accStart + (trimOffset >= 0 ? trimOffset : 0);
    const endChar = startChar + trimmed.length;
    const speechText = stripMarkdown(trimmed);

    if (speechText) {
      chunks.push({
        id: `p${pIdx}-s${sIdx}`,
        pIdx,
        sIdx,
        speechText,
        rawText: trimmed,
        startChar,
        endChar,
      });
    }
  }

  return chunks;
}

/**
 * Builds an ordered, flattened array of all chapter sentences from effective display paragraphs.
 */
export function buildChapterSentences(
  displayParagraphs: { original: string; translation?: string }[],
  langCode: string,
): ChapterSentence[] {
  const allSentences: ChapterSentence[] = [];
  let globalIndex = 0;

  for (let pIdx = 0; pIdx < displayParagraphs.length; pIdx++) {
    const dp = displayParagraphs[pIdx];
    const cleanText = getParagraphCleanText(dp.original);
    const paraSentences = segmentParagraphIntoSentences(
      cleanText,
      pIdx,
      langCode,
    );

    for (const s of paraSentences) {
      allSentences.push({
        ...s,
        globalIndex,
      });
      globalIndex++;
    }
  }

  return allSentences;
}
