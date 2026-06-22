/**
 * POST /api/stories/generate-glossary
 * Generates/extracts glossary vocabulary terms from a given text using AI.
 *
 * Supports two modes:
 *  - Single-chapter mode: { content, language, cefrLevel, ... }
 *    → returns { vocabulary: [...] }
 *  - Batch mode: { chapters: [{ chapterNumber, content }, ...], language, cefrLevel, ... }
 *    → returns { chapterVocabulary: { [chapterNumber]: [...] } }
 *
 * The model is always overridden to a cheap/fast model regardless of what the
 * caller sends, since vocabulary extraction does not require a premium model.
 */

import { Router } from 'express';
import { cleanJSONString, handleModelCall, Type } from '../lib/aiProviders';

const router = Router();

// Always use this cheap model for glossary regardless of story model.
const GLOSSARY_MODEL = 'google/gemma-4-31b-it:free';

// Vocabulary schema item (reused for both modes)
const vocabItem = {
  type: Type.OBJECT,
  properties: {
    word: {
      type: Type.STRING,
      description: 'The exact word or phrase from the text.',
    },
    partOfSpeech: {
      type: Type.STRING,
      description: 'Noun, Verb, Adjective, Adverb, Idiom, etc.',
    },
    transliteration: {
      type: Type.STRING,
      description:
        'Transliteration, romanization, or pronunciation guide for the word (e.g. romanization/IPA for Thai, pinyin for Chinese, romaji for Japanese, romanization for Korean). Provide phonetic guide/helper for non-Latin script target languages, or leave empty if the language is already in Latin script.',
    },
    definition: {
      type: Type.STRING,
      description: 'English translation or concise explanation.',
    },
    contextSentence: {
      type: Type.STRING,
      description:
        'A short sentence or phrase from the text showing how the word is used, with a maximum of 10 words. Crucially, it MUST contain the exact word/phrase as a substring. Double-check exact spelling (especially in non-spaced languages like Thai).',
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

router.post('/', async (req, res) => {
  let headersSent = false;
  try {
    const {
      // Single-chapter mode
      content,
      // Batch mode
      chapters,
      // Common
      language,
      cefrLevel,
      existingWords = [],
      userId,
      userEmail,
    } = req.body as {
      content?: string;
      chapters?: Array<{ chapterNumber: number; content: string }>;
      language?: string;
      cefrLevel?: string;
      existingWords?: string[];
      userId?: string;
      userEmail?: string;
    };

    const isBatchMode = Array.isArray(chapters) && chapters.length > 0;

    if (!language || !cefrLevel) {
      return res
        .status(400)
        .json({ error: 'Missing language or cefrLevel parameters.' });
    }
    if (!isBatchMode && !content) {
      return res
        .status(400)
        .json({ error: 'Missing content or chapters parameter.' });
    }

    const customOpenRouterKey =
      req.headers['x-openrouter-api-key'] ||
      req.headers['X-OpenRouter-API-Key'];

    // Base system instruction
    let systemInstruction = `You are an expert bilingual linguist and language teacher. \
Your task is to analyze the provided text and extract key vocabulary terms/phrases suitable \
for a student learning ${language} at the CEFR level ${cefrLevel}.
For each term, you must provide:
- The word/phrase in ${language}.
- The part of speech (Noun, Verb, Adjective, Idiom, etc.).
- A transliteration, romanization, or pronunciation guide (e.g. romanization/IPA for Thai, pinyin for Chinese, romaji for Japanese, romanization for Korean, or empty for standard space-separated latin languages).
- A simple English definition/explanation.
- A short context sentence or phrase from the text showing how it is used (maximum of 10 words). Crucially, the contextSentence MUST contain the exact word/phrase as a substring. (This is especially important for languages like Thai; ensure the word's exact spelling is present in the sentence.)`;

    if (existingWords && existingWords.length > 0) {
      systemInstruction += `\n\nCrucially, avoid selecting any of the following vocabulary words/phrases as they have already been covered in other chapters of this story: ${existingWords.join(', ')}`;
    }

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

    // -------------------------------------------------------------------------
    // BATCH MODE: one LLM call for all chapters
    // -------------------------------------------------------------------------
    if (isBatchMode) {
      const chapterSchema = {
        type: Type.OBJECT,
        properties: {
          chapterNumber: {
            type: Type.INTEGER,
            description: 'The chapter number.',
          },
          vocabulary: {
            type: Type.ARRAY,
            items: vocabItem,
            description:
              'A list of 5 to 10 vocabulary terms extracted from this chapter.',
          },
        },
        required: ['chapterNumber', 'vocabulary'],
      };

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          chapters: {
            type: Type.ARRAY,
            items: chapterSchema,
            description: `An array of exactly ${chapters!.length} chapter vocabulary objects, one per chapter.`,
          },
        },
        required: ['chapters'],
      };

      const chaptersText = chapters!
        .map((ch) => `--- Chapter ${ch.chapterNumber} ---\n${ch.content}`)
        .join('\n\n');

      const prompt = `Language: ${language}
CEFR Difficulty Level: ${cefrLevel}

For each of the ${chapters!.length} chapter(s) below, extract 5 to 10 vocabulary terms/phrases that are relevant, interesting, or challenging for a student at the ${cefrLevel} level. Avoid selecting duplicate words across chapters.

${chaptersText}

Return your response as a JSON array of chapter vocabulary objects.`;

      const responseText = await handleModelCall({
        model: GLOSSARY_MODEL,
        systemInstruction,
        prompt,
        responseSchema,
        temperature: 0.3,
        customOpenRouterKey:
          typeof customOpenRouterKey === 'string'
            ? customOpenRouterKey
            : undefined,
        userId,
        userEmail,
        action: 'generate-glossary-batch',
        onHeartbeat: sendHeartbeat,
      });

      const parsedData = JSON.parse(cleanJSONString(responseText || '{}'));

      // Convert array to map: { [chapterNumber]: vocabulary[] }
      const chapterVocabulary: Record<number, unknown[]> = {};
      if (Array.isArray(parsedData.chapters)) {
        for (const ch of parsedData.chapters) {
          if (typeof ch.chapterNumber === 'number') {
            chapterVocabulary[ch.chapterNumber] = ch.vocabulary ?? [];
          }
        }
      }

      if (!headersSent) {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Transfer-Encoding': 'chunked',
        });
        headersSent = true;
      }
      res.write(JSON.stringify({ chapterVocabulary }));
      res.end();
      return;
    }

    // -------------------------------------------------------------------------
    // SINGLE-CHAPTER MODE (legacy / backward compat)
    // -------------------------------------------------------------------------
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        vocabulary: {
          type: Type.ARRAY,
          items: vocabItem,
          description:
            'A list of 5 to 10 vocabulary terms extracted from the text.',
        },
      },
      required: ['vocabulary'],
    };

    const prompt = `Text to analyze:
"${content}"

Language: ${language}
CEFR Difficulty Level: ${cefrLevel}

Extract 5 to 10 vocabulary terms/phrases that are relevant, interesting, or challenging for a student at the ${cefrLevel} level from the text above. Return them in the requested JSON structure.`;

    const responseText = await handleModelCall({
      model: GLOSSARY_MODEL,
      systemInstruction,
      prompt,
      responseSchema,
      temperature: 0.3,
      customOpenRouterKey:
        typeof customOpenRouterKey === 'string'
          ? customOpenRouterKey
          : undefined,
      userId,
      userEmail,
      action: 'generate-glossary',
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
    console.error('Error generating glossary:', error);
    if (!headersSent) {
      return res
        .status(500)
        .json({ error: e.message || 'Error generating glossary.' });
    } else {
      res.end();
    }
  }
});

export default router;
