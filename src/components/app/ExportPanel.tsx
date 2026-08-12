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
  const handleClose = () => {
    setShowExportMenu(false);
    setShowDocOptions(false);
    setShowEpubLinks(false);
  };

  // Always render the compact "Export" banner in the page flow
  const triggerBanner = (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 gap-3 w-full md:w-auto md:min-w-[320px]">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-tj-primary-light dark:bg-tj-primary-light/10 rounded-xl text-tj-primary dark:text-tj-primary-hover shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="text-left select-none">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Export
          </p>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-normal font-medium">
            Download eBook or copy text.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowExportMenu(true)}
        className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-tj-primary hover:bg-tj-primary-hover dark:bg-tj-primary dark:hover:bg-tj-primary-hover text-tj-bg-main dark:text-tj-bg-main py-2 px-4 rounded-xl text-xs font-semibold select-none transition-all cursor-pointer active:scale-98"
      >
        <span>Export</span>
      </button>
    </div>
  );

  return (
    <>
      {triggerBanner}

      <AnimatePresence>
        {showExportMenu && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-[#0f172a]/60 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="relative bg-tj-bg-card rounded-2xl border border-tj-border-main shadow-2xl max-w-md w-full p-6 space-y-4 overflow-hidden z-10 flex flex-col"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                className="absolute top-4 right-4 p-1.5 hover:bg-tj-bg-recessed text-tj-text-muted rounded-full cursor-pointer transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1 pr-6">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Export Book
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                  Choose a format to download as an eBook or copy story text.
                </p>
              </div>

              {/* Format selection options */}
              <div className="space-y-3 py-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono block">
                  Select Output Format
                </span>

                <div className="flex flex-col gap-2">
                  {/* EPUB Option */}
                  <button
                    type="button"
                    disabled={isExportingEpub}
                    onClick={() => {
                      handleDownloadEpub();
                      setShowEpubLinks(true);
                      setShowDocOptions(false);
                    }}
                    className={`flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl text-xs font-semibold select-none transition-all cursor-pointer border w-full justify-start ${
                      showEpubLinks
                        ? 'bg-tj-primary border-tj-primary text-tj-bg-main shadow-md'
                        : 'bg-tj-bg-card hover:bg-tj-bg-recessed border-tj-border-main text-tj-text-muted hover:text-tj-text-main'
                    }`}
                  >
                    {isExportingEpub ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <Download className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>Download EPUB (eBook)</span>
                  </button>

                  {/* Copy Styled Doc */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerCopyRichText();
                      setShowDocOptions(true);
                      setShowEpubLinks(false);
                    }}
                    className={`flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl text-xs font-semibold select-none transition-all cursor-pointer border w-full justify-start ${
                      showDocOptions && copyStatus === 'copy-rich'
                        ? 'bg-emerald-605 border-emerald-600 text-white shadow-sm font-bold'
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
                    <span>Copy Formatted Rich Text</span>
                  </button>

                  {/* Copy Plain Text */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerCopyPlaintext();
                      setShowDocOptions(true);
                      setShowEpubLinks(false);
                    }}
                    className={`flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl text-xs font-semibold select-none transition-all cursor-pointer border w-full justify-start ${
                      showDocOptions && copyStatus === 'copy-plain'
                        ? 'bg-emerald-605 border-emerald-605 text-white shadow-sm font-bold'
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
              </div>

              {/* Auxiliary Helper Panels */}
              <div className="space-y-3">
                <AnimatePresence mode="wait">
                  {showDocOptions && (
                    <motion.div
                      key="doc-options"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80 w-full justify-between min-w-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider transition truncate uppercase">
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
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80 w-full"
                    >
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                          Upload EPUB File:
                        </span>

                        <div className="flex flex-wrap gap-1.5 w-full justify-start">
                          <a
                            href="https://www.amazon.com/sendtokindle"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 py-1 px-2.5 bg-tj-bg-card hover:bg-tj-bg-recessed select-none text-slate-650 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 text-[11px] font-bold rounded-lg transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-800 shrink-0 whitespace-nowrap"
                            title="Official Kindle desktop uploader portal"
                          >
                            <span>Send to Kindle</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 text-amber-500" />
                          </a>

                          <a
                            href="https://play.google.com/books"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 py-1 px-2.5 bg-tj-bg-card hover:bg-tj-bg-recessed select-none text-slate-650 hover:text-tj-primary dark:text-slate-400 dark:hover:text-tj-primary-hover text-[11px] font-bold rounded-lg transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-800 shrink-0 whitespace-nowrap"
                            title="Google Play Books web library uploader portal"
                          >
                            <span>Google Library</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 text-tj-primary" />
                          </a>
                        </div>
                      </div>

                      {/* Kindle CSS Device Mockup */}
                      <div className="border-t border-slate-200/50 dark:border-slate-800/80 pt-3 mt-1 flex justify-center overflow-hidden">
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
                                {(selectedStory.chapters ?? [])[0]?.content.split(
                                  /\n+/,
                                )[0] || 'No content available.'}
                              </p>
                            </div>

                            <div className="text-center text-[6.5px] font-sans text-black/40 dark:text-white/40 border-t border-black/[0.06] dark:border-white/[0.04] pt-1">
                              Page 1 of {(selectedStory.chapters?.length ?? 0) * 8} • 1%
                            </div>
                          </div>
                          {/* Kindle Logo Accent */}
                          <span className="text-[7px] font-mono tracking-widest text-slate-500 font-bold uppercase mt-2 select-none opacity-80">
                            kindle
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
