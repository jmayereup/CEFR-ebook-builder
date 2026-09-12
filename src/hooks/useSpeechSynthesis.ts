import { useCallback, useEffect, useRef, useState } from 'react';
import { getLanguageCodeFromName } from '../types';
import type { ChapterSentence } from '../utils/sentenceChunker';

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
 * On Android Chromium, calling cancel() immediately followed synchronously by speak()
 * triggers an IPC race condition that discards the newly queued utterance.
 * This helper ensures any existing utterance is canceled and allows the IPC to settle.
 */
function safeCancelSpeech(): Promise<void> {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve();
  }
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
    return new Promise((resolve) => setTimeout(resolve, 40));
  }
  return Promise.resolve();
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
        if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.0) {
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
  const [ttsError, setTtsError] = useState<string | null>(null);

  // Queue references for sequential sentence playback
  const queueRef = useRef<{
    sentences: ChapterSentence[];
    currentIndex: number;
    timerId: number | null;
  } | null>(null);
  const isStoppingRef = useRef<boolean>(false);

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
      if (queueRef.current?.timerId) {
        clearTimeout(queueRef.current.timerId);
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Internal recursive sentence chunk speaker
  const speakSentenceChunk = useCallback(
    (sentences: ChapterSentence[], index: number, isRetry = false) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      if (isStoppingRef.current || !queueRef.current) return;

      if (index >= sentences.length) {
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
      setIsSpeaking(true);
      setIsPaused(false);

      const utterance = new SpeechSynthesisUtterance(sentence.speechText);
      const targetLangCode = getLanguageCodeFromName(language);
      utterance.lang = targetLangCode;

      const selectedVoice = voices.find((v) => v.name === selectedVoiceName);
      if (selectedVoice && !isRetry) {
        utterance.voice = selectedVoice;
      }
      utterance.rate = speechRate;

      utterance.onstart = () => {
        if (!isStoppingRef.current) {
          setIsSpeaking(true);
          setIsPaused(false);
        }
      };

      utterance.onend = () => {
        if (isStoppingRef.current || !queueRef.current) return;
        // Schedule next sentence after an organic natural reading pause (160ms)
        const nextIdx = index + 1;
        const timerId = window.setTimeout(() => {
          speakSentenceChunk(sentences, nextIdx);
        }, 160);
        if (queueRef.current) {
          queueRef.current.timerId = timerId;
        }
      };

      utterance.onerror = (e) => {
        console.warn(`Sentence narration error at chunk ${index}:`, e);
        if (isStoppingRef.current || !queueRef.current) return;

        // If voice failed and we haven't retried with system default voice yet, retry once
        if (!isRetry && selectedVoice) {
          console.info('Retrying sentence with OS default voice...');
          speakSentenceChunk(sentences, index, true);
          return;
        }

        // If it still fails, advance to the next sentence chunk rather than locking up narration
        console.warn(
          'Advancing to next sentence after synthesis error:',
          index,
        );
        const timerId = window.setTimeout(() => {
          speakSentenceChunk(sentences, index + 1);
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
    async (sentences: ChapterSentence[], startIndex = 0) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      if (!sentences || sentences.length === 0) return;

      isStoppingRef.current = false;
      if (queueRef.current?.timerId) {
        clearTimeout(queueRef.current.timerId);
      }
      queueRef.current = {
        sentences,
        currentIndex: startIndex,
        timerId: null,
      };

      unstickSpeechQueue();
      await safeCancelSpeech();
      speakSentenceChunk(sentences, startIndex);
    },
    [speakSentenceChunk],
  );

  const pauseSentenceQueue = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (queueRef.current?.timerId) {
      clearTimeout(queueRef.current.timerId);
      queueRef.current.timerId = null;
    }
    // Cancel active audio stream cleanly so Android doesn't hang the speech thread
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(true);
  }, []);

  const resumeSentenceQueue = useCallback(async () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (!queueRef.current) return;
    const { sentences, currentIndex } = queueRef.current;
    unstickSpeechQueue();
    await safeCancelSpeech();
    isStoppingRef.current = false;
    speakSentenceChunk(sentences, currentIndex);
  }, [speakSentenceChunk]);

  const stopSentenceQueue = useCallback(() => {
    isStoppingRef.current = true;
    if (queueRef.current?.timerId) {
      clearTimeout(queueRef.current.timerId);
    }
    queueRef.current = null;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setCurrentSentenceIndex(null);
    setActiveSentenceId(null);
    setActiveParagraphIndex(null);
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
      await safeCancelSpeech();
      isStoppingRef.current = false;
      speakSentenceChunk(queueRef.current.sentences, index);
    },
    [speakSentenceChunk],
  );

  const stop = useCallback(() => {
    stopSentenceQueue();
  }, [stopSentenceQueue]);

  const playWord = useCallback(
    async (word: string, customLanguage?: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      unstickSpeechQueue();
      await safeCancelSpeech();

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

      utterance.onerror = (e) => {
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
          fallback.onerror = (err2) => {
            console.error('Fallback playWord failed:', err2);
            setTtsError(
              'Voice playback error. Please verify preferred TTS engine in device settings.',
            );
          };
          window.speechSynthesis.speak(fallback);
        } else {
          setTtsError(
            'Voice playback error. Please verify preferred TTS engine in device settings.',
          );
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

      unstickSpeechQueue();
      await safeCancelSpeech();

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
        setIsSpeaking(true);
        setIsPaused(false);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utterance.onerror = (e) => {
        console.error('Speech synthesis error: ', e);
        if (selectedVoice) {
          const fallback = new SpeechSynthesisUtterance(cleanedText);
          fallback.lang = targetLangCode;
          fallback.rate = speechRate;
          fallback.onstart = () => {
            setIsSpeaking(true);
            setIsPaused(false);
          };
          fallback.onend = () => {
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
    playSentenceQueue,
    pauseSentenceQueue,
    resumeSentenceQueue,
    stopSentenceQueue,
    jumpToSentence,
    ttsError,
    clearTtsError: () => setTtsError(null),
  };
}
