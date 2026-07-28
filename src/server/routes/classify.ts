/**
 * POST /api/stories/classify-ip
 * Lightweight copyright/IP risk classification for story content that did not
 * pass through the outline-generation pipeline (e.g. scratch-mode stories
 * with manually written outlines). Uses a cheap flash model.
 */

import { Router } from 'express';
import { cleanJSONString, handleModelCall, Type } from '../lib/aiProviders';

const router = Router();

const CLASSIFIER_MODEL =
  process.env.IP_CLASSIFIER_MODEL || 'google/gemini-3.6-flash';

router.post('/', async (req, res) => {
  try {
    const { title, outline, description, promptNotes, model } = req.body as {
      title?: string;
      outline?: string;
      description?: string;
      promptNotes?: string;
      model?: string;
    };

    const contentToClassify = [title, description, outline, promptNotes]
      .filter(Boolean)
      .join('\n\n')
      .trim();

    if (!contentToClassify) {
      return res.json({ ipRisk: false, ipRiskReason: '' });
    }

    const customOpenRouterKey =
      req.headers['x-openrouter-api-key'] ||
      req.headers['X-OpenRouter-API-Key'];

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        ipRisk: {
          type: Type.BOOLEAN,
          description:
            'true ONLY if the story clearly references copyrighted material that would normally require permission: established copyrighted fictional characters, copyrighted fictional universes/franchises, or near-verbatim retellings of a copyrighted work. false for generic genre tropes, public-domain works, and original ideas. When in doubt, false.',
        },
        ipRiskReason: {
          type: Type.STRING,
          description:
            'If ipRisk is true, briefly name the specific copyrighted source (e.g. "Harry Potter fan fiction"). Otherwise an empty string.',
        },
      },
      required: ['ipRisk', 'ipRiskReason'],
    };

    const systemInstruction = `You are a copyright compliance classifier for a language-learning story library.
Decide whether a story plan references established copyrighted material that would require the copyright holder's permission to publish.

Set "ipRisk" to true ONLY when the content clearly references:
- Established copyrighted fictional characters (e.g. Harry Potter, Spider-Man, Pikachu, Darth Vader, Elsa from Frozen, Mario)
- Established copyrighted fictional universes or franchises (e.g. Star Wars, Marvel Cinematic Universe, DC Universe, Pokémon, Hogwarts / the Wizarding World)
- A close retelling of a specific copyrighted novel, film, or TV series

Set "ipRisk" to FALSE for:
- Generic genre tropes (wizards, vampires, space travel, dragons, detectives, school settings) without naming a specific copyrighted work
- Public-domain works and characters (Sherlock Holmes, Dracula, Frankenstein, Brothers Grimm / Hans Christian Andersen / Charles Perrault fairy tales, Greek/Roman/Norse mythology, King Arthur, Robin Hood, Jane Eyre, Alice in Wonderland, A Christmas Carol)
- Original characters in any genre setting
- Real historical events and figures (no copyright on facts)

When in doubt, set ipRisk to false. In "ipRiskReason", briefly name the specific copyrighted source if ipRisk is true, otherwise return an empty string.`;

    const prompt = `Classify the following story plan:\n\n${contentToClassify.slice(0, 6000)}`;

    const responseText = await handleModelCall({
      model: model || CLASSIFIER_MODEL,
      systemInstruction,
      prompt,
      responseSchema,
      temperature: 0,
      customOpenRouterKey:
        typeof customOpenRouterKey === 'string'
          ? customOpenRouterKey
          : undefined,
      userId: (req.body as any).userId,
      userEmail: (req.body as any).userEmail,
      action: 'classify-ip',
    });

    const parsed = JSON.parse(cleanJSONString(responseText || '{}'));

    res.json({
      ipRisk: parsed.ipRisk === true,
      ipRiskReason:
        typeof parsed.ipRiskReason === 'string' ? parsed.ipRiskReason : '',
    });
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error('Error classifying story IP risk:', error);
    // Fail-open: never block story creation on a classifier outage.
    res.json({ ipRisk: false, ipRiskReason: '' });
  }
});

export default router;
