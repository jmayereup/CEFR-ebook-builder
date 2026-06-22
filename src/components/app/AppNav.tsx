import {
  BookMarked,
  Grid,
  Layers,
  Menu,
  PlusCircle,
  Shield,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import type { Story } from '../../types';

interface AppNavProps {
  activeTab: 'browse' | 'bookshelf' | 'create' | 'practice' | 'admin';
  setActiveTab: (
    tab: 'browse' | 'bookshelf' | 'create' | 'practice' | 'admin',
  ) => void;
  setSelectedStory: (story: Story | null) => void;
  storiesCount: number;
  bookshelfCount: number;
  savedVocabCount: number;
  selectedStory: Story | null;
  dirty?: boolean;
  isSyncing?: boolean;
  syncChangesToDatabase?: () => Promise<void>;
}

export default function AppNav({
  activeTab,
  setActiveTab,
  setSelectedStory,
  storiesCount,
  bookshelfCount,
  savedVocabCount,
  selectedStory,
  dirty = false,
  isSyncing = false,
  syncChangesToDatabase,
}: AppNavProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showVocabBuilder = !!selectedStory || savedVocabCount > 0;
  const showAdmin = currentUser?.email === 'jmayereup@gmail.com';

  return (
    <nav className="bg-tj-bg-main dark:bg-[#121310] border-b border-tj-border-main py-2 sm:py-3 px-4">
      <div className="max-w-7xl mx-auto select-none">
        {/* DESKTOP VIEW NAV BAR (sm and up) */}
        <div className="hidden sm:flex items-center gap-1 sm:gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setSelectedStory(null);
              setActiveTab('browse');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold rounded transition-all cursor-pointer shrink-0 ${
              activeTab === 'browse'
                ? 'bg-tj-mint text-tj-text-main border border-tj-success/50 shadow-none font-sans font-bold'
                : 'text-tj-text-muted hover:bg-tj-bg-recessed hover:text-tj-text-main border border-transparent font-sans bg-transparent'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Library ({storiesCount})</span>
          </button>

          {mounted && !!currentUser && (
            <button
              type="button"
              onClick={() => {
                setSelectedStory(null);
                setActiveTab('bookshelf');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold rounded transition-all cursor-pointer shrink-0 ${
                activeTab === 'bookshelf'
                  ? 'bg-tj-mint text-tj-text-main border border-tj-success/50 shadow-none font-sans font-bold'
                  : 'text-tj-text-muted hover:bg-tj-bg-recessed hover:text-tj-text-main border border-transparent font-sans bg-transparent'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>My Bookshelf ({bookshelfCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setSelectedStory(null);
              setActiveTab('create');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold rounded transition-all cursor-pointer shrink-0 ${
              activeTab === 'create'
                ? 'bg-tj-mint text-tj-text-main border border-tj-success/50 shadow-none font-sans font-bold'
                : 'text-tj-text-muted hover:bg-tj-bg-recessed hover:text-tj-text-main border border-transparent font-sans bg-transparent'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Story</span>
          </button>

          {mounted && showVocabBuilder && (
            <button
              type="button"
              onClick={() => {
                setSelectedStory(null);
                setActiveTab('practice');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold rounded transition-all cursor-pointer shrink-0 ${
                activeTab === 'practice'
                  ? 'bg-tj-mint text-tj-text-main border border-tj-success/50 shadow-none font-sans font-bold'
                  : 'text-tj-text-muted hover:bg-tj-bg-recessed hover:text-tj-text-main border border-transparent font-sans bg-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                Vocab Builder{' '}
                {savedVocabCount > 0 ? `(${savedVocabCount})` : ''}
              </span>
            </button>
          )}

          {mounted && showAdmin && (
            <button
              type="button"
              onClick={() => {
                setSelectedStory(null);
                setActiveTab('admin');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold rounded transition-all cursor-pointer shrink-0 ${
                activeTab === 'admin'
                  ? 'bg-tj-mint text-tj-text-main border border-tj-success/50 shadow-none font-sans font-bold'
                  : 'text-tj-text-muted hover:bg-tj-bg-recessed hover:text-tj-text-main border border-transparent font-sans bg-transparent'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Dashboard</span>
            </button>
          )}
        </div>

        {/* MOBILE VIEW NAV BAR (hamburger triggers menu) */}
        <div className="flex sm:hidden items-center justify-between w-full h-8">
          <div className="flex items-center gap-1.5">
            <button
              id="nav-mobile-browse"
              type="button"
              onClick={() => {
                setSelectedStory(null);
                setActiveTab('browse');
              }}
              className={`flex items-center justify-center h-8 w-8 rounded-lg border transition-all cursor-pointer shrink-0 ${
                activeTab === 'browse'
                  ? 'bg-tj-mint text-tj-text-main border-tj-success/50'
                  : 'text-tj-text-muted hover:bg-tj-bg-recessed hover:text-tj-text-main border-transparent bg-transparent'
              }`}
              title={`Library (${storiesCount})`}
              aria-label={`Library (${storiesCount})`}
            >
              <Grid className="w-4 h-4" />
            </button>

            {mounted && !!currentUser && (
              <button
                id="nav-mobile-bookshelf"
                type="button"
                onClick={() => {
                  setSelectedStory(null);
                  setActiveTab('bookshelf');
                }}
                className={`flex items-center justify-center h-8 w-8 rounded-lg border transition-all cursor-pointer shrink-0 ${
                  activeTab === 'bookshelf'
                    ? 'bg-tj-mint text-tj-text-main border-tj-success/50'
                    : 'text-tj-text-muted hover:bg-tj-bg-recessed hover:text-tj-text-main border-transparent bg-transparent'
                }`}
                title={`My Bookshelf (${bookshelfCount})`}
                aria-label={`My Bookshelf (${bookshelfCount})`}
              >
                <BookMarked className="w-4 h-4" />
              </button>
            )}

            <button
              id="nav-mobile-create"
              type="button"
              onClick={() => {
                setSelectedStory(null);
                setActiveTab('create');
              }}
              className={`flex items-center justify-center h-8 w-8 rounded-lg border transition-all cursor-pointer shrink-0 ${
                activeTab === 'create'
                  ? 'bg-tj-mint text-tj-text-main border-tj-success/50'
                  : 'text-tj-text-muted hover:bg-tj-bg-recessed hover:text-tj-text-main border-transparent bg-transparent'
              }`}
              title="Create Story"
              aria-label="Create Story"
            >
              <PlusCircle className="w-4 h-4" />
            </button>

            {mounted && showVocabBuilder && (
              <button
                id="nav-mobile-practice"
                type="button"
                onClick={() => {
                  setSelectedStory(null);
                  setActiveTab('practice');
                }}
                className={`flex items-center justify-center h-8 w-8 rounded-lg border transition-all cursor-pointer shrink-0 ${
                  activeTab === 'practice'
                    ? 'bg-tj-mint text-tj-text-main border-tj-success/50'
                    : 'text-tj-text-muted hover:bg-tj-bg-recessed hover:text-tj-text-main border-transparent bg-transparent'
                }`}
                title={`Vocab Builder ${savedVocabCount > 0 ? `(${savedVocabCount})` : ''}`}
                aria-label={`Vocab Builder ${savedVocabCount > 0 ? `(${savedVocabCount})` : ''}`}
              >
                <Layers className="w-4 h-4" />
              </button>
            )}

            {mounted && showAdmin && (
              <button
                id="nav-mobile-admin"
                type="button"
                onClick={() => {
                  setSelectedStory(null);
                  setActiveTab('admin');
                }}
                className={`flex items-center justify-center h-8 w-8 rounded-lg border transition-all cursor-pointer shrink-0 ${
                  activeTab === 'admin'
                    ? 'bg-tj-mint text-tj-text-main border-tj-success/50'
                    : 'text-tj-text-muted hover:bg-tj-bg-recessed hover:text-tj-text-main border-transparent bg-transparent'
                }`}
                title="Admin Dashboard"
                aria-label="Admin Dashboard"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            id="nav-mobile-menu-toggle"
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-tj-primary hover:border-slate-350 transition-all cursor-pointer flex items-center justify-center bg-transparent"
            title="Toggle Menu"
            aria-label="Toggle Menu"
          >
            {isMenuOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* MOBILE DROPDOWN LINKS */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="mt-3 flex flex-col gap-1.5 sm:hidden overflow-hidden border-t border-tj-border-main/50 pt-3"
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedStory(null);
                  setActiveTab('browse');
                  setIsMenuOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded transition-all cursor-pointer w-full text-left border ${
                  activeTab === 'browse'
                    ? 'bg-tj-mint text-tj-text-main border-tj-success/50 font-bold'
                    : 'text-tj-text-muted hover:bg-tj-bg-recessed hover:text-tj-text-main border-transparent bg-transparent'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>Library ({storiesCount})</span>
              </button>

              {mounted && !!currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStory(null);
                    setActiveTab('bookshelf');
                    setIsMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded transition-all cursor-pointer w-full text-left border ${
                    activeTab === 'bookshelf'
                      ? 'bg-tj-mint text-tj-text-main border-tj-success/50 font-bold'
                      : 'text-tj-text-muted hover:bg-tj-bg-recessed hover:text-tj-text-main border-transparent bg-transparent'
                  }`}
                >
                  <BookMarked className="w-4 h-4" />
                  <span>My Bookshelf ({bookshelfCount})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedStory(null);
                  setActiveTab('create');
                  setIsMenuOpen(false);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded transition-all cursor-pointer w-full text-left border ${
                  activeTab === 'create'
                    ? 'bg-tj-mint text-tj-text-main border-tj-success/50 font-bold'
                    : 'text-tj-text-muted hover:bg-tj-bg-recessed hover:text-tj-text-main border-transparent bg-transparent'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Story</span>
              </button>

              {mounted && showVocabBuilder && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStory(null);
                    setActiveTab('practice');
                    setIsMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded transition-all cursor-pointer w-full text-left border ${
                    activeTab === 'practice'
                      ? 'bg-tj-mint text-tj-text-main border-tj-success/50 font-bold'
                      : 'text-tj-text-muted hover:bg-tj-bg-recessed hover:text-tj-text-main border-transparent bg-transparent'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>
                    Vocab Builder{' '}
                    {savedVocabCount > 0 ? `(${savedVocabCount})` : ''}
                  </span>
                </button>
              )}

              {mounted && showAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStory(null);
                    setActiveTab('admin');
                    setIsMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded transition-all cursor-pointer w-full text-left border ${
                    activeTab === 'admin'
                      ? 'bg-tj-mint text-tj-text-main border-tj-success/50 font-bold'
                      : 'text-tj-text-muted hover:bg-tj-bg-recessed hover:text-tj-text-main border-transparent bg-transparent'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin Dashboard</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
