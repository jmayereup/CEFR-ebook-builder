/**
 * POST /api/stories/generate-outline
 * Generates a story title and chapter-by-chapter outline.
 */

import { Router } from 'express';
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
      promptNotes,
      chapterLength,
      model = 'deepseek/deepseek-v4-flash',
      thinkingLevel,
      thinkingBudget,
      translationLanguage,
      temperature,
      userId,
      userEmail,
    } = req.body as {
      language?: string;
      cefrLevel?: string;
      genre?: string;
      totalChapters?: number;
      promptNotes?: string;
      chapterLength?: number;
      model?: string;
      thinkingLevel?: string;
      thinkingBudget?: number;
      translationLanguage?: string;
      temperature?: number;
      userId?: string;
      userEmail?: string;
    };

    if (!language || !cefrLevel || !genre || !totalChapters) {
      return res
        .status(400)
        .json({ error: 'Missing required configuration parameters.' });
    }

    const customOpenRouterKey =
      req.headers['x-openrouter-api-key'] ||
      req.headers['X-OpenRouter-API-Key'];
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
      ? 'Note: This is a non-fiction work. Please ensure historical and factual accuracy as much as possible, avoiding standard AI hallucinations.'
      : isHistorical
        ? 'Note: This is a historical fiction work. Please ensure the setting, culture, and key historical facts are accurate, avoiding glaring anachronisms.'
        : '';

    const systemInstruction = `You are a talented story architect and bilingual educator tutor.
Write an outline and proposed story title for a learner reading at CEFR ${cefrLevel} level in the language ${language}. 
The text must be written in the style of a "${resolvedWritingType}" text.
${(cefrLevel === 'A1' || cefrLevel === 'Pre-A1') && translationLanguage ? `Since this is a ${cefrLevel} level story, it will be generated in a line-by-line bilingual format (${language} and ${translationLanguage}). Plan the chapters accordingly to be simple, repetitive, and educational.` : ''}
${accuracyGuidance ? `${accuracyGuidance}\n` : ''}The story will have ${totalChapters} chapters of around ${targetWordCount} words each.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        storyTitle: {
          type: Type.STRING,
          description: `The overarching title of the narrative in ${language}. Appropriate for CEFR ${cefrLevel}.`,
        },
        outline: {
          type: Type.STRING,
          description: `A beautiful detailed markdown bulleted outline describing what happens in each of the ${totalChapters} chapters.`,
        },
        description: {
          type: Type.STRING,
          description: `A brief 2-3 sentence synopsis/description of the story in English, suitable for a book back cover or listing card.`,
        },
      },
      required: ['storyTitle', 'outline', 'description'],
    };

    const prompt = `Genre: ${resolvedGenre}
Writing Type: ${resolvedWritingType}
Language: ${language}
CEFR Level: ${cefrLevel}
Total Chapters planned: ${totalChapters}
${cleanedPromptNotes ? `Incorporating user concept ideas: "${cleanedPromptNotes}"` : ''}

Draft an overarching narrative outline. For each of the ${totalChapters} chapters, provide a brief 1-2 sentence description of the key event and theme. Return a beautiful title, outline, and a brief 2-3 sentence English synopsis/description of the story.`;

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
      userId,
      userEmail,
      action: 'generate-outline',
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
    console.error('Error generating story outline:', error);
    if (!headersSent) {
      return res
        .status(500)
        .json({ error: e.message || 'Error drafting outline.' });
    } else {
      res.end();
    }
  }
});

export default router;
