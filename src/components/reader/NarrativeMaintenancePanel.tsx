import {
  AlertCircle,
  Compass,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
// Firestore writes removed to operate in-memory
import type {
  CharacterProfile,
  ConsistencyAudit,
  Story,
  StoryBible,
} from '../../types';
import { buildApiHeaders } from '../../utils/modelUtils';

interface NarrativeMaintenancePanelProps {
  story: Story;
  onStoryUpdated: (story: Story) => void;
  customOpenRouterKey?: string;
  onShowAlert?: (
    title: string,
    message: string,
    type?: 'info' | 'error' | 'warning',
  ) => void;
  isOnline?: boolean;
  activeSubTab?: 'bible' | 'audits' | 'tone' | 'outline';
  setActiveSubTab?: (tab: 'bible' | 'audits' | 'tone' | 'outline') => void;
}

export default function NarrativeMaintenancePanel({
  story,
  onStoryUpdated,
  customOpenRouterKey = '',
  onShowAlert,
  isOnline = true,
  activeSubTab: propActiveSubTab,
  setActiveSubTab: propSetActiveSubTab,
}: NarrativeMaintenancePanelProps) {
  const { currentUser } = useAuthStore();
  const [localSubTab, setLocalSubTab] = useState<
    'bible' | 'audits' | 'tone' | 'outline'
  >('bible');

  const activeSubTab = propActiveSubTab ?? localSubTab;
  const setActiveSubTab = propSetActiveSubTab ?? setLocalSubTab;

  // Story Bible Local States
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [rules, setRules] = useState<string[]>(['', '', '']);
  const [plotPoints, setPlotPoints] = useState<string[]>([]);
  const [isUpdatingBible, setIsUpdatingBible] = useState(false);
  const [isSavingBible, setIsSavingBible] = useState(false);

  // Consistency Audits States
  const [audits, setAudits] = useState<ConsistencyAudit[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);

  // Tone States
  const [toneGuidance, setToneGuidance] = useState('');
  const [toneAnalysis, setToneAnalysis] = useState('');
  const [isAnalyzingTone, setIsAnalyzingTone] = useState(false);
  const [isSavingTone, setIsSavingTone] = useState(false);

  // Outline States
  const [outline, setOutline] = useState('');
  const [isSavingOutline, setIsSavingOutline] = useState(false);

  // Sync state with Story prop
  useEffect(() => {
    if (story.storyBible) {
      setCharacters(story.storyBible.characterProfiles || []);
      setRules(
        story.storyBible.rulesOfThree &&
          story.storyBible.rulesOfThree.length === 3
          ? story.storyBible.rulesOfThree
          : [...(story.storyBible.rulesOfThree || []), '', '', ''].slice(0, 3),
      );
      setPlotPoints(story.storyBible.activePlotPoints || []);
    } else {
      setCharacters([]);
      setRules(['', '', '']);
      setPlotPoints([]);
    }

    setAudits(story.consistencyAudits || []);
    setToneGuidance(story.toneRefreshGuidance || '');
    setOutline(story.outline || '');
  }, [story]);

  const headers = buildApiHeaders(customOpenRouterKey);

  // Save manual changes to Story Bible
  const handleSaveBible = async () => {
    setIsSavingBible(true);
    try {
      const cleanCharacters = characters.filter((c) => c.name.trim() !== '');
      const cleanRules = rules.map((r) => r.trim()).filter((r) => r !== '');
      const cleanPlotPoints = plotPoints.filter((p) => p.trim() !== '');

      const updatedBible: StoryBible = {
        characterProfiles: cleanCharacters,
        rulesOfThree: cleanRules,
        activePlotPoints: cleanPlotPoints,
        lastUpdatedChapter: story.storyBible?.lastUpdatedChapter ?? 0,
      };

      onStoryUpdated({
        ...story,
        storyBible: updatedBible,
        isUnsaved: true,
      });

      if (onShowAlert) {
        onShowAlert(
          'Draft Updated',
          'Story Bible updated in local memory. Make sure to click "Save Draft" or "Save Changes" to save to the database.',
          'info',
        );
      } else {
        alert(
          'Story Bible updated in local memory. Make sure to click "Save Draft" or "Save Changes" to save to the database.',
        );
      }
    } catch (err: any) {
      console.error('Failed to save Story Bible:', err);
      if (onShowAlert) {
        onShowAlert(
          'Error',
          `Failed to save Story Bible: ${err.message}`,
          'error',
        );
      }
    } finally {
      setIsSavingBible(false);
    }
  };

  // Re-generate/Update Bible via AI
  const handleUpdateBibleWithAI = async () => {
    if (!isOnline) return;
    if (story.chapters?.length === 0) {
      if (onShowAlert) {
        onShowAlert(
          'Empty Story',
          'Generate at least one chapter before updating the Story Bible.',
          'warning',
        );
      }
      return;
    }

    setIsUpdatingBible(true);
    try {
      const response = await fetch('/api/stories/maintenance/update-bible', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: story.language,
          cefrLevel: story.cefrLevel,
          genre: story.genre,
          storyTitle: story.title,
          outline: story.outline || '',
          chapters: story.chapters || [],
          existingBible: story.storyBible || null,
          model: story.model,
          userId: currentUser?.uid,
          userEmail: currentUser?.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update Story Bible with AI.');
      }

      const updatedBible = await response.json();
      updatedBible.lastUpdatedChapter = story.chapters?.length || 0;

      onStoryUpdated({
        ...story,
        storyBible: updatedBible,
        isUnsaved: true,
      });

      if (onShowAlert) {
        onShowAlert(
          'AI Update Drafted',
          'The Story Bible has been compiled and updated in local memory. Click "Save Draft" or "Save Changes" to save to the database.',
          'info',
        );
      }
    } catch (err: any) {
      console.error(err);
      if (onShowAlert) {
        onShowAlert('AI Update Failed', err.message, 'error');
      }
    } finally {
      setIsUpdatingBible(false);
    }
  };

  // Run Consistency Audit
  const handleRunAudit = async () => {
    if (!isOnline) return;
    if (!story.chapters || story.chapters.length === 0) {
      if (onShowAlert) {
        onShowAlert(
          'Empty Story',
          'Generate some chapters before auditing continuity.',
          'warning',
        );
      }
      return;
    }

    setIsAuditing(true);
    try {
      const response = await fetch('/api/stories/maintenance/run-audit', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: story.language,
          cefrLevel: story.cefrLevel,
          genre: story.genre,
          storyTitle: story.title,
          outline: story.outline || '',
          chapters: story.chapters || [],
          storyBible: story.storyBible || null,
          model: story.model,
          userId: currentUser?.uid,
          userEmail: currentUser?.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute consistency check.');
      }

      const data = await response.json();
      const auditObj: ConsistencyAudit = {
        chapterRange: `Chapters 1-${story.chapters.length}`,
        auditText: data.auditText,
        createdAt: new Date().toISOString(),
      };

      onStoryUpdated({
        ...story,
        consistencyAudits: [...(story.consistencyAudits || []), auditObj],
        isUnsaved: true,
      });

      if (onShowAlert) {
        onShowAlert(
          'Audit Compiled',
          'Continuity report compiled in local memory. Click "Save Draft" or "Save Changes" to save to the database.',
          'info',
        );
      }
    } catch (err: any) {
      console.error(err);
      if (onShowAlert) {
        onShowAlert('Audit Failed', err.message, 'error');
      }
    } finally {
      setIsAuditing(false);
    }
  };

  // Analyze Pacing & Tone
  const handleAnalyzeTone = async () => {
    if (!isOnline) return;
    if (!story.chapters || story.chapters.length === 0) {
      if (onShowAlert) {
        onShowAlert(
          'Empty Story',
          'Generate chapters before analyzing style.',
          'warning',
        );
      }
      return;
    }

    setIsAnalyzingTone(true);
    try {
      const response = await fetch('/api/stories/maintenance/analyze-tone', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: story.language,
          cefrLevel: story.cefrLevel,
          genre: story.genre,
          storyTitle: story.title,
          outline: story.outline || '',
          chapters: story.chapters || [],
          model: story.model,
          userId: currentUser?.uid,
          userEmail: currentUser?.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze tone.');
      }

      const data = await response.json();
      setToneAnalysis(data.analysisText);
      setToneGuidance(data.suggestedRefresh);

      if (onShowAlert) {
        onShowAlert(
          'Analysis Complete',
          'We analyzed the current tone and loaded suggested refresh guidelines.',
          'info',
        );
      }
    } catch (err: any) {
      console.error(err);
      if (onShowAlert) {
        onShowAlert('Tone Analysis Failed', err.message, 'error');
      }
    } finally {
      setIsAnalyzingTone(false);
    }
  };

  // Save manual changes to Tone guidance
  const handleSaveToneGuidance = async () => {
    setIsSavingTone(true);
    try {
      onStoryUpdated({
        ...story,
        toneRefreshGuidance: toneGuidance,
        isUnsaved: true,
      });

      if (onShowAlert) {
        onShowAlert(
          'Draft Updated',
          'Tone & Style guidance updated in local memory. Click "Save Draft" or "Save Changes" to save to the database.',
          'info',
        );
      } else {
        alert(
          'Tone & Style guidance updated in local memory. Click "Save Draft" or "Save Changes" to save to the database.',
        );
      }
    } catch (err: any) {
      console.error(err);
      if (onShowAlert) {
        onShowAlert(
          'Error',
          `Failed to save tone guidance: ${err.message}`,
          'error',
        );
      }
    } finally {
      setIsSavingTone(false);
    }
  };

  // Save manual changes to Story Outline
  const handleSaveOutline = async () => {
    setIsSavingOutline(true);
    try {
      onStoryUpdated({
        ...story,
        outline,
        isUnsaved: true,
      });

      if (onShowAlert) {
        onShowAlert(
          'Draft Updated',
          'Story Outline updated in local memory. Click "Save Draft" or "Save Changes" to save to the database.',
          'info',
        );
      } else {
        alert(
          'Story Outline updated in local memory. Click "Save Draft" or "Save Changes" to save to the database.',
        );
      }
    } catch (err: any) {
      console.error('Failed to save Story Outline:', err);
      if (onShowAlert) {
        onShowAlert(
          'Error',
          `Failed to save Story Outline: ${err.message}`,
          'error',
        );
      }
    } finally {
      setIsSavingOutline(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs navigation */}
      <div className="flex border-b border-tj-border-main pb-px font-sans text-xs">
        <button
          onClick={() => setActiveSubTab('bible')}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'bible'
              ? 'border-tj-success text-tj-success'
              : 'border-transparent text-tj-text-muted hover:text-tj-text-main'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Living Story Bible</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audits')}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'audits'
              ? 'border-tj-success text-tj-success'
              : 'border-transparent text-tj-text-muted hover:text-tj-text-main'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Mirror Audits ({audits.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('tone')}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'tone'
              ? 'border-tj-success text-tj-success'
              : 'border-transparent text-tj-text-muted hover:text-tj-text-main'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Style & Tone Refresh</span>
        </button>

        <button
          onClick={() => setActiveSubTab('outline')}
          className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-semibold transition-colors cursor-pointer ${
            activeSubTab === 'outline'
              ? 'border-tj-success text-tj-success'
              : 'border-transparent text-tj-text-muted hover:text-tj-text-main'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Story Outline</span>
        </button>
      </div>

      {/* SUBTAB: LIVING BIBLE */}
      {activeSubTab === 'bible' && (
        <div className="space-y-6 font-sans">
          {/* Header Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-tj-mint/20 border border-tj-success/20 rounded-xl">
            <div>
              <h4 className="text-xs font-bold text-tj-mint-dark uppercase tracking-wider">
                The Living Bible
              </h4>
              <p className="text-[11px] text-tj-text-muted mt-1 leading-relaxed">
                The Living Bible houses character details, critical rules, and
                unresolved plots. The AI updates this every 5 chapters to keep
                details razor-sharp.
              </p>
              {story.storyBible?.lastUpdatedChapter ? (
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  Last updated at Chapter {story.storyBible.lastUpdatedChapter}
                </p>
              ) : null}
            </div>

            <button
              disabled={isUpdatingBible || !isOnline}
              onClick={handleUpdateBibleWithAI}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-tj-primary hover:bg-tj-primary-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer border-0 shrink-0 disabled:opacity-50"
            >
              {isUpdatingBible ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Drafting Bible...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Update Bible via AI</span>
                </>
              )}
            </button>
          </div>

          {/* Section: Characters */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-tj-border-main pb-2">
              <h5 className="text-xs font-bold uppercase tracking-wide text-tj-text-main">
                Character Profiles
              </h5>
              <button
                type="button"
                onClick={() =>
                  setCharacters([...characters, { name: '', description: '' }])
                }
                className="flex items-center gap-1 text-[10px] font-bold text-tj-primary hover:underline cursor-pointer border-0 bg-transparent"
              >
                <Plus className="w-3 h-3" />
                Add Character
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {characters.map((char, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-tj-border-main bg-tj-bg-recessed/30 rounded-xl space-y-2 relative group"
                >
                  <input
                    type="text"
                    value={char.name}
                    onChange={(e) => {
                      const updated = [...characters];
                      updated[idx] = { ...char, name: e.target.value };
                      setCharacters(updated);
                    }}
                    placeholder="Character Name"
                    className="w-full text-xs font-bold bg-transparent border-b border-tj-border-main focus:border-tj-primary focus:outline-none py-1 pr-8"
                  />
                  <textarea
                    value={char.description}
                    onChange={(e) => {
                      const updated = [...characters];
                      updated[idx] = { ...char, description: e.target.value };
                      setCharacters(updated);
                    }}
                    placeholder="2-3 sentences on emotional state, speech features, and active goals."
                    rows={3}
                    className="w-full text-xs bg-transparent border-0 focus:outline-none resize-none leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setCharacters(characters.filter((_, i) => i !== idx))
                    }
                    className="absolute top-1.5 right-1.5 p-1 text-tj-error hover:bg-tj-error-light rounded transition-colors cursor-pointer border-0 bg-transparent opacity-0 group-hover:opacity-100"
                    title="Delete character"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {characters.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-tj-text-muted border border-dashed border-tj-border-main rounded-xl">
                  No character profiles defined yet. Click "Add Character" or
                  "Update Bible via AI".
                </div>
              )}
            </div>
          </div>

          {/* Section: Rule of Three */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wide text-tj-text-main border-b border-tj-border-main pb-2">
              The Rule of Three (Forbidden Actions & Styles)
            </h5>
            <p className="text-[11px] text-tj-text-muted leading-relaxed">
              Define exactly 3 rules to prevent the AI model from introducing
              undesirable styles or character behavior drift (e.g. "Character X
              never behaves politely with Character Y").
            </p>

            <div className="space-y-2.5">
              {rules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center border border-tj-border-main bg-tj-bg-recessed text-[10px] font-bold font-mono">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={rule}
                    onChange={(e) => {
                      const updated = [...rules];
                      updated[idx] = e.target.value;
                      setRules(updated);
                    }}
                    placeholder={`e.g. Character X never uses flowery language.`}
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-tj-border-main bg-tj-bg-card focus:border-tj-primary focus:outline-none text-tj-text-main"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section: Active Plot Points */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-tj-border-main pb-2">
              <h5 className="text-xs font-bold uppercase tracking-wide text-tj-text-main">
                Active Plot Points (Unresolved Conflicts)
              </h5>
              <button
                type="button"
                onClick={() => setPlotPoints([...plotPoints, ''])}
                className="flex items-center gap-1 text-[10px] font-bold text-tj-primary hover:underline cursor-pointer border-0 bg-transparent"
              >
                <Plus className="w-3 h-3" />
                Add Plot Point
              </button>
            </div>

            <div className="space-y-2">
              {plotPoints.map((point, idx) => (
                <div key={idx} className="flex items-center gap-2 group">
                  <input
                    type="text"
                    value={point}
                    onChange={(e) => {
                      const updated = [...plotPoints];
                      updated[idx] = e.target.value;
                      setPlotPoints(updated);
                    }}
                    placeholder="e.g. Mali needs to find the key to the locked desk in chapter 7."
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-tj-border-main bg-tj-bg-card focus:border-tj-primary focus:outline-none text-tj-text-main"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPlotPoints(plotPoints.filter((_, i) => i !== idx))
                    }
                    className="p-2 text-tj-error hover:bg-tj-error-light rounded transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {plotPoints.length === 0 && (
                <div className="py-8 text-center text-xs text-tj-text-muted border border-dashed border-tj-border-main rounded-xl">
                  No active plot points set. Use these to track ongoing
                  conflicts.
                </div>
              )}
            </div>
          </div>

          {/* Save Action Bar */}
          <div className="pt-4 border-t border-tj-border-main flex items-center justify-end">
            <button
              disabled={isSavingBible}
              onClick={handleSaveBible}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-tj-primary hover:bg-tj-primary-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer border-0"
            >
              {isSavingBible ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Bible...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Bible Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB: MIRROR AUDITS */}
      {activeSubTab === 'audits' && (
        <div className="space-y-6 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-tj-primary-light/50 dark:bg-tj-primary-light/10 border border-tj-primary-border rounded-xl">
            <div className="max-w-xl">
              <h4 className="text-xs font-bold text-tj-text-main uppercase tracking-wider">
                Mirror Audits (Consistency Checks)
              </h4>
              <p className="text-[11px] text-tj-text-muted mt-1 leading-relaxed">
                Consistency Checks run every 10 chapters. The AI evaluates
                current text against Chapter 1 and the Story Bible to highlight
                narrative drifts, out-of-character moments, and tonal variance
                in English.
              </p>
            </div>

            <button
              disabled={isAuditing || !isOnline}
              onClick={handleRunAudit}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-tj-primary hover:bg-tj-primary-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer border-0 shrink-0 disabled:opacity-50"
            >
              {isAuditing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Run Audit Now</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {audits
              .slice()
              .reverse()
              .map((audit, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-tj-border-main bg-tj-bg-card rounded-xl space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-tj-border-main pb-2">
                    <span className="text-xs font-bold text-tj-primary">
                      {audit.chapterRange} Audit Report
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(audit.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-tj-text-main leading-relaxed whitespace-pre-wrap font-sans prose prose-slate dark:prose-invert">
                    {audit.auditText}
                  </div>
                </div>
              ))}

            {audits.length === 0 && (
              <div className="py-12 text-center text-xs text-tj-text-muted border border-dashed border-tj-border-main rounded-xl flex flex-col items-center justify-center gap-2">
                <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                <span>
                  No consistency checks logged yet. Complete Chapter 10 or click
                  "Run Audit Now".
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB: STYLE & TONE REFRESH */}
      {activeSubTab === 'tone' && (
        <div className="space-y-6 font-sans">
          <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Pacing & Tone Refresher
            </h4>
            <p className="text-[11px] text-tj-text-muted leading-relaxed">
              Every 10 chapters, analyze recent chapters and inject new
              style/tone instructions into the prompt. This fights AI pattern
              entrenchment and signals story phase transitions.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-tj-text-main">
                Tone Analysis & Suggested Guidelines
              </label>
              <button
                type="button"
                disabled={isAnalyzingTone || !isOnline}
                onClick={handleAnalyzeTone}
                className="flex items-center gap-1.5 text-[10px] font-bold text-tj-primary hover:underline cursor-pointer border-0 bg-transparent disabled:opacity-50"
              >
                {isAnalyzingTone ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Analyze Current Tone</span>
                  </>
                )}
              </button>
            </div>

            {toneAnalysis && (
              <div className="p-3 bg-tj-bg-recessed rounded-xl border border-tj-border-main text-xs text-tj-text-main leading-relaxed whitespace-pre-wrap">
                <strong>Current Tone Summary:</strong>
                <p className="mt-1 text-tj-text-muted">{toneAnalysis}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-tj-text-muted">
                Active Style/Tone Prompt Injection
              </label>
              <textarea
                value={toneGuidance}
                onChange={(e) => setToneGuidance(e.target.value)}
                placeholder="e.g. Keep the melancholic, historical tone but introduce a sudden sense of dramatic urgency and immediate action to start the new arc."
                rows={4}
                className="w-full text-xs p-3 rounded-xl border border-tj-border-main bg-tj-bg-card focus:border-tj-primary focus:outline-none text-tj-text-main leading-relaxed"
              />
              <p className="text-[10px] text-slate-400">
                This instruction is automatically appended to the chapter prompt
                to guide writing pacing and tone.
              </p>
            </div>
          </div>

          {/* Save Action Bar */}
          <div className="pt-4 border-t border-tj-border-main flex items-center justify-end">
            <button
              disabled={isSavingTone}
              onClick={handleSaveToneGuidance}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-tj-primary hover:bg-tj-primary-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer border-0"
            >
              {isSavingTone ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Guidance...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Tone Guidance</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB: STORY OUTLINE */}
      {activeSubTab === 'outline' && (
        <div className="space-y-6 font-sans">
          <div className="p-4 bg-tj-primary-light/40 dark:bg-slate-800/40 border border-tj-primary-border/50 dark:border-slate-700/60 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-tj-primary dark:text-tj-primary-hover uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              Story Outline
            </h4>
            <p className="text-[11px] text-tj-text-muted leading-relaxed">
              Review and refine the narrative breakdown for remaining chapters.
              The AI writing engine refers to this outline to ensure consistent
              progression when generating next chapters.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-tj-text-main">
                Story Outline (Markdown)
              </label>
            </div>
            <textarea
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
              placeholder="e.g. Chapter 1: ... Chapter 2: ..."
              rows={12}
              className="w-full text-xs p-4 rounded-xl border border-tj-border-main bg-tj-bg-card focus:border-tj-primary focus:outline-none text-tj-text-main font-mono leading-relaxed resize-y"
            />
          </div>

          {/* Save Action Bar */}
          <div className="pt-4 border-t border-tj-border-main flex items-center justify-end">
            <button
              disabled={isSavingOutline}
              onClick={handleSaveOutline}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-tj-primary hover:bg-tj-primary-hover text-white text-xs font-bold rounded-xl transition-all cursor-pointer border-0"
            >
              {isSavingOutline ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Outline...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Outline Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
