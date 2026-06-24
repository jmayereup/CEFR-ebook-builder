/**
 * POST /api/stories/generate-batch
 *
 * Generates a batch of chapters (default: 5) in a single LLM call using the
 * full story history as context. Vocabulary extraction is omitted — glossary
 * generation is deferred to a separate post-completion step.
 *
 * Narrative maintenance milestones (Bible, Audit, Tone) are evaluated and run
 * server-side before the batch is generated so the guidance is included in the
 * same call.
 */

import { Router } from 'express';
import { GEMINI_MODELS } from '../../constants/models';
import { countWords } from '../../utils/wordCounter';
import { cleanJSONString, handleModelCall, Type } from '../lib/aiProviders';

const router = Router();

const BATCH_SIZE = 5;

router.post('/', async (req, res) => {
  let headersSent = false;
  try {
    const {
      language,
      cefrLevel,
      genre,
      totalChapters,
      startChapterNumber,
      storyTitle,
      outline,
      promptNotes,
      chapterLength,
      previousChapters,
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
      startChapterNumber?: number;
      storyTitle?: string;
      outline?: string;
      promptNotes?: string;
      chapterLength?: number;
      previousChapters?: Array<{
        chapterNumber: number;
        title: string;
        content: string;
        summary?: string;
      }>;
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

    if (
      !language ||
      !cefrLevel ||
      !genre ||
      !totalChapters ||
      !startChapterNumber
    ) {
      return res
        .status(400)
        .json({ error: 'Missing required configuration parameters.' });
    }

    const customOpenRouterKey =
      req.headers['x-openrouter-api-key'] ||
      req.headers['X-OpenRouter-API-Key'];

    const targetWordCount = chapterLength ? Number(chapterLength) : 300;
    const prevChaptersList = [...(previousChapters ?? [])].sort(
      (a, b) => a.chapterNumber - b.chapterNumber,
    );

    // Calculate how many chapters this batch will produce
    const remaining = totalChapters - (startChapterNumber - 1);
    const batchCount = Math.min(BATCH_SIZE, remaining);

    // Build the numbers for all chapters in this batch
    const batchNumbers = Array.from(
      { length: batchCount },
      (_, i) => startChapterNumber + i,
    );

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

    let resolvedWritingType = 'narrative';
    let cleanedPromptNotes = promptNotes || '';
    if (promptNotes) {
      const match = promptNotes.match(/\[Writing Type:\s*([^\]]+)\]/i);
      if (match) {
        resolvedWritingType = match[1].trim().toLowerCase();
        cleanedPromptNotes = promptNotes.replace(/\[Writing Type:\s*[^\]]+\]/i, '').trim();
      }
    }

    const isNonFiction = genre === 'nonfiction';
    const isHistorical = genre === 'historical';
    const accuracyGuidance = isNonFiction
      ? 'Note: This is a non-fiction work. Please ensure historical and factual accuracy, avoiding AI hallucinations.'
      : isHistorical
        ? 'Note: This is a historical fiction work. Ensure the setting, culture, and key historical facts are accurate, avoiding anachronisms.'
        : '';

    // -------------------------------------------------------------------------
    // Full-context previous chapters (no hybrid summarisation)
    // -------------------------------------------------------------------------
    const fullContextText = prevChaptersList
      .map(
        (ch) =>
          `Chapter ${ch.chapterNumber}: "${ch.title}" (Full Text):\n${ch.content}`,
      )
      .join('\n\n');

    // -------------------------------------------------------------------------
    // CEFR level narrative guidance
    // -------------------------------------------------------------------------
    const levelGuidance: Record<string, string> = {
      'Pre-A1':
        'Extremely basic vocabulary, 2-4 words per sentence, present tense only, very repetitive. Generate in line-by-line bilingual format: each line in target language immediately followed by a "Translation:" line in the translation language with word-by-word mapping.',
      A1: 'Extremely basic, short sentences, simple vocab, present tense only. Generate in line-by-line bilingual format: each line in target language immediately followed by its "Translation:" line.',
      A2: 'Elementary, basic connectors, simple past/present tenses, routine situations, concrete vocabulary.',
      B1: 'Intermediate, moderate structures, complex sentences with basic clauses, narratives of events, feelings, daily experiences.',
      B2: 'Upper-Intermediate, rich vocabulary, clear descriptions of complex situations, varied idiomatic expressions, nuanced narrative structures.',
      C1: 'Advanced, elaborate descriptions, high stylistic expression, diverse grammar structures, metaphors, natural, highly expressive target language.',
      C2: 'Mastery, expert-level native text, highly advanced wordplays, idiomatic mastery.',
    };
    const cefrNarrativeGuide =
      levelGuidance[cefrLevel] ||
      'Standard narrative at the appropriate difficulty level.';

    const isBilingual = cefrLevel === 'A1' || cefrLevel === 'Pre-A1';

    // -------------------------------------------------------------------------
    // System instruction
    // -------------------------------------------------------------------------
    const systemInstruction = `You are an expert bilingual linguist and a professional story writer.
Your task is to generate ${batchCount} consecutive chapters of an ongoing story, written in ${language} at CEFR level ${cefrLevel}.
The text must be written in the style of a "${resolvedWritingType}" text.

Each chapter must be approximately ${targetWordCount} words long.
${cefrNarrativeGuide}
${accuracyGuidance ? `\n${accuracyGuidance}` : ''}

IMPORTANT: You MUST generate exactly ${batchCount} chapters in the correct JSON array structure. Ensure the narrative flows seamlessly from one chapter to the next within the batch, and continues from where the previous chapters ended.`;

    // -------------------------------------------------------------------------
    // Response schema: array of chapters
    // -------------------------------------------------------------------------
    const chapterItem = {
      type: Type.OBJECT,
      properties: {
        chapterNumber: {
          type: Type.INTEGER,
          description: 'The sequential chapter number.',
        },
        chapterTitle: {
          type: Type.STRING,
          description: `The title of this chapter, written in ${language}.`,
        },
        content: {
          type: Type.STRING,
          description: `The story narrative (~${targetWordCount} words) written strictly in ${language} at ${cefrLevel} level.${isBilingual ? ' Must be in line-by-line bilingual format with Translation: prefix on each translated line.' : ''}`,
        },
        summary: {
          type: Type.STRING,
          description:
            'A 1-2 sentence English summary of the plot events in this chapter.',
        },
      },
      required: ['chapterNumber', 'chapterTitle', 'content', 'summary'],
    };

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        chapters: {
          type: Type.ARRAY,
          items: chapterItem,
          description: `An array of exactly ${batchCount} chapter objects in sequential order.`,
        },
      },
      required: ['chapters'],
    };

    // -------------------------------------------------------------------------
    // Prompt
    // -------------------------------------------------------------------------
    const prompt = `Continue the story titled "${storyTitle}".
Language: ${language}
CEFR Level: ${cefrLevel}
Genre: ${resolvedGenre}
Writing Type: ${resolvedWritingType}
${outline ? `Pre-approved Story Outline/Plan to follow:\n${outline}` : ''}
${cleanedPromptNotes ? `Author Notes / Style Guidance: "${cleanedPromptNotes}"` : ''}

Total story chapters: ${totalChapters}
You are now writing Chapters ${batchNumbers[0]} through ${batchNumbers[batchNumbers.length - 1]} of ${totalChapters}.

Here is the complete narrative history of all previous chapters:
${prevChaptersList.length > 0 ? fullContextText : '(This is the beginning of the story — no previous chapters yet.)'}

Please write exactly ${batchCount} new consecutive chapters (Chapters ${batchNumbers[0]}–${batchNumbers[batchNumbers.length - 1]}) as a JSON array. Each chapter must:
- Be approximately ${targetWordCount} words long
- Continue seamlessly from where the story left off
- Be written at CEFR ${cefrLevel} level
- Include a chapter title in ${language} and a 1-2 sentence English summary`;

    // -------------------------------------------------------------------------
    // LLM call
    // -------------------------------------------------------------------------
    const multiplier = isBilingual ? 2.5 : 1.5;
    const estOutputTokens =
      Math.ceil(batchCount * targetWordCount * 1.33 * multiplier) + 1200;
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
      action: 'generate-batch',
      onHeartbeat: sendHeartbeat,
    });

    const parsedData = JSON.parse(cleanJSONString(responseText || '{}'));

    // Normalise: ensure chapterNumber is correct even if model hallucinated
    if (Array.isArray(parsedData.chapters)) {
      const sortedChapters = [...parsedData.chapters].sort((a: any, b: any) => {
        const numA = typeof a.chapterNumber === 'number' ? a.chapterNumber : 0;
        const numB = typeof b.chapterNumber === 'number' ? b.chapterNumber : 0;
        return numA - numB;
      });
      parsedData.chapters = sortedChapters.map((ch: any, idx: number) => ({
        ...ch,
        chapterNumber: batchNumbers[idx] ?? ch.chapterNumber,
        vocabulary: [], // always empty — glossary is deferred
      }));
    }

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
    console.error('Error generating chapter batch:', error);
    if (!headersSent) {
      return res
        .status(500)
        .json({ error: e.message || 'Error generating chapter batch.' });
    } else {
      res.end();
    }
  }
});

export default router;
