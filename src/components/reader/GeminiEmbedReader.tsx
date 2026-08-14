import React, { useState } from 'react';
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Check,
  Edit3,
  ExternalLink,
  Globe,
  Lock,
  Share2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Story } from '../../types';
import { getStoryCoverUrl } from '../../utils/coverUtils';
import { updateStoryDescription } from '../../services/db';

interface GeminiEmbedReaderProps {
  story: Story;
  currentUser: any;
  bookshelf: string[];
  handleToggleBookshelf: (storyId: string) => void;
  handleToggleStoryPrivacy: (storyId: string) => Promise<void>;
  handleShareStoryLink: () => void;
  handleDeleteStory?: () => void;
  onStoryUpdated?: (updatedStory: Story) => void;
}

export default function GeminiEmbedReader({
  story,
  currentUser,
  bookshelf,
  handleToggleBookshelf,
  handleToggleStoryPrivacy,
  handleShareStoryLink,
  handleDeleteStory,
  onStoryUpdated,
}: GeminiEmbedReaderProps) {
  const [isEditing, setIsEditing] = useState(!story.description);
  const [editTitle, setEditTitle] = useState(story.title || '');
  const [editDescription, setEditDescription] = useState(story.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [imgError, setImgError] = useState(false);

  React.useEffect(() => {
    setEditTitle(story.title || '');
    setEditDescription(story.description || '');
    setImgError(false);
  }, [story.id, story.title, story.description]);

  const isSavedInBookshelf = bookshelf.includes(story.id);
  const isOwner =
    currentUser &&
    (currentUser.uid === story.creatorId || currentUser.isAdmin === true);

  const embedLink = story.embedUrl || 'https://gemini.google.com';
  const coverUrl = getStoryCoverUrl(story);

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const newTitle = editTitle.trim() || story.title;
      const newDesc = editDescription.trim();

      await updateStoryDescription(story.id, newDesc);

      const updatedStory: Story = {
        ...story,
        title: newTitle,
        description: newDesc,
      };

      if (onStoryUpdated) {
        onStoryUpdated(updatedStory);
      }
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update story details:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article className="space-y-6 max-w-4xl mx-auto">
      {/* Header & Controls Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-tj-bg-card border border-tj-border-main p-5 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0 border border-emerald-500/30 shadow-xs">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-lg sm:text-xl font-serif font-extrabold text-tj-text-main truncate">
                {story.title || 'Gemini Storybook'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 tracking-wide uppercase">
                Gemini Storybook ✨
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-tj-primary/10 text-tj-primary border border-tj-primary/20">
                {story.cefrLevel}
              </span>
            </div>
            {story.description ? (
              <p className="text-xs text-tj-text-muted leading-relaxed max-w-xl">
                {story.description}
              </p>
            ) : (
              <p className="text-xs text-tj-text-muted/60 italic">
                No description set yet. Click edit to add one.
              </p>
            )}
          </div>
        </div>

        {/* Top Control Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Edit Description & Title Button */}
          {isOwner && (
            <button
              type="button"
              onClick={() => {
                setEditTitle(story.title || '');
                setEditDescription(story.description || '');
                setIsEditing(!isEditing);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                isEditing
                  ? 'bg-tj-primary text-white border-tj-primary'
                  : 'text-tj-text-main hover:bg-slate-100 dark:hover:bg-slate-800 border-tj-border-main'
              }`}
              title="Edit story description"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Close Edit' : 'Edit Info'}</span>
            </button>
          )}

          {/* Bookshelf Bookmark Toggle */}
          <button
            type="button"
            onClick={() => handleToggleBookshelf(story.id)}
            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
              isSavedInBookshelf
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                : 'text-tj-text-muted hover:text-tj-text-main hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={
              isSavedInBookshelf
                ? 'Remove from Bookshelf'
                : 'Save to Bookshelf'
            }
          >
            {isSavedInBookshelf ? (
              <BookmarkCheck className="w-4 h-4" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>

          {/* Privacy Toggle */}
          {isOwner && (
            <button
              type="button"
              onClick={() => handleToggleStoryPrivacy(story.id)}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                story.isPublic
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
              }`}
              title={
                story.isPublic
                  ? 'Public Story (Click to make private)'
                  : 'Private Story (Click to make public)'
              }
            >
              {story.isPublic ? (
                <Globe className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Share Link */}
          <button
            type="button"
            onClick={handleShareStoryLink}
            className="p-2.5 text-tj-text-muted hover:text-tj-text-main hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            title="Share Story Link"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Delete Story */}
          {isOwner && handleDeleteStory && (
            <button
              type="button"
              onClick={handleDeleteStory}
              className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
              title="Delete Story"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Edit Description Form Drawer / Card */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="bg-tj-bg-card border border-tj-primary/30 p-5 rounded-2xl shadow-lg space-y-4 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-tj-text-main flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-tj-primary" />
                Edit Story Information
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 text-tj-text-muted hover:text-tj-text-main rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-tj-text-muted mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main text-sm focus:ring-2 focus:ring-tj-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-tj-text-muted mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add a description or summary for this story..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main text-sm focus:ring-2 focus:ring-tj-primary outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-semibold text-tj-text-muted hover:text-tj-text-main border border-tj-border-main rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveEdit}
                className="px-5 py-2 text-xs font-bold text-white bg-tj-primary hover:bg-tj-primary-hover rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Description'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Interactive Launch Container with Book Cover Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-emerald-900/10 via-tj-bg-card to-teal-900/10 border border-emerald-500/20 rounded-3xl p-6 sm:p-10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden text-center md:text-left"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Book Cover Image Display */}
        <div className="shrink-0 relative group">
          <div className="w-44 sm:w-52 aspect-[3/4.2] rounded-2xl overflow-hidden border-2 border-emerald-500/30 shadow-2xl bg-tj-bg-recessed relative">
            {!imgError && coverUrl ? (
              <img
                src={coverUrl}
                onError={() => setImgError(true)}
                alt={story.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center bg-gradient-to-br from-emerald-800 to-teal-900 text-white space-y-2">
                <BookOpen className="w-10 h-10 text-emerald-300 mb-1" />
                <h4 className="text-xs font-serif font-bold line-clamp-3">
                  {story.title}
                </h4>
                <span className="text-[9px] uppercase tracking-widest font-mono text-emerald-200">
                  {story.cefrLevel} • {story.language}
                </span>
              </div>
            )}
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white p-1.5 rounded-full">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Story Information & Launch Action */}
        <div className="flex-1 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="text-xs font-bold font-mono px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-500/30">
                {story.language.toUpperCase()} • {story.cefrLevel}
              </span>
              {story.genre && (
                <span className="text-xs font-mono text-tj-text-muted capitalize">
                  {story.genre}
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-tj-text-main tracking-tight leading-tight">
              {story.title || 'Interactive Gemini Storybook'}
            </h2>
            {story.description ? (
              <p className="text-xs sm:text-sm text-tj-text-muted leading-relaxed font-sans max-w-xl">
                {story.description}
              </p>
            ) : (
              <p className="text-xs text-tj-text-muted/70 italic font-sans">
                Interactive storybook created with Google Gemini. Click edit info to add notes or description.
              </p>
            )}
          </div>

          {/* Edit Description shortcut button */}
          {isOwner && !isEditing && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setEditTitle(story.title || '');
                  setEditDescription(story.description || '');
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-tj-primary hover:text-tj-primary-hover underline cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Update Story Description</span>
              </button>
            </div>
          )}

          {/* Launch Action Button */}
          <div className="pt-2">
            <a
              href={embedLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-3 py-3.5 px-7 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-emerald-600/30 hover:shadow-emerald-500/40 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Launch Storybook in Gemini</span>
              <ExternalLink className="w-4 h-4 opacity-80 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

          {/* Link URL pill */}
          <div>
            <span className="text-[10px] font-mono text-tj-text-muted/70 bg-tj-bg-recessed px-3 py-1.5 rounded-xl border border-tj-border-main/50 inline-block max-w-full truncate">
              {embedLink}
            </span>
          </div>
        </div>
      </motion.div>
    </article>
  );
}
