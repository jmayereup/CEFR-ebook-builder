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
      model = 'deepseek/deepseek-v4-pro',
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
      scifi: 'Science Fiction',
      fantasy: 'Fantasy',
      scifi_fantasy: 'Sci-Fi & Fantasy (Blended)',
      adventure: 'Adventure & Exploration',
      sliceoflife: 'Slice of Life & Culture',
      romance: 'Romance & Drama',
      folklore: 'Folklore & Legend',
      philosophy: 'Spirituality & Philosophy',
      historical: 'Historical Fiction',
      horror: 'Horror & Thriller',
      comedy: 'Comedy & Humor',
      fairy: 'Fairy Tales & Fables',
      nonfiction: 'Non-Fiction',
    };
    const resolvedGenre = genreLabels[genre] || genre;

    let resolvedWritingType = 'narrative';
    let cleanedPromptNotes = promptNotes || '';
    if (promptNotes) {
      const match = promptNotes.match(/\[Writing Type:\s*([^\]]+)\]/i);
      if (match) {
        resolvedWritingType = match[1].trim().toLowerCase();
        cleanedPromptNotes = promptNotes
          .replace(/\[Writing Type:\s*[^\]]+\]/i, '')
          .trim();
      }
    }

    const isNonFiction = genre === 'nonfiction';
    const isHistorical = genre === 'historical';
    const accuracyGuidance = isNonFiction
      ? 'Note: This is a non-fiction work. Please ensure historical and factual accuracy as much as possible, avoiding standard AI hallucinations.'
      : isHistorical
        ? 'Note: This is a historical fiction work. Please ensure the setting, culture, and key historical facts are accurate, avoiding glaring anachronisms.'
        : '';

    let genreGuidance = '';
    if (genre === 'scifi') {
      genreGuidance =
        'Note: This is a pure Science Fiction story. You must strictly avoid any fantasy elements, magic, spells, supernatural occurrences, or mythical creatures unless explicitly requested in the concept notes. Focus on scientific elements, futuristic technology, or space exploration.';
    } else if (genre === 'fantasy') {
      genreGuidance =
        'Note: This is a pure Fantasy story. You must strictly avoid advanced futuristic technology, space travel, or science fiction concepts unless explicitly requested in the concept notes. Focus on magic, mythical creatures, historical/medieval settings, and supernatural events.';
    } else if (genre === 'scifi_fantasy') {
      genreGuidance =
        'Note: This is a blended Science Fiction & Fantasy story. You may combine futuristic technology with magic or mystical elements.';
    } else if (genre === 'horror') {
      genreGuidance =
        'Note: This is a Horror & Thriller story. Build suspense, tension, and a spooky or thrilling atmosphere.';
    } else if (genre === 'comedy') {
      genreGuidance =
        'Note: This is a Comedy & Humor story. Keep the tone light, funny, and entertaining.';
    } else if (genre === 'fairy') {
      genreGuidance =
        'Note: This is a Fairy Tale & Fable. Keep the story whimsical, moral-focused, or classic, suitable for storytelling.';
    }

    const systemInstruction = `You are a talented story architect and bilingual educator tutor.
Write an outline and proposed story title for a learner reading at CEFR ${cefrLevel} level in the language ${language}. 
The text must be written in the style of a "${resolvedWritingType}" text.
${(cefrLevel === 'A1' || cefrLevel === 'Pre-A1') && translationLanguage ? `Since this is a ${cefrLevel} level story, it will be generated in a line-by-line bilingual format (${language} and ${translationLanguage}). Plan the chapters accordingly to be simple, repetitive, and educational.` : ''}
${accuracyGuidance ? `${accuracyGuidance}\n` : ''}${genreGuidance ? `${genreGuidance}\n` : ''}The story will have ${totalChapters} chapters of around ${targetWordCount} words each.

CRITICAL FIDELITY RULE: When the user's concept notes already contain a detailed plan — such as a chapter-by-chapter outline, character maps, specific settings, plot beats, themes, or style notes — you MUST preserve ALL of those specific details in the outline. Never compress, omit, or replace user-specified details with generic summaries. Your job is to faithfully organize, structure, and enrich the user's vision (filling gaps where the user was vague), not to re-invent or shrink it.

LANGUAGE HANDLING: Write the story title and the outline itself in ${language} (the target language). If the user's concept notes are written in another language (e.g., English), render all details into ${language}, establishing exactly one consistent transliteration for each character and place name and reusing it throughout. Only the description field is written in English.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        storyTitle: {
          type: Type.STRING,
          description: `The overarching title of the narrative in ${language}. Appropriate for CEFR ${cefrLevel}.`,
        },
        outline: {
          type: Type.STRING,
          description: `A beautiful, detailed markdown bulleted outline written in ${language}, describing what happens in each of the ${totalChapters} chapters. For each chapter, include the setting, the key plot beats, the characters involved, and the theme. Every specific detail from the user's concept notes (names, places, events, themes, style notes) must appear in the relevant chapter entry — do not compress them away.`,
        },
        description: {
          type: Type.STRING,
          description: `A brief 2-3 sentence synopsis/description of the story in English, suitable for a book back cover or listing card.`,
        },
        ipRisk: {
          type: Type.BOOLEAN,
          description:
            'Set to true ONLY if the story concept clearly references copyrighted material that would normally require permission: established copyrighted fictional characters, copyrighted fictional universes/franchises, close imitations of a living or recently-deceased author\'s distinctive style, or near-verbatim retellings of a copyrighted work. Set to false for everything else, including generic genre tropes (wizards, space travel, vampires), public-domain works (fairy tales, Greek myths, Sherlock Holmes, Dracula, Pride and Prejudice, fairy tales from the public domain), and original characters in genre settings. When in doubt, set to false.',
        },
        ipRiskReason: {
          type: Type.STRING,
          description:
            'If ipRisk is true, give a short English explanation naming the specific copyrighted source (e.g. "Harry Potter fan fiction", "Star Wars fan fiction", "Marvel Cinematic Universe fan fiction"). If ipRisk is false, return an empty string.',
        },
      },
      required: ['storyTitle', 'outline', 'description', 'ipRisk', 'ipRiskReason'],
    };

    const prompt = `Genre: ${resolvedGenre}
Writing Type: ${resolvedWritingType}
Language: ${language}
CEFR Level: ${cefrLevel}
Total Chapters planned: ${totalChapters}
${cleanedPromptNotes ? `Incorporating user concept ideas: "${cleanedPromptNotes}"` : ''}

Draft an overarching narrative outline. For each of the ${totalChapters} chapters, provide a detailed breakdown covering the setting, the key plot beats, the characters involved, and the theme.
IMPORTANT: If the user concept ideas above already contain a detailed plan (a chapter-by-chapter outline, character maps, settings, themes, or style notes), preserve ALL of those specific details in your outline — including character names, locations, and specific plot events — rendered in ${language} with consistent name transliterations. Expand and organize the user's vision chapter by chapter; do NOT summarize it down into generic 1-2 sentence blurbs. Only invent new material to fill gaps the user left unspecified.

COPYRIGHT / IP CLASSIFICATION:
Also assess whether the story concept references established copyrighted material that would normally require the copyright holder's permission. Set "ipRisk" to true ONLY when the concept clearly references:
- Established copyrighted fictional characters (e.g. Harry Potter, Spider-Man, Pikachu, Darth Vader, Elsa from Frozen, Mario)
- Established copyrighted fictional universes or franchises (e.g. Star Wars, Marvel Cinematic Universe, DC Universe, Pokémon, Middle-earth settings beyond public-domain elements, Hogwarts, the Wizarding World)
- A living or recently-deceased author's distinctive style requested by name (e.g. "written in the style of [current bestselling author]")
- A close retelling of a specific copyrighted novel, film, or TV series

Set "ipRisk" to FALSE for:
- Generic genre tropes (wizards, vampires, space travel, dragons, detectives, school settings) without naming a specific copyrighted work
- Public-domain works and characters (Sherlock Holmes, Dracula, Frankenstein, Pride and Prejudice characters, fairy tales from the Brothers Grimm / Hans Christian Andersen / Charles Perrault / public-domain folk tales, Greek/Roman/Norse mythology, King Arthur, Robin Hood, Jane Eyre, A Christmas Carol, Alice in Wonderland's underlying folk-tale motifs are NOT this; Lewis Carroll's specific text is public domain too)
- Original characters in any genre setting
- Real historical events and figures (no copyright on facts)
- Style emulation of long-dead authors whose works are public domain

When in doubt, set ipRisk to false. In "ipRiskReason" briefly name the specific copyrighted source if ipRisk is true, otherwise return an empty string.

Return a beautiful title, the detailed outline, a brief 2-3 sentence English synopsis/description, the ipRisk boolean, and ipRiskReason.`;

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
      maxTokens: 16384,
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
      res.write(
        JSON.stringify({ error: e.message || 'Error drafting outline.' }),
      );
      res.end();
    }
  }
});

export default router;
