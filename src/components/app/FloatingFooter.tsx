import { ChevronUp, FileText, Mail, Shield } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

export default function FloatingFooter() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          aria-label="Legal and navigation quick links"
          className="fixed bottom-4 right-4 z-40 flex items-center gap-3 px-3.5 py-2 rounded-full bg-tj-bg-card/85 dark:bg-[#181916]/85 backdrop-blur-md border border-tj-border-main/80 shadow-lg text-[11px] font-semibold text-tj-text-muted select-none transition-shadow duration-200 hover:shadow-xl hover:border-tj-primary/40"
        >
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-tj-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tj-primary rounded px-1"
            title="View Privacy Notice"
          >
            <Shield className="w-3.5 h-3.5 text-tj-primary shrink-0" />
            <span>Privacy</span>
          </a>

          <span className="text-tj-border-main/80">•</span>

          <a
            href="/terms.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-tj-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tj-primary rounded px-1"
            title="View Terms of Service"
          >
            <FileText className="w-3.5 h-3.5 text-tj-text-muted shrink-0" />
            <span>Terms</span>
          </a>

          <span className="text-tj-border-main/80">•</span>

          <a
            href="mailto:admin@teacherjake.com"
            className="flex items-center gap-1 hover:text-tj-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-tj-primary rounded px-1"
            title="Contact Support"
          >
            <Mail className="w-3.5 h-3.5 text-tj-text-muted shrink-0" />
            <span>Support</span>
          </a>

          <span className="h-4 w-px bg-tj-border-main/80 shrink-0 ml-0.5" />

          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center justify-center p-1.5 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main rounded-full transition-all cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tj-primary shrink-0"
            aria-label="Back to top"
            title="Back to top"
          >
            <ChevronUp className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
