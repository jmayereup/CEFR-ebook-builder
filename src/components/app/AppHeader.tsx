import {
  AlertTriangle,
  Crown,
  FileText,
  Flag,
  Flame,
  HelpCircle,
  LogOut,
  Mail,
  Moon,
  Pencil,
  Settings,
  Shield,
  Sun,
  User,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { updateUsername } from '../../services/auth';
import { getLocalTodayStr } from '../../services/db';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import type { Story, UserStreakData } from '../../types';

interface AppHeaderProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setShowSettingsModal: (show: boolean) => void;
  authChecking: boolean;
  isPaid: boolean;
  handleLogin: () => void;
  handleLogout: () => void;
  setSelectedStory: (story: Story | null) => void;
  setActiveTab: (
    tab: 'browse' | 'bookshelf' | 'create' | 'practice' | 'admin',
  ) => void;
  streakData: UserStreakData | null;
  onOpenStreakDashboard: () => void;
  pendingFlagCount?: number;
}

export default function AppHeader({
  darkMode,
  toggleDarkMode,
  setShowSettingsModal,
  authChecking,
  isPaid,
  handleLogin,
  handleLogout,
  setSelectedStory,
  setActiveTab,
  streakData,
  onOpenStreakDashboard,
  pendingFlagCount = 0,
}: AppHeaderProps) {
  const customOpenRouterKey = useUIStore((state) => state.customOpenRouterKey);
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);
  const helpMenuRef = useRef<HTMLDivElement>(null);

  const todayStr = getLocalTodayStr();
  const isStreakMetToday =
    !!streakData &&
    (streakData.lastActiveDate === todayStr ||
      streakData.activityHistory?.includes(todayStr));

  useEffect(() => {
    if (!isProfileMenuOpen) {
      setIsEditingUsername(false);
      setUsernameError('');
    }
  }, [isProfileMenuOpen]);

  const handleStartEdit = () => {
    setNewUsername(currentUser?.displayName || '');
    setIsEditingUsername(true);
    setUsernameError('');
  };

  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const trimmed = newUsername.trim();
    if (!trimmed) {
      setUsernameError('Username cannot be empty');
      return;
    }
    if (trimmed === currentUser.displayName) {
      setIsEditingUsername(false);
      return;
    }
    setIsSavingUsername(true);
    setUsernameError('');
    try {
      const updatedUser = await updateUsername(currentUser.uid, trimmed);
      setCurrentUser(updatedUser);
      setIsEditingUsername(false);
    } catch (err) {
      console.error('Failed to update username:', err);
      const message =
        err instanceof Error ? err.message : 'Failed to update username';
      setUsernameError(message);
    } finally {
      setIsSavingUsername(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (
        helpMenuRef.current &&
        !helpMenuRef.current.contains(event.target as Node)
      ) {
        setIsHelpMenuOpen(false);
      }
    };
    if (isProfileMenuOpen || isHelpMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen, isHelpMenuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-tj-bg-main dark:bg-[#121310] border-b border-tj-border-main">
      {currentUser?.isAdmin === true && pendingFlagCount > 0 && (
        <div className="bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
            <span>
              Admin Alert: {pendingFlagCount} story deletion request(s) pending
              review.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className="px-3 py-1 bg-slate-950 text-white font-bold rounded-lg text-[11px] hover:bg-slate-900 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Flag className="w-3 h-3" />
            <span>Review Flags</span>
          </button>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* biome-ignore lint/a11y/useSemanticElements: logo wrapper contains block-level headings and must be a div */}
        <div
          role="button"
          tabIndex={0}
          className="flex items-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tj-primary focus-visible:ring-offset-2 rounded"
          onClick={() => {
            setSelectedStory(null);
            setActiveTab('browse');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setSelectedStory(null);
              setActiveTab('browse');
            } else if (e.key === ' ') {
              e.preventDefault();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === ' ') {
              setSelectedStory(null);
              setActiveTab('browse');
            }
          }}
        >
          <img
            src="/tj-logo.svg"
            alt="TJ Logo"
            className="w-8 h-8 rounded border border-tj-border-main"
          />
          <div>
            <h1 className="text-sm font-bold tracking-tight text-tj-text-main leading-none font-sans">
              CEFR Stories
            </h1>
            <span className="text-[10px] text-tj-text-muted font-mono">
              eBook Builder
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Reading Streak Flame — only rendered in header if unmet today */}
          {currentUser && !isStreakMetToday && (
            <button
              type="button"
              onClick={onOpenStreakDashboard}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-extrabold rounded-full border transition-all cursor-pointer shadow-sm ${
                streakData && streakData.currentStreak > 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100/60'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100/60'
              }`}
              title={
                streakData && streakData.currentStreak > 0
                  ? `${streakData.currentStreak} Day Streak! Click to view progress.`
                  : 'Streak inactive today. Read a story to activate!'
              }
            >
              <Flame
                className={`w-4 h-4 ${
                  streakData && streakData.currentStreak > 0
                    ? 'fill-emerald-500 text-emerald-500 animate-pulse'
                    : 'text-slate-400'
                }`}
              />
              <span>{streakData?.currentStreak ?? 0}</span>
            </button>
          )}

          {/* Dark Mode toggle moved inside profile dropdown menu */}

          {/* Settings button removed from header bar */}

          {/* Auth panel */}
          {authChecking ? (
            <div className="w-6 h-6 border-2 border-tj-primary-color border-t-transparent rounded-full animate-spin"></div>
          ) : currentUser ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="p-2 text-slate-800 dark:text-slate-200 hover:bg-tj-primary-light rounded-full transition-all cursor-pointer relative flex items-center justify-center bg-transparent border-0 focus:outline-none"
                title="User menu"
              >
                <User className="w-5 h-5" />
                {customOpenRouterKey && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-tj-success rounded-full border border-tj-bg-main" />
                )}
              </button>

              {/* Dropdown Menu */}
              {isProfileMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-tj-bg-card rounded-2xl border border-tj-border-main p-4 shadow-xl z-50 text-tj-text-main font-sans flex flex-col gap-3"
                  style={{ top: '100%' }}
                >
                  {/* User Name & Tier info */}
                  <div className="pb-2.5 border-b border-tj-border-main/50 space-y-1.5">
                    {isEditingUsername ? (
                      <form
                        onSubmit={handleSaveUsername}
                        className="flex flex-col gap-1.5"
                      >
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          disabled={isSavingUsername}
                          className="w-full text-xs px-2.5 py-1.5 bg-tj-bg-recessed border border-tj-border-main rounded-lg focus:outline-none focus:border-tj-primary text-tj-text-main font-semibold"
                          placeholder="Username"
                          // biome-ignore lint/a11y/noAutofocus: autofocus input on entering edit mode
                          autoFocus
                          maxLength={50}
                        />
                        {usernameError && (
                          <p className="text-[10px] text-tj-error font-medium leading-none">
                            {usernameError}
                          </p>
                        )}
                        <div className="flex gap-1.5">
                          <button
                            type="submit"
                            disabled={isSavingUsername || !newUsername.trim()}
                            className="px-2.5 py-1 text-[10px] font-bold bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main rounded-lg cursor-pointer disabled:opacity-50 transition-colors"
                          >
                            {isSavingUsername ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingUsername(false)}
                            disabled={isSavingUsername}
                            className="px-2.5 py-1 text-[10px] font-bold bg-tj-bg-recessed hover:bg-tj-border-main/30 text-tj-text-muted rounded-lg cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-xs font-bold text-tj-text-main truncate">
                              {currentUser.displayName || 'Learner'}
                            </p>
                            {currentUser.isAdmin === true && (
                              <Crown className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={handleStartEdit}
                            className="p-1 text-tj-text-muted hover:text-tj-primary rounded transition-all cursor-pointer hover:bg-tj-primary-light"
                            title="Edit username"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[10px] text-tj-text-muted truncate leading-tight">
                          {currentUser.email || 'No email registered'}
                        </p>
                        <p className="text-[10px] text-tj-text-muted font-mono leading-tight">
                          {currentUser.isAdmin === true
                            ? 'Super Admin'
                            : isPaid
                              ? 'Paid Tier'
                              : 'Free Tier'}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Streak Option (always accessible in dropdown) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onOpenStreakDashboard();
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-tj-text-main hover:bg-tj-primary-light rounded-xl cursor-pointer transition-all border-0 bg-transparent text-left w-full focus:outline-none"
                  >
                    <Flame
                      className={`w-4 h-4 ${
                        streakData && streakData.currentStreak > 0
                          ? 'fill-emerald-500 text-emerald-500'
                          : 'text-tj-text-muted'
                      }`}
                    />
                    <span>Daily Streak ({streakData?.currentStreak ?? 0})</span>
                    {isStreakMetToday && (
                      <span className="ml-auto text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                        Met
                      </span>
                    )}
                  </button>

                  {/* Settings Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setShowSettingsModal(true);
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-tj-text-main hover:bg-tj-primary-light rounded-xl cursor-pointer transition-all border-0 bg-transparent text-left w-full focus:outline-none"
                  >
                    <Settings className="w-4 h-4 text-tj-text-muted" />
                    <span>Settings</span>
                    {customOpenRouterKey && (
                      <span className="ml-auto w-1.5 h-1.5 bg-tj-success rounded-full" />
                    )}
                  </button>

                  {/* Dark Mode Toggle Option */}
                  <button
                    type="button"
                    onClick={() => {
                      toggleDarkMode();
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-tj-text-main hover:bg-tj-primary-light rounded-xl cursor-pointer transition-all border-0 bg-transparent text-left w-full focus:outline-none"
                  >
                    {darkMode ? (
                      <>
                        <Sun className="w-4 h-4 text-tj-text-muted" />
                        <span>Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4 text-tj-text-muted" />
                        <span>Dark Mode</span>
                      </>
                    )}
                  </button>

                  {/* Logout Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs font-bold text-tj-error hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-xl cursor-pointer transition-all border-0 bg-transparent text-left w-full focus:outline-none"
                  >
                    <LogOut className="w-4 h-4 text-tj-error" />
                    <span>Log out</span>
                  </button>

                  {/* Footer & Legal Links */}
                  <div className="pt-2.5 border-t border-tj-border-main/60 flex items-center justify-between text-[11px] font-medium text-tj-text-muted px-1">
                    <a
                      href="/privacy.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-tj-primary transition-colors"
                    >
                      Privacy
                    </a>
                    <span className="text-tj-border-main">•</span>
                    <a
                      href="/terms.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-tj-primary transition-colors"
                    >
                      Terms
                    </a>
                    <span className="text-tj-border-main">•</span>
                    <a
                      href="mailto:admin@teacherjake.com"
                      className="hover:text-tj-primary transition-colors"
                    >
                      Support
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLogin}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main font-bold text-xs rounded-xl cursor-pointer transition-all border-0 focus:outline-none"
              >
                Sign In / Sign Up
              </button>

              <div className="relative" ref={helpMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsHelpMenuOpen((prev) => !prev)}
                  className="flex items-center justify-center p-1.5 text-tj-text-muted hover:text-tj-primary hover:bg-tj-primary-light rounded-xl cursor-pointer transition-all border-0 focus:outline-none"
                  title="Help & Info"
                  aria-label="Help and Info"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>

                {isHelpMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 py-2 bg-tj-bg-card dark:bg-[#181916] border border-tj-border-main rounded-2xl shadow-xl z-50 flex flex-col gap-1 px-1 select-none">
                    <a
                      href="/privacy.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsHelpMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-tj-text-main hover:bg-tj-primary-light rounded-xl transition-all"
                    >
                      <Shield className="w-4 h-4 text-tj-primary shrink-0" />
                      <span>Privacy Policy</span>
                    </a>
                    <a
                      href="/terms.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsHelpMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-tj-text-main hover:bg-tj-primary-light rounded-xl transition-all"
                    >
                      <FileText className="w-4 h-4 text-tj-text-muted shrink-0" />
                      <span>Terms of Service</span>
                    </a>
                    <a
                      href="mailto:admin@teacherjake.com"
                      onClick={() => setIsHelpMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-tj-text-main hover:bg-tj-primary-light rounded-xl transition-all"
                    >
                      <Mail className="w-4 h-4 text-tj-text-muted shrink-0" />
                      <span>Contact Support</span>
                    </a>

                    <div className="my-1 border-t border-tj-border-main/60" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsHelpMenuOpen(false);
                        toggleDarkMode();
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-tj-text-main hover:bg-tj-primary-light rounded-xl transition-all cursor-pointer text-left w-full focus:outline-none"
                    >
                      {darkMode ? (
                        <>
                          <Sun className="w-4 h-4 text-tj-text-muted shrink-0" />
                          <span>Light Mode</span>
                        </>
                      ) : (
                        <>
                          <Moon className="w-4 h-4 text-tj-text-muted shrink-0" />
                          <span>Dark Mode</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsHelpMenuOpen(false);
                        setShowSettingsModal(true);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-tj-text-main hover:bg-tj-primary-light rounded-xl transition-all cursor-pointer text-left w-full focus:outline-none"
                    >
                      <Settings className="w-4 h-4 text-tj-text-muted shrink-0" />
                      <span>Settings</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
