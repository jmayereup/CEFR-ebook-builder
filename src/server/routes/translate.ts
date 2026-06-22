/**
 * POST /api/translate
 * Translates a clicked word using context from the surrounding paragraph.
 */

import { Router } from 'express';
import { cleanJSONString, handleModelCall, Type } from '../lib/aiProviders';

const router = Router();

// In-memory rate limiting store
interface RateLimitRecord {
  timestamps: number[];
}

const rateLimits = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_LOOKUPS_PER_WINDOW = 30; // Max 30 lookups per minute

// Periodically clean up old rate limit records every 5 minutes to prevent memory leaks
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, record] of rateLimits.entries()) {
      record.timestamps = record.timestamps.filter(
        (time) => now - time < RATE_LIMIT_WINDOW_MS,
      );
      if (record.timestamps.length === 0) {
        rateLimits.delete(ip);
      }
    }
  },
  5 * 60 * 1000,
);

router.post('/', async (req, res) => {
  // Enforce IP-based rate limiting
  const ip =
    (req.headers['x-forwarded-for'] as string) ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown';
  const now = Date.now();

  let record = rateLimits.get(ip);
  if (!record) {
    record = { timestamps: [] };
    rateLimits.set(ip, record);
  }

  // Filter timestamps to only keep those within the window
  record.timestamps = record.timestamps.filter(
    (time) => now - time < RATE_LIMIT_WINDOW_MS,
  );

  if (record.timestamps.length >= MAX_LOOKUPS_PER_WINDOW) {
    return res.status(429).json({
      error:
        'Rate limit exceeded. Please wait a moment before doing more translations.',
    });
  }

  record.timestamps.push(now);

  try {
    const {
      word,
      language,
      context,
      targetLanguage = 'English',
      userId,
      userEmail,
    } = req.body as {
      word?: string;
      language?: string;
      context?: string;
      targetLanguage?: string;
      userId?: string;
      userEmail?: string;
    };

    if (!word || !language) {
      return res.status(400).json({ error: 'Missing word or language.' });
    }

    const customOpenRouterKey =
      req.headers['x-openrouter-api-key'] ||
      req.headers['X-OpenRouter-API-Key'];

    // Try OpenRouter's free Gemma model first, fall back to paid if it fails or returns invalid output
    const primaryModel = 'google/gemma-4-31b-it:free';
    const fallbackModel = 'google/gemma-4-31b-it';

    const systemInstruction = `You are a professional dictionary and language translation assistant. 
Translate the student's selected word into ${targetLanguage} based on its surrounding context if provided. Make it extremely concise and beginner-friendly.`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        translation: {
          type: Type.STRING,
          description: `Direct clear ${targetLanguage} translation of the word.`,
        },
        partOfSpeech: {
          type: Type.STRING,
          description: 'Noun, Verb, Adjective, Adverb, Phrase, etc.',
        },
        definition: {
          type: Type.STRING,
          description: `Detailed but simple definition or explanation (written in ${targetLanguage}) of how the word is used.`,
        },
      },
      required: ['translation', 'partOfSpeech', 'definition'],
    };

    const prompt = `Selected Word: "${word}"
Language: ${language}
${context ? `Surrounding Context sentence/paragraph: "${context}"` : ''}

Provide a precise translation, part of speech, and definition for this word in contemporary ${targetLanguage}.`;

    interface TranslationResult {
      translation: string;
      partOfSpeech: string;
      definition: string;
    }

    let parsedData: TranslationResult | null = null;
    let attemptError: unknown = null;

    try {
      console.log(
        `Attempting dictionary lookup with free model: ${primaryModel}`,
      );
      const responseText = await handleModelCall({
        model: primaryModel,
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
        action: 'translate',
      });

      const parsed = JSON.parse(cleanJSONString(responseText || '{}'));
      if (parsed.translation && parsed.partOfSpeech && parsed.definition) {
        parsedData = parsed as TranslationResult;
      } else {
        throw new Error('Response did not contain all required fields.');
      }
    } catch (err) {
      attemptError = err;
    }

    if (!parsedData) {
      console.warn(
        `Primary translation model ${primaryModel} failed or returned invalid JSON. Falling back to ${fallbackModel}. Error:`,
        attemptError,
      );
      const responseText = await handleModelCall({
        model: fallbackModel,
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
        action: 'translate-fallback',
      });
      parsedData = JSON.parse(cleanJSONString(responseText || '{}'));
    }

    return res.status(200).json(parsedData);
  } catch (error: unknown) {
    const e = error as { message?: string };
    console.error('Error translating word:', error);
    return res
      .status(500)
      .json({ error: e.message || 'Error occurred during translation.' });
  }
});

export default router;
