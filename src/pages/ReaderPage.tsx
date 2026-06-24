import { BookMarked, Globe, Lock, Share2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import ExportPanel from '../components/app/ExportPanel';
import ReaderPanel from '../components/ReaderPanel';
import {
  getLanguageCodeFromName,
  type Story,
  type VocabularyTerm,
} from '../types';

interface ReaderPageProps {
  currentUser: { uid: string; email: string | null } | null;
  selectedStory: Story;
  setSelectedStory: (story: Story | null) => void;
  activeChapterIdx: number;
  onSelectChapter: (idx: number) => void;
  handleToggleStoryPrivacy: (storyId: string) => Promise<void>;
  handleToggleBookshelf: (storyId: string) => void;
  handleShareStoryLink: () => void;
  bookshelf: string[];
  showShareToast: boolean;
  showExportMenu: boolean;
  setShowExportMenu: (show: boolean) => void;
  showDocOptions: boolean;
  setShowDocOptions: (show: boolean) => void;
  showEpubLinks: boolean;
  setShowEpubLinks: (show: boolean) => void;
  copyStatus: 'idle' | 'success' | 'error';
  isExportingEpub: boolean;
  triggerCopyPlaintext: () => void;
  triggerCopyRichText: () => void;
  handleDownloadEpub: () => void;
  isGenerating: boolean;
  isAutoGenerating: boolean;
  isAutoGenerationPaused: boolean;
  handleGenerateNextChapter: () => void;
  handleRegenerateChapter: (
    index: number,
    chapterGuidance?: string,
  ) => Promise<void>;
  handleAutoGenerateRemaining: () => void;
  handleSaveWord: (word: VocabularyTerm) => void;
  onRemoveWord?: (wordText: string) => void;
  isPaid: boolean;
  onOpenSettings: () => void;
  showAlert: (
    title: string,
    message: string,
    type?: 'info' | 'error' | 'warning',
  ) => void;
  generationStatus: string;
  handleCancelGeneration: () => void;
  handleRateStory: (storyId: string, rating: number) => Promise<void>;
  lookupLimitData: { count: number; date: string } | null;
  handleIncrementLookupCount: () => void | Promise<void>;
  savedVocab: VocabularyTerm[];
  onStoryUpdated: (updatedStory: Story) => void;
  handleDeleteChapter: (chapterIdx: number) => Promise<void>;
  handleSaveNewChapter: (
    title: string,
    content: string,
    vocabulary: VocabularyTerm[],
  ) => Promise<void>;
  handleDeleteStory: (bypass?: boolean) => void;
  isZenMode: boolean;
  setIsZenMode: (zen: boolean) => void;
  handleGenerateGlossary: (story: Story) => Promise<void>;
  onSaveStory: (story?: Story) => Promise<any>;
  onChapterFinished?: () => void;
  onStoryFinished?: (storyId: string) => void;
  onStoryUnfinished?: (storyId: string) => void;
  dirty?: boolean;
  isSyncing?: boolean;
  syncChangesToDatabase?: () => Promise<void>;
}

export default function ReaderPage({
  currentUser,
  selectedStory,
  setSelectedStory,
  activeChapterIdx,
  onSelectChapter,
  handleToggleStoryPrivacy,
  handleToggleBookshelf,
  handleShareStoryLink,
  bookshelf,
  showShareToast,
  showExportMenu,
  setShowExportMenu,
  showDocOptions,
  setShowDocOptions,
  showEpubLinks,
  setShowEpubLinks,
  copyStatus,
  isExportingEpub,
  triggerCopyPlaintext,
  triggerCopyRichText,
  handleDownloadEpub,
  isGenerating,
  isAutoGenerating,
  isAutoGenerationPaused,
  handleGenerateNextChapter,
  handleRegenerateChapter,
  handleAutoGenerateRemaining,
  handleSaveWord,
  onRemoveWord,
  isPaid,
  onOpenSettings,
  showAlert,
  generationStatus,
  handleCancelGeneration,
  handleRateStory,
  lookupLimitData,
  handleIncrementLookupCount,
  savedVocab,
  onStoryUpdated,
  handleDeleteChapter,
  handleSaveNewChapter,
  handleDeleteStory,
  isZenMode,
  setIsZenMode,
  handleGenerateGlossary,
  onSaveStory,
  onChapterFinished,
  onStoryFinished,
  onStoryUnfinished,
  dirty = false,
  isSyncing = false,
  syncChangesToDatabase,
}: ReaderPageProps) {
  return (
    <div className="space-y-6">
      {/* Detailed Title / Breadcrumb and Document Copier */}
      {!isZenMode && (
        <div className="bg-tj-bg-card p-5 rounded-2xl border border-tj-border-main shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <button
                type="button"
                onClick={() => setSelectedStory(null)}
                className="text-xs text-tj-text-muted hover:text-tj-text-main font-semibold hover:underline cursor-pointer"
              >
                ← Back
              </button>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-mono font-bold bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-text-main dark:text-tj-text-main px-2 py-0.5 rounded uppercase tracking-wide">
                {selectedStory.cefrLevel} Difficulty
              </span>
              <span className="text-[10px] text-slate-400 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                {selectedStory.language} Graded
              </span>

              {/* Public/Private visibility badge toggle */}
              {currentUser &&
                (selectedStory.creatorId === currentUser.uid ||
                  currentUser.email === 'jmayereup@gmail.com') && (
                  <button
                    type="button"
                    onClick={() => handleToggleStoryPrivacy(selectedStory.id)}
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-all border ${
                      selectedStory.isPublic === false
                        ? 'bg-rose-50 dark:bg-rose-955/20 text-rose-705 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                        : 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-705 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
                    }`}
                    title="Toggle public/private visibility"
                  >
                    {selectedStory.isPublic === false ? (
                      <>
                        <Lock className="w-3 h-3 text-rose-500" />
                        <span>Private</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3 text-emerald-500" />
                        <span>Public</span>
                      </>
                    )}
                  </button>
                )}
            </div>

            <div className="flex items-center gap-2.5">
              <h2
                lang={getLanguageCodeFromName(selectedStory.language)}
                className="text-2xl font-serif font-black text-slate-900 dark:text-white leading-tight"
              >
                {selectedStory.title}
              </h2>

              {/* Save to Bookshelf button */}
              <button
                type="button"
                onClick={() => handleToggleBookshelf(selectedStory.id)}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                  bookshelf.includes(selectedStory.id)
                    ? 'bg-amber-50 dark:bg-amber-955/20 border-amber-300 dark:border-amber-900/50 text-amber-600 dark:text-amber-400'
                    : 'bg-tj-bg-card hover:bg-tj-bg-recessed border-tj-border-main text-tj-text-muted hover:text-tj-text-main'
                }`}
                title={
                  bookshelf.includes(selectedStory.id)
                    ? 'Remove from Bookshelf'
                    : 'Save to Bookshelf'
                }
              >
                <BookMarked
                  className={`w-4 h-4 ${bookshelf.includes(selectedStory.id) ? 'fill-amber-500 text-amber-500' : ''}`}
                />
              </button>

              {/* Share Link button */}
              <button
                type="button"
                onClick={handleShareStoryLink}
                className="p-1.5 rounded-xl border bg-tj-bg-card hover:bg-tj-bg-recessed border-tj-border-main text-tj-text-muted hover:text-tj-primary dark:hover:text-tj-primary-hover transition-all cursor-pointer relative"
                title="Copy Link to Clipboard"
              >
                <Share2 className="w-4 h-4" />
                <AnimatePresence>
                  {showShareToast && (
                    <motion.span
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded-lg shadow-lg whitespace-nowrap z-50 border border-slate-700/50 dark:border-slate-800"
                    >
                      Link Copied!
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* Save Story Button (if unsaved) */}
              {selectedStory.isUnsaved && (
                <button
                  type="button"
                  onClick={() => onSaveStory(selectedStory)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer ml-1 select-none"
                  title="Save entire story draft to database"
                >
                  <span>Save Draft</span>
                </button>
              )}
            </div>
            {selectedStory.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-sans leading-relaxed max-w-2xl">
                {selectedStory.description}
              </p>
            )}
          </div>
          <ExportPanel
            selectedStory={selectedStory}
            showExportMenu={showExportMenu}
            setShowExportMenu={setShowExportMenu}
            showDocOptions={showDocOptions}
            setShowDocOptions={setShowDocOptions}
            showEpubLinks={showEpubLinks}
            setShowEpubLinks={setShowEpubLinks}
            copyStatus={copyStatus}
            isExportingEpub={isExportingEpub}
            triggerCopyPlaintext={triggerCopyPlaintext}
            triggerCopyRichText={triggerCopyRichText}
            handleDownloadEpub={handleDownloadEpub}
          />
        </div>
      )}

      {/* Novel reading window */}
      <ReaderPanel
        story={selectedStory}
        activeChapterIndex={activeChapterIdx}
        onSelectChapter={onSelectChapter}
        onGenerateNextChapter={handleGenerateNextChapter}
        onRegenerateChapter={handleRegenerateChapter}
        isLoadingNext={isGenerating}
        isAutoGeneratingRemaining={isAutoGenerating}
        isAutoGenerationPaused={isAutoGenerationPaused}
        onAutoGenerateAll={handleAutoGenerateRemaining}
        onSaveWord={handleSaveWord}
        onRemoveWord={onRemoveWord}
        isPaid={isPaid}
        isAdmin={currentUser?.email === 'jmayereup@gmail.com'}
        onOpenSettings={onOpenSettings}
        onShowAlert={showAlert}
        generationStatus={generationStatus}
        onCancelGeneration={handleCancelGeneration}
        onRateStory={(rating) => handleRateStory(selectedStory.id, rating)}
        lookupLimitData={lookupLimitData}
        onIncrementLookupCount={handleIncrementLookupCount}
        savedVocab={savedVocab}
        onStoryUpdated={onStoryUpdated}
        onDeleteChapter={handleDeleteChapter}
        onAddCustomChapter={handleSaveNewChapter}
        onDeleteStory={handleDeleteStory}
        isZenMode={isZenMode}
        onToggleZen={setIsZenMode}
        onGenerateGlossary={handleGenerateGlossary}
        onSaveStory={onSaveStory}
        onChapterFinished={onChapterFinished}
        onStoryFinished={onStoryFinished}
        onStoryUnfinished={onStoryUnfinished}
        dirty={dirty}
        isSyncing={isSyncing}
        syncChangesToDatabase={syncChangesToDatabase}
        onExit={() => setSelectedStory(null)}
      />
    </div>
  );
}
