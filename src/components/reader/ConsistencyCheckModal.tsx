import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  CheckSquare,
  FileText,
  Loader2,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  AI_MODELS,
  FRONTIER_LATEST_MODELS,
  formatModelPriceIndicator,
} from '../../constants/models';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import type {
  ConsistencyEditProposal,
  ConsistencyIssue,
  Story,
  TargetedEdit,
} from '../../types';
import {
  applyBatchEdits,
  checkEditMatch,
} from '../../utils/consistencyUtils';
import { buildApiHeaders } from '../../utils/modelUtils';

interface ConsistencyCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: Story;
  onStoryUpdated: (story: Story) => void;
  onSaveStory?: (story?: Story) => Promise<any>;
  customOpenRouterKey?: string;
  onShowAlert?: (
    title: string,
    message: string,
    type?: 'info' | 'error' | 'warning',
  ) => void;
  initialPrompt?: string;
}

export default function ConsistencyCheckModal({
  isOpen,
  onClose,
  story,
  onStoryUpdated,
  onSaveStory,
  customOpenRouterKey = '',
  onShowAlert,
  initialPrompt = '',
}: ConsistencyCheckModalProps) {
  const { currentUser } = useAuthStore();
  const defaultStoryModel = useUIStore((state) => state.defaultStoryModel);

  const [customIssuePrompt, setCustomIssuePrompt] = useState(initialPrompt);
  const [submittedPrompt, setSubmittedPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return story.model || defaultStoryModel || '~deepseek/deepseek-flash-latest';
  });
  const [isCustomModelMode, setIsCustomModelMode] = useState<boolean>(false);
  const [customModelInput, setCustomModelInput] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [proposal, setProposal] = useState<ConsistencyEditProposal | null>(
    null,
  );
  // Track selected edits by a composite key `${issueIndex}-${editIndex}`
  const [selectedEditKeys, setSelectedEditKeys] = useState<Set<string>>(
    new Set(),
  );

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sync initialPrompt and ensure selectedModel has a default on open
  useEffect(() => {
    if (isOpen) {
      if (initialPrompt) {
        setCustomIssuePrompt(initialPrompt);
      }
      setSelectedModel((prev) => {
        if (prev) return prev;
        return defaultStoryModel || story.model || '~deepseek/deepseek-flash-latest';
      });
    }
  }, [isOpen, initialPrompt, defaultStoryModel, story.model]);

  // Whenever a proposal is loaded, select all edits by default
  useEffect(() => {
    if (proposal && proposal.issues) {
      const allKeys = new Set<string>();
      proposal.issues.forEach((issue, issueIdx) => {
        issue.edits.forEach((_, editIdx) => {
          allKeys.add(`${issueIdx}-${editIdx}`);
        });
      });
      setSelectedEditKeys(allKeys);
    } else {
      setSelectedEditKeys(new Set());
    }
  }, [proposal]);

  if (!isOpen) return null;

  const chapters = story.chapters || [];

  const handleProposeEdits = async () => {
    if (chapters.length === 0) {
      setErrorMsg('This story has no chapters to analyze.');
      return;
    }

    const trimmedPrompt = customIssuePrompt.trim();
    setSubmittedPrompt(trimmedPrompt);

    setErrorMsg(null);
    setIsLoading(true);
    setProposal(null);

    try {
      const headers = buildApiHeaders(customOpenRouterKey);

      const response = await fetch(
        '/api/stories/maintenance/propose-consistency-edits',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            storyTitle: story.title,
            language: story.language,
            cefrLevel: story.cefrLevel,
            genre: story.genre,
            outline: story.outline || '',
            storyBible: story.storyBible || null,
            chapters: chapters.map((ch) => ({
              chapterNumber: ch.chapterNumber,
              title: ch.title,
              content: ch.content,
              summary: ch.summary,
            })),
            issueDescription: trimmedPrompt || undefined,
            model: selectedModel,
            userId: currentUser?.uid,
            userEmail: currentUser?.email,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to analyze consistency (Status: ${response.status})`,
        );
      }

      const data: ConsistencyEditProposal = await response.json();
      setProposal(data);
    } catch (err: any) {
      console.error('[ConsistencyCheckModal] Error:', err);
      setErrorMsg(err.message || 'An error occurred during consistency check.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEditSelection = (key: string) => {
    const next = new Set(selectedEditKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedEditKeys(next);
  };

  const handleSelectAll = () => {
    if (!proposal) return;
    const allKeys = new Set<string>();
    proposal.issues.forEach((issue, issueIdx) => {
      issue.edits.forEach((_, editIdx) => {
        allKeys.add(`${issueIdx}-${editIdx}`);
      });
    });
    setSelectedEditKeys(allKeys);
  };

  const handleDeselectAll = () => {
    setSelectedEditKeys(new Set());
  };

  const handleApplyEdits = async () => {
    if (!proposal) return;

    // Collect all selected edits
    const editsToApply: TargetedEdit[] = [];
    proposal.issues.forEach((issue, issueIdx) => {
      issue.edits.forEach((edit, editIdx) => {
        if (selectedEditKeys.has(`${issueIdx}-${editIdx}`)) {
          editsToApply.push(edit);
        }
      });
    });

    if (editsToApply.length === 0) {
      if (onShowAlert) {
        onShowAlert('No Edits Selected', 'Please select at least one edit to apply.', 'warning');
      }
      return;
    }

    setIsApplying(true);
    try {
      const { updatedChapters, appliedCount, failedEdits } = applyBatchEdits(
        chapters,
        editsToApply,
      );

      if (appliedCount === 0) {
        throw new Error(
          'None of the selected snippets could be matched in the chapter text.',
        );
      }

      const auditSummary = `Applied ${appliedCount} targeted consistency edit(s) across chapters.\n\n${proposal.issuesSummary}`;

      const updatedStory: Story = {
        ...story,
        chapters: updatedChapters,
        consistencyAudits: [
          ...(story.consistencyAudits || []),
          {
            chapterRange: `Consistency Fix: ${appliedCount} edit(s)`,
            auditText: auditSummary,
            createdAt: new Date().toISOString(),
          },
        ],
        isUnsaved: false,
      };

      onStoryUpdated(updatedStory);

      if (onSaveStory) {
        await onSaveStory(updatedStory);
      }

      if (onShowAlert) {
        if (failedEdits.length > 0) {
          onShowAlert(
            'Partial Edits Applied',
            `Applied ${appliedCount} edit(s). ${failedEdits.length} edit(s) could not be matched verbatim and were skipped.`,
            'warning',
          );
        } else {
          onShowAlert(
            'Consistency Edits Applied',
            `Successfully applied ${appliedCount} targeted edit(s) across chapters!`,
            'info',
          );
        }
      }

      onClose();
    } catch (err: any) {
      console.error('[ConsistencyCheckModal] Save error:', err);
      setErrorMsg(`Failed to apply edits: ${err.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  // Helper to count total edits in proposal
  const totalEditsCount =
    proposal?.issues.reduce((acc, iss) => acc + iss.edits.length, 0) ?? 0;
  const selectedCount = selectedEditKeys.size;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consistency-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in select-text font-sans"
    >
      <div className="bg-tj-bg-card text-tj-text-main w-full max-w-4xl rounded-2xl border border-tj-border-main shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-tj-border-main flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-tj-primary/10 text-tj-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="consistency-modal-title"
                className="text-base font-bold text-tj-text-main leading-tight"
              >
                Story Consistency Check & Targeted Edits
              </h2>
              <p className="text-xs text-tj-text-muted mt-0.5">
                Audit character continuity, timeline, and plot across all chapters,
                or target specific fixes with surgical search-and-replace edits.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close consistency modal"
            className="p-1.5 text-tj-text-muted hover:text-tj-text-main hover:bg-tj-bg-recessed rounded-xl cursor-pointer transition-colors border-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 text-xs bg-tj-error-light/50 text-tj-error border border-tj-error/30 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Continuity Focus / Inspection Prompt Box */}
          <div className="space-y-3 bg-tj-bg-recessed/40 p-4 rounded-xl border border-tj-border-main">
            <div className="flex items-center justify-between">
              <label
                htmlFor="continuity-prompt-input"
                className="text-xs font-bold text-tj-text-main flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-tj-primary" />
                Continuity Focus / Targeted Inspection Prompt
              </label>
              {customIssuePrompt.trim() && (
                <button
                  type="button"
                  onClick={() => setCustomIssuePrompt('')}
                  className="text-[10px] text-tj-text-muted hover:text-tj-text-main hover:underline bg-transparent border-0 cursor-pointer p-0"
                >
                  Clear (Audit Everything)
                </button>
              )}
            </div>

            <p className="text-[11px] text-tj-text-muted leading-relaxed">
              Ask the AI to trace a specific item, character, or plotline across all chapters (e.g.{' '}
              <span className="italic font-medium text-tj-text-main">
                "Check the location of the amulet"
              </span>
              ), specify a fix, or leave blank to audit the entire book.
            </p>

            <textarea
              id="continuity-prompt-input"
              value={customIssuePrompt}
              onChange={(e) => setCustomIssuePrompt(e.target.value)}
              rows={3}
              className="w-full p-3 text-xs border border-tj-border-main bg-tj-bg-card text-tj-text-main rounded-xl focus:border-tj-primary focus:outline-none resize-none leading-relaxed placeholder:text-tj-text-muted/60 font-sans"
              placeholder={`e.g. "Check the location of the amulet across chapters", "Trace who possesses the secret key", "Verify whether Sarah's eye color stays green", or "Change Buster the dog to Barnaby"...`}
            />

            {/* Quick Inspiration Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-semibold text-tj-text-muted mr-1">
                Suggested Prompts:
              </span>
              <button
                type="button"
                onClick={() =>
                  setCustomIssuePrompt('Check the location of the amulet across all chapters')
                }
                className="text-[10px] px-2.5 py-1 rounded-full bg-tj-bg-card hover:bg-tj-primary/10 hover:text-tj-primary border border-tj-border-main text-tj-text-main cursor-pointer transition-all"
              >
                💎 Check location of the amulet
              </button>
              <button
                type="button"
                onClick={() =>
                  setCustomIssuePrompt('Trace possession and location of key items or artifacts across all chapters')
                }
                className="text-[10px] px-2.5 py-1 rounded-full bg-tj-bg-card hover:bg-tj-primary/10 hover:text-tj-primary border border-tj-border-main text-tj-text-main cursor-pointer transition-all"
              >
                🗝️ Trace key items
              </button>
              <button
                type="button"
                onClick={() =>
                  setCustomIssuePrompt('Check character names, physical descriptions, and relationships across all chapters')
                }
                className="text-[10px] px-2.5 py-1 rounded-full bg-tj-bg-card hover:bg-tj-primary/10 hover:text-tj-primary border border-tj-border-main text-tj-text-main cursor-pointer transition-all"
              >
                👤 Verify character traits & names
              </button>
              <button
                type="button"
                onClick={() =>
                  setCustomIssuePrompt('Check timeline consistency, days elapsed, and chronology of events')
                }
                className="text-[10px] px-2.5 py-1 rounded-full bg-tj-bg-card hover:bg-tj-primary/10 hover:text-tj-primary border border-tj-border-main text-tj-text-main cursor-pointer transition-all"
              >
                ⏳ Check chronology & timeline
              </button>
            </div>
          </div>

          {/* Configuration & Trigger Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-tj-bg-recessed/60 border border-tj-border-main rounded-xl">
            <div className="flex-1 max-w-md space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-tj-text-muted whitespace-nowrap">
                  Model:
                </label>
                <div className="flex-1">
                  <select
                    value={isCustomModelMode ? 'custom' : selectedModel}
                    disabled={isLoading}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomModelMode(true);
                        if (!customModelInput) {
                          setCustomModelInput(selectedModel);
                        }
                      } else {
                        setIsCustomModelMode(false);
                        setSelectedModel(e.target.value);
                      }
                    }}
                    className="w-full text-xs p-2 rounded-lg border border-tj-border-main bg-tj-bg-card text-tj-text-main focus:outline-none cursor-pointer"
                  >
                    {customOpenRouterKey ? (
                      <>
                        {/* Curated BYOK Frontier & Latest models */}
                        {!isCustomModelMode &&
                          !FRONTIER_LATEST_MODELS.some(
                            (m) => m.id === selectedModel,
                          ) && (
                            <option value={selectedModel}>
                              {selectedModel} (Active Model)
                            </option>
                          )}
                        {[...FRONTIER_LATEST_MODELS]
                          .sort((a, b) =>
                            a.name.localeCompare(b.name, undefined, {
                              sensitivity: 'base',
                            }),
                          )
                          .map((m) => {
                            const priceLabel = formatModelPriceIndicator(
                              m.inputCost1M,
                              m.outputCost1M,
                            );
                            return (
                              <option key={m.id} value={m.id}>
                                {m.name} {priceLabel}
                              </option>
                            );
                          })}
                        <option value="custom">
                          ⚙️ Enter Custom OpenRouter Model ID...
                        </option>
                      </>
                    ) : (
                      <>
                        <option value="~deepseek/deepseek-flash-latest">
                          DeepSeek Flash Latest (Recommended)
                        </option>
                        <option value="~z-ai/glm-flash-latest">
                          GLM Flash Latest
                        </option>
                        <option value="~google/gemini-flash-latest">
                          Gemini Flash Latest
                        </option>
                        {story.model &&
                          story.model !== '~deepseek/deepseek-flash-latest' &&
                          story.model !== '~z-ai/glm-flash-latest' &&
                          story.model !== 'z-ai/glm-5.3-flash' &&
                          story.model !== '~google/gemini-flash-latest' && (
                            <option value={story.model}>
                              {story.model} (Story Model)
                            </option>
                          )}
                      </>
                    )}
                  </select>
                </div>
              </div>

              {isCustomModelMode && (
                <div className="flex items-center gap-1.5 pl-14">
                  <input
                    type="text"
                    placeholder="e.g. anthropic/claude-3.7-sonnet"
                    value={customModelInput}
                    onChange={(e) => {
                      setCustomModelInput(e.target.value);
                      setSelectedModel(e.target.value.trim());
                    }}
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-tj-border-main bg-tj-bg-card text-tj-text-main font-mono focus:border-tj-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomModelMode(false);
                      setSelectedModel(
                        defaultStoryModel || '~deepseek/deepseek-flash-latest',
                      );
                    }}
                    className="text-[10px] text-tj-text-muted hover:text-tj-text-main hover:underline bg-transparent border-0 cursor-pointer p-0"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={isLoading || isApplying}
              onClick={handleProposeEdits}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-tj-primary hover:bg-tj-primary-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer border-0 shrink-0 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {customIssuePrompt.trim()
                      ? 'Tracing Focus Query...'
                      : 'Auditing All Chapters...'}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {customIssuePrompt.trim()
                      ? `Check: "${customIssuePrompt.trim().slice(0, 26)}${customIssuePrompt.trim().length > 26 ? '...' : ''}"`
                      : 'Run Full Continuity Audit'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Results Display */}
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="w-8 h-8 text-tj-primary animate-spin" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-tj-text-main">
                  {customIssuePrompt.trim()
                    ? `Tracing "${customIssuePrompt.trim()}" across ${chapters.length} chapters...`
                    : `Analyzing ${chapters.length} chapters for narrative continuity...`}
                </p>
                <p className="text-[11px] text-tj-text-muted">
                  Checking character profiles, timeline contradictions, item locations,
                  and generating surgical edits.
                </p>
              </div>
            </div>
          )}

          {!isLoading && proposal && (
            <div className="space-y-5 animate-fade-in">
              {/* Active Query Banner */}
              {submittedPrompt && (
                <div className="p-3 bg-tj-primary-light/40 dark:bg-tj-primary-light/10 border border-tj-primary-border rounded-xl flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-tj-primary uppercase tracking-wide text-[10px]">
                      Targeted Query:
                    </span>
                    <span className="text-tj-text-main font-medium italic">
                      "{submittedPrompt}"
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProposal(null);
                      setSubmittedPrompt('');
                      setCustomIssuePrompt('');
                    }}
                    className="text-[11px] font-semibold text-tj-primary hover:underline bg-transparent border-0 cursor-pointer p-0"
                  >
                    Reset Check
                  </button>
                </div>
              )}

              {/* Executive Summary */}
              <div className="p-4 bg-tj-mint/15 border border-tj-success/20 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-tj-forest shrink-0" />
                  <h4 className="text-xs font-bold text-tj-mint-dark uppercase tracking-wider">
                    Continuity Audit Report
                  </h4>
                </div>
                <p className="text-xs text-tj-text-main leading-relaxed whitespace-pre-wrap">
                  {proposal.issuesSummary}
                </p>
              </div>

              {/* No Issues Found State */}
              {proposal.issues.length === 0 && (
                <div className="py-8 text-center text-xs text-tj-text-muted border border-dashed border-tj-border-main rounded-xl flex flex-col items-center justify-center gap-2">
                  <Check className="w-8 h-8 text-tj-forest" />
                  <span className="font-semibold text-tj-text-main">
                    No Continuity Problems Found!
                  </span>
                  <span>
                    {submittedPrompt
                      ? `Everything regarding "${submittedPrompt}" is consistent across all ${chapters.length} chapters.`
                      : `The character profiles, timelines, and dialogue are consistent across all ${chapters.length} chapters.`}
                  </span>
                </div>
              )}

              {/* Issues & Edits List */}
              {proposal.issues.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-tj-border-main pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-tj-text-main">
                        Proposed Edits ({totalEditsCount} across{' '}
                        {proposal.issues.length} issue
                        {proposal.issues.length === 1 ? '' : 's'})
                      </span>
                      <span className="text-[10px] bg-tj-bg-recessed px-2 py-0.5 rounded text-tj-text-muted font-medium">
                        {selectedCount} selected
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-[11px] font-semibold text-tj-primary hover:underline bg-transparent border-0 cursor-pointer p-0"
                      >
                        Select All
                      </button>
                      <span className="text-tj-text-muted/40">|</span>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="text-[11px] font-semibold text-tj-text-muted hover:underline bg-transparent border-0 cursor-pointer p-0"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {proposal.issues.map((issue: ConsistencyIssue, issueIdx) => (
                      <div
                        key={issueIdx}
                        className="border border-tj-border-main bg-tj-bg-recessed/30 rounded-xl overflow-hidden shadow-xs"
                      >
                        {/* Issue Header */}
                        <div className="p-3 bg-tj-bg-card border-b border-tj-border-main flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  issue.severity === 'high'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                    : issue.severity === 'medium'
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {issue.severity} priority
                              </span>
                              <span className="font-bold text-tj-text-main text-xs">
                                Issue #{issueIdx + 1}
                              </span>
                            </div>
                            <p className="text-xs text-tj-text-main font-medium">
                              {issue.issueDescription}
                            </p>
                          </div>
                        </div>

                        {/* List of Edits for this Issue */}
                        <div className="p-3 space-y-3">
                          {issue.edits.map((edit: TargetedEdit, editIdx) => {
                            const key = `${issueIdx}-${editIdx}`;
                            const isSelected = selectedEditKeys.has(key);
                            const targetChapter = chapters.find(
                              (c) => c.chapterNumber === edit.chapterNumber,
                            );
                            const isMatchReady = targetChapter
                              ? checkEditMatch(
                                  targetChapter.content,
                                  edit.findText,
                                )
                              : false;

                            return (
                              <div
                                key={editIdx}
                                className={`p-3 rounded-xl border transition-all ${
                                  isSelected
                                    ? 'bg-tj-bg-card border-tj-primary/40 shadow-xs'
                                    : 'bg-tj-bg-card/50 border-tj-border-main/60 opacity-60'
                                }`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => toggleEditSelection(key)}
                                    className="mt-0.5 text-tj-primary cursor-pointer border-0 bg-transparent p-0"
                                    title={isSelected ? 'Deselect' : 'Select'}
                                  >
                                    {isSelected ? (
                                      <CheckSquare className="w-4 h-4 text-tj-primary" />
                                    ) : (
                                      <Square className="w-4 h-4 text-tj-text-muted" />
                                    )}
                                  </button>

                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <span className="text-[11px] font-bold text-tj-primary">
                                        Chapter {edit.chapterNumber}
                                        {targetChapter?.title
                                          ? `: "${targetChapter.title}"`
                                          : ''}
                                      </span>

                                      {isMatchReady ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-tj-forest font-semibold">
                                          <Check className="w-3 h-3" />
                                          Exact match ready
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                          <AlertTriangle className="w-3 h-3" />
                                          Snippet not found verbatim
                                        </span>
                                      )}
                                    </div>

                                    {/* Diff View */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                                      {/* Original (Find) */}
                                      <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30 rounded-lg space-y-1">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                                          Original Snippet:
                                        </span>
                                        <p className="line-through decoration-rose-500/70 text-tj-text-main whitespace-pre-wrap leading-relaxed font-sans">
                                          {edit.findText}
                                        </p>
                                      </div>

                                      {/* Replacement (ReplaceWith) */}
                                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 rounded-lg space-y-1">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                                          Replacement:
                                        </span>
                                        <p className="text-tj-text-main font-medium whitespace-pre-wrap leading-relaxed font-sans">
                                          {edit.replaceWith}
                                        </p>
                                      </div>
                                    </div>

                                    {edit.explanation && (
                                      <p className="text-[10px] text-tj-text-muted italic">
                                        Why: {edit.explanation}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-tj-border-main bg-tj-bg-recessed flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-tj-border-main hover:bg-tj-bg-card rounded-xl text-xs font-semibold text-tj-text-main cursor-pointer transition-colors"
          >
            Close
          </button>

          {proposal && proposal.issues.length > 0 && (
            <button
              type="button"
              disabled={isApplying || selectedCount === 0}
              onClick={handleApplyEdits}
              className="flex items-center gap-1.5 px-5 py-2 bg-tj-primary hover:bg-tj-primary-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer border-0 disabled:opacity-50 shadow-sm"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Applying Edits...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    Apply {selectedCount} Selected Edit
                    {selectedCount === 1 ? '' : 's'}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
