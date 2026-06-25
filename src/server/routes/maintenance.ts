import { Router } from 'express';
import { cleanJSONString, handleModelCall, Type } from '../lib/aiProviders';

const router = Router();

// Endpoint: Update Story Bible
router.post('/update-bible', async (req, res) => {
  try {
    const {
      language,
      cefrLevel,
      genre,
      storyTitle,
      outline,
      chapters,
      existingBible,
      model = 'deepseek/deepseek-v4-flash',
      thinkingLevel,
      thinkingBudget,
      temperature,
      userId,
      userEmail,
    } = req.body;

    if (!language || !cefrLevel || !genre || !storyTitle || !chapters) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const customOpenRouterKey =
      req.headers['x-openrouter-api-key'] ||
      req.headers['X-OpenRouter-API-Key'];

    // Construct prompt summarizing chapters so far
    const sortedChapters = Array.isArray(chapters)
      ? [...chapters].sort(
          (a: any, b: any) => a.chapterNumber - b.chapterNumber,
        )
      : [];
    const chaptersSummary = sortedChapters
      .map(
        (ch: any) =>
          `Chapter ${ch.chapterNumber}: "${ch.title}" (Summary: ${
            ch.summary || `${ch.content?.substring(0, 250)}...`
          })`,
      )
      .join('\n\n');

    const systemInstruction = `You are a professional story editor and narrative continuity architect.
Your task is to analyze the story so far and generate/update the "Story Bible" to prevent character dilution and narrative drift.
This story is written in ${language} at CEFR ${cefrLevel} difficulty, with genre ${genre}.
The Story Bible MUST contain:
1. Character Profiles: Update or create profiles for the main characters. For each character, write 2-3 sentences on their current emotional state, distinct speech patterns, and current goals.
2. The "Rule of Three": Exactly 3 rules of forbidden actions/behaviors (e.g., "Mali never uses formal, flowery language with Gla", "Gla never shows fear in public"). If rules already exist in the existing bible, you may keep, update, or replace them.
3. Active Plot Points: Brief bullet points listing ongoing mysteries or conflicts that haven't been resolved yet.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        characterProfiles: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: {
                type: Type.STRING,
                description:
                  '2-3 sentences on current emotional state, speech patterns, and goals.',
              },
            },
            required: ['name', 'description'],
          },
        },
        rulesOfThree: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            'Exactly 3 rules of forbidden actions or behaviors to maintain consistency.',
        },
        activePlotPoints: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            'List of currently active unresolved plot points, mysteries, or conflicts.',
        },
      },
      required: ['characterProfiles', 'rulesOfThree', 'activePlotPoints'],
    };

    const prompt = `Story Title: "${storyTitle}"
Genre: ${genre}
Language: ${language}
CEFR Level: ${cefrLevel}
Overarching Plan/Outline:
${outline || 'No outline provided.'}

Existing Bible:
${existingBible ? JSON.stringify(existingBible, null, 2) : 'None.'}

Chapters Written So Far:
${chaptersSummary}

Analyze the characters, rules, and plot progression from the chapters above. Update the Character Profiles to reflect their latest emotional states and goals. List exactly 3 forbidden behaviors (Rule of Three), and capture all active unresolved conflicts. Return the structured JSON.`;

    const responseText = await handleModelCall({
      model,
      systemInstruction,
      prompt,
      responseSchema,
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      thinkingLevel,
      thinkingBudget,
      customOpenRouterKey:
        typeof customOpenRouterKey === 'string'
          ? customOpenRouterKey
          : undefined,
      userId,
      userEmail,
      action: 'update-bible',
    });

    const parsedData = JSON.parse(cleanJSONString(responseText || '{}'));
    return res.status(200).json(parsedData);
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error('Error updating story bible:', error);
    return res
      .status(500)
      .json({ error: e.message || 'Error updating story bible.' });
  }
});

// Endpoint: Run Consistency Audit (Mirror Audit)
router.post('/run-audit', async (req, res) => {
  try {
    const {
      language,
      cefrLevel,
      genre,
      storyTitle,
      outline,
      chapters,
      storyBible,
      model = 'deepseek/deepseek-v4-flash',
      thinkingLevel,
      thinkingBudget,
      temperature,
      userId,
      userEmail,
    } = req.body;

    if (!language || !cefrLevel || !genre || !storyTitle || !chapters) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const customOpenRouterKey =
      req.headers['x-openrouter-api-key'] ||
      req.headers['X-OpenRouter-API-Key'];

    // Provide detailed summaries or contents of recent chapters
    const sortedChapters = Array.isArray(chapters)
      ? [...chapters].sort(
          (a: any, b: any) => a.chapterNumber - b.chapterNumber,
        )
      : [];
    const recentChapters = sortedChapters.slice(-10);
    const chaptersText = recentChapters
      .map(
        (ch: any) =>
          `Chapter ${ch.chapterNumber}: "${ch.title}"\nSummary: ${ch.summary || 'N/A'}\nContent excerpt:\n${
            ch.content?.substring(0, 1000) || 'N/A'
          }`,
      )
      .join('\n\n');

    const firstChapter = chapters[0];
    const firstChapterInfo = firstChapter
      ? `Chapter 1: "${firstChapter.title}"\nContent excerpt:\n${firstChapter.content?.substring(0, 1000)}`
      : 'No Chapter 1 provided.';

    const systemInstruction = `You are an expert story continuity auditor.
Your job is to read the Story Bible, the overarching plan, and the text/summaries of the chapters.
Perform a Consistency Check (Mirror Audit) to evaluate whether characters' behavior, speech patterns, and tone in the recent chapters match their initial profiles.
You MUST write the audit results in English.
Keep the tone helpful, constructive, and analytical. Structure your output in clean Markdown.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        auditText: {
          type: Type.STRING,
          description:
            'A detailed consistency audit report in English (markdown format). Identify any moments where characters felt out of character, where tone shifted unnecessarily, or where repetitive phrasing entered.',
        },
      },
      required: ['auditText'],
    };

    const prompt = `Story Title: "${storyTitle}"
Genre: ${genre}
Language: ${language}
CEFR Level: ${cefrLevel}
Overarching Plan/Outline:
${outline || 'No outline provided.'}

Story Bible:
${storyBible ? JSON.stringify(storyBible, null, 2) : 'None.'}

Original Chapter 1 Baseline:
${firstChapterInfo}

Recent Chapters under Audit (Last 10 Chapters):
${chaptersText}

Please compare the recent chapters against Chapter 1 and the Story Bible.
Does Mali or other characters' behavior in the last 10 chapters remain consistent with who they were at the start? Identify any moments where characters felt "out of character", where the tone shifted, or where the writing style has become repetitive. Provide the audit results in English, formatted in Markdown.`;

    const responseText = await handleModelCall({
      model,
      systemInstruction,
      prompt,
      responseSchema,
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      thinkingLevel,
      thinkingBudget,
      customOpenRouterKey:
        typeof customOpenRouterKey === 'string'
          ? customOpenRouterKey
          : undefined,
      userId,
      userEmail,
      action: 'run-audit',
    });

    const parsedData = JSON.parse(cleanJSONString(responseText || '{}'));
    return res.status(200).json(parsedData);
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error('Error running consistency audit:', error);
    return res
      .status(500)
      .json({ error: e.message || 'Error running consistency audit.' });
  }
});

