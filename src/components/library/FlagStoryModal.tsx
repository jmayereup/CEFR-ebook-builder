import { AlertTriangle, Flag, Loader2, Mail, X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { flagStoryForDeletion } from '../../services/db';
import type { IUser } from '../../services/types';
import type { DeletionFlag, Story } from '../../types';

interface FlagStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: Story | null;
  currentUser: IUser | null;
  onSuccess?: (message: string) => void;
}

export default function FlagStoryModal({
  isOpen,
  onClose,
  story,
  currentUser,
  onSuccess,
}: FlagStoryModalProps) {
  const [reason, setReason] = useState<DeletionFlag['reason']>('inappropriate');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !story) return null;

  const isEmailUnverified =
    Boolean(currentUser && currentUser.emailVerified === false && !currentUser.isAdmin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEmailUnverified) {
      setError(
        'Email verification required. Please verify your email address to flag stories.',
      );
      return;
    }
    if (!comment.trim()) {
      setError('Please provide a reason comment for your flag request.');
      return;
    }

    if (!currentUser) {
      setError('You must be signed in to flag stories.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await flagStoryForDeletion({
        storyId: story.id,
        storyTitle: story.title || 'Untitled Story',
        flaggerId: currentUser.uid,
        flaggerEmail: currentUser.email || 'anonymous@user.com',
        reason,
        comment: comment.trim(),
      });

      if (onSuccess) {
        onSuccess(
          `Story "${story.title}" has been flagged for administrator review. Thank you for your feedback!`,
        );
      }
      setComment('');
      onClose();
    } catch (err: any) {
      console.error('Error submitting story flag:', err);
      setError(err.message || 'Failed to submit story flag. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-tj-bg-card border border-tj-border-main rounded-2xl shadow-2xl overflow-hidden select-text p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-tj-border-main">
          <div className="flex items-center gap-2 text-rose-500 font-bold text-lg">
            <Flag className="w-5 h-5" />
            <span>Flag Story for Deletion</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-tj-text-muted hover:text-tj-text-main rounded-lg hover:bg-tj-bg-recessed transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Story Info */}
        <div className="my-4 p-3 bg-tj-bg-recessed rounded-xl border border-tj-border-main/50">
          <p className="text-xs font-mono text-tj-text-muted uppercase">
            Story to Review:
          </p>
          <p className="text-sm font-bold text-tj-text-main font-serif">
            "{story.title}"
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEmailUnverified && (
            <div className="p-3 bg-amber-50 dark:bg-amber-955/20 text-amber-800 dark:text-amber-300 text-xs rounded-xl border border-amber-200 dark:border-amber-900/40 flex items-start gap-2">
              <Mail className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-bold">Email Verification Required</p>
                <p className="mt-0.5 leading-relaxed text-[11px]">
                  Please verify your email address to submit story deletion
                  requests.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs rounded-xl border border-rose-200 dark:border-rose-900/40 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Reason Radio Group */}
          <div>
            <label className="block text-xs font-bold text-tj-text-muted uppercase tracking-wider mb-2">
              Reason for Deletion Flag
            </label>
            <select
              value={reason}
              disabled={isEmailUnverified}
              onChange={(e) =>
                setReason(e.target.value as DeletionFlag['reason'])
              }
              className="w-full text-xs p-3 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main focus:border-tj-primary focus:outline-none cursor-pointer disabled:opacity-50"
            >
              <option value="inappropriate">
                🚩 Inappropriate / Offensive Content
              </option>
              <option value="quality">
                ⚠️ Low Text Quality / Inaccurate CEFR Level
              </option>
              <option value="formatting">
                🛠️ Formatting or Rendering Errors
              </option>
              <option value="duplicate">
                📄 Duplicate or Copyright Concern
              </option>
              <option value="other">📝 Other Reason</option>
            </select>
          </div>

          {/* Comment / Explanation Textarea */}
          <div>
            <label className="block text-xs font-bold text-tj-text-muted uppercase tracking-wider mb-2">
              Detailed Explanation / Comment{' '}
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={comment}
              disabled={isEmailUnverified}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Please describe why this story should be removed by an administrator..."
              className="w-full text-xs p-3 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main focus:border-tj-primary focus:outline-none resize-none disabled:opacity-50"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-tj-border-main">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-tj-text-muted hover:text-tj-text-main transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !comment.trim() || isEmailUnverified}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Flag...</span>
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4" />
                  <span>Submit Flag for Review</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
