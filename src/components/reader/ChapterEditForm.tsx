import {
  AlertCircle,
  X as CloseIcon,
  Loader2,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
// Firestore import removed to operate in-memory
import type { Chapter, Story, VocabularyTerm } from '../../types';

interface ChapterEditFormProps {
  story: Story;
  activeChapter: Chapter;
  activeChapterIndex: number;
  fontSize: number;
  customOpenRouterKey?: string;
  onStoryUpdated?: (story: Story) => void;
  onShowAlert?: (
    title: string,
    message: string,
    type?: 'info' | 'error' | 'warning',
  ) => void;
  onClose: () => void;
}

export default function ChapterEditForm({
  story,
  activeChapter,
  activeChapterIndex,
  fontSize,
  customOpenRouterKey,
  onStoryUpdated,
  onShowAlert,
  onClose,
}: ChapterEditFormProps) {
  const { currentUser } = useAuthStore();
  const [editStoryTitle, setEditStoryTitle] = useState<string>('');
  const [editStoryDescription, setEditStoryDescription] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');
  const [editVocabulary, setEditVocabulary] = useState<VocabularyTerm[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGeneratingGlossary, setIsGeneratingGlossary] =
    useState<boolean>(false);
  const [glossaryError, setGlossaryError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(
    'google/gemma-4-31b-it:free',
  );

  // Sync state if activeChapter changes
  useEffect(() => {
    setEditStoryTitle(story.title);
    setEditStoryDescription(story.description || '');
    setEditTitle(activeChapter.title);
    setEditContent(activeChapter.content);
    setEditVocabulary(activeChapter.vocabulary || []);
  }, [activeChapter, story.title, story.description]);

  const handleGenerateGlossaryFromContent = async (modelId?: string) => {
    if (!editContent.trim()) {
      if (onShowAlert) {
        onShowAlert(
          'Empty Content',
          'Please enter some chapter content first before generating a glossary.',
          'warning',
        );
      } else {
        alert('Please enter some chapter content first.');
      }
      return;
    }

    setIsGeneratingGlossary(true);
    setGlossaryError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (customOpenRouterKey) {
        headers['X-OpenRouter-API-Key'] = customOpenRouterKey;
      }

      const activeModel = modelId || selectedModel;

      const response = await fetch('/api/stories/generate-glossary', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: editContent.trim(),
          language: story.language,
          cefrLevel: story.cefrLevel,
          model: activeModel,
          userId: currentUser?.uid,
          userEmail: currentUser?.email,
          translationLanguage:
            story.translationLanguage ||
            useUIStore.getState().translationTargetLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Failed to generate glossary (status ${response.status}).`,
        );
      }

      const data = await response.json();
      if (data.vocabulary) {
        setEditVocabulary(data.vocabulary);
        setGlossaryError(null);
      }
    } catch (err: any) {
      console.error(err);
      setGlossaryError(
        err.message || 'An error occurred while generating the glossary.',
      );
    } finally {
      setIsGeneratingGlossary(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editStoryTitle.trim()) {
      if (onShowAlert) {
        onShowAlert(
          'Required Fields',
          'Story title cannot be empty.',
          'warning',
        );
      } else {
        alert('Story title cannot be empty.');
      }
      return;
    }
    if (!editTitle.trim() || !editContent.trim()) {
      if (onShowAlert) {
        onShowAlert(
          'Required Fields',
          'Title and content cannot be empty.',
          'warning',
        );
      } else {
        alert('Title and content cannot be empty.');
      }
      return;
    }

    setIsSaving(true);
    try {
      const updatedChapter: Chapter = {
        ...activeChapter,
        title: editTitle.trim(),
        content: editContent.trim(),
        vocabulary: editVocabulary,
      };
      const updatedChapters = story.chapters ? [...story.chapters] : [];
      updatedChapters[activeChapterIndex] = updatedChapter;

      if (onStoryUpdated) {
        onStoryUpdated({
          ...story,
          title: editStoryTitle.trim(),
          description: editStoryDescription.trim(),
          chapters: updatedChapters,
          isUnsaved: true,
        });
      }

      onClose();
    } catch (err: any) {
      console.error('Failed to save chapter edits:', err);
      if (onShowAlert) {
        onShowAlert(
          'Save Failed',
          `Failed to save changes: ${err.message}`,
          'error',
        );
      } else {
        alert(`Failed to save changes: ${err.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 select-text mb-6 font-sans">
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-tj-text-muted mb-1.5">
          Overall Story Title
        </label>
        <input
          type="text"
          value={editStoryTitle}
          onChange={(e) => setEditStoryTitle(e.target.value)}
          className="w-full text-lg font-medium bg-transparent border border-transparent border-b-tj-border-main focus:border-tj-primary focus:rounded focus:outline-none focus:ring-0 transition-all px-1 py-1.5 font-serif"
          placeholder="Story Title"
        />
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-tj-text-muted mb-1.5">
          Overall Story Description
        </label>
        <textarea
          value={editStoryDescription}
          onChange={(e) => setEditStoryDescription(e.target.value)}
          rows={3}
          className="w-full text-sm bg-transparent border border-transparent border-b-tj-border-main focus:border-tj-primary focus:rounded focus:outline-none focus:ring-0 transition-all px-1 py-1.5 font-sans resize-y leading-relaxed"
          placeholder="Story Description"
        />
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-tj-text-muted mb-1.5">
          Chapter Title
        </label>
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full text-lg font-medium bg-transparent border border-transparent border-b-tj-border-main focus:border-tj-primary focus:rounded focus:outline-none focus:ring-0 transition-all px-1 py-1.5 font-serif"
          placeholder="Chapter Title"
        />
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider text-tj-text-muted mb-1.5">
          Chapter Content
        </label>
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          rows={12}
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
          className={`w-full p-2 bg-transparent border border-transparent border-b-tj-border-main focus:border-tj-primary focus:rounded focus:outline-none focus:ring-0 transition-all resize-y font-serif`}
          placeholder="Chapter narrative content..."
        />
      </div>

      {/* Glossary Editor inside Chapter editing */}
      <div className="pt-4 border-t border-tj-border-main space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-tj-text-muted">
            Chapter Glossary Review ({editVocabulary.length} terms)
          </label>
          <button
            type="button"
            disabled={isGeneratingGlossary}
            onClick={handleGenerateGlossaryFromContent}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-tj-primary-light hover:bg-tj-primary-border text-tj-primary font-semibold rounded text-xs cursor-pointer border border-tj-border-main transition-all disabled:opacity-50"
          >
            {isGeneratingGlossary ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Glossary...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Glossary with AI</span>
              </>
            )}
          </button>
        </div>

        {glossaryError && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-955/20 border border-rose-200 dark:border-rose-900/30 rounded-xl space-y-3 font-sans">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Glossary Generation Failed
                </p>
                <p className="text-[10px] text-tj-text-muted mt-0.5 leading-relaxed">
                  {glossaryError}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-rose-100 dark:border-rose-900/20">
              <div className="flex-1">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-tj-border-main bg-tj-bg-recessed text-tj-text-main focus:outline-none cursor-pointer"
                >
                  <option value="google/gemma-4-31b-it:free">
                    Gemma 4 31B (Free)
                  </option>
                  <option value="deepseek/deepseek-v4-flash">
                    DeepSeek V4 Flash
                  </option>
                  <option value="google/gemma-4-31b-it">
                    Gemma 4 31B (Paid)
                  </option>
                  <option value="openrouter/free">OpenRouter Free</option>
                </select>
              </div>
              <button
                type="button"
                disabled={isGeneratingGlossary}
                onClick={() => handleGenerateGlossaryFromContent(selectedModel)}
                className="px-4 py-2 bg-tj-primary hover:bg-tj-primary-hover text-tj-bg-main text-xs font-bold rounded-lg cursor-pointer transition-all disabled:opacity-50 shrink-0 border-0 flex items-center justify-center gap-1.5"
              >
                {isGeneratingGlossary && (
                  <Loader2 className="w-3 h-3 animate-spin" />
                )}
                <span>Retry with Selected Model</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto p-1 border border-tj-border-main rounded bg-tj-bg-main/50">
          {editVocabulary.map((vocab, index) => (
            <div
              key={index}
              className="p-3 rounded border border-tj-border-main bg-tj-bg-card space-y-2 relative group"
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={vocab.word}
                    onChange={(e) => {
                      const updated = [...editVocabulary];
                      updated[index] = {
                        ...vocab,
                        word: e.target.value,
                      };
                      setEditVocabulary(updated);
                    }}
                    className="w-full text-xs bg-transparent border border-transparent border-b-tj-border-main focus:border-tj-primary focus:rounded focus:outline-none focus:ring-0 transition-all px-1 py-0.5"
                    placeholder="Word"
                  />
                </div>
                <div className="w-full sm:w-24">
                  <input
                    type="text"
                    value={vocab.partOfSpeech}
                    onChange={(e) => {
                      const updated = [...editVocabulary];
                      updated[index] = {
                        ...vocab,
                        partOfSpeech: e.target.value,
                      };
                      setEditVocabulary(updated);
                    }}
                    className="w-full text-xs bg-transparent border border-transparent border-b-tj-border-main focus:border-tj-primary focus:rounded focus:outline-none focus:ring-0 transition-all px-1 py-0.5"
                    placeholder="POS (Noun, etc.)"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={vocab.transliteration || ''}
                    onChange={(e) => {
                      const updated = [...editVocabulary];
                      updated[index] = {
                        ...vocab,
                        transliteration: e.target.value,
                      };
                      setEditVocabulary(updated);
                    }}
                    className="w-full text-xs bg-transparent border border-transparent border-b-tj-border-main focus:border-tj-primary focus:rounded focus:outline-none focus:ring-0 transition-all px-1 py-0.5"
                    placeholder="Transliteration / Pronunciation"
                  />
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={vocab.definition}
                  onChange={(e) => {
                    const updated = [...editVocabulary];
                    updated[index] = {
                      ...vocab,
                      definition: e.target.value,
                    };
                    setEditVocabulary(updated);
                  }}
                  className="w-full text-xs bg-transparent border border-transparent border-b-tj-border-main focus:border-tj-primary focus:rounded focus:outline-none focus:ring-0 transition-all px-1 py-0.5"
                  placeholder="English Definition"
                />
              </div>

              <div>
                <textarea
                  value={vocab.contextSentence}
                  onChange={(e) => {
                    const updated = [...editVocabulary];
                    updated[index] = {
                      ...vocab,
                      contextSentence: e.target.value,
                    };
                    setEditVocabulary(updated);
                  }}
                  rows={2}
                  className="w-full text-[10px] bg-transparent border border-transparent border-b-tj-border-main focus:border-tj-primary focus:rounded focus:outline-none focus:ring-0 transition-all p-1 resize-none leading-tight"
                  placeholder="Context Sentence"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditVocabulary(
                    editVocabulary.filter((_, i) => i !== index),
                  );
                }}
                className="absolute top-1.5 right-1.5 p-1 text-tj-error hover:bg-tj-error-light rounded transition-colors cursor-pointer"
                title="Delete term"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {editVocabulary.length === 0 && (
            <div className="col-span-full py-6 text-center text-xs text-tj-text-muted">
              No glossary terms. Click generate above or add one manually below.
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setEditVocabulary([
              ...editVocabulary,
              {
                word: '',
                partOfSpeech: 'Noun',
                definition: '',
                contextSentence: '',
                transliteration: '',
              },
            ]);
          }}
          className="w-full py-2 border border-dashed border-tj-border-main hover:bg-tj-primary-light text-tj-text-muted text-xs font-semibold rounded transition-all cursor-pointer bg-transparent"
        >
          + Add Glossary Term
        </button>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-tj-border-main">
        <button
          disabled={isSaving}
          onClick={handleSaveEdit}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-tj-bg-main bg-tj-primary hover:bg-tj-primary-hover rounded shadow-none disabled:opacity-50 transition-all cursor-pointer border-0"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </>
          )}
        </button>

        <button
          disabled={isSaving}
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-tj-text-muted hover:text-tj-text-main bg-tj-primary-light hover:bg-tj-primary-border border border-tj-border-main rounded transition-all cursor-pointer"
        >
          <CloseIcon className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
}