// Endpoint: Analyze Tone & Style
router.post('/analyze-tone', async (req, res) => {
  try {
    const {
      language,
      cefrLevel,
      genre,
      storyTitle,
      outline,
      chapters,
      model = 'deepseek/deepseek-v4-flash',
      thinkingLevel,
      thinkingBudget,
      temperature,
      userId,
      userEmail,
    } = req.body;

    if (!language || !cefrLevel || !genre || !storyTitle || !chapters) {
      return res.status(400).json({ error: 'Missing required parameters.' });
    }

    const customOpenRouterKey =
      req.headers['x-openrouter-api-key'] ||
      req.headers['X-OpenRouter-API-Key'];

    // Analyze tone of the recent chapters (up to last 15)
    const sortedChapters = Array.isArray(chapters)
      ? [...chapters].sort(
          (a: any, b: any) => a.chapterNumber - b.chapterNumber,
        )
      : [];
    const recentChapters = sortedChapters.slice(-15);
    const chaptersSummaries = recentChapters
      .map(
        (ch: any) =>
          `Chapter ${ch.chapterNumber}: "${ch.title}"\nSummary: ${ch.summary || 'N/A'}`,
      )
      .join('\n\n');

    const systemInstruction = `You are a professional writing style and tone analyst.
Your job is to analyze the tone and style of the recent chapters. Summarize it, and suggest a subtle shift or refresh in tone to keep the narrative engaging and prevent repetition.
Write your analysis in English.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        analysisText: {
          type: Type.STRING,
          description:
            'A summary of the current tone, style, and pacing of the recent chapters in English.',
        },
        suggestedRefresh: {
          type: Type.STRING,
          description:
            'A specific writing tone instruction to feed to the AI generator for the next chapters (e.g. "Keep the contemplative tone but introduce a sense of impending change and dramatic tension.")',
        },
      },
      required: ['analysisText', 'suggestedRefresh'],
    };

    const prompt = `Story Title: "${storyTitle}"
Genre: ${genre}
Language: ${language}
CEFR Level: ${cefrLevel}
Overarching Plan/Outline:
${outline || 'No outline provided.'}

Recent Chapters (Last 15):
${chaptersSummaries}

Analyze the tone of these recent chapters. Is the tone contemplative, historical, melancholic, action-packed? Let's suggest how to keep that same tone but introduce a subtle fresh element (e.g. urgency/tension) to signal a shift in the story. Return the JSON object.`;

    const responseText = await handleModelCall({
      model,
      systemInstruction,
      prompt,
      responseSchema,
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      thinkingLevel,
      thinkingBudget,
      customOpenRouterKey:
        typeof customOpenRouterKey === 'string'
          ? customOpenRouterKey
          : undefined,
      userId,
      userEmail,
      action: 'analyze-tone',
    });

    const parsedData = JSON.parse(cleanJSONString(responseText || '{}'));
    return res.status(200).json(parsedData);
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error('Error analyzing tone:', error);
    return res
      .status(500)
      .json({ error: e.message || 'Error analyzing tone.' });
  }
});

export default router;
