import { ChevronUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

export default function FloatingFooter() {
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveredRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
        }
        if (!isHoveredRef.current) {
          hideTimerRef.current = setTimeout(() => {
            setIsVisible(false);
          }, 2000);
        }
      } else {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
        }
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    isHoveredRef.current = true;
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    if (window.scrollY > 300) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
    }
  };

  const scrollToTop = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    setIsVisible(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-5 right-5 z-40"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center justify-center p-2.5 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main rounded-full transition-all cursor-pointer shadow-lg hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tj-primary active:scale-95 shrink-0"
            aria-label="Back to top"
            title="Back to top"
          >
            <ChevronUp className="w-5 h-5 stroke-[2.5]" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
