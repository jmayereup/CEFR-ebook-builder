import { ArrowLeft, CheckCircle, Edit3, FileSignature } from 'lucide-react';
import { motion } from 'motion/react';
import { FREE_MODEL_IDS } from '../../constants/models';

interface StoryOutlineReviewProps {
  draftTitle: string;
  setDraftTitle: (title: string) => void;
  draftDescription: string;
  setDraftDescription: (desc: string) => void;
  draftOutline: string;
  setDraftOutline: (outline: string) => void;
  isScratchMode: boolean;
  isLoading: boolean;
  est: { totalCost: number };
  selectedModel: string;
  isPaid: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export default function StoryOutlineReview({
  draftTitle,
  setDraftTitle,
  draftDescription,
  setDraftDescription,
  draftOutline,
  setDraftOutline,
  isScratchMode,
  isLoading,
  est,
  selectedModel,
  isPaid,
  onBack,
  onSubmit,
}: StoryOutlineReviewProps) {
  const isFreeModel =
    FREE_MODEL_IDS.has(selectedModel) || selectedModel.endsWith(':free');
  const creditCost = isFreeModel
    ? 0
    : Math.max(1, Math.ceil(est.totalCost * 100));

  return (
    <motion.div
      key="outline"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="bg-tj-bg-card p-6 rounded-2xl shadow-xl border border-tj-border-main space-y-6"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          type="button"
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
            Step 2: Approve & Refine Outline
          </h2>
          <p className="text-xs text-slate-500">
            Edit elements to steer the narrative arc before drafting begins
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Story Title Edit */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
            Story Title (Target Language)
          </label>
          <div className="relative">
            <FileSignature className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-tj-border-main bg-tj-bg-card text-tj-text-main text-sm font-semibold tracking-tight focus:border-tj-primary focus:outline-none"
              placeholder="Insert custom title"
            />
          </div>
        </div>

        {/* Story Description Edit */}
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
            Story Description / Synopsis (for Metadata & Cards)
          </label>
          <textarea
            value={draftDescription}
            onChange={(e) => setDraftDescription(e.target.value)}
            rows={3}
            className="w-full p-3.5 rounded-xl border border-tj-border-main bg-tj-bg-card text-tj-text-main text-sm leading-relaxed placeholder:text-tj-text-muted/50 focus:border-tj-primary focus:outline-none font-sans resize-y"
            placeholder="Insert brief synopsis/description of the story"
          />
        </div>

        {/* Markdown Outline Plan Details */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
              Proposed Chapter Breakdown & Outline
            </label>
            <div className="flex items-center gap-1 text-[10px] text-tj-primary font-semibold bg-tj-primary-light dark:bg-slate-800 px-2 py-0.5 rounded-lg">
              <Edit3 className="w-3 h-3" />
              <span>Fully Editable</span>
            </div>
          </div>
          <textarea
            value={draftOutline}
            onChange={(e) => setDraftOutline(e.target.value)}
            rows={11}
            className="w-full p-4 rounded-xl border border-tj-border-main bg-tj-bg-card text-tj-text-main text-sm font-mono leading-relaxed placeholder:text-tj-text-muted/50 focus:border-tj-primary focus:outline-none"
            placeholder="Story outline details"
          />
          <p className="text-[10px] text-slate-400 font-mono leading-normal mt-1.5">
            Steer any chapters. E.g., add "Include meeting a dog in Chapter 2"
            or change names. The writing engine follows these exact
            instructions.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          type="button"
          className="py-3 px-4 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-all"
        >
          Back to Settings
        </button>
        <button
          onClick={onSubmit}
          type="button"
          disabled={isLoading || !draftTitle.trim() || !draftOutline.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-tj-primary hover:bg-tj-primary-hover disabled:bg-slate-400 disabled:dark:bg-slate-700 dark:bg-tj-primary dark:hover:bg-tj-primary-hover text-tj-bg-main font-bold text-xs rounded-xl cursor-pointer transition-all border-0"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>
                {isScratchMode
                  ? 'Saving Story Plan...'
                  : 'Drafting Chapter 1...'}
              </span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>
                {isScratchMode
                  ? 'Save Story Plan'
                  : `Approve Outline & Write Chapter 1${
                      isPaid && !isFreeModel
                        ? ` (Est. ${creditCost} credits)`
                        : ''
                    }`}
              </span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
