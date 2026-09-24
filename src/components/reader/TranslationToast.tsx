import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { useEffect, useState } from 'react';
import { getLanguageCodeFromName } from '../../types';
import ToastCollapsedBar from './toast/ToastCollapsedBar';
import ToastExpandedContent from './toast/ToastExpandedContent';
import type { TranslationToastProps } from './toast/types';
import { useToastAutoDismiss } from './toast/useToastAutoDismiss';

export type { TranslationToastProps } from './toast/types';

export default function TranslationToast({
  selectedWord,
  setSelectedWord,
  story,
  currentUser,
  handleFetchTranslation,
  handleSaveWordRecord,
  handlePlayWord,
  isSaved = false,
  handleRemoveWordRecord,
  isOnline = true,
  hasPrev,
  hasNext,
  onNavigatePrev,
  onNavigateNext,
  selectedWordRange = null,
  canShrinkRight = false,
  canExtendRight = false,
  onShrinkRight,
  onExtendRight,
  activeHighlight,
  onSelectHighlightColor,
  onSaveHighlightNote,
  onDeleteHighlight,
  autoPlayWord = true,
  setAutoPlayWord,
  onResumeChapterFromWord,
  isExpanded: controlledExpanded,
  setIsExpanded: setControlledExpanded,
  onOpenAuth,
}: TranslationToastProps) {
  const dragControls = useDragControls();
  const [internalExpanded, setInternalExpanded] = useState<boolean>(false);
  const isExpanded =
    controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const setIsExpanded = (val: boolean) => {
    if (setControlledExpanded) {
      setControlledExpanded(val);
    } else {
      setInternalExpanded(val);
    }
  };

  const [isHovered, setIsHovered] = useState<boolean>(false);

  const { resetActivityTimer } = useToastAutoDismiss({
    isActive: Boolean(selectedWord),
    isExpanded,
    isHovered,
    onDismiss: () => setSelectedWord(null),
    timeoutMs: 2000,
  });

  useEffect(() => {
    if (!selectedWord) return;

    const handleDocumentClick = (_e: MouseEvent) => {
      setSelectedWord(null);
    };

    document.addEventListener('click', handleDocumentClick);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [selectedWord, setSelectedWord]);

  const languageCode = story?.language
    ? getLanguageCodeFromName(story.language)
    : 'en';

  return (
    <AnimatePresence>
      {selectedWord && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          onClick={(e) => e.stopPropagation()}
          onPointerEnter={() => setIsHovered(true)}
          onPointerLeave={() => setIsHovered(false)}
          className={`fixed bottom-0 left-0 right-0 z-50 w-full flex flex-col bg-tj-bg-card/95 dark:bg-tj-bg-card/95 backdrop-blur-md border-t border-tj-border-main shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1),0_-8px_10px_-6px_rgba(0,0,0,0.1)] select-text touch-pan-x ${
            isExpanded
              ? 'max-h-[50dvh]'
              : 'pb-[max(0.25rem,env(safe-area-inset-bottom))]'
          }`}
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: isExpanded ? 0 : 0.8, bottom: 0.8 }}
          onDragEnd={(_event, info) => {
            if (isExpanded) {
              if (info.offset.y > 150 || info.velocity.y > 450) {
                setSelectedWord(null);
              } else if (info.offset.y > 40 || info.velocity.y > 180) {
                setIsExpanded(false);
              }
            } else {
              if (info.offset.y < -25 || info.velocity.y < -150) {
                setIsExpanded(true);
              } else if (info.offset.y > 40 || info.velocity.y > 200) {
                setSelectedWord(null);
              }
            }
          }}
        >
          {/* Top drag handle indicator (shown when expanded) */}
          {isExpanded && (
            <div
              className="w-full flex items-center justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
              onPointerDown={(e) => {
                dragControls.start(e);
              }}
            >
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600 transition-colors hover:bg-tj-primary" />
            </div>
          )}

          {!isExpanded ? (
            <ToastCollapsedBar
              selectedWord={selectedWord}
              languageCode={languageCode}
              onExpand={() => setIsExpanded(true)}
              onDismiss={() => setSelectedWord(null)}
              onPlayWord={handlePlayWord}
              onUserActivity={resetActivityTimer}
            />
          ) : (
            <ToastExpandedContent
              selectedWord={selectedWord}
              languageCode={languageCode}
              currentUser={currentUser}
              isOnline={isOnline}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onNavigatePrev={onNavigatePrev}
              onNavigateNext={onNavigateNext}
              onPlayWord={handlePlayWord}
              onClose={() => setSelectedWord(null)}
              onResumeChapterFromWord={onResumeChapterFromWord}
              autoPlayWord={autoPlayWord}
              setAutoPlayWord={setAutoPlayWord}
              selectedWordRange={selectedWordRange}
              canShrinkRight={canShrinkRight}
              canExtendRight={canExtendRight}
              onShrinkRight={onShrinkRight}
              onExtendRight={onExtendRight}
              activeHighlight={activeHighlight}
              onSelectHighlightColor={onSelectHighlightColor}
              onSaveHighlightNote={onSaveHighlightNote}
              onDeleteHighlight={onDeleteHighlight}
              onOpenAuth={onOpenAuth}
              onChangeWord={setSelectedWord}
              handleFetchTranslation={handleFetchTranslation}
              handleSaveWordRecord={handleSaveWordRecord}
              isSaved={isSaved}
              handleRemoveWordRecord={handleRemoveWordRecord}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
