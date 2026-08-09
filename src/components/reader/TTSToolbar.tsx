import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeftRight,
  ChevronDown,
  Edit,
  Eye,
  Flag,
  Languages,
  Pause,
  Play,
  Settings2,
  Square,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

interface TTSToolbarProps {
  isSpeaking: boolean;
  isPaused: boolean;
  handleReadChapter: () => void;
  handleStopSpeech: () => void;
  selectedVoiceName: string;
  setSelectedVoiceName: (voiceName: string) => void;
  voices: SpeechSynthesisVoice[];
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  useSerif: boolean;
  setUseSerif: (serif: boolean) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  alignment: 'left' | 'center' | 'right' | 'justify';
  setAlignment: (alignment: 'left' | 'center' | 'right' | 'justify') => void;
  columnWidth: 'narrow' | 'medium' | 'wide' | 'full';
  setColumnWidth: (width: 'narrow' | 'medium' | 'wide' | 'full') => void;
  cefrLevel: string;
  showBilingual: boolean;
  setShowBilingual: (show: boolean) => void;
  onToggleZen: () => void;
  isCreator?: boolean;
  isAdmin?: boolean;
  isEditing?: boolean;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
  onFlagClick?: () => void;
  canSwapLanguages?: boolean;
  isSwapped?: boolean;
  onToggleSwap?: () => void;
  primaryLanguage?: string;
  translationLanguage?: string;
  isReaderSettingsOpen?: boolean;
  onReaderSettingsOpenChange?: (open: boolean) => void;
}

