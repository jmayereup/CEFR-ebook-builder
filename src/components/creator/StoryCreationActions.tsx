import { Edit3, HelpCircle, Lock, Sparkles } from 'lucide-react';
import type React from 'react';

interface StoryCreationActionsProps {
  draftError: string;
  currentUser: any;
  isDraftingOutline: boolean;
  isLoading: boolean;
  onCreateFromScratch: () => void;
  onLogin?: (mode?: 'signin' | 'signup') => void;
}

export default function StoryCreationActions({
  draftError,
  currentUser,
  isDraftingOutline,
  isLoading,
  onCreateFromScratch,
  onLogin,
}: StoryCreationActionsProps) {
  const isDisabled = !currentUser || isDraftingOutline || isLoading;

  return (
    <>
      {draftError && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 text-xs rounded-xl border border-rose-100 dark:border-rose-950/30 flex items-start gap-2">
          <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{draftError}</span>
        </div>
      )}

      {/* Sign in prompt banner */}
      {!currentUser && (
        <div className="p-5 bg-tj-primary-light/50 dark:bg-slate-800/40 border border-tj-primary-border/60 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-start gap-3 text-left">
            <div className="p-2 bg-tj-primary-light dark:bg-tj-primary-light/20 text-tj-primary rounded-xl shrink-0 mt-0.5">
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Sign Up or Sign In to Create Stories
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Create custom graded stories, export to DRM-free eBook formats,
                and practice vocabulary. Free daily generations during our
                limited-time launch!
              </p>
            </div>
          </div>
          {onLogin && (
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={() => onLogin('signup')}
                className="flex-1 md:flex-none py-2.5 px-4 bg-tj-primary hover:bg-tj-primary-hover active:bg-tj-primary text-tj-bg-main font-semibold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 text-center"
              >
                Sign Up Free
              </button>
              <button
                type="button"
                onClick={() => onLogin('signin')}
                className="flex-1 md:flex-none py-2.5 px-4 bg-transparent border border-tj-border-main hover:bg-slate-100 dark:hover:bg-slate-800 text-tj-text-main font-semibold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap text-center"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="submit"
          disabled={isDisabled}
          className="flex items-center justify-center gap-2 py-3.5 px-4 bg-tj-primary hover:bg-tj-primary-hover active:bg-tj-primary disabled:bg-slate-300 disabled:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:dark:bg-slate-800 dark:bg-tj-primary dark:hover:bg-tj-primary-hover text-tj-bg-main font-semibold text-sm rounded-xl transition-colors dark:shadow-none cursor-pointer"
        >
          {isDraftingOutline ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin font-semibold"></div>
              <span>Drafting Story Outline...</span>
            </div>
          ) : (
            <>
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>Generate Story Outline & Plan</span>
            </>
          )}
        </button>
        <button
          type="button"
          disabled={isDisabled}
          onClick={onCreateFromScratch}
          className="flex items-center justify-center gap-2 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
        >
          <Edit3 className="w-4 h-4" />
          <span>Create from Scratch</span>
        </button>
      </div>
    </>
  );
}
