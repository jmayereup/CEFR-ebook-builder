import { useCallback, useEffect, useState } from 'react';
import { getLanguageCodeFromName } from '../types';

export function useSpeechSynthesis(language: string) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(0.75);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const allVoices = window.speechSynthesis.getVoices();
        setVoices(allVoices);

        // Find default vocal match for active story target language, prioritizing high quality voices
        const targetLangCode = getLanguageCodeFromName(language).toLowerCase();
        const langVoices = allVoices.filter(
          (v) =>
            v.lang.toLowerCase().startsWith(targetLangCode) ||
            v.lang.toLowerCase().includes(targetLangCode),
        );

        if (langVoices.length > 0) {
          // Sort them by priority: Natural -> Google -> Premium/Siri -> Standard
          const sortedVoices = [...langVoices].sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();

            const getPriority = (name: string) => {
              if (name.includes('natural')) return 4;
              if (name.includes('google')) return 3;
              if (name.includes('premium') || name.includes('siri')) return 2;
              return 1;
            };

            return getPriority(nameB) - getPriority(nameA);
          });

          setSelectedVoiceName(sortedVoices[0].name);
        } else if (allVoices.length > 0) {
          setSelectedVoiceName(allVoices[0].name);
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

      const utterance = new SpeechSynthesisUtterance(word);
      const langToUse = customLanguage || language;
      const targetLangCode = getLanguageCodeFromName(langToUse);
      utterance.lang = targetLangCode;

      let selectedVoice = voices.find((v) => v.name === selectedVoiceName);

      if (customLanguage) {
        const lowerLang = targetLangCode.toLowerCase();
        const langVoices = voices.filter(
          (v) =>
            v.lang.toLowerCase().startsWith(lowerLang) ||
            v.lang.toLowerCase().includes(lowerLang),
        );

        if (langVoices.length > 0) {
          const sortedVoices = [...langVoices].sort((a, b) => {
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();

            const getPriority = (name: string) => {
              if (name.includes('natural')) return 4;
              if (name.includes('google')) return 3;
              if (name.includes('premium') || name.includes('siri')) return 2;
              return 1;
            };

            return getPriority(nameB) - getPriority(nameA);
          });
          selectedVoice = sortedVoices[0];
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

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
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
    setSelectedVoiceName,
    speechRate,
    setSpeechRate,
    isSpeaking,
    isPaused,
    speak,
    stop,
    playWord,
  };
}
