import { Pause, Play, Square, Volume2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useState } from 'react';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

interface FloatingMediaControlsProps {
  isSpeaking: boolean;
  isPaused: boolean;
  onPlayPause: () => void;
  onStop: () => void;
  speechRate: number;
  setSpeechRate: (rate: number) => void;
  isVisible: boolean;
  isZenMode?: boolean;
}

export default function FloatingMediaControls({
  isSpeaking,
  isPaused,
  onPlayPause,
  onStop,
  speechRate,
  setSpeechRate,
  isVisible,
  isZenMode = false,
}: FloatingMediaControlsProps) {
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);

  const handleCycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(speechRate);
    const nextIndex =
      currentIndex === -1 ? 2 : (currentIndex + 1) % SPEED_OPTIONS.length;
    setSpeechRate(SPEED_OPTIONS[nextIndex]);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`fixed z-40 flex items-center gap-1.5 p-1.5 pl-2.5 bg-tj-bg-card/95 dark:bg-slate-900/95 backdrop-blur-md border border-tj-border-main rounded-2xl shadow-xl select-none font-sans text-tj-text-main ${
            isZenMode
              ? 'top-4 left-4'
              : 'top-16 sm:top-20 right-4 sm:right-6 md:right-8'
          }`}
        >
          {/* TTS Audio Indicator */}
          <div className="flex items-center gap-1.5 pr-1 text-tj-primary dark:text-tj-primary-hover">
            <Volume2 className="w-4 h-4" />
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                isSpeaking && !isPaused
                  ? 'bg-emerald-500 animate-pulse'
                  : isPaused
                    ? 'bg-amber-500'
                    : 'bg-slate-400 dark:bg-slate-600'
              }`}
            />
          </div>

          {/* Play / Pause Toggle Button */}
          <button
            type="button"
            onClick={onPlayPause}
            className={`h-8 w-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              isSpeaking && !isPaused
                ? 'bg-tj-primary-light dark:bg-tj-primary-light/10 text-tj-primary dark:text-tj-primary-hover border-tj-primary-border'
                : isPaused
                  ? 'bg-amber-100 dark:bg-amber-955/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                  : 'bg-tj-bg-recessed hover:bg-tj-primary-light text-tj-text-main hover:text-tj-primary border-tj-border-main'
            }`}
            title={
              isSpeaking && !isPaused
                ? 'Pause audio narration'
                : 'Resume audio narration'
            }
          >
            {isSpeaking && !isPaused ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Stop Button (visible whenever speaking or paused) */}
          {(isSpeaking || isPaused) && (
            <button
              type="button"
              onClick={onStop}
              className="h-8 w-8 rounded-xl border border-transparent text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-955/20 cursor-pointer flex items-center justify-center transition-colors"
              title="Stop narration"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          {/* Speed Cycle / Menu Button */}
          <div className="relative">
            <button
              type="button"
              onClick={handleCycleSpeed}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowSpeedMenu((prev) => !prev);
              }}
              className="h-8 px-2 rounded-xl border border-tj-border-main bg-tj-bg-recessed hover:bg-tj-bg-card text-xs font-mono font-bold text-tj-text-main hover:text-tj-primary transition-colors cursor-pointer flex items-center justify-center"
              title="Click to cycle speed (Right-click for options)"
            >
              {speechRate}x
            </button>

            {/* Quick Speed Dropdown on right-click / toggle */}
            {showSpeedMenu && (
              <div className="absolute right-0 top-full mt-1 bg-tj-bg-card border border-tj-border-main rounded-xl shadow-xl p-1 z-50 flex flex-col gap-0.5 min-w-[70px]">
                {SPEED_OPTIONS.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => {
                      setSpeechRate(rate);
                      setShowSpeedMenu(false);
                    }}
                    className={`px-2 py-1 text-xs font-mono font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                      rate === speechRate
                        ? 'bg-tj-primary text-white font-bold'
                        : 'hover:bg-tj-bg-recessed text-tj-text-main'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
