import { useMemo } from 'react';
import { getLanguageCodeFromName } from '../../types';
import { segmentText } from '../../utils/segmenter';

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
  key?: any;
  activeWordRangeInPara?: [number, number] | null;
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
}: InteractiveParagraphProps) {
  const langCode = getLanguageCodeFromName(language);
  const isAsiatic = ['japanese', 'chinese', 'ja', 'zh'].some((c) =>
    language.toLowerCase().includes(c),
  );

  const getWordStyle = (
    word: string,
    isAsiaticChar = false,
    isActive = false,
  ) => {
    const wordClean = word.toLowerCase().trim();
    const isSaved = savedWordsSet?.has(wordClean);
    const isGlossary = glossaryWordsSet?.has(wordClean);

    const paddingClass = isAsiaticChar ? 'px-0.5' : 'px-1 -mx-1';
    const weightClass = isAsiaticChar ? '' : 'font-medium';

    if (isActive) {
      return `text-tj-primary dark:text-tj-primary-hover underline decoration-2 decoration-black dark:decoration-white underline-offset-4 ${paddingClass} cursor-pointer transition font-bold select-text`;
    }

    if (isSaved) {
      return `text-amber-800 dark:text-amber-300 border-b border-amber-500/35 dark:border-amber-400/20 hover:border-amber-600 dark:hover:border-amber-400 ${paddingClass} cursor-pointer transition ${weightClass} select-text`;
    }
    if (isGlossary) {
      return `text-tj-primary dark:text-tj-primary-hover border-b border-tj-primary-border/60 dark:border-tj-primary-border/30 hover:border-tj-primary dark:hover:border-tj-primary-hover ${paddingClass} cursor-pointer transition ${weightClass} select-text`;
    }

    if (isAsiaticChar) {
      return 'hover:text-tj-primary px-0.5 cursor-pointer transition underline decoration-transparent hover:decoration-tj-primary-border select-text';
    }
    return 'hover:text-tj-primary px-1 -mx-1 cursor-pointer transition font-medium underline decoration-transparent hover:decoration-tj-primary-border select-text';
  };

  const combinedSet = useMemo(() => {
    const combined = new Set<string>();
    glossaryWordsSet?.forEach((w) => combined.add(w));
    savedWordsSet?.forEach((w) => combined.add(w));
    return combined;
  }, [glossaryWordsSet, savedWordsSet]);

  const segments = segmentText(paragraphText, langCode, combinedSet);
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

  return (
    <p
      key={pIdx}
      translate="no"
      className={`${isBilingual ? '' : 'indent-4 md:indent-6'} text-justify leading-relaxed mb-4`}
    >
      {segments.map((seg, sIdx) => {
        const isActive =
          startSegIdx !== -1 &&
          endSegIdx !== -1 &&
          sIdx >= startSegIdx &&
          sIdx <= endSegIdx;

        if (seg.isWordLike) {
          const currentWordIndex = wordIndexInPara++;
          return (
            <span
              key={sIdx}
              onClick={(e) => {
                e.stopPropagation();
                handleWordClick(
                  seg.segment,
                  paragraphText,
                  pIdx,
                  currentWordIndex,
                );
              }}
              className={getWordStyle(seg.segment, isAsiatic, isActive)}
            >
              {seg.segment}
            </span>
          );
        }

        if (isActive) {
          return (
            <span
              key={sIdx}
              className="text-tj-primary dark:text-tj-primary-hover underline decoration-2 decoration-black dark:decoration-white underline-offset-4 cursor-pointer font-bold select-text"
            >
              {seg.segment}
            </span>
          );
        }

        return (
          <span key={sIdx} className="select-text">
            {seg.segment}
          </span>
        );
      })}
    </p>
  );
}
