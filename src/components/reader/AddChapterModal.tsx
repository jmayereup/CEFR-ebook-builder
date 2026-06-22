import { Loader2, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import type { VocabularyTerm } from '../../types';

interface AddChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    title: string,
    content: string,
    vocabulary: VocabularyTerm[],
  ) => Promise<void>;
  language: string;
  cefrLevel: string;
  customOpenRouterKey?: string;
  model?: string;
  nextChapterNumber: number;
}

export default function AddChapterModal({
  isOpen,
  onClose,
  onSave,
  language,
  cefrLevel,
  customOpenRouterKey = '',
  model = 'deepseek/deepseek-v4-flash',
  nextChapterNumber,
}: AddChapterModalProps) {
  const { currentUser } = useAuthStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [vocabulary, setVocabulary] = useState<VocabularyTerm[]>([]);
  const [isGeneratingGlossary, setIsGeneratingGlossary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleGenerateGlossary = async () => {
    if (!content.trim()) {
      setErrorMsg('Please enter chapter content before generating a glossary.');
      return;
    }
    setErrorMsg('');
    setIsGeneratingGlossary(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (customOpenRouterKey) {
        headers['X-OpenRouter-API-Key'] = customOpenRouterKey;
      }

      const response = await fetch('/api/stories/generate-glossary', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: content.trim(),
          language,
          cefrLevel,
          model,
          userId: currentUser?.uid,
          userEmail: currentUser?.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate glossary from server.');
      }

      const data = await response.json();
      if (data.vocabulary) {
        setVocabulary(data.vocabulary);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to generate glossary: ' + err.message);
    } finally {
      setIsGeneratingGlossary(false);
    }
  };

  const handleAddTerm = () => {
    setVocabulary([
      ...vocabulary,
      {
        word: '',
        partOfSpeech: 'Noun',
        definition: '',
        contextSentence: '',
        transliteration: '',
      },
    ]);
  };

  const handleRemoveTerm = (index: number) => {
    setVocabulary(vocabulary.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setErrorMsg('Chapter Title and Content are required.');
      return;
    }
    setErrorMsg('');
    setIsSaving(true);

    try {
      await onSave(title.trim(), content.trim(), vocabulary);
      // Reset state
      setTitle('');
      setContent('');
      setVocabulary([]);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to save chapter: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in select-text">
      <div className="bg-tj-bg-card text-tj-text-main w-full max-w-3xl rounded-2xl border border-tj-border-main shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold font-serif text-slate-900 dark:text-white leading-tight">
              Add Custom Chapter {nextChapterNumber}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Write or paste your custom text for {language} ({cefrLevel}) and
              generate a graded glossary.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-450 hover:text-slate-655 dark:text-slate-450 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors border-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 text-xs bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 rounded-xl">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 font-sans">
              Chapter Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm font-semibold px-3.5 py-2 border border-tj-border-main bg-tj-bg-recessed text-tj-text-main rounded-xl focus:border-tj-primary focus:outline-none"
              placeholder={`Chapter ${nextChapterNumber} Title...`}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 font-sans">
              Chapter Narrative Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full p-4 border border-tj-border-main bg-tj-bg-recessed text-tj-text-main rounded-xl focus:border-tj-primary focus:outline-none resize-y leading-relaxed font-sans text-sm"
              placeholder="Paste or write the story text here..."
            />
          </div>

          {/* Glossary Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 font-sans">
                Vocabulary Glossary ({vocabulary.length} terms)
              </label>
              <button
                type="button"
                disabled={isGeneratingGlossary}
                onClick={handleGenerateGlossary}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-tj-primary-light dark:bg-slate-900 hover:bg-tj-primary-border dark:hover:bg-slate-800 text-tj-primary dark:text-tj-primary-hover font-semibold rounded-xl text-xs cursor-pointer border border-slate-200 dark:border-slate-800 transition-all disabled:opacity-50"
              >
                {isGeneratingGlossary ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Glossary with AI</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[250px] overflow-y-auto p-1 border border-tj-border-main rounded-xl bg-tj-bg-card">
              {vocabulary.map((vocab, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 space-y-2 relative group"
                >
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={vocab.word}
                        onChange={(e) => {
                          const updated = [...vocabulary];
                          updated[index] = { ...vocab, word: e.target.value };
                          setVocabulary(updated);
                        }}
                        className="w-full text-xs px-2 py-1 border border-tj-border-main bg-tj-bg-recessed text-tj-text-main rounded-lg focus:outline-none"
                        placeholder="Word"
                      />
                    </div>
                    <div className="w-full sm:w-24">
                      <input
                        type="text"
                        value={vocab.partOfSpeech}
                        onChange={(e) => {
                          const updated = [...vocabulary];
                          updated[index] = {
                            ...vocab,
                            partOfSpeech: e.target.value,
                          };
                          setVocabulary(updated);
                        }}
                        className="w-full text-xs px-2 py-1 border border-tj-border-main bg-tj-bg-recessed text-tj-text-main rounded-lg focus:outline-none"
                        placeholder="POS"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={vocab.transliteration || ''}
                        onChange={(e) => {
                          const updated = [...vocabulary];
                          updated[index] = {
                            ...vocab,
                            transliteration: e.target.value,
                          };
                          setVocabulary(updated);
                        }}
                        className="w-full text-xs px-2 py-1 border border-tj-border-main bg-tj-bg-recessed text-tj-text-main rounded-lg focus:outline-none"
                        placeholder="Transliteration / Pronunciation"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={vocab.definition}
                      onChange={(e) => {
                        const updated = [...vocabulary];
                        updated[index] = {
                          ...vocab,
                          definition: e.target.value,
                        };
                        setVocabulary(updated);
                      }}
                      className="w-full text-xs px-2 py-1 border border-tj-border-main bg-tj-bg-recessed text-tj-text-main rounded-lg focus:outline-none"
                      placeholder="English Definition"
                    />
                  </div>

                  <div>
                    <textarea
                      value={vocab.contextSentence}
                      onChange={(e) => {
                        const updated = [...vocabulary];
                        updated[index] = {
                          ...vocab,
                          contextSentence: e.target.value,
                        };
                        setVocabulary(updated);
                      }}
                      rows={2}
                      className="w-full text-[10px] p-1.5 border border-tj-border-main bg-tj-bg-recessed text-tj-text-main rounded-lg focus:outline-none resize-none leading-tight"
                      placeholder="Context sentence..."
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveTerm(index)}
                    className="absolute top-1.5 right-1.5 p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg border-0 transition-colors cursor-pointer"
                    title="Delete term"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {vocabulary.length === 0 && (
                <div className="col-span-full py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                  No glossary terms. Click generate above or add one manually.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleAddTerm}
              className="w-full py-2 border border-dashed border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-550 dark:text-slate-400 text-xs font-semibold rounded-xl transition-all cursor-pointer bg-transparent"
            >
              + Add Glossary Term
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/20">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-slate-655 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim() || !content.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-tj-primary hover:bg-tj-primary-hover dark:bg-tj-primary dark:hover:bg-tj-primary-hover text-tj-bg-main dark:text-tj-bg-main text-xs font-bold rounded-xl shadow-sm disabled:opacity-50 transition-all border-0 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Chapter</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
