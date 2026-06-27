import { Gamepad2, Globe, Layers, List } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';
import {
  getLanguageCodeFromName,
  type Story,
  SUPPORTED_LANGUAGES,
  type VocabularyTerm,
} from '../types';
import FlashcardsDeck from './vocabulary/FlashcardsDeck';
import MatchingGame from './vocabulary/MatchingGame';
import VocabListView from './vocabulary/VocabListView';

interface VocabularyPracticeProps {
  story?: Story | null;
  onRemoveSavedWord?: (word: string) => void;
  onUpdateWordSRS?: (term: VocabularyTerm, isCorrect: boolean) => void;
  onVocabActivity?: (count: number) => void;
}

export default function VocabularyPractice({
  story,
  savedVocab = [],
  onRemoveSavedWord,
  onUpdateWordSRS,
  onVocabActivity,
}: VocabularyPracticeProps) {
  const langCode = story ? getLanguageCodeFromName(story.language) : 'en';
  const { playWord } = useSpeechSynthesis(story?.language || 'English');
  const [activeTab, setActiveTab] = useState<'flashcards' | 'match' | 'list'>(
    'flashcards',
  );
  const [sourceType, setSourceType] = useState<'story' | 'custom'>(
    savedVocab && savedVocab.length > 0 ? 'custom' : 'story',
  );

  // Collect vocab words based on selected source type and deduplicate
  const allVocab = useMemo(() => {
    const rawVocab =
      sourceType === 'story' && story && story.chapters
        ? story.chapters.reduce((accum: VocabularyTerm[], ch) => {
            if (ch.vocabulary) {
              accum.push(
                ...ch.vocabulary.map((v) => ({
                  ...v,
                  language: story.language,
                })),
              );
            }
            return accum;
          }, [])
        : savedVocab;

    // Deduplicate by word (case-insensitive, trimmed)
    const uniqueMap = new Map<string, VocabularyTerm>();
    rawVocab.forEach((item) => {
      const key = item.word.toLowerCase().trim();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });
    return Array.from(uniqueMap.values());
  }, [sourceType, story, savedVocab]);

  const [selectedLang, setSelectedLang] = useState('All');

  // Compute unique languages present in allVocab list
  const uniqueLanguages = useMemo(() => {
    const langs = new Set<string>();
    allVocab.forEach((t) => {
      const lang = t.language || story?.language || 'Unknown';
      langs.add(lang);
    });
    return Array.from(langs).sort();
  }, [allVocab, story]);

  // Reset language filter if the list of unique languages changes and the selected lang is no longer present
  useEffect(() => {
    if (selectedLang !== 'All' && !uniqueLanguages.includes(selectedLang)) {
      setSelectedLang('All');
    }
  }, [uniqueLanguages, selectedLang]);

  // Filter terms by selected language and sort by SRS priority (due words first)
  const filteredVocab = useMemo(() => {
    const filtered = allVocab.filter((t) => {
      const termLang = t.language || story?.language || 'Unknown';
      return selectedLang === 'All' || termLang === selectedLang;
    });

    return filtered.sort((a, b) => {
      // If neither has review date, sort alphabetically
      if (!a.nextReviewDate && !b.nextReviewDate) return a.word.localeCompare(b.word);
      // If one is missing review date (new word), prioritize it slightly
      if (!a.nextReviewDate) return -1;
      if (!b.nextReviewDate) return 1;
      
      const dateA = new Date(a.nextReviewDate).getTime();
      const dateB = new Date(b.nextReviewDate).getTime();
      return dateA - dateB;
    });
  }, [allVocab, selectedLang, story]);

  if (allVocab.length === 0) {
    return (
      <div className="space-y-4">
        {/* Source Switcher toolbar inside empty state */}
        <div className="flex gap-2.5 items-center justify-center">
          {story && (
            <button
              type="button"
              onClick={() => setSourceType('story')}
              className={`px-3 py-1 text-xs rounded font-bold transition-all border ${
                sourceType === 'story'
                  ? 'bg-tj-mint text-tj-text-main border-tj-success/50'
                  : 'text-tj-text-muted hover:text-tj-text-main border-transparent bg-transparent'
              }`}
            >
              Story Core Glossary
            </button>
          )}
          {savedVocab.length > 0 && (
            <button
              type="button"
              onClick={() => setSourceType('custom')}
              className={`px-3 py-1 text-xs rounded font-bold transition-all border ${
                sourceType === 'custom'
                  ? 'bg-tj-mint text-tj-text-main border-tj-success/50'
                  : 'text-tj-text-muted hover:text-tj-text-main border-transparent bg-transparent'
              }`}
            >
              My Saved Vocabulary ({savedVocab.length})
            </button>
          )}
        </div>

        <div className="bg-tj-bg-card p-8 rounded-lg border border-tj-border-main text-center text-tj-text-muted shadow-none">
          <Layers className="w-12 h-12 text-tj-text-muted/30 mx-auto mb-3 animate-bounce" />
          <p className="font-medium text-tj-text-main">
            No Vocabulary Terms Recurrence
          </p>
          <p className="text-xs text-tj-text-muted mt-1 leading-relaxed">
            {sourceType === 'story'
              ? 'Please write or open a story with valid chapters to launch vocab glossary practice.'
              : 'Please enter or save some terms first using the interactive click-to-translate inside the Reader Panel!'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Source Switcher & Global Language Selector Option Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-tj-bg-card p-3 rounded-lg border border-tj-border-main shadow-none gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-xs font-bold text-tj-text-muted uppercase tracking-widest font-sans ml-1">
            Practice Source:
          </span>
          <div className="flex w-full sm:w-fit bg-tj-bg-recessed p-1 rounded border border-tj-border-main">
            {story?.chapters && (
              <button
                type="button"
                onClick={() => setSourceType('story')}
                className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer text-center ${
                  sourceType === 'story'
                    ? 'bg-tj-mint text-tj-text-main border border-tj-success/40 shadow-none font-bold'
                    : 'text-tj-text-muted hover:text-tj-text-main'
                }`}
              >
                <span className="hidden sm:inline">
                  Story Glossary (
                  {story.chapters.reduce(
                    (accum: number, ch) => accum + (ch.vocabulary?.length || 0),
                    0,
                  )}
                  )
                </span>
                <span className="sm:hidden">
                  Story (
                  {story.chapters.reduce(
                    (accum: number, ch) => accum + (ch.vocabulary?.length || 0),
                    0,
                  )}
                  )
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSourceType('custom')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer text-center ${
                sourceType === 'custom'
                  ? 'bg-tj-mint text-tj-text-main border border-tj-success/40 shadow-none font-bold'
                  : 'text-tj-text-muted hover:text-tj-text-main'
              }`}
            >
              <span className="hidden sm:inline">
                My Custom Saved Words ({savedVocab.length})
              </span>
              <span className="sm:hidden">Saved ({savedVocab.length})</span>
            </button>
          </div>
        </div>

        {/* Global Language Filter */}
        {uniqueLanguages.length > 1 && (
          <div className="flex items-center gap-2 bg-tj-bg-recessed p-1.5 rounded border border-tj-border-main self-start md:self-auto w-full md:w-auto">
            <span className="text-xs font-bold text-tj-text-muted px-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>Language:</span>
            </span>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="appearance-none text-xs px-2.5 py-1 bg-tj-bg-card border border-tj-border-main rounded text-tj-text-main focus:border-tj-primary focus:ring-0 outline-none cursor-pointer font-medium"
            >
              <option value="All">All ({uniqueLanguages.length})</option>
              {uniqueLanguages.map((lang) => {
                const langObj = SUPPORTED_LANGUAGES.find(
                  (l) => l.name.toLowerCase() === lang.toLowerCase(),
                );
                const flag = langObj ? langObj.flag : '🌐';
                return (
                  <option key={lang} value={lang}>
                    {flag} {lang}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      <div className="flex w-full sm:w-fit bg-tj-bg-recessed p-1 rounded border border-tj-border-main">
        <button
          type="button"
          onClick={() => setActiveTab('flashcards')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 text-xs font-semibold rounded transition-all cursor-pointer ${
            activeTab === 'flashcards'
              ? 'bg-tj-mint text-tj-text-main border border-tj-success/40 shadow-none font-bold'
              : 'text-tj-text-muted hover:text-tj-text-main'
          }`}
        >
          <Layers className="w-4.5 h-4.5 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">
            Interactive Flashcards ({filteredVocab.length})
          </span>
          <span className="sm:hidden">Flashcards ({filteredVocab.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('match')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 text-xs font-semibold rounded transition-all cursor-pointer ${
            activeTab === 'match'
              ? 'bg-tj-mint text-tj-text-main border border-tj-success/40 shadow-none font-bold'
              : 'text-tj-text-muted hover:text-tj-text-main'
          }`}
        >
          <Gamepad2 className="w-4.5 h-4.5 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Vocab Matching Game</span>
          <span className="sm:hidden">Matching</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 text-xs font-semibold rounded transition-all cursor-pointer ${
            activeTab === 'list'
              ? 'bg-tj-mint text-tj-text-main border border-tj-success/40 shadow-none font-bold'
              : 'text-tj-text-muted hover:text-tj-text-main'
          }`}
        >
          <List className="w-4.5 h-4.5 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">
            Word List ({filteredVocab.length})
          </span>
          <span className="sm:hidden">List ({filteredVocab.length})</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'flashcards' && (
          <FlashcardsDeck
            key="flashcards"
            terms={filteredVocab}
            langCode={langCode}
            onVocabActivity={onVocabActivity}
            onUpdateWordSRS={onUpdateWordSRS}
            playWord={playWord}
          />
        )}
        {activeTab === 'match' && (
          <MatchingGame
            key="match"
            terms={filteredVocab}
            langCode={langCode}
            onVocabActivity={onVocabActivity}
            onUpdateWordSRS={onUpdateWordSRS}
            playWord={playWord}
          />
        )}
        {activeTab === 'list' && (
          <VocabListView
            key="list"
            terms={filteredVocab}
            langCode={langCode}
            isCustom={sourceType === 'custom'}
            onRemoveWord={onRemoveSavedWord}
            story={story}
            playWord={playWord}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
