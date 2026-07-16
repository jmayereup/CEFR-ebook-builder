import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import PocketBaseClass from 'pocketbase';
import sharp from 'sharp';
import { cleanJSONString, handleModelCall, Type } from '../lib/aiProviders';

const PocketBase = (PocketBaseClass as any).default || PocketBaseClass;

const router = Router();

const COVERS_DIR = path.resolve(process.cwd(), 'public', 'covers');

// Ensure public/covers directory exists
if (!fs.existsSync(COVERS_DIR)) {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
}

router.post('/generate', async (req, res) => {
  try {
    const { storyId, force = false } = req.body;
    if (!storyId) {
      return res.status(400).json({ error: 'Missing storyId.' });
    }

    const coverPath = path.join(COVERS_DIR, `${storyId}.webp`);

    // Skip generation if cover already exists and force is false
    if (fs.existsSync(coverPath) && !force) {
      return res.status(200).json({
        success: true,
        message: 'Cover already exists.',
        url: `/covers/${storyId}.webp`,
      });
    }

    // Authenticate with PocketBase to fetch story details
    const pbUrl = process.env.VITE_POCKETBASE_URL;
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const modelId =
      process.env.COVER_IMAGE_MODEL || 'google/gemini-3.1-flash-lite-image';

    if (!pbUrl || !adminEmail || !adminPassword || !openrouterApiKey) {
      return res.status(500).json({
        error: 'Server is missing configuration for cover generation.',
      });
    }

    const pb = new PocketBase(pbUrl);
    if (typeof (pb as any).admins !== 'undefined') {
      await (pb as any).admins.authWithPassword(adminEmail, adminPassword);
    } else {
      await pb
        .collection('_superusers')
        .authWithPassword(adminEmail, adminPassword);
    }

    // Fetch completed story
    const story = await pb.collection('stories').getOne(storyId);
    if (!story) {
      return res.status(404).json({ error: 'Story not found.' });
    }

    let sceneDescription = '';
    let visualStyle = '';

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
    const resolvedGenre = genreLabels[story.genre] || story.genre || 'General';

    // Default genre fallback mapping
    const fallbackStyles: Record<string, { scene: string; style: string }> = {
      mystery: {
        scene:
          'A mysterious magnifying glass magnifying a clue, a single old key, or a shadow of a person under a streetlamp',
        style:
          'A suspenseful, high-contrast flat vector illustration. Dark navy blue, charcoal gray, and pale amber accents',
      },
      scifi: {
        scene:
          'A futuristic spaceship silhouette travelling past a large ringed planet, or a cosmic starry sky',
        style:
          'A clean retro-futuristic flat vector design. Deep space blacks, cool blues, and vibrant neon purple or cyan accents',
      },
      fantasy: {
        scene:
          'A glowing magical book or amulet, a mystical forest pathway, or a castle silhouette against a full moon',
        style:
          'A whimsical, magical flat vector illustration. Deep emerald greens, rich purples, and glowing golden sparkles',
      },
      scifi_fantasy: {
        scene:
          'A futuristic city rising above a forest of ancient magical trees, or a glowing crystal engine',
        style:
          'A blended science-fantasy flat vector illustration. Mystical violet, deep blue, and shimmering gold colors',
      },
      horror: {
        scene:
          'A spooky dark house silhouette on a hill under a full moon, or a single lantern glowing in a foggy wood',
        style:
          'An eerie, atmospheric flat vector illustration. Dark muted tones, deep crimson red, and stark white highlights',
      },
      adventure: {
        scene:
          'A backpacker standing on a mountain peak looking out at a winding valley, or a compass on a vintage map',
        style:
          'An inspiring, bold flat vector design. Warm earthy tones, forest greens, mountain blues, and golden sunset colors',
      },
      romance: {
        scene:
          'Two silhouettes sharing an umbrella in the rain under a streetlamp, or a cozy cafe table with two cups',
        style:
          'A warm, romantic flat vector illustration. Soft rose pink, warm peach, gentle pastel purples, and soft lighting',
      },
      sliceoflife: {
        scene:
          'A cozy window overlooking a garden, a steaming coffee mug on a table, or a bicycle parked next to a bakery',
        style:
          'A cozy, inviting flat vector illustration. Warm pastel colors, soft earth tones, and gentle lighting',
      },
      folklore: {
        scene:
          'A legendary mythical creature or creature silhouette in a mystical natural setting, or a glowing ancient stone',
        style:
          'A traditional, mythic flat vector design. Deep forest greens, rich browns, and amber tones',
      },
      philosophy: {
        scene:
          'A single green leaf floating on a ripple of water, a quiet stone pathway, or a simple candle flame',
        style:
          'A serene, meditative flat vector design. Soft grays, calm blues, and warm cream colors',
      },
      historical: {
        scene:
          'An old quill pen on parchment paper, a vintage carriage, or a historical town square silhouette',
        style:
          'A nostalgic, classic flat vector design. Sepia tones, deep mahogany, and antique gold colors',
      },
      comedy: {
        scene:
          'A quirky, funny cartoonish animal, a smiling cloud, or an open suitcase with funny objects spilling out',
        style:
          'A lighthearted, playful flat vector illustration. Bright cheerful yellow, sky blue, and vibrant orange colors',
      },
      fairy: {
        scene:
          'A whimsical fairy wand, a tiny house in a mushroom, or a sparkling carriage',
        style:
          'A whimsical, charming flat vector illustration. Soft lavender, powder blue, and magic gold dust accents',
      },
      nonfiction: {
        scene:
          'A clean stack of books, a lightbulb representing an idea, or a globe',
        style:
          'A clean, modern, professional flat vector design. Crisp white, teal, dark navy, and gray tones',
      },
    };

    const fallback = fallbackStyles[story.genre] || {
      scene: `A simple, serene scene symbolizing the theme of the book`,
      style:
        'A cozy, warm, and inviting soft vector illustration. Pastel colors, clean lines, and gentle shading',
    };

    try {
      const textModel = story.model || 'google/gemini-3.1-flash-lite';
      const systemInstruction = `You are a professional graphic designer and book cover illustrator.
Given a book's metadata (title, genre, description, concept notes, outline), create a unique, tailored visual concept for its cover art.
The concept must fit the book's specific theme and genre. Avoid generic ideas. Do NOT suggest a person reading or sitting in front of a window unless it is highly relevant to the story.
Return a JSON object matching the requested schema.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          sceneDescription: {
            type: Type.STRING,
            description:
              'A concise description of the central illustration/subject, tailored to the story (e.g. key characters, settings, or symbolic objects). Do NOT include any text or borders in this description.',
          },
          visualStyle: {
            type: Type.STRING,
            description:
              "Visual art style, color palette, and atmosphere matching the story's genre (e.g. mystical and rich for fantasy, dark and atmospheric for horror, warm and sunny for slice of life).",
          },
        },
        required: ['sceneDescription', 'visualStyle'],
      };

      const promptNotes = story.promptNotes
        ? `User concept notes: "${story.promptNotes}"`
        : '';
      const outlineText = story.outline
        ? `Story outline: "${story.outline}"`
        : '';

      const promptText = `Story Details:
Title: "${story.title}"
Genre: "${resolvedGenre}"
Description: "${story.description || ''}"
${promptNotes}
${outlineText}

Please generate:
1. A concise, specific scene description (sceneDescription) for a minimalist flat vector illustration representing the book's unique story. Focus on a single key character, symbolic object, or setting from the story.
2. A visual style and color palette (visualStyle) that matches the genre and mood of the book.`;

      const responseText = await handleModelCall({
        model: textModel,
        systemInstruction,
        prompt: promptText,
        responseSchema,
        temperature: 0.7,
        userId: story.creatorId,
        userEmail: story.creatorEmail,
        action: 'generate-cover-prompt',
      });

      const parsedData = JSON.parse(cleanJSONString(responseText || '{}'));
      sceneDescription = parsedData.sceneDescription || fallback.scene;
      visualStyle = parsedData.visualStyle || fallback.style;
      console.log(`[Cover Prompt Generator] Successfully generated custom prompt details.
Scene: ${sceneDescription}
Style: ${visualStyle}`);
    } catch (llmErr) {
      console.error(
        '[Cover Prompt Generator] Failed to generate custom prompt with LLM. Falling back to default genre rules:',
        llmErr,
      );
      sceneDescription = fallback.scene;
      visualStyle = fallback.style;
    }

    const prompt = `A professional, clean, minimalist flat vector book cover design.
Title text: The image for the book cover must clearly feature the title "${story.title}" written in a clean, legible, and elegant font at the top or center, spelled correctly.
Author text: The image must clearly feature the author name "CEFR Stories" written in a smaller, clean, legible, and elegant font near the bottom, spelled correctly.
Visual style: ${visualStyle}. Flat 2D graphic from edge to edge.
Subject: ${sceneDescription}. The image must be a flat 2D graphic with no physical borders. Do not include any other text, random letters, or other author names.`;

    const requestBody: any = {
      model: modelId,
      prompt: prompt,
      response_format: 'url',
    };

    if (
      modelId.includes('gemini') ||
      modelId.includes('flux') ||
      modelId.includes('recraft')
    ) {
      requestBody.aspect_ratio = '3:4';
    } else {
      requestBody.size = '1024x1024';
    }

    const response = await fetch('https://openrouter.ai/api/v1/images', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res
        .status(502)
        .json({ error: `OpenRouter API error: ${errText}` });
    }

    const data = (await response.json()) as any;
    const imageObj = data.data?.[0];

    if (!imageObj) {
      return res
        .status(502)
        .json({ error: 'Invalid response from OpenRouter (no image data).' });
    }

    let buffer: Buffer;
    if (imageObj.b64_json) {
      buffer = Buffer.from(imageObj.b64_json, 'base64');
    } else if (imageObj.url) {
      const imageRes = await fetch(imageObj.url);
      if (!imageRes.ok) {
        return res
          .status(502)
          .json({ error: 'Failed to download cover image from URL.' });
      }
      const arrayBuffer = await imageRes.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      return res
        .status(502)
        .json({ error: 'Image data missing from OpenRouter response.' });
    }

    // Process image: crop & resize to 480x672 (aspect-ratio matched)
    const processed = sharp(buffer).resize(480, 672, {
      fit: 'cover',
      position: 'center',
    });

    const coverJpgPath = path.join(COVERS_DIR, `${storyId}.jpg`);

    // Write WebP and JPEG formats concurrently
    await Promise.all([
      processed.clone().webp({ quality: 80 }).toFile(coverPath),
      processed.clone().jpeg({ quality: 85 }).toFile(coverJpgPath),
    ]);

    // Update story record in PocketBase to bump the 'updated' timestamp
    let updatedRecord: any = null;
    try {
      updatedRecord = await pb.collection('stories').update(storyId, {
        description: story.description || '',
      });
    } catch (dbErr) {
      console.error(
        '[Cover Route] Warning: failed to bump story updated timestamp in PocketBase:',
        dbErr,
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Cover generated successfully.',
      url: `/covers/${storyId}.webp`,
      updated: updatedRecord ? updatedRecord.updated : new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Cover Generation Error]:', err);
    return res
      .status(500)
      .json({ error: err.message || 'Internal server error.' });
  }
});

export default router;
