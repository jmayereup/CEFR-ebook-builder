import {
  ChevronDown,
  Edit,
  Eye,
  Languages,
  Pause,
  Play,
  Sliders,
  Trash2,
  Type,
  VolumeX,
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
  cefrLevel: string;
  showBilingual: boolean;
  setShowBilingual: (show: boolean) => void;
  onToggleZen: () => void;
  isCreator?: boolean;
  isAdmin?: boolean;
  isEditing?: boolean;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
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
  cefrLevel,
  showBilingual,
  setShowBilingual,
  onToggleZen,
  isCreator = false,
  isAdmin = false,
  isEditing = false,
  onEditClick,
  onDeleteClick,
}: TTSToolbarProps) {
  const [isTTSModalOpen, setIsTTSModalOpen] = useState<boolean>(false);
  const [isStylesModalOpen, setIsStylesModalOpen] = useState<boolean>(false);

  return (
    <div className="flex items-center justify-between gap-2 border-b border-slate-200/50 dark:border-slate-800 pb-4 mb-6 w-full">
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
        {/* SPEAK / PAUSE TRIGGER */}
        <button
          onClick={handleReadChapter}
          className={`h-8 px-2.5 rounded-lg border flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
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
          <span>{isSpeaking ? (isPaused ? 'Resume' : 'Pause') : 'Speak'}</span>
        </button>

        {isSpeaking && (
          <button
            onClick={handleStopSpeech}
            className="h-8 w-8 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg border border-transparent cursor-pointer flex items-center justify-center"
            title="Stop TTS Playback"
          >
            <VolumeX className="w-4 h-4" />
          </button>
        )}

        {/* SPEECH SETTINGS TRIGGER */}
        <button
          onClick={() => setIsTTSModalOpen(true)}
          className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-tj-primary-hover bg-transparent hover:text-tj-primary hover:border-slate-300 transition-all cursor-pointer flex items-center justify-center animate-none"
          title="Configure Speech Voice & Speed"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Bilingual Mode Toggle (Pre-A1 and A1 only) */}
        {(cefrLevel === 'A1' || cefrLevel === 'Pre-A1') && (
          <button
            onClick={() => setShowBilingual(!showBilingual)}
            title="Toggle Bilingual Translation"
            className={`h-8 px-2.5 rounded-lg border flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
              showBilingual
                ? 'bg-tj-primary-light hover:bg-tj-primary-border dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover border-tj-primary-border'
                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-tj-primary-hover bg-transparent hover:text-tj-primary hover:border-slate-300'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Bilingual</span>
          </button>
        )}

        {/* Formatting Styles Settings Button */}
        <button
          onClick={() => setIsStylesModalOpen(true)}
          className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-tj-primary-hover bg-transparent hover:text-tj-primary hover:border-slate-300 transition-all cursor-pointer flex items-center justify-center"
          title="Configure Font & Text Styles"
        >
          <Type className="w-4 h-4" />
        </button>

        {/* Zen Focus Toggle Button */}
        <button
          onClick={onToggleZen}
          title="Zen Reading Mode"
          className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-tj-primary-hover bg-transparent hover:text-tj-primary hover:border-slate-300 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          <Eye className="w-4 h-4" />
          <span>Zen</span>
        </button>

        {/* EDIT BUTTON (icon-only, on the left group) */}
        {(isCreator || isAdmin) && !isEditing && onEditClick && (
          <button
            onClick={onEditClick}
            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-tj-primary-hover bg-transparent hover:text-tj-primary hover:border-slate-300 transition-all cursor-pointer flex items-center justify-center"
            title="Edit Chapter Content"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* DELETE STORY BUTTON (icon-only, on the far right) */}
        {(isCreator || isAdmin) && !isEditing && onDeleteClick && (
          <button
            onClick={onDeleteClick}
            className="h-8 w-8 rounded-lg border border-red-200 dark:border-red-900/30 text-tj-error hover:bg-rose-50 dark:hover:bg-rose-955/20 transition-all cursor-pointer flex items-center justify-center bg-transparent"
            title="Delete Entire Story"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* TTS Speech Settings Modal */}
      <AnimatePresence>
        {isTTSModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-tj-bg-card rounded-2xl border border-tj-border-main p-5 shadow-2xl relative space-y-4 text-tj-text-main font-sans"
            >
              <div className="flex items-center justify-between border-b border-tj-border-main pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-tj-primary" />
                  <h3 className="text-sm font-bold">Speech Settings</h3>
                </div>
                <button
                  onClick={() => setIsTTSModalOpen(false)}
                  className="p-1 hover:bg-tj-bg-recessed rounded-full text-tj-text-muted hover:text-tj-text-main cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Voice Selector */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-tj-text-muted font-bold">
                    Voice
                  </label>
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
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-tj-text-muted font-bold">
                    Speed Rate
                  </label>
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
                        value="1.0"
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
                        value="2.0"
                        className="dark:bg-slate-900 text-tj-text-main"
                      >
                        2.0x
                      </option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tj-text-muted pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsTTSModalOpen(false)}
                  className="px-4 py-2 text-xs text-tj-bg-main bg-tj-primary hover:bg-tj-primary-hover font-bold rounded-xl cursor-pointer transition-all shadow-none border-0"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Formatting & Font Styles Modal */}
      <AnimatePresence>
        {isStylesModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-tj-bg-card rounded-2xl border border-tj-border-main p-5 shadow-2xl relative space-y-4 text-tj-text-main font-sans"
            >
              <div className="flex items-center justify-between border-b border-tj-border-main pb-2">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-tj-primary" />
                  <h3 className="text-sm font-bold">Text & Font Styles</h3>
                </div>
                <button
                  onClick={() => setIsStylesModalOpen(false)}
                  className="p-1 hover:bg-tj-bg-recessed rounded-full text-tj-text-muted hover:text-tj-text-main cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Font Family Selector */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-tj-text-muted font-bold">
                    Reading Font Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
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
                <div className="space-y-2">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-tj-text-muted font-bold">
                    Text Font Size
                  </label>
                  <div className="flex items-center justify-between bg-slate-100/50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/80">
                    <button
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
                      onClick={() => setFontSize(Math.min(26, fontSize + 1))}
                      disabled={fontSize >= 26}
                      className="p-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg disabled:opacity-40 cursor-pointer transition-all border-0"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsStylesModalOpen(false)}
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
