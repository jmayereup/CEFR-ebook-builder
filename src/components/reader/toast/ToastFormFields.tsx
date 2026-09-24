import type { SelectedWordData } from './types';

interface ToastFormFieldsProps {
  selectedWord: SelectedWordData;
  onChangeWord: (updated: SelectedWordData) => void;
}

export default function ToastFormFields({
  selectedWord,
  onChangeWord,
}: ToastFormFieldsProps) {
  return (
    <div className="flex-1 flex flex-col gap-2.5">
      {/* Translation input */}
      <div className="space-y-1">
        <label
          htmlFor="toast-translation-input"
          className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest"
        >
          Translation
        </label>
        <input
          id="toast-translation-input"
          type="text"
          value={selectedWord.translation}
          onChange={(e) =>
            onChangeWord({
              ...selectedWord,
              translation: e.target.value,
            })
          }
          placeholder="Enter or fetch translation"
          className="w-full text-xs p-2 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main focus:border-tj-primary focus:outline-none"
        />
      </div>

      {/* Tight 2-Column Row: Part of Speech & Definition together */}
      <div className="flex items-center gap-2">
        {/* Part of Speech Select (compact width) */}
        <div className="w-28 sm:w-40 shrink-0 space-y-1">
          <label
            htmlFor="toast-pos-select"
            className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate"
          >
            Part of Speech
          </label>
          <select
            id="toast-pos-select"
            value={selectedWord.partOfSpeech}
            onChange={(e) =>
              onChangeWord({
                ...selectedWord,
                partOfSpeech: e.target.value,
              })
            }
            className="w-full text-xs p-2 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main focus:border-tj-primary focus:outline-none cursor-pointer"
          >
            <option value="Noun">Noun</option>
            <option value="Verb">Verb</option>
            <option value="Adjective">Adjective</option>
            <option value="Adverb">Adverb</option>
            <option value="Preposition">Preposition</option>
            <option value="Pronoun">Pronoun</option>
            <option value="Phrase">Phrase/Idiom</option>
          </select>
        </div>

        {/* Definition Input (fills remaining width) */}
        <div className="flex-1 min-w-0 space-y-1">
          <label
            htmlFor="toast-definition-input"
            className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate"
          >
            Definition (Optional)
          </label>
          <input
            id="toast-definition-input"
            type="text"
            value={selectedWord.definition}
            onChange={(e) =>
              onChangeWord({
                ...selectedWord,
                definition: e.target.value,
              })
            }
            placeholder="e.g. indicates movement / noun form"
            className="w-full text-xs p-2 rounded-xl border border-tj-border-main bg-tj-bg-recessed text-tj-text-main focus:border-tj-primary focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
