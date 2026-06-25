import { ClipboardCopy, FileText, Trash2, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { Story, VocabularyTerm } from '../../types';
import { limitContextToTenWords } from '../../utils/segmenter';

interface VocabListViewProps {
  terms: VocabularyTerm[];
  langCode: string;
  isCustom: boolean;
  onRemoveWord?: (word: string) => void;
  story?: Story | null;
  playWord: (word: string, customLanguage?: string) => void;
  key?: string;
}

export default function VocabListView({
  terms,
  langCode,
  isCustom,
  onRemoveWord,
  story,
  playWord,
}: VocabListViewProps) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<
    | 'word-asc'
    | 'word-desc'
    | 'lang-asc'
    | 'lang-desc'
    | 'date-desc'
    | 'date-asc'
  >('date-desc');
  const [copyStatus, setCopyStatus] = useState<'plain' | 'rich' | null>(null);

  const filteredAndSortedTerms = useMemo(() => {
    // Map each term to include its original index (representing database order)
    const mapped = terms.map((term, index) => ({ term, index }));

    const filtered = mapped.filter(({ term }) => {
      const matchesQuery =
        term.word.toLowerCase().includes(query.toLowerCase()) ||
        term.definition.toLowerCase().includes(query.toLowerCase());
      return matchesQuery;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return b.index - a.index; // Newest first
      }
      if (sortBy === 'date-asc') {
        return a.index - b.index; // Oldest first
      }

      const aLang = a.term.language || story?.language || 'Unknown';
      const bLang = b.term.language || story?.language || 'Unknown';

      if (sortBy === 'word-asc') {
        return a.term.word.localeCompare(b.term.word, langCode);
      }
      if (sortBy === 'word-desc') {
        return b.term.word.localeCompare(a.term.word, langCode);
      }
      if (sortBy === 'lang-asc') {
        const langDiff = aLang.localeCompare(bLang);
        return langDiff !== 0
          ? langDiff
          : a.term.word.localeCompare(b.term.word, langCode);
      }
      if (sortBy === 'lang-desc') {
        const langDiff = bLang.localeCompare(aLang);
        return langDiff !== 0
          ? langDiff
          : a.term.word.localeCompare(b.term.word, langCode);
      }
      return 0;
    });

    return filtered.map(({ term }) => term);
  }, [terms, query, sortBy, story, langCode]);

  const copyPlainText = () => {
    let text = `VOCABULARY LIST\n`;
    text += `============================\n\n`;
    filteredAndSortedTerms.forEach((t, i) => {
      const termLang = t.language || story?.language || 'Unknown';
      text += `${i + 1}. ${t.word} (${t.partOfSpeech}) [Language: ${termLang}] - ${t.definition}\n`;
      if (t.contextSentence) {
        text += `   Context: "${limitContextToTenWords(t.contextSentence, t.word, langCode)}"\n`;
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus('plain');
      setTimeout(() => setCopyStatus(null), 2000);
    });
  };

  const copyRichText = () => {
    let html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1e293b; max-width: 700px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #004d2c; border-bottom: 2px solid #004d2c; padding-bottom: 8px; margin-bottom: 16px;">Vocabulary List</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; background-color: #f8fafc;">
              <th style="padding: 8px; font-size: 14px;">Word</th>
              <th style="padding: 8px; font-size: 14px;">Language</th>
              <th style="padding: 8px; font-size: 14px;">Part of Speech</th>
              <th style="padding: 8px; font-size: 14px;">Definition & Context</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredAndSortedTerms.forEach((t, idx) => {
      const termLang = t.language || story?.language || 'Unknown';
      html += `
        <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 8px; font-size: 14px; font-weight: bold; font-family: Georgia, serif; color: #0f172a;">${t.word}</td>
          <td style="padding: 8px; font-size: 12px; color: #475569; font-family: monospace;">${termLang}</td>
          <td style="padding: 8px; font-size: 12px; color: #64748b; font-style: italic;">${t.partOfSpeech}</td>
          <td style="padding: 8px; font-size: 13px; color: #334155;">
            <strong>${t.definition}</strong>
            ${t.contextSentence ? `<br/><span style="font-size: 11px; color: #64748b; font-style: italic;">e.g. "${limitContextToTenWords(t.contextSentence, t.word, langCode)}"</span>` : ''}
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const textBlob = new Blob([html.replace(/<[^>]+>/g, '')], {
      type: 'text/plain',
    });
    const item = new ClipboardItem({
      'text/html': blob,
      'text/plain': textBlob,
    });

    navigator.clipboard.write([item]).then(() => {
      setCopyStatus('rich');
      setTimeout(() => setCopyStatus(null), 2000);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="bg-tj-bg-card p-6 rounded-lg border border-tj-border-main shadow-none space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-tj-text-main text-sm font-sans">
            Vocabulary Terms Directory
          </h3>
          <p className="text-xs text-tj-text-muted">
            View, search, copy or export your vocabulary deck.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Copy Plain Text */}
          <button
            type="button"
            onClick={copyPlainText}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-tj-primary-light hover:bg-tj-primary-light/90 text-tj-text-main text-xs font-bold rounded border border-tj-success/40 cursor-pointer transition-all relative"
          >
            <FileText className="w-3.5 h-3.5 text-tj-text-muted" />
            <span>Copy Text</span>
            {copyStatus === 'plain' && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-tj-primary-light hover:bg-tj-primary-light/90 text-tj-text-main text-[10px] font-bold border border-tj-border-main py-1 px-2 rounded shadow-md whitespace-nowrap">
                Copied Plain Text!
              </span>
            )}
          </button>

          {/* Copy Rich Text */}
          <button
            type="button"
            onClick={copyRichText}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-tj-primary-light hover:bg-tj-primary-light/90 text-tj-text-main text-xs font-bold rounded border border-tj-success/40 cursor-pointer transition-all relative"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
            <span>Copy for Docs</span>
            {copyStatus === 'rich' && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-tj-primary-light hover:bg-tj-primary-light/90 text-tj-text-main text-[10px] py-1 px-2 rounded shadow-md whitespace-nowrap">
                Copied Rich Format!
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters and Search Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Search */}
        <div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter words or definitions..."
            className="w-full text-xs px-1 py-2 bg-transparent border-t-0 border-l-0 border-r-0 border-b border-tj-border-main hover:border-b-tj-text-muted text-tj-text-main placeholder-tj-text-muted/60 focus:border-b-tj-primary focus:ring-0 outline-none transition-all"
          />
        </div>

        {/* Sort selector */}
        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full appearance-none text-xs px-1 py-2 bg-transparent border-t-0 border-l-0 border-r-0 border-b border-tj-border-main hover:border-b-tj-text-muted text-tj-text-main focus:border-b-tj-primary focus:ring-0 outline-none cursor-pointer"
          >
            <option value="date-desc">Sort: Newest First</option>
            <option value="date-asc">Sort: Oldest First</option>
            <option value="word-asc">Sort: Word (A-Z)</option>
            <option value="word-desc">Sort: Word (Z-A)</option>
            <option value="lang-asc">Sort: Language (A-Z)</option>
            <option value="lang-desc">Sort: Language (Z-A)</option>
          </select>
        </div>
      </div>

      {filteredAndSortedTerms.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          No matching terms found.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Table view for larger screens */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-2 pt-1 font-mono">Word</th>
                  <th className="pb-2 pt-1 px-1 font-mono">Language</th>
                  <th className="pb-2 pt-1 px-1 font-mono">Part</th>
                  <th className="pb-2 pt-1 font-mono">Definition</th>
                  {isCustom && onRemoveWord && (
                    <th className="pb-2 pt-1 font-mono text-right"></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTerms.map((t) => (
                  <tr
                    key={`${t.word}-${t.partOfSpeech}`}
                    className="border-b border-slate-100/60 dark:border-slate-800/60 hover:bg-slate-50/30 dark:hover:bg-slate-900/20 transition-colors"
                  >
                    <td
                      lang={langCode}
                      className="py-3 pr-4 font-serif font-bold text-sm text-slate-805 dark:text-slate-200 align-top group"
                    >
                      <button
                        type="button"
                        className="flex items-center gap-1.5 hover:text-tj-primary transition-colors cursor-pointer text-left bg-transparent border-0 p-0 font-serif font-bold text-sm text-slate-805 dark:text-slate-200"
                        onClick={() => playWord(t.word, t.language)}
                        title="Click to pronounce word"
                      >
                        <span>{t.word}</span>
                        <Volume2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-tj-primary transition-opacity shrink-0" />
                      </button>
                      {t.transliteration && (
                        <span className="text-[10px] text-slate-400 font-sans italic block font-normal mt-0.5">
                          [{t.transliteration}]
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs font-mono text-slate-500 dark:text-slate-400 align-top">
                      {t.language || story?.language || 'Unknown'}
                    </td>
                    <td className="py-3 pr-4 text-xs font-mono text-slate-500 dark:text-slate-400 align-top">
                      {t.partOfSpeech}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-700 dark:text-slate-300 max-w-sm align-top">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-tj-text-main block">
                          {t.definition}
                        </span>
                        {t.contextSentence && (
                          <span className="text-[14px] text-tj-text-muted italic font-serif leading-relaxed block">
                            "
                            {limitContextToTenWords(
                              t.contextSentence,
                              t.word,
                              langCode,
                            )}
                            "
                          </span>
                        )}
                      </div>
                    </td>
                    {isCustom && onRemoveWord && (
                      <td className="py-3 text-right align-top">
                        <button
                          type="button"
                          onClick={() => onRemoveWord(t.word)}
                          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-955/20 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
                          title="Remove word from saved vocabulary"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="block sm:hidden space-y-3">
            {filteredAndSortedTerms.map((t) => (
              <div
                key={`${t.word}-${t.partOfSpeech}`}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10 hover:border-slate-200 dark:hover:border-slate-700 transition-all flex flex-col gap-2 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="flex flex-col cursor-pointer group/word text-left bg-transparent border-0 p-0"
                    onClick={() => playWord(t.word, t.language)}
                    title="Click to pronounce word"
                  >
                    <div className="flex items-center gap-1.5 hover:text-tj-primary transition-colors">
                      <span
                        lang={langCode}
                        className="font-serif font-bold text-base text-slate-800 dark:text-slate-200"
                      >
                        {t.word}
                      </span>
                      <Volume2 className="w-4 h-4 text-tj-primary opacity-60 group-hover/word:opacity-100 transition-opacity shrink-0" />
                    </div>
                    {t.transliteration && (
                      <span className="text-[11px] text-slate-400 font-sans italic">
                        [{t.transliteration}]
                      </span>
                    )}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                      {t.language || story?.language || 'Unknown'}
                    </span>
                    <span className="text-[10px] font-mono bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover px-1.5 py-0.5 rounded uppercase font-semibold font-sans">
                      {t.partOfSpeech}
                    </span>
                    {isCustom && onRemoveWord && (
                      <button
                        type="button"
                        onClick={() => onRemoveWord(t.word)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-955/20 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer border-0 bg-transparent shrink-0"
                        title="Remove word"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-350">
                  <span className="font-semibold text-tj-text-main block mb-1 text-[13px]">
                    {t.definition}
                  </span>
                  {t.contextSentence && (
                    <span className="text-xs text-tj-text-muted italic font-serif leading-relaxed block border-l-2 border-tj-border-main pl-2 py-0.5 mt-1.5">
                      "
                      {limitContextToTenWords(
                        t.contextSentence,
                        t.word,
                        langCode,
                      )}
                      "
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
