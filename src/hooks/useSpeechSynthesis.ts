import { useCallback, useEffect, useState } from 'react';
import { getLanguageCodeFromName } from '../types';

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

  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

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

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  const playWord = useCallback(
    (word: string, customLanguage?: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      const cleanedWord = cleanSpeechText(word);
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
      window.speechSynthesis.speak(utterance);
    },
    [language, voices, selectedVoiceName, speechRate],
  );

  const speak = useCallback(
    (textToSpeak: string) => {
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

      window.speechSynthesis.cancel();

      const cleanedText = cleanSpeechText(textToSpeak);
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
        setIsSpeaking(false);
        setIsPaused(false);
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
    isSpeaking,
    isPaused,
    speak,
    stop,
    playWord,
  };
}
