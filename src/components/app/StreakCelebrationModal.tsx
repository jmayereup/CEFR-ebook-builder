import { Flame, Sparkles, Trophy, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface StreakCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  streak: number;
  type: 'maintained' | 'milestone';
}

export default function StreakCelebrationModal({
  isOpen,
  onClose,
  streak,
  type,
}: StreakCelebrationModalProps) {
  // Simple particle generator for local CSS/Framer Motion confetti
  const particles = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    x: Math.random() * 300 - 150,
    y: Math.random() * -200 - 50,
    size: Math.random() * 8 + 4,
    color: ['#064e3b', '#10b981', '#34d399', '#fbbf24', '#f59e0b'][
      Math.floor(Math.random() * 5)
    ],
    delay: Math.random() * 0.4,
    duration: Math.random() * 2 + 1.5,
  }));

  const getTitle = () => {
    switch (type) {
      case 'milestone':
        return 'Milestone Achieved! 🏆';
      default:
        return 'Streak Maintained!';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'milestone':
        return `Incredible dedication! You reached an amazing milestone. You've been practicing daily!`;
      default:
        return `You're keeping the momentum alive. Daily practice is the secret to language mastery!`;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-tj-bg-card border border-tj-border-main p-8 rounded-3xl shadow-2xl text-center overflow-hidden"
          >
            {/* Confetti Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ x: 0, y: 150, scale: 0, opacity: 1 }}
                  animate={{
                    x: p.x,
                    y: p.y + 400,
                    scale: [0, 1, 1, 0],
                    rotate: Math.random() * 360 + 360,
                    opacity: [1, 1, 0.8, 0],
                  }}
                  transition={{
                    delay: p.delay,
                    duration: p.duration,
                    ease: 'easeOut',
                  }}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '10%',
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    borderRadius: Math.random() > 0.5 ? '50%' : '20%',
                  }}
                />
              ))}
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-tj-text-muted hover:text-tj-text-main rounded-full hover:bg-tj-primary-light transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Large Animated Flame Icon */}
            <div className="relative inline-flex items-center justify-center my-4">
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  filter: [
                    'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))',
                    'drop-shadow(0 0 15px rgba(16, 185, 129, 0.8))',
                    'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-24 h-24 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50"
              >
                {type === 'milestone' ? (
                  <Trophy className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Flame className="w-12 h-12 fill-emerald-500 text-emerald-500" />
                )}
              </motion.div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="absolute -top-1 -right-1 bg-amber-500 text-white p-1.5 rounded-full border-2 border-white dark:border-[#1e293b]"
              >
                <Sparkles className="w-4 h-4 fill-white" />
              </motion.div>
            </div>

            {/* Streak Number */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-black font-sans text-tj-text-main tracking-tight mt-2"
            >
              {streak} {streak === 1 ? 'Day' : 'Days'}
            </motion.h2>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-3 space-y-2"
            >
              <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {getTitle()}
              </h3>
              <p className="text-xs text-tj-text-muted leading-relaxed max-w-sm mx-auto">
                {getDescription()}
              </p>
            </motion.div>

            {/* Action Button */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <button
                onClick={onClose}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl cursor-pointer transition-all shadow-lg hover:shadow-emerald-600/20 active:scale-98"
              >
                Keep Learning! 🔥
              </button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
