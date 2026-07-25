import { useMemo } from 'react';
import { getLanguageCodeFromName } from '../../types';
import { segmentText } from '../../utils/segmenter';

interface StyledRange {
  start: number;
  end: number;
  isBold?: boolean;
  isItalic?: boolean;
}

function parseMarkdownRanges(text: string): {
  cleanText: string;
  ranges: StyledRange[];
  isBlockquote: boolean;
  isHeader: boolean;
} {
  let raw = text || '';
  let isBlockquote = false;
  let isHeader = false;

  if (/^>\s+/.test(raw)) {
    isBlockquote = true;
    raw = raw.replace(/^>\s+/, '');
  } else if (/^#+\s+/.test(raw)) {
    isHeader = true;
    raw = raw.replace(/^#+\s+/, '');
  }

  const ranges: StyledRange[] = [];
  let cleanText = '';

  const pattern =
    /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*[\s\S]+?\*|___[\s\S]+?___|__[\s\S]+?__|_\b[\s\S]+?\b_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(raw)) !== null) {
    const before = raw.substring(lastIndex, match.index);
    cleanText += before;

    const matchedStr = match[0];
    let innerText = '';
    let isBold = false;
    let isItalic = false;

    if (matchedStr.startsWith('***') && matchedStr.endsWith('***')) {
      innerText = matchedStr.slice(3, -3);
      isBold = true;
      isItalic = true;
    } else if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
      innerText = matchedStr.slice(2, -2);
      isBold = true;
    } else if (matchedStr.startsWith('__') && matchedStr.endsWith('__')) {
      innerText = matchedStr.slice(2, -2);
      isBold = true;
    } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      innerText = matchedStr.slice(1, -1);
      isItalic = true;
    } else if (matchedStr.startsWith('_') && matchedStr.endsWith('_')) {
      innerText = matchedStr.slice(1, -1);
      isItalic = true;
    }

    const start = cleanText.length;
    cleanText += innerText;
    const end = cleanText.length;

    ranges.push({ start, end, isBold, isItalic });
    lastIndex = pattern.lastIndex;
  }

  cleanText += raw.substring(lastIndex);
  return { cleanText, ranges, isBlockquote, isHeader };
}

interface InteractiveParagraphProps {
  paragraphText: string;
  pIdx: number;
  language: string;
  handleWordClick: (
    wordClean: string,
    fullParagraph: string,
    pIdx: number,
    wIdx: number,
  ) => void;
  isBilingual?: boolean;
  glossaryWordsSet?: Set<string>;
  savedWordsSet?: Set<string>;
  activeWordRangeInPara?: [number, number] | null;
  alignment?: 'left' | 'center' | 'right' | 'justify';
}