export default function TTSToolbar({
  isSpeaking,
  isPaused,
  handleReadChapter,
  handleStopSpeech,
  selectedVoiceName,
  setSelectedVoiceName,
  voices,
  speechRate,
  setSpeechRate,
  useSerif,
  setUseSerif,
  fontSize,
  setFontSize,
  alignment,
  setAlignment,
  columnWidth,
  setColumnWidth,
  cefrLevel,
  showBilingual,
  setShowBilingual,
  onToggleZen,
  isCreator = false,
  isAdmin = false,
  isEditing = false,
  onEditClick,
  onDeleteClick,
  onFlagClick,
  canSwapLanguages = false,
  isSwapped = false,
  onToggleSwap,
  primaryLanguage,
  translationLanguage,
  isReaderSettingsOpen,
  onReaderSettingsOpenChange,
}: TTSToolbarProps) {
  const [internalSettingsOpen, setInternalSettingsOpen] =
    useState<boolean>(false);
  const isControlled = onReaderSettingsOpenChange !== undefined;
  const isSettingsModalOpen = isControlled
    ? (isReaderSettingsOpen ?? false)
    : internalSettingsOpen;
  const setIsSettingsModalOpen = (open: boolean) => {
    if (isControlled) {
      onReaderSettingsOpenChange?.(open);
    } else {
      setInternalSettingsOpen(open);
    }
  };

  return (
    <div className="grid grid-cols-3 items-center gap-2 border-b border-slate-200/50 dark:border-slate-800 pb-4 mb-6 w-full">
      {/* LEFT: Edit (creator / admin only) */}
      <div className="flex items-center gap-1.5 justify-self-start">
        {(isCreator || isAdmin) && !isEditing && onEditClick && (
          <button
            type="button"
            onClick={onEditClick}
            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-tj-primary-hover bg-transparent hover:text-tj-primary hover:border-slate-300 transition-all cursor-pointer flex items-center justify-center"
            title="Edit Chapter Content"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* CENTER: Play / Stop + Reader Settings */}
      <div className="flex items-center gap-1.5 justify-self-center">
        {/* SPEAK / PAUSE TRIGGER */}
        <button
          type="button"
          onClick={handleReadChapter}
          className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
            isSpeaking
              ? isPaused
                ? 'bg-amber-100 dark:bg-amber-955/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                : 'bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover animate-pulse border-tj-primary-border'
              : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-tj-primary-hover bg-transparent hover:text-tj-primary hover:border-slate-300'
          }`}
          title="Synthesize audio narration via browser voices"
        >
          {isSpeaking && !isPaused ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
        </button>

        {isSpeaking && (
          <button
            type="button"
            onClick={handleStopSpeech}
            className="h-8 w-8 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg border border-transparent cursor-pointer flex items-center justify-center"
            title="Stop TTS Playback"
          >
            <Square className="w-4 h-4" />
          </button>
        )}

        {/* READER SETTINGS TRIGGER */}
        <button
          type="button"
          onClick={() => setIsSettingsModalOpen(true)}
          className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-tj-primary-hover bg-transparent hover:text-tj-primary hover:border-slate-300 transition-all cursor-pointer flex items-center justify-center animate-none"
          title="Reader Settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* RIGHT: Delete (admin) / Flag (non-admin) */}
      <div className="flex items-center gap-1.5 justify-self-end">
        {isAdmin && !isEditing && onDeleteClick && (
          <button
            type="button"
            onClick={onDeleteClick}
            className="h-8 w-8 rounded-lg border border-red-200 dark:border-red-900/30 text-tj-error hover:bg-rose-50 dark:hover:bg-rose-955/20 transition-all cursor-pointer flex items-center justify-center bg-transparent"
            title="Delete Entire Story (Admin)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        {!isAdmin && !isEditing && onFlagClick && (
          <button
            type="button"
            onClick={onFlagClick}
            className="h-8 w-8 rounded-lg border border-tj-border-main text-tj-text-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 transition-all cursor-pointer flex items-center justify-center bg-transparent"
            title="Flag Story for Deletion"
          >
            <Flag className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Reader Settings Modal (speech, reading, and text) */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-tj-bg-card rounded-2xl border border-tj-border-main p-5 shadow-2xl relative space-y-4 text-tj-text-main font-sans"
            >
              <div className="flex items-center justify-between border-b border-tj-border-main pb-2">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-tj-primary" />
                  <h3 className="text-sm font-bold">Reader Settings</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="p-1 hover:bg-tj-bg-recessed rounded-full text-tj-text-muted hover:text-tj-text-main cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-5">
                {/* SPEECH SECTION */}
                <div className="space-y-3">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-tj-text-muted font-bold">
                    Speech
                  </span>

                  {/* Voice Selector */}
                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-semibold text-tj-text-muted">
                      Voice
                    </span>
                    <div className="relative">
                      <select
                        value={selectedVoiceName}
                        onChange={(e) => {
                          setSelectedVoiceName(e.target.value);
                          if (isSpeaking) handleStopSpeech();
                        }}
                        className="w-full pr-10 py-2.5 bg-transparent border border-tj-border-main hover:border-tj-text-muted text-tj-text-main text-xs font-semibold focus:border-tj-primary focus:ring-0 focus:outline-none transition-colors cursor-pointer appearance-none rounded-xl px-3"
                      >
                        {voices.map((v) => (
                          <option
                            key={v.name}
                            value={v.name}
                            className="dark:bg-slate-900 text-tj-text-main"
                          >
                            {v.name} ({v.lang})
                          </option>
                        ))}
                        {voices.length === 0 && (
                          <option
                            value=""
                            className="dark:bg-slate-900 text-tj-text-main"
                          >
                            (Loading system voices...)
                          </option>
                        )}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tj-text-muted pointer-events-none" />
                    </div>
                  </div>

                  {/* Speed rate selector */}
                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-semibold text-tj-text-muted">
                      Speed Rate
                    </span>
                    <div className="relative">
                      <select
                        value={speechRate}
                        onChange={(e) => {
                          setSpeechRate(parseFloat(e.target.value));
                          if (isSpeaking) handleStopSpeech();
                        }}
                        className="w-full pr-10 py-2.5 bg-transparent border border-tj-border-main hover:border-tj-text-muted text-tj-text-main text-xs font-semibold focus:border-tj-primary focus:ring-0 focus:outline-none transition-colors cursor-pointer appearance-none rounded-xl px-3"
                      >
                        <option
                          value="0.5"
                          className="dark:bg-slate-900 text-tj-text-main"
                        >
                          0.5x
                        </option>
                        <option
                          value="0.75"
                          className="dark:bg-slate-900 text-tj-text-main"
                        >
                          0.75x
                        </option>
                        <option
                          value="1"
                          className="dark:bg-slate-900 text-tj-text-main"
                        >
                          1.0x (Normal)
                        </option>
                        <option
                          value="1.25"
                          className="dark:bg-slate-900 text-tj-text-main"
                        >
                          1.25x
                        </option>
                        <option
                          value="1.5"
                          className="dark:bg-slate-900 text-tj-text-main"
                        >
                          1.5x
                        </option>
                        <option
                          value="2"
                          className="dark:bg-slate-900 text-tj-text-main"
                        >
                          2.0x
                        </option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tj-text-muted pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* READING SECTION */}
                <div className="space-y-3 border-t border-tj-border-main pt-4">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-tj-text-muted font-bold">
                    Reading
                  </span>

                  {/* Bilingual Mode Toggle (A1 / Pre-A1 only) */}
                  {(cefrLevel === 'A1' || cefrLevel === 'Pre-A1') && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Languages className="w-3.5 h-3.5 text-tj-text-muted shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-tj-text-main">
                            Bilingual
                          </p>
                          <p className="text-[10px] text-tj-text-muted leading-tight">
                            Show translation under each line
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={showBilingual}
                        onClick={() => setShowBilingual(!showBilingual)}
                        className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer border shrink-0 ${
                          showBilingual
                            ? 'bg-tj-primary border-tj-primary'
                            : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                            showBilingual ? 'left-[22px]' : 'left-0.5'
                          }`}
                          style={{ width: '1.125rem', height: '1.125rem' }}
                        />
                      </button>
                    </div>
                  )}

                  {/* Swap Primary/Translation (A1 bilingual only — Pre-A1 has inserted scaffolding) */}
                  {canSwapLanguages && onToggleSwap && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <ArrowLeftRight className="w-3.5 h-3.5 text-tj-text-muted shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-tj-text-main">
                            Swap Languages
                          </p>
                          <p className="text-[10px] text-tj-text-muted leading-tight">
                            {isSwapped
                              ? `Showing ${translationLanguage} as primary`
                              : `Showing ${primaryLanguage} as primary`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isSwapped}
                        onClick={onToggleSwap}
                        className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer border shrink-0 ${
                          isSwapped
                            ? 'bg-tj-primary border-tj-primary'
                            : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                            isSwapped ? 'left-[22px]' : 'left-0.5'
                          }`}
                          style={{ width: '1.125rem', height: '1.125rem' }}
                        />
                      </button>
                    </div>
                  )}

                  {/* Zen Mode */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Eye className="w-3.5 h-3.5 text-tj-text-muted shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-tj-text-main">
                          Zen Mode
                        </p>
                        <p className="text-[10px] text-tj-text-muted leading-tight">
                          Distraction-free fullscreen reading
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsModalOpen(false);
                        onToggleZen();
                      }}
                      className="px-3 h-8 text-xs font-semibold rounded-xl border flex items-center gap-1.5 cursor-pointer transition-all bg-tj-primary-light hover:bg-tj-primary-border dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover border-tj-primary-border shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Enter</span>
                    </button>
                  </div>
                </div>

                {/* TEXT SECTION */}
                <div className="space-y-3 border-t border-tj-border-main pt-4">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-tj-text-muted font-bold">
                    Text
                  </span>

                  {/* Font Family Selector */}
                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-semibold text-tj-text-muted">
                      Reading Font
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setUseSerif(true)}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer font-serif text-center ${
                          useSerif
                            ? 'border-tj-primary bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        Serif (Classic)
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseSerif(false)}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer font-sans text-center ${
                          !useSerif
                            ? 'border-tj-primary bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        Sans-Serif (Modern)
                      </button>
                    </div>
                  </div>

                  {/* Font Size Adjuster */}
                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-semibold text-tj-text-muted">
                      Text Font Size
                    </span>
                    <div className="flex items-center justify-between bg-slate-100/50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => setFontSize(Math.max(14, fontSize - 1))}
                        disabled={fontSize <= 14}
                        className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg disabled:opacity-40 cursor-pointer transition-all border-0"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-sans font-bold text-slate-750 dark:text-slate-200 select-none">
                        {fontSize}px
                      </span>
                      <button
                        type="button"
                        onClick={() => setFontSize(Math.min(26, fontSize + 1))}
                        disabled={fontSize >= 26}
                        className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg disabled:opacity-40 cursor-pointer transition-all border-0"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Text Alignment Selector */}
                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-semibold text-tj-text-muted">
                      Text Alignment
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => setAlignment('left')}
                        className={`py-2 px-1 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold rounded-xl border transition-all cursor-pointer ${
                          alignment === 'left'
                            ? 'border-tj-primary bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                        title="Align Left"
                      >
                        <AlignLeft className="w-4 h-4" />
                        <span>Left</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignment('center')}
                        className={`py-2 px-1 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold rounded-xl border transition-all cursor-pointer ${
                          alignment === 'center'
                            ? 'border-tj-primary bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                        title="Align Center"
                      >
                        <AlignCenter className="w-4 h-4" />
                        <span>Center</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignment('justify')}
                        className={`py-2 px-1 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold rounded-xl border transition-all cursor-pointer ${
                          alignment === 'justify'
                            ? 'border-tj-primary bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                        title="Justify"
                      >
                        <AlignJustify className="w-4 h-4" />
                        <span>Justify</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAlignment('right')}
                        className={`py-2 px-1 flex flex-col items-center justify-center gap-1 text-[10px] font-semibold rounded-xl border transition-all cursor-pointer ${
                          alignment === 'right'
                            ? 'border-tj-primary bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                        title="Align Right"
                      >
                        <AlignRight className="w-4 h-4" />
                        <span>Right</span>
                      </button>
                    </div>
                  </div>

                  {/* Reading Column Width Selector */}
                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-semibold text-tj-text-muted">
                      Reading Column Width
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {(['narrow', 'medium', 'wide', 'full'] as const).map(
                        (width) => (
                          <button
                            key={width}
                            type="button"
                            onClick={() => setColumnWidth(width)}
                            className={`py-2 px-1 flex flex-col items-center justify-center gap-1.5 text-[10px] font-semibold rounded-xl border transition-all cursor-pointer ${
                              columnWidth === width
                                ? 'border-tj-primary bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover font-bold'
                                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                            title={`Set column width to ${width}`}
                          >
                            {width === 'narrow' && (
                              <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <title>Narrow Column Width</title>
                                <line x1="8" y1="6" x2="16" y2="6" />
                                <line x1="8" y1="12" x2="16" y2="12" />
                                <line x1="8" y1="18" x2="16" y2="18" />
                              </svg>
                            )}
                            {width === 'medium' && (
                              <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <title>Medium Column Width</title>
                                <line x1="5" y1="6" x2="19" y2="6" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <line x1="5" y1="18" x2="19" y2="18" />
                              </svg>
                            )}
                            {width === 'wide' && (
                              <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <title>Wide Column Width</title>
                                <line x1="2" y1="6" x2="22" y2="6" />
                                <line x1="2" y1="12" x2="22" y2="12" />
                                <line x1="2" y1="18" x2="22" y2="18" />
                              </svg>
                            )}
                            {width === 'full' && (
                              <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <title>Full Column Width</title>
                                <line
                                  x1="0"
                                  y1="6"
                                  x2="24"
                                  y2="6"
                                  strokeWidth="2.5"
                                />
                                <line
                                  x1="0"
                                  y1="12"
                                  x2="24"
                                  y2="12"
                                  strokeWidth="2.5"
                                />
                                <line
                                  x1="0"
                                  y1="18"
                                  x2="24"
                                  y2="18"
                                  strokeWidth="2.5"
                                />
                              </svg>
                            )}
                            <span className="capitalize">{width}</span>
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 text-xs text-tj-bg-main bg-tj-primary hover:bg-tj-primary-hover font-bold rounded-xl cursor-pointer transition-all shadow-none border-0"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
