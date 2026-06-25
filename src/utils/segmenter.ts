export interface Segment {
  segment: string;
  isWordLike: boolean;
}

export function segmentText(
  text: string,
  langCode: string,
  glossaryWordsSet?: Set<string>,
): Segment[] {
  const glossaryWords = glossaryWordsSet
    ? Array.from(glossaryWordsSet).filter(Boolean)
    : [];

  if (glossaryWords.length === 0) {
    return defaultSegment(text, langCode);
  }

  // Sort glossary words descending by length to ensure longer phrases are matched first
  const sortedGlossary = [...glossaryWords].sort((a, b) => b.length - a.length);

  interface Match {
    start: number;
    end: number;
    word: string;
  }

  const matches: Match[] = [];
  const covered = new Array(text.length).fill(false);

  for (const gw of sortedGlossary) {
    const gwLower = gw.toLowerCase();
    const textLower = text.toLowerCase();

    let index = textLower.indexOf(gwLower);
    while (index !== -1) {
      const start = index;
      const end = index + gw.length;

      let isOverlap = false;
      for (let i = start; i < end; i++) {
        if (covered[i]) {
          isOverlap = true;
          break;
        }
      }

      // Space-less vs space-separated language checks
      const isSpaceLess = ['th', 'ja', 'zh'].includes(langCode);
      if (!isOverlap && !isSpaceLess) {
        // Word boundary check for space-separated languages
        const prevChar = start > 0 ? text[start - 1] : ' ';
        const nextChar = end < text.length ? text[end] : ' ';

        const isLetter = (c: string) => /\p{L}/u.test(c);
        if (isLetter(prevChar) || isLetter(nextChar)) {
          isOverlap = true;
        }
      }

      if (!isOverlap) {
        matches.push({ start, end, word: text.substring(start, end) });
        for (let i = start; i < end; i++) {
          covered[i] = true;
        }
      }

      index = textLower.indexOf(gwLower, start + 1);
    }
  }

  // Sort matches by start index
  matches.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let currentPos = 0;

  for (const match of matches) {
    if (match.start > currentPos) {
      const gapText = text.substring(currentPos, match.start);
      segments.push(...defaultSegment(gapText, langCode));
    }
    segments.push({ segment: match.word, isWordLike: true });
    currentPos = match.end;
  }

  if (currentPos < text.length) {
    const remainingText = text.substring(currentPos);
    segments.push(...defaultSegment(remainingText, langCode));
  }

  return segments;
}

function defaultSegment(text: string, langCode: string): Segment[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const segmenter = new Intl.Segmenter(langCode, { granularity: 'word' });
      return Array.from(segmenter.segment(text)).map((seg) => ({
        segment: seg.segment,
        isWordLike: !!seg.isWordLike,
      }));
    } catch (e) {
      console.error('Error segmenting text with Intl.Segmenter:', e);
    }
  }

  const isAsiatic = ['ja', 'zh', 'th'].includes(langCode);
  if (isAsiatic) {
    return text.split('').map((char) => {
      const isWordLike =
        char.trim().length > 0 &&
        !/[.,/#!$%^&*;:{}=\-_`~()?"'«»。、！？：；（）“”]/.test(char);
      return { segment: char, isWordLike };
    });
  } else {
    const tokens = text.split(/(\s+)/);
    const result: Segment[] = [];
    for (const token of tokens) {
      if (!token) continue;
      const hasLetters = /\p{L}/u.test(token);
      if (hasLetters) {
        const prefixMatch = token.match(/^\P{L}+/u);
        const suffixMatch = token.match(/\P{L}+$/u);
        const prefix = prefixMatch ? prefixMatch[0] : '';
        const suffix = suffixMatch ? suffixMatch[0] : '';
        const wordDisplay = token.slice(
          prefix.length,
          token.length - suffix.length,
        );

        if (prefix) {
          result.push({ segment: prefix, isWordLike: false });
        }
        if (wordDisplay) {
          result.push({ segment: wordDisplay, isWordLike: true });
        }
        if (suffix) {
          result.push({ segment: suffix, isWordLike: false });
        }
      } else {
        result.push({ segment: token, isWordLike: false });
      }
    }
    return result;
  }
}

export function limitContextToTenWords(
  context: string,
  word: string,
  langCode: string,
): string {
  if (!context || !word) return context;

  const cleanContext = context.replace(/\s+/g, ' ').trim();
  const segments = defaultSegment(cleanContext, langCode);

  // Find all word-like segments
  const wordSegments = segments.filter((s) => s.isWordLike);

  if (wordSegments.length <= 10) {
    return cleanContext;
  }

  // Find the index of the segment containing/matching the word
  const wordLower = word.toLowerCase();

  // Find which word-like segment matches the target word
  let targetWordSegIdx = wordSegments.findIndex((s) =>
    s.segment.toLowerCase().includes(wordLower),
  );
  if (targetWordSegIdx === -1) {
    // Fallback: match by segment text
    targetWordSegIdx = wordSegments.findIndex((s) =>
      wordLower.includes(s.segment.toLowerCase()),
    );
  }

  if (targetWordSegIdx === -1) {
    // If we can't find it, let's just reconstruct the first 10 words from the segments
    let wordCount = 0;
    let charIndex = 0;
    for (const seg of segments) {
      if (seg.isWordLike) {
        wordCount++;
        if (wordCount > 10) break;
      }
      charIndex += seg.segment.length;
    }
    return `${cleanContext.substring(0, charIndex).trim()}...`;
  }

  // Center a window of 10 words around targetWordSegIdx
  const maxWords = 10;
  const beforeCount = Math.floor((maxWords - 1) / 2);
  const afterCount = maxWords - 1 - beforeCount;

  let startIdx = Math.max(0, targetWordSegIdx - beforeCount);
  let endIdx = Math.min(wordSegments.length, targetWordSegIdx + 1 + afterCount);

  // Adjust if boundaries are hit
  if (startIdx === 0) {
    endIdx = Math.min(wordSegments.length, maxWords);
  } else if (endIdx === wordSegments.length) {
    startIdx = Math.max(0, wordSegments.length - maxWords);
  }

  const targetStartSeg = wordSegments[startIdx];
  const targetEndSeg = wordSegments[endIdx - 1];

  const startSegIdx = segments.indexOf(targetStartSeg);
  const endSegIdx = segments.indexOf(targetEndSeg);

  if (startSegIdx === -1 || endSegIdx === -1) {
    return `${wordSegments
      .slice(startIdx, endIdx)
      .map((s) => s.segment)
      .join(' ')}...`;
  }

  let result = segments
    .slice(startSegIdx, endSegIdx + 1)
    .map((s) => s.segment)
    .join('');

  if (startIdx > 0) {
    result = `...${result.trimStart()}`;
  }
  if (endIdx < wordSegments.length) {
    result = `${result.trimEnd()}...`;
  }

  return result.trim();
}