export default function InteractiveParagraph({
  paragraphText,
  pIdx,
  language,
  handleWordClick,
  isBilingual = false,
  glossaryWordsSet,
  savedWordsSet,
  activeWordRangeInPara = null,
  alignment = 'justify',
}: InteractiveParagraphProps) {
  const langCode = getLanguageCodeFromName(language);
  const isAsiatic = ['japanese', 'chinese', 'ja', 'zh'].some((c) =>
    language.toLowerCase().includes(c),
  );

  const { cleanText, ranges, isBlockquote, isHeader } = useMemo(() => {
    return parseMarkdownRanges(paragraphText);
  }, [paragraphText]);

  const combinedSet = useMemo(() => {
    const combined = new Set<string>();
    glossaryWordsSet?.forEach((w) => {
      combined.add(w);
    });
    savedWordsSet?.forEach((w) => {
      combined.add(w);
    });
    return combined;
  }, [glossaryWordsSet, savedWordsSet]);

  const segments = useMemo(() => {
    return segmentText(cleanText, langCode, combinedSet);
  }, [cleanText, langCode, combinedSet]);

  const segmentsWithPositions = useMemo(() => {
    let currPos = 0;
    return segments.map((seg, idx) => {
      const startPos = currPos;
      const endPos = currPos + seg.segment.length;
      currPos = endPos;

      const matchingRange = ranges.find(
        (r) => startPos >= r.start && endPos <= r.end,
      );

      return {
        ...seg,
        index: idx,
        startPos,
        endPos,
        isBold: matchingRange?.isBold,
        isItalic: matchingRange?.isItalic,
        key: `seg-${pIdx}-${idx}-${seg.segment}`,
      };
    });
  }, [segments, ranges, pIdx]);

  const getWordStyle = (
    word: string,
    isAsiaticChar = false,
    isActive = false,
    isBold = false,
    isItalic = false,
  ) => {
    const wordClean = word.toLowerCase().trim();
    const isSaved = savedWordsSet?.has(wordClean);
    const isGlossary = glossaryWordsSet?.has(wordClean);

    const paddingClass = isAsiaticChar ? 'px-0.5' : 'px-1 -mx-1';
    let weightClass = isAsiaticChar ? '' : 'font-medium';
    if (isBold) weightClass = 'font-bold';
    if (isItalic) weightClass += ' italic';

    if (isActive) {
      return `text-tj-primary dark:text-tj-primary-hover underline decoration-2 decoration-black dark:decoration-white underline-offset-4 ${paddingClass} cursor-pointer transition font-bold ${isItalic ? 'italic' : ''} select-text`;
    }

    if (isSaved) {
      return `text-amber-800 dark:text-amber-300 border-b border-amber-500/35 dark:border-amber-400/20 hover:border-amber-600 dark:hover:border-amber-400 ${paddingClass} cursor-pointer transition ${weightClass} select-text`;
    }
    if (isGlossary) {
      return `text-tj-primary dark:text-tj-primary-hover border-b border-tj-primary-border/60 dark:border-tj-primary-border/30 hover:border-tj-primary dark:hover:border-tj-primary-hover ${paddingClass} cursor-pointer transition ${weightClass} select-text`;
    }

    if (isAsiaticChar) {
      return `hover:text-tj-primary px-0.5 cursor-pointer transition underline decoration-transparent hover:decoration-tj-primary-border ${isItalic ? 'italic' : ''} select-text`;
    }
    return `hover:text-tj-primary px-1 -mx-1 cursor-pointer transition ${weightClass} underline decoration-transparent hover:decoration-tj-primary-border select-text`;
  };

  let wordIndexInPara = 0;

  let startSegIdx = -1;
  let endSegIdx = -1;

  if (activeWordRangeInPara !== null) {
    let wordIdx = 0;
    for (let sIdx = 0; sIdx < segments.length; sIdx++) {
      if (segments[sIdx].isWordLike) {
        if (wordIdx === activeWordRangeInPara[0]) {
          startSegIdx = sIdx;
        }
        if (wordIdx === activeWordRangeInPara[1]) {
          endSegIdx = sIdx;
        }
        wordIdx++;
      }
    }
  }

  const getAlignmentClass = () => {
    switch (alignment) {
      case 'left':
        return 'text-left';
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-justify';
    }
  };

  const blockClass = isBlockquote
    ? 'border-l-4 border-tj-primary pl-4 italic text-slate-700 dark:text-slate-300 font-serif my-3'
    : isHeader
      ? 'font-bold text-lg text-slate-800 dark:text-slate-100 my-3'
      : `${isBilingual ? '' : 'indent-4 md:indent-6'} ${getAlignmentClass()} leading-relaxed mb-4`;

  return (
    <p key={pIdx} translate="no" className={blockClass}>
      {segmentsWithPositions.map((seg) => {
        const isActive =
          startSegIdx !== -1 &&
          endSegIdx !== -1 &&
          seg.index >= startSegIdx &&
          seg.index <= endSegIdx;

        if (seg.isWordLike) {
          const currentWordIndex = wordIndexInPara++;
          return (
            // biome-ignore lint/a11y/useSemanticElements: span is required to keep text layout inline within paragraph
            <span
              key={seg.key}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleWordClick(
                  seg.segment,
                  paragraphText,
                  pIdx,
                  currentWordIndex,
                );
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  e.preventDefault();
                  handleWordClick(
                    seg.segment,
                    paragraphText,
                    pIdx,
                    currentWordIndex,
                  );
                }
              }}
              className={getWordStyle(
                seg.segment,
                isAsiatic,
                isActive,
                seg.isBold,
                seg.isItalic,
              )}
            >
              {seg.segment}
            </span>
          );
        }

        if (isActive) {
          return (
            <span
              key={seg.key}
              className={`text-tj-primary dark:text-tj-primary-hover underline decoration-2 decoration-black dark:decoration-white underline-offset-4 cursor-pointer font-bold ${seg.isItalic ? 'italic' : ''} select-text`}
            >
              {seg.segment}
            </span>
          );
        }

        return (
          <span
            key={seg.key}
            className={`select-text ${seg.isItalic ? 'italic' : ''} ${seg.isBold ? 'font-bold' : ''}`}
          >
            {seg.segment}
          </span>
        );
      })}
    </p>
  );
}
