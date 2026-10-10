import { useCallback, useEffect, useRef, useState } from 'react';
import { getLanguageCodeFromName } from '../types';
import {
  type ChapterSentence,
  segmentParagraphIntoSentences,
} from '../utils/sentenceChunker';

function cleanSpeechText(text: string): string {
  if (!text) return '';
  let clean = text.trim();

  // Loop to remove all leading ellipses
  while (/^(\.{3,}|…)/.test(clean)) {
    clean = clean.replace(/^(\.{3,}|…)\s*/, '').trim();
  }

  // Loop to remove all trailing ellipses
  while (/(\.{3,}|…)$/.test(clean)) {
    clean = clean.replace(/\s*(\.{3,}|…)$/, '').trim();
  }

  return clean;
}

/**
 * Ensures any frozen or paused SpeechSynthesis state on Android / Chromium is resumed.
 */
function unstickSpeechQueue() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    if (window.speechSynthesis.paused) {
      try {
        window.speechSynthesis.resume();
      } catch (e) {
        console.warn('Could not resume speech synthesis queue:', e);
      }
    }
  }
}

/**
 * On Android Chromium and WebKit, calling cancel() immediately followed synchronously by speak()
 * triggers an IPC race condition that discards the newly queued utterance.
 * This helper ensures any existing utterance is canceled and allows the IPC to settle.
 */
function safeCancelSpeech(): Promise<void> {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve();
  }
  try {
    window.speechSynthesis.cancel();
  } catch (e) {
    console.warn('Could not cancel speech synthesis:', e);
  }
  return new Promise((resolve) => setTimeout(resolve, 40));
}

export function getVoiceQualityScore(
  voice: SpeechSynthesisVoice,
  targetLangCode: string,
): number {
  let score = 0;
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase().replace('_', '-');
  const target = targetLangCode.toLowerCase().replace('_', '-');
  const targetPrimary = target.split('-')[0];

  // 1. Language matching precision
  if (lang === target) {
    score += 10;
  } else if (
    lang.startsWith(targetPrimary) ||
    targetPrimary.startsWith(lang.split('-')[0])
  ) {
    score += 5;
  } else if (name.includes('multilingual') || name.includes('multi-lingual')) {
    score += 5;
  } else {
    // Heavy penalty for non-matching language
    score -= 100;
  }

  // 2. High-Quality / Neural / Multilingual Tier
  if (name.includes('multilingual') || name.includes('multi-lingual'))
    score += 25;
  if (name.includes('enhanced')) score += 25;
  if (name.includes('premium')) score += 25;
  if (name.includes('natural')) score += 20;
  if (name.includes('neural')) score += 20;
  if (name.includes('wavenet')) score += 20;

  // 3. Siri & Alex Apple Voices
  if (name.includes('siri')) score += 15;
  if (name.includes('alex')) score += 15;

  // 4. Android / Google / Online Voices
  if (name.includes('google')) score += 12;
  if (name.includes('online')) score += 10;

  // 5. System Defaults & Local Service
  if (voice.default) score += 5;
  if (voice.localService) score += 2;

  // 6. Low-Quality Penalties
  if (name.includes('compact')) score -= 20;
  if (
    /novelty|boing|whisper|deranged|cellos|zarvox|pipe|bad news|albert|fred|trinoids/i.test(
      name,
    )
  ) {
    score -= 30;
  }

  return score;
}

