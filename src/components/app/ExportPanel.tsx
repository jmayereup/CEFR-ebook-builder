import {
  BookOpen,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Story } from '../../types';

interface ExportPanelProps {
  selectedStory: Story;
  showExportMenu: boolean;
  setShowExportMenu: (show: boolean) => void;
  showDocOptions: boolean;
  setShowDocOptions: (show: boolean) => void;
  showEpubLinks: boolean;
  setShowEpubLinks: (show: boolean) => void;
  copyStatus: string | null;
  isExportingEpub: boolean;
  triggerCopyPlaintext: () => void;
  triggerCopyRichText: () => void;
  handleDownloadEpub: () => void;
}

export default function ExportPanel({
  selectedStory,
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
}: ExportPanelProps) {
  if (!showExportMenu) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-tj-primary-light dark:bg-tj-primary-light/10 rounded-xl text-tj-primary dark:text-tj-primary-hover shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-left select-none">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Export
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-medium">
              Download ebook or copy the complete story text.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowExportMenu(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-tj-primary hover:bg-tj-primary-hover dark:bg-tj-primary dark:hover:bg-tj-primary-hover text-tj-bg-main dark:text-tj-bg-main py-2 px-4 rounded-xl text-xs font-semibold select-none transition-all cursor-pointer active:scale-98"
        >
          <span>Export</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl border border-tj-primary-border dark:border-tj-primary-border transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2.5">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
          Select Output Format
        </span>
        <button
          type="button"
          onClick={() => {
            setShowExportMenu(false);
            setShowDocOptions(false);
            setShowEpubLinks(false);
          }}
          className="flex items-center gap-1 py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 rounded-lg cursor-pointer transition text-[11px] font-semibold"
          title="Go back"
        >
          <X className="w-3.5 h-3.5" />
          <span>Dismiss</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="flex flex-wrap items-center gap-2 max-w-full shrink-0">
          {/* EPUB Option */}
          <button
            type="button"
            disabled={isExportingEpub}
            onClick={() => {
              handleDownloadEpub();
              setShowEpubLinks(true);
              setShowDocOptions(false);
            }}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold select-none transition-all cursor-pointer border ${
              showEpubLinks
                ? 'bg-tj-primary border-tj-primary text-tj-bg-main shadow-md'
                : 'bg-tj-bg-card hover:bg-tj-bg-recessed border-tj-border-main text-tj-text-muted hover:text-tj-text-main'
            }`}
          >
            {isExportingEpub ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>eBook</span>
          </button>

          {/* Copy Styled Doc */}
          <button
            type="button"
            onClick={() => {
              triggerCopyRichText();
              setShowDocOptions(true);
              setShowEpubLinks(false);
            }}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold select-none transition-all cursor-pointer border ${
              showDocOptions && copyStatus === 'copy-rich'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-bold'
                : showDocOptions && !showEpubLinks
                  ? 'bg-tj-primary-light border-tj-primary-border text-tj-primary dark:bg-tj-primary-light/10 dark:border-tj-primary-border dark:text-tj-primary-hover'
                  : 'bg-tj-bg-card hover:bg-tj-bg-recessed border-tj-border-main text-tj-text-muted hover:text-tj-text-main'
            }`}
          >
            {copyStatus === 'copy-rich' ? (
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <FileText className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>Copy</span>
          </button>

          {/* Copy Plain Text */}
          <button
            type="button"
            onClick={() => {
              triggerCopyPlaintext();
              setShowDocOptions(true);
              setShowEpubLinks(false);
            }}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold select-none transition-all cursor-pointer border ${
              showDocOptions && copyStatus === 'copy-plain'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-bold'
                : 'bg-tj-bg-card hover:bg-tj-bg-recessed border-tj-border-main text-tj-text-muted hover:text-tj-text-main'
            }`}
          >
            {copyStatus === 'copy-plain' ? (
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <Copy className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>Copy Plain Text</span>
          </button>
        </div>

        {/* Dynamic responsive output helper panel */}
        <div className="flex-1 flex items-center min-w-0">
          <AnimatePresence mode="wait">
            {showDocOptions && (
              <motion.div
                key="doc-options"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-tj-bg-card px-3 py-2 rounded-xl border border-tj-border-main w-full justify-between min-w-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider transition truncate">
                    {copyStatus
                      ? 'Copied to Clipboard!'
                      : 'Output Ready to Paste!'}
                  </span>
                </div>
                <a
                  href="https://docs.new"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 py-1 px-2.5 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main text-[11px] font-bold rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <span>Create Blank Google Doc</span>
                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                </a>
              </motion.div>
            )}

            {showEpubLinks && (
              <motion.div
                key="epub-options"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-tj-bg-card px-3 py-2 rounded-xl border border-tj-border-main w-full min-w-0"
              >
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono shrink-0 whitespace-nowrap">
                  Upload EPUB File:
                </span>

                <div className="flex flex-wrap gap-1.5 w-full justify-start">
                  <a
                    href="https://www.amazon.com/sendtokindle"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 py-1 px-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800 select-none text-slate-600 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 text-[11px] font-bold rounded-lg transition-colors cursor-pointer border border-slate-200/50 dark:border-slate-800 shrink-0 whitespace-nowrap"
                    title="Official Kindle desktop uploader portal"
                  >
                    <span>Send to Kindle</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0 text-amber-500" />
                  </a>

                  <a
                    href="https://play.google.com/books/upload"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 py-1 px-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800 select-none text-slate-600 hover:text-tj-primary dark:text-slate-400 dark:hover:text-tj-primary-hover text-[11px] font-bold rounded-lg transition-colors cursor-pointer border border-slate-200/50 dark:border-slate-800 shrink-0 whitespace-nowrap"
                    title="Google Play Books web library uploader portal"
                  >
                    <span>Google Books</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0 text-tj-primary" />
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showEpubLinks && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-slate-200/60 dark:border-slate-800/80 pt-3.5 mt-2 flex flex-col md:flex-row gap-4 overflow-hidden"
        >
          {/* Kindle CSS Device Mockup */}
          <div className="w-full md:w-[210px] shrink-0 bg-slate-900 dark:bg-black rounded-3xl p-3.5 shadow-xl border border-slate-850 dark:border-slate-800 flex flex-col items-center">
            {/* Kindle Screen */}
            <div className="w-full aspect-[3/4.1] bg-[#FAF6EE] dark:bg-[#1E1D1B] rounded-md p-3.5 text-[#2D2A26] dark:text-[#EBE4D5] flex flex-col justify-between select-none border border-black/10 dark:border-white/5 relative overflow-hidden font-serif">
              {/* Screen Content */}
              <div className="space-y-2">
                <div className="text-center border-b border-black/[0.06] dark:border-white/[0.04] pb-1">
                  <span className="text-[6px] font-sans font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
                    Kindle paperwhite
                  </span>
                </div>
                <h4 className="text-[9px] font-extrabold text-center leading-tight">
                  {selectedStory.title}
                </h4>
                <p className="text-[5px] text-center font-sans tracking-wide text-black/50 dark:text-white/50 -mt-1 uppercase">
                  {selectedStory.language} Graded • Level{' '}
                  {selectedStory.cefrLevel}
                </p>
                <div className="h-[1px] w-5 bg-black/20 dark:bg-white/20 mx-auto"></div>
                <p className="text-[7.5px] leading-[1.3] text-justify text-black/85 dark:text-white/85 line-clamp-4">
                  {selectedStory.chapters[0]?.content.split(/\n+/)[0] ||
                    'No content available.'}
                </p>
              </div>

              <div className="text-center text-[6.5px] font-sans text-black/40 dark:text-white/40 border-t border-black/[0.06] dark:border-white/[0.04] pt-1">
                Page 1 of {selectedStory.chapters.length * 8} • 1%
              </div>
            </div>
            {/* Kindle Logo Accent */}
            <span className="text-[7px] font-mono tracking-widest text-slate-500 font-bold uppercase mt-2 select-none opacity-80">
              kindle
            </span>
          </div>

          {/* Feature details */}
          <div className="flex-1 flex flex-col justify-center space-y-3.5 py-1">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Optimized Reflowable EPUB Features:
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                EPUB is the industry-standard format for digital publications,
                compatible with Kindle, Apple Books, Kobo, and Google Books.
              </p>
            </div>

            <ul className="space-y-2 text-[10px] text-slate-600 dark:text-slate-400 font-medium">
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-tj-primary mt-1 shrink-0"></div>
                <span>
                  <strong>Interactive Font Sizing:</strong> Font scales
                  automatically based on your e-reader's configuration.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-tj-primary mt-1 shrink-0"></div>
                <span>
                  <strong>Bilingual Text Alignment:</strong> Preserves
                  paragraphs and translations clearly across pages.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-tj-primary mt-1 shrink-0"></div>
                <span>
                  <strong>Vocabulary Appendix:</strong> Embeds the vocabulary
                  glossary at the end of each chapter.
                </span>
              </li>
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
}
