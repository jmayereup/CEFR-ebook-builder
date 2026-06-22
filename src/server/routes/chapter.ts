/**
 * POST /api/stories/generate-chapter
 * Generates a story chapter (either the first or a continuation).
 */

import { Router } from 'express';
import { GEMINI_MODELS } from '../../constants/models';
import { cleanJSONString, handleModelCall, Type } from '../lib/aiProviders';

const router = Router();

router.post('/', async (req, res) => {
  let headersSent = false;
  try {
    const {
      language,
      cefrLevel,
      genre,
      totalChapters,
      chapterNumber,
      storyTitle,
      outline,
      chapterGuidance,
      previousChapters,
      promptNotes,
      chapterLength,
      model = 'deepseek/deepseek-v4-flash',
      thinkingLevel,
      thinkingBudget,
      translationLanguage,
      temperature,
      consistencyAudits,
      storyBible,
      toneRefreshGuidance,
      userId,
      userEmail,
    } = req.body as {
      language?: string;
      cefrLevel?: string;
      genre?: string;
      totalChapters?: number;
      chapterNumber?: number;
      storyTitle?: string;
      outline?: string;
      chapterGuidance?: string;
      previousChapters?: Array<{
        chapterNumber: number;
        title: string;
        content: string;
        summary?: string;
        vocabulary?: Array<{
          word: string;
          partOfSpeech?: string;
          definition?: string;
          contextSentence?: string;
        }>;
      }>;
      promptNotes?: string;
      chapterLength?: number;
      model?: string;
      thinkingLevel?: string;
      thinkingBudget?: number;
      translationLanguage?: string;
      temperature?: number;
      storyBible?: any;
      toneRefreshGuidance?: string;
      consistencyAudits?: Array<{
        chapterRange: string;
        auditText: string;
        createdAt: string;
      }>;
      userId?: string;
      userEmail?: string;
    };

    if (!language || !cefrLevel || !genre || !totalChapters || !chapterNumber) {
      return res
        .status(400)
        .json({ error: 'Missing required configuration parameters.' });
    }

    const customOpenRouterKey =
      req.headers['x-openrouter-api-key'] ||
      req.headers['X-OpenRouter-API-Key'];
    const isFirstChapter = chapterNumber === 1;
    const targetWordCount = chapterLength ? Number(chapterLength) : 300;

    const genreLabels: Record<string, string> = {
      mystery: 'Detective & Mystery',
      scifi: 'Sci-Fi & Fantasy',
      adventure: 'Adventure & Exploration',
      sliceoflife: 'Slice of Life & Culture',
      romance: 'Romance & Drama',
      folklore: 'Folklore & Legend',
      philosophy: 'Spirituality & Philosophy',
      historical: 'Historical Fiction',
      nonfiction: 'Non-Fiction',
    };
    const resolvedGenre = genreLabels[genre] || genre;

    const isNonFiction = genre === 'nonfiction';
    const isHistorical = genre === 'historical';
    const accuracyGuidance = isNonFiction
      ? 'Note: This is a non-fiction work. Please ensure historical and factual accuracy as much as possible, avoiding standard AI hallucinations.'
      : isHistorical
        ? 'Note: This is a historical fiction work. Please ensure the setting, culture, and key historical facts are accurate, avoiding glaring anachronisms.'
        : '';

    // Note: vocabulary exclusion is no longer performed here.
    // Glossary generation is fully deferred to post-story completion.

    const systemInstruction = `You are an expert bilingual linguist and a professional story writer. 
Your target is to generate a short story segment (chapter) tailored for learners studying ${language} at the CEFR difficulty level of ${cefrLevel}.
The narrative style must strictly adhere to the ${cefrLevel} CEFR guidelines:
- Pre-A1: Extremely basic vocabulary, minimal sentence structure (2-4 words per sentence), present tense only, very repetitive. Since this is a Pre-A1 level book, it MUST be generated in a line-by-line bilingual format. Each line/sentence in target language (${language}) must be immediately followed by a word-by-word or phrase-by-phrase bilingual translation in the translation language (${translationLanguage || 'English'}). In this translation, map each word or phrase from the translation language directly to its target language counterpart in parentheses. Format each translated line on a new line prefixed with 'Translation:'. Example:
[Target Language line]
Translation: [Translation Language word-by-word/phrase-by-phrase translation with target words in parentheses]
Example: if target is "민수는 일어나요." (Minsu wakes up), the translation line must be:
Translation: Minsu (민수) wakes up (일어나요).
Do not include any key vocabulary extraction or glossary for Pre-A1 bilingual stories.
- A1: Extremely basic, short sentences, simple vocab, present tense only, very repetitive, easy to read. Since this is an A1 level book, it MUST be generated in a line-by-line bilingual format: each line/sentence in target language (${language}) must be immediately followed by its translation in the translation language (${translationLanguage || 'English'}). Format each translated line on a new line prefixed with 'Translation:'. Example:
[Target Language line]
Translation: [Translation Language line]
Do not include any key vocabulary extraction or glossary for A1 bilingual stories.
- A2: Elementary, basic connectors, simple past/present tenses, routine situations, concrete vocabulary.
- B1: Intermediate, moderate structures, complex sentences with basic clauses, narratives of events, feelings, daily experiences.
- B2: Upper-Intermediate, rich vocabulary, clear descriptions of complex situations, varied idiomatic expressions, nuanced narrative structures.
- C1: Advanced, elaborate descriptions, high stylistic expression, diverse grammar structures, metaphors, natural, highly expressive target language.
- C2: Mastery, expert-level native text, highly advanced wordplays, idiomatic mastery.

The chapter must be approximately ${targetWordCount} words long.
${cefrLevel === 'A1' || cefrLevel === 'Pre-A1' ? 'Do NOT select or extract vocabulary terms. Set the vocabulary field to an empty array.' : `You must also select and extract 5 to 10 key vocabulary terms from this chapter. For each term, provide its part of speech, a clear English meaning/definition, its transliteration/pronunciation guide (e.g. romanization/IPA for Thai, pinyin for Chinese, romaji for Japanese, romanization for Korean, or empty for standard space-separated latin languages), and its usage context (a short context sentence or phrase from the text of at most 10 words). Crucially, the contextSentence MUST contain the exact word/phrase as a substring. (Verify this carefully, especially for languages like Thai where words are not space-separated.)`}
${accuracyGuidance ? `\n${accuracyGuidance}` : ''}`;

    // ---------------------------------------------------------------------------
    // Build schema and prompt depending on whether this is chapter 1 or later
    // ---------------------------------------------------------------------------

    let prompt = '';
    let responseSchema: Record<string, unknown> = {};

    const vocabItems = {
      type: Type.OBJECT,
      properties: {
        word: {
          type: Type.STRING,
          description: 'The terms, verbs, or expressions.',
        },
        partOfSpeech: {
          type: Type.STRING,
          description: 'Noun, Verb, Adjective, Idiom, etc.',
        },
        transliteration: {
          type: Type.STRING,
          description:
            'Transliteration, romanization, or pronunciation guide for the word. For example, Romanization/IPA for Thai, Pinyin for Chinese, Romaji/Furigana for Japanese, Romanization for Korean. Provide phonetic help/transliteration for non-Latin scripts, or leave empty if the language is already in Latin script.',
        },
        definition: {
          type: Type.STRING,
          description: 'English translation or explanation of the term.',
        },
        contextSentence: {
          type: Type.STRING,
          description:
            'A short sentence or phrase from the text showing how the word is used, with a maximum of 10 words. Crucially, the sentence MUST contain the exact word/phrase as a substring. Double-check exact spelling matching, especially in non-spaced languages like Thai.',
        },
      },
      required: [
        'word',
        'partOfSpeech',
        'transliteration',
        'definition',
        'contextSentence',
      ],
    };

    const vocabDescription =
      cefrLevel === 'A1' || cefrLevel === 'Pre-A1'
        ? `An empty array []. ${cefrLevel} bilingual stories do not need a vocabulary glossary.`
        : '5 to 10 interesting or key terms from Chapter 1 for review.';

    if (isFirstChapter) {
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          storyTitle: {
            type: Type.STRING,
            description: `The overarching title for the entire story, written in beautiful ${language} appropriate for ${cefrLevel} level. If a title was already chosen or drafted, feel free to use or refine it.`,
          },
          chapterTitle: {
            type: Type.STRING,
            description: `The specific title for Chapter 1, written in ${language}.`,
          },
          content: {
            type: Type.STRING,
            description: `The story narrative of Chapter 1. Approximately ${targetWordCount} words written strictly in ${language} at ${cefrLevel} level.`,
          },
          summary: {
            type: Type.STRING,
            description:
              'A 1-2 sentence English summary of the plot events in this chapter.',
          },
          vocabulary: {
            type: Type.ARRAY,
            items: vocabItems,
            description: vocabDescription,
          },
        },
        required: [
          'storyTitle',
          'chapterTitle',
          'content',
          'summary',
          'vocabulary',
        ],
      };

      prompt = `Start a brand new story written in ${language} at the CEFR ${cefrLevel} difficulty level.
Genre of the story: ${resolvedGenre}
Expected total number of chapters: ${totalChapters}
Chapter details: This is Chapter 1 of ${totalChapters}.
${outline ? `Approved Overarching Outline/Plan to align with:\n${outline}` : ''}
${promptNotes ? `Initial ideas/characters/settings: "${promptNotes}"` : ''}
${chapterGuidance ? `Custom specific guidance for Chapter 1: "${chapterGuidance}"` : ''}

Based on these guidelines, invent an overarching story title (or use "${storyTitle || ''}" if appropriate), a chapter title, the story chapter content (approx. ${targetWordCount} words), a 1-2 sentence English summary of the chapter events, and extract the key terms (leave vocab empty if A1 or Pre-A1).`;
    } else {
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          chapterTitle: {
            type: Type.STRING,
            description: `The specific title for Chapter ${chapterNumber}, written in ${language}.`,
          },
          content: {
            type: Type.STRING,
            description: `The story narrative of Chapter ${chapterNumber}. Approximately ${targetWordCount} words written strictly in ${language} at ${cefrLevel} level, advancing the plot seamlessly.`,
          },
          summary: {
            type: Type.STRING,
            description:
              'A 1-2 sentence English summary of the plot events in this chapter.',
          },
          vocabulary: {
            type: Type.ARRAY,
            items: vocabItems,
            description: vocabDescription,
          },
        },
        required: ['chapterTitle', 'content', 'summary', 'vocabulary'],
      };

      // Build full-text context from all previous chapters (no hybrid summarisation)
      const prevChaptersList = [...(previousChapters ?? [])].sort(
        (a, b) => a.chapterNumber - b.chapterNumber,
      );
      const summaryText = prevChaptersList
        .map(
          (ch) =>
            `Chapter ${ch.chapterNumber}: "${ch.title}" (Full Text):\n${ch.content}`,
        )
        .join('\n\n');

      prompt = `Continue the story titled "${storyTitle}".
Language: ${language}
CEFR level: ${cefrLevel}
Genre: ${resolvedGenre}
This is Chapter ${chapterNumber} of ${totalChapters}.
${outline ? `Pre-approved Story Outline/Plan to follow:\n${outline}` : ''}
${chapterGuidance ? `Custom additional guidance for this Chapter ${chapterNumber}: "${chapterGuidance}"` : ''}

Here is the complete narrative history of all previous chapters:
${summaryText || '(No previous chapters — this is the beginning.)'}

Please write Chapter ${chapterNumber} of ${totalChapters}, ensuring a seamless continuation of the storyline. Make sure the difficulty is perfectly fitted for CEFR ${cefrLevel} level and that the word length remains around ${targetWordCount} words. Extract 5-10 key vocabulary terms (leave vocab empty if A1 or Pre-A1) and provide a 1-2 sentence English summary of the chapter events.`;
    }

    const isBilingual = cefrLevel === 'A1' || cefrLevel === 'Pre-A1';
    const multiplier = isBilingual ? 2.5 : 1.5;
    const estOutputTokens =
      Math.ceil(targetWordCount * 1.33 * multiplier) + 1200;
    const selectedModelObj = GEMINI_MODELS.find((m) => m.id === model);
    const modelMaxOutput = selectedModelObj?.maxOutputTokens ?? 4096;
    const maxTokens = Math.min(Math.max(estOutputTokens, 4096), modelMaxOutput);

    const sendHeartbeat = () => {
      if (!headersSent) {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Transfer-Encoding': 'chunked',
        });
        headersSent = true;
      }
      res.write(' ');
    };

    const responseText = await handleModelCall({
      model,
      systemInstruction,
      prompt,
      responseSchema,
      temperature: typeof temperature === 'number' ? temperature : 0.8,
      thinkingLevel,
      thinkingBudget,
      customOpenRouterKey:
        typeof customOpenRouterKey === 'string'
          ? customOpenRouterKey
          : undefined,
      maxTokens,
      userId,
      userEmail,
      action: 'generate-chapter',
      onHeartbeat: sendHeartbeat,
    });

    const parsedData = JSON.parse(cleanJSONString(responseText || '{}'));

    if (!headersSent) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      });
      headersSent = true;
    }
    res.write(JSON.stringify(parsedData));
    res.end();
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error('Error generating story chapter:', error);
    if (!headersSent) {
      return res
        .status(500)
        .json({ error: e.message || 'Error generating chapter.' });
    } else {
      res.end();
    }
  }
});

export default router;