export function useSpeechSynthesis(language: string) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [speechRate, setSpeechRateState] = useState<number>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('reader-speech-rate');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!Number.isNaN(parsed) && parsed >= 0.5 && parsed <= 2.0) {
          return parsed;
        }
      }
    }
    return 0.75;
  });

  const [autoPlayWord, setAutoPlayWordState] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('reader-autoplay-word');
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return true;
  });

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<
    number | null
  >(null);
  const [activeSentenceId, setActiveSentenceId] = useState<string | null>(null);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<
    number | null
  >(null);
  const [activeSpeechType, setActiveSpeechType] = useState<
    'primary' | 'translation' | null
  >(null);
  const [ttsError, setTtsError] = useState<string | null>(null);

  // Queue references for sequential sentence playback
  const queueRef = useRef<{
    sentences: ChapterSentence[];
    currentIndex: number;
    stopAfterIndex?: number;
    timerId: number | null;
    customLanguage?: string;
    speechType?: 'primary' | 'translation';
  } | null>(null);
  const isStoppingRef = useRef<boolean>(false);
  const playSessionRef = useRef<number>(0);

  const setAutoPlayWord = useCallback((enabled: boolean) => {
    setAutoPlayWordState(enabled);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('reader-autoplay-word', enabled ? 'true' : 'false');
    }
  }, []);

  const setSpeechRate = useCallback((rate: number) => {
    setSpeechRateState(rate);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('reader-speech-rate', rate.toString());
    }
  }, []);

  const setSelectedVoice = useCallback(
    (voiceName: string) => {
      setSelectedVoiceName(voiceName);
      if (typeof localStorage !== 'undefined') {
        const targetLangCode = getLanguageCodeFromName(language).toLowerCase();
        localStorage.setItem(`reader-voice-${targetLangCode}`, voiceName);
      }
    },
    [language],
  );

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const allVoices = window.speechSynthesis.getVoices();
        const targetLangCode = getLanguageCodeFromName(language).toLowerCase();

        // Sort all voices by quality score for target language so TTSToolbar lists highest quality first
        const sortedAllVoices = [...allVoices].sort(
          (a, b) =>
            getVoiceQualityScore(b, targetLangCode) -
            getVoiceQualityScore(a, targetLangCode),
        );
        setVoices(sortedAllVoices);

        const savedVoiceName =
          typeof localStorage !== 'undefined'
            ? localStorage.getItem(`reader-voice-${targetLangCode}`)
            : null;

        if (
          savedVoiceName &&
          allVoices.some((v) => v.name === savedVoiceName)
        ) {
          setSelectedVoiceName(savedVoiceName);
        } else if (sortedAllVoices.length > 0) {
          setSelectedVoiceName(sortedAllVoices[0].name);
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [language]);

  // Clean up any ongoing speech timers on unmount
  useEffect(() => {
    return () => {
      isStoppingRef.current = true;
      playSessionRef.current += 1;
      if (queueRef.current?.timerId) {
        clearTimeout(queueRef.current.timerId);
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {
          console.warn('Could not cancel speech synthesis on unmount:', e);
        }
      }
    };
  }, []);

  // Internal recursive sentence chunk speaker
  const speakSentenceChunk = useCallback(
    (
      sentences: ChapterSentence[],
      index: number,
      isRetry = false,
      sessionId = playSessionRef.current,
    ) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      if (
        playSessionRef.current !== sessionId ||
        isStoppingRef.current ||
        !queueRef.current
      ) {
        return;
      }

      if (
        index >= sentences.length ||
        (queueRef.current?.stopAfterIndex !== undefined &&
          index > queueRef.current.stopAfterIndex)
      ) {
        // Complete queue
        queueRef.current = null;
        setCurrentSentenceIndex(null);
        setActiveSentenceId(null);
        setActiveParagraphIndex(null);
        setIsSpeaking(false);
        setIsPaused(false);
        return;
      }

      const sentence = sentences[index];
      queueRef.current.currentIndex = index;
      setCurrentSentenceIndex(index);
      setActiveSentenceId(sentence.id);
      setActiveParagraphIndex(sentence.pIdx);
      setActiveSpeechType(queueRef.current.speechType || 'primary');
      setIsSpeaking(true);
      setIsPaused(false);

      const utterance = new SpeechSynthesisUtterance(sentence.speechText);
      const langToUse = queueRef.current.customLanguage || language;
      const targetLangCode = getLanguageCodeFromName(langToUse);
      utterance.lang = targetLangCode;

      let selectedVoice: SpeechSynthesisVoice | undefined;
      if (queueRef.current.customLanguage) {
        const lowerLang = targetLangCode.toLowerCase();
        const savedTransVoiceName =
          typeof localStorage !== 'undefined'
            ? localStorage.getItem(`reader-voice-${lowerLang}`)
            : null;

        if (
          savedTransVoiceName &&
          voices.some((v) => v.name === savedTransVoiceName)
        ) {
          selectedVoice = voices.find((v) => v.name === savedTransVoiceName);
        } else {
          const sortedCustomVoices = [...voices].sort(
            (a, b) =>
              getVoiceQualityScore(b, lowerLang) -
              getVoiceQualityScore(a, lowerLang),
          );
          if (sortedCustomVoices.length > 0) {
            selectedVoice = sortedCustomVoices[0];
          }
        }
      } else {
        selectedVoice = voices.find((v) => v.name === selectedVoiceName);
      }

      if (selectedVoice && !isRetry) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = speechRate;

      utterance.onstart = () => {
        if (playSessionRef.current === sessionId && !isStoppingRef.current) {
          setIsSpeaking(true);
          setIsPaused(false);
          setTtsError(null);
        }
      };

      utterance.onend = () => {
        if (
          playSessionRef.current !== sessionId ||
          isStoppingRef.current ||
          !queueRef.current
        ) {
          return;
        }
        if (
          queueRef.current.stopAfterIndex !== undefined &&
          index >= queueRef.current.stopAfterIndex
        ) {
          queueRef.current = null;
          setCurrentSentenceIndex(null);
          setActiveSentenceId(null);
          setActiveParagraphIndex(null);
          setActiveSpeechType(null);
          setIsSpeaking(false);
          setIsPaused(false);
          return;
        }
        // Schedule next sentence after an organic natural reading pause (160ms)
        const nextIdx = index + 1;
        const timerId = window.setTimeout(() => {
          if (
            playSessionRef.current !== sessionId ||
            isStoppingRef.current ||
            !queueRef.current
          ) {
            return;
          }
          speakSentenceChunk(sentences, nextIdx, false, sessionId);
        }, 160);
        if (queueRef.current) {
          queueRef.current.timerId = timerId;
        }
      };

      utterance.onerror = (e) => {
        // If canceled or interrupted, it is normal speech cancellation - do not treat as error or retry
        if (e.error === 'canceled' || e.error === 'interrupted') {
          return;
        }
        if (
          playSessionRef.current !== sessionId ||
          isStoppingRef.current ||
          !queueRef.current
        ) {
          return;
        }
        console.warn(`Sentence narration error at chunk ${index}:`, e);

        // If voice failed and we haven't retried with system default voice yet, retry once
        if (!isRetry && selectedVoice) {
          console.info('Retrying sentence with OS default voice...');
          speakSentenceChunk(sentences, index, true, sessionId);
          return;
        }

        if (
          queueRef.current.stopAfterIndex !== undefined &&
          index >= queueRef.current.stopAfterIndex
        ) {
          queueRef.current = null;
          setCurrentSentenceIndex(null);
          setActiveSentenceId(null);
          setActiveParagraphIndex(null);
          setActiveSpeechType(null);
          setIsSpeaking(false);
          setIsPaused(false);
          return;
        }

        // If it still fails, advance to the next sentence chunk rather than locking up narration
        console.warn(
          'Advancing to next sentence after synthesis error:',
          index,
        );
        const timerId = window.setTimeout(() => {
          if (
            playSessionRef.current !== sessionId ||
            isStoppingRef.current ||
            !queueRef.current
          ) {
            return;
          }
          speakSentenceChunk(sentences, index + 1, false, sessionId);
        }, 250);
        if (queueRef.current) {
          queueRef.current.timerId = timerId;
        }
      };

      unstickSpeechQueue();
      window.speechSynthesis.speak(utterance);
    },
    [language, voices, selectedVoiceName, speechRate],
  );

  const playSentenceQueue = useCallback(
    async (
      sentences: ChapterSentence[],
      startIndex = 0,
      stopAfterIndex?: number,
    ) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      if (!sentences || sentences.length === 0) return;

      const sessionId = ++playSessionRef.current;
      isStoppingRef.current = false;
      if (queueRef.current?.timerId) {
        clearTimeout(queueRef.current.timerId);
      }
      queueRef.current = {
        sentences,
        currentIndex: startIndex,
        stopAfterIndex,
        timerId: null,
        speechType: 'primary',
      };

      unstickSpeechQueue();
      await safeCancelSpeech();
      if (playSessionRef.current !== sessionId) return;
      speakSentenceChunk(sentences, startIndex, false, sessionId);
    },
    [speakSentenceChunk],
  );

  const pauseSentenceQueue = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    playSessionRef.current += 1;
    if (queueRef.current?.timerId) {
      clearTimeout(queueRef.current.timerId);
      queueRef.current.timerId = null;
    }
    // Cancel active audio stream cleanly so Android doesn't hang the speech thread
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('Could not cancel speech on pause:', e);
    }
    setIsSpeaking(false);
    setIsPaused(true);
  }, []);

  const resumeSentenceQueue = useCallback(async () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (!queueRef.current) return;
    const { sentences, currentIndex } = queueRef.current;
    const sessionId = ++playSessionRef.current;
    isStoppingRef.current = false;
    unstickSpeechQueue();
    await safeCancelSpeech();
    if (playSessionRef.current !== sessionId || !queueRef.current) return;
    speakSentenceChunk(sentences, currentIndex, false, sessionId);
  }, [speakSentenceChunk]);

  const stopSentenceQueue = useCallback(() => {
    isStoppingRef.current = true;
    playSessionRef.current += 1;
    if (queueRef.current?.timerId) {
      clearTimeout(queueRef.current.timerId);
    }
    queueRef.current = null;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('Could not cancel speech on stop:', e);
      }
    }
    setCurrentSentenceIndex(null);
    setActiveSentenceId(null);
    setActiveParagraphIndex(null);
    setActiveSpeechType(null);
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const jumpToSentence = useCallback(
    async (index: number) => {
      if (!queueRef.current) return;
      if (queueRef.current.timerId) {
        clearTimeout(queueRef.current.timerId);
        queueRef.current.timerId = null;
      }
      const sessionId = ++playSessionRef.current;
      isStoppingRef.current = false;
      await safeCancelSpeech();
      if (playSessionRef.current !== sessionId || !queueRef.current) return;
      speakSentenceChunk(queueRef.current.sentences, index, false, sessionId);
    },
    [speakSentenceChunk],
  );

  const stop = useCallback(() => {
    stopSentenceQueue();
  }, [stopSentenceQueue]);

  const playParagraphTranslation = useCallback(
    async (pIdx: number, text: string, transLanguage: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      if (!text?.trim()) return;

      const sessionId = ++playSessionRef.current;
      isStoppingRef.current = false;
      if (queueRef.current?.timerId) {
        clearTimeout(queueRef.current.timerId);
      }
      const targetLangCode = getLanguageCodeFromName(transLanguage);
      const cleanPara = cleanSpeechText(text);
      const chunks = segmentParagraphIntoSentences(
        cleanPara,
        pIdx,
        targetLangCode,
      );
      const sentences: ChapterSentence[] =
        chunks.length > 0
          ? chunks.map((c, sIdx) => ({ ...c, globalIndex: sIdx }))
          : [
              {
                id: `p${pIdx}-trans-0`,
                pIdx,
                sIdx: 0,
                globalIndex: 0,
                speechText: cleanPara,
                rawText: text,
                startChar: 0,
                endChar: cleanPara.length,
              },
            ];

      queueRef.current = {
        sentences,
        currentIndex: 0,
        stopAfterIndex: sentences.length - 1,
        timerId: null,
        customLanguage: transLanguage,
        speechType: 'translation',
      };

      unstickSpeechQueue();
      await safeCancelSpeech();
      if (playSessionRef.current !== sessionId) return;
      speakSentenceChunk(sentences, 0, false, sessionId);
    },
    [speakSentenceChunk],
  );

  const playWord = useCallback(
    async (word: string, customLanguage?: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      const sessionId = ++playSessionRef.current;
      isStoppingRef.current = false;
      // Stop and clear any active chapter sentence queue so words don't race with sentence stepper
      if (queueRef.current?.timerId) {
        clearTimeout(queueRef.current.timerId);
      }
      queueRef.current = null;
      setCurrentSentenceIndex(null);
      setActiveSentenceId(null);
      setActiveParagraphIndex(null);
      setActiveSpeechType(null);

      unstickSpeechQueue();
      await safeCancelSpeech();
      if (playSessionRef.current !== sessionId) return;

      const cleanedWord = cleanSpeechText(word);
      if (!cleanedWord) return;

      const utterance = new SpeechSynthesisUtterance(cleanedWord);
      const langToUse = customLanguage || language;
      const targetLangCode = getLanguageCodeFromName(langToUse);
      utterance.lang = targetLangCode;

      let selectedVoice = voices.find((v) => v.name === selectedVoiceName);

      if (customLanguage) {
        const lowerLang = targetLangCode.toLowerCase();
        const sortedCustomVoices = [...voices].sort(
          (a, b) =>
            getVoiceQualityScore(b, lowerLang) -
            getVoiceQualityScore(a, lowerLang),
        );
        if (sortedCustomVoices.length > 0) {
          selectedVoice = sortedCustomVoices[0];
        }
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = speechRate;

      utterance.onstart = () => {
        if (playSessionRef.current === sessionId) {
          setIsSpeaking(true);
          setIsPaused(false);
          setTtsError(null);
        }
      };

      utterance.onend = () => {
        if (playSessionRef.current === sessionId) {
          setIsSpeaking(false);
          setIsPaused(false);
        }
      };

      utterance.onerror = (e) => {
        // If canceled or interrupted, it is normal speech cancellation - do not treat as error
        if (e.error === 'canceled' || e.error === 'interrupted') {
          return;
        }
        if (playSessionRef.current !== sessionId || isStoppingRef.current) {
          return;
        }
        console.warn('Speech synthesis utterance error on playWord:', e);
        // Fallback retry without setting utterance.voice (delegating to OS default voice for language)
        if (selectedVoice) {
          console.info(
            'Retrying playWord with OS default voice for lang:',
            targetLangCode,
          );
          const fallback = new SpeechSynthesisUtterance(cleanedWord);
          fallback.lang = targetLangCode;
          fallback.rate = speechRate;
          fallback.onstart = () => {
            if (playSessionRef.current === sessionId) {
              setIsSpeaking(true);
              setIsPaused(false);
              setTtsError(null);
            }
          };
          fallback.onend = () => {
            if (playSessionRef.current === sessionId) {
              setIsSpeaking(false);
              setIsPaused(false);
            }
          };
          fallback.onerror = (err2) => {
            if (err2.error === 'canceled' || err2.error === 'interrupted') {
              return;
            }
            if (playSessionRef.current !== sessionId || isStoppingRef.current) {
              return;
            }
            console.error('Fallback playWord failed:', err2);
            setTtsError(
              'Voice playback error. Please verify preferred TTS engine in device settings.',
            );
            setIsSpeaking(false);
            setIsPaused(false);
          };
          window.speechSynthesis.speak(fallback);
        } else {
          setTtsError(
            'Voice playback error. Please verify preferred TTS engine in device settings.',
          );
          setIsSpeaking(false);
          setIsPaused(false);
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [language, voices, selectedVoiceName, speechRate],
  );

  const speak = useCallback(
    async (textToSpeak: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      if (isSpeaking) {
        if (isPaused) {
          window.speechSynthesis.resume();
          setIsPaused(false);
        } else {
          window.speechSynthesis.pause();
          setIsPaused(true);
        }
        return;
      }

      const sessionId = ++playSessionRef.current;
      isStoppingRef.current = false;
      if (queueRef.current?.timerId) {
        clearTimeout(queueRef.current.timerId);
      }
      queueRef.current = null;

      unstickSpeechQueue();
      await safeCancelSpeech();
      if (playSessionRef.current !== sessionId) return;

      const cleanedText = cleanSpeechText(textToSpeak);
      if (!cleanedText) return;

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      const targetLangCode = getLanguageCodeFromName(language);
      utterance.lang = targetLangCode;

      const selectedVoice = voices.find((v) => v.name === selectedVoiceName);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = speechRate;

      utterance.onstart = () => {
        if (playSessionRef.current === sessionId) {
          setIsSpeaking(true);
          setIsPaused(false);
          setTtsError(null);
        }
      };

      utterance.onend = () => {
        if (playSessionRef.current === sessionId) {
          setIsSpeaking(false);
          setIsPaused(false);
        }
      };

      utterance.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') {
          return;
        }
        if (playSessionRef.current !== sessionId || isStoppingRef.current) {
          return;
        }
        console.error('Speech synthesis error: ', e);
        if (selectedVoice) {
          const fallback = new SpeechSynthesisUtterance(cleanedText);
          fallback.lang = targetLangCode;
          fallback.rate = speechRate;
          fallback.onstart = () => {
            if (playSessionRef.current === sessionId) {
              setIsSpeaking(true);
              setIsPaused(false);
              setTtsError(null);
            }
          };
          fallback.onend = () => {
            if (playSessionRef.current === sessionId) {
              setIsSpeaking(false);
              setIsPaused(false);
            }
          };
          fallback.onerror = (err2) => {
            if (err2.error === 'canceled' || err2.error === 'interrupted') {
              return;
            }
            setIsSpeaking(false);
            setIsPaused(false);
          };
          window.speechSynthesis.speak(fallback);
        } else {
          setIsSpeaking(false);
          setIsPaused(false);
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSpeaking, isPaused, language, voices, selectedVoiceName, speechRate],
  );

  return {
    voices,
    selectedVoiceName,
    setSelectedVoiceName: setSelectedVoice,
    speechRate,
    setSpeechRate,
    autoPlayWord,
    setAutoPlayWord,
    isSpeaking,
    isPaused,
    speak,
    stop,
    playWord,
    // Sentence queue additions
    currentSentenceIndex,
    activeSentenceId,
    activeParagraphIndex,
    activeSpeechType,
    playSentenceQueue,
    playParagraphTranslation,
    pauseSentenceQueue,
    resumeSentenceQueue,
    stopSentenceQueue,
    jumpToSentence,
    ttsError,
    clearTtsError: () => setTtsError(null),
  };
}
