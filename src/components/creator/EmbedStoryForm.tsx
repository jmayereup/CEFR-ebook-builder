import { Globe, Sparkles } from 'lucide-react';
import type React from 'react';
import {
  CEFR_LEVELS,
  GENRES,
  type SUPPORTED_LANGUAGES,
} from '../../types';

interface EmbedStoryFormProps {
  embedUrl: string;
  setEmbedUrl: (val: string) => void;
  embedUrlError: string;
  setEmbedUrlError: (val: string) => void;
  embedStoryTitle: string;
  setEmbedStoryTitle: (val: string) => void;
  embedDescription: string;
  setEmbedDescription: (val: string) => void;
  language: string;
  onLanguageChange: (langCode: string) => void;
  sortedLanguages: typeof SUPPORTED_LANGUAGES;
  cefrLevel: string;
  onLevelChange: (level: string) => void;
  genre: string;
  setGenre: (genre: string) => void;
  isPublic: boolean;
  setIsPublic: (isPublic: boolean) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function EmbedStoryForm({
  embedUrl,
  setEmbedUrl,
  embedUrlError,
  setEmbedUrlError,
  embedStoryTitle,
  setEmbedStoryTitle,
  embedDescription,
  setEmbedDescription,
  language,
  onLanguageChange,
  sortedLanguages,
  cefrLevel,
  onLevelChange,
  genre,
  setGenre,
  isPublic,
  setIsPublic,
  isLoading,
  onSubmit,
}: EmbedStoryFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
        <div className="font-semibold flex items-center gap-1.5 text-sm">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          Gemini Storybook Shared Link
        </div>
        <p>
          Paste a shared story link created with Google Gemini's Storybook Gem
          (e.g.,{' '}
          <code className="bg-emerald-500/20 px-1 py-0.5 rounded font-mono">
            https://share.gemini.google/WqFtCVRyBcpI
          </code>
          ).
        </p>
      </div>

      {/* Gemini Link URL */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Gemini Share Link URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={embedUrl}
          onChange={(e) => {
            setEmbedUrl(e.target.value);
            if (embedUrlError) setEmbedUrlError('');
          }}
          placeholder="https://share.gemini.google/..."
          required
          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-tj-primary focus:border-transparent outline-none transition"
        />
        {embedUrlError && (
          <p className="mt-1.5 text-xs text-red-500 font-medium">
            {embedUrlError}
          </p>
        )}
      </div>

      {/* Optional Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Story Title (Optional)
        </label>
        <input
          type="text"
          value={embedStoryTitle}
          onChange={(e) => setEmbedStoryTitle(e.target.value)}
          placeholder="e.g., The Forest Adventure"
          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-tj-primary focus:border-transparent outline-none transition"
        />
      </div>

      {/* Language Selection */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          <Globe className="w-4 h-4 text-tj-primary" />
          Story Language
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {sortedLanguages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => onLanguageChange(lang.code)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                language === lang.code
                  ? 'border-tj-primary bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover ring-2 ring-tj-primary/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-transparent text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="text-2xl mb-1">{lang.flag}</span>
              <span className="text-xs font-semibold">{lang.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CEFR Level */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          CEFR Level
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {CEFR_LEVELS.map((lvl) => (
            <button
              key={lvl.code}
              type="button"
              onClick={() => onLevelChange(lvl.code)}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                cefrLevel === lvl.code
                  ? 'border-tj-primary bg-tj-primary text-white shadow-md scale-105'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
              }`}
            >
              {lvl.code}
            </button>
          ))}
        </div>
      </div>

      {/* Genre */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Genre
        </label>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-tj-primary outline-none transition"
        >
          {GENRES.map((g) => (
            <option key={g.id} value={g.id}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Description / Notes (Optional)
        </label>
        <textarea
          rows={2}
          value={embedDescription}
          onChange={(e) => setEmbedDescription(e.target.value)}
          placeholder="Short description of this Gemini story..."
          className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-tj-primary outline-none transition resize-none"
        />
      </div>

      {/* Public Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div>
          <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-500" />
            Make Story Public
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Allow other learners to read this story on the public library
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsPublic(!isPublic)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
            isPublic ? 'bg-tj-primary' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isPublic ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <Sparkles className="w-4 h-4" />
        {isLoading ? 'Importing Story...' : 'Add Gemini Story to Library'}
      </button>
    </form>
  );
}
