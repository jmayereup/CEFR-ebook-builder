import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
import { resolve } from 'path';
import PocketBaseClass from 'pocketbase';
import sharp from 'sharp';
import {
  cleanJSONString,
  handleModelCall,
  Type,
} from '../src/server/lib/aiProviders';

const PocketBase = (PocketBaseClass as any).default || PocketBaseClass;

// Load environment variables from .env files
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.VITE_POCKETBASE_URL;
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const modelId =
  process.env.COVER_IMAGE_MODEL || 'google/gemini-3.1-flash-lite-image';

if (!url || !adminEmail || !adminPassword || !openrouterApiKey) {
  console.error('Missing required environment variables in .env file.');
  console.error(
    'Required: VITE_POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD, OPENROUTER_API_KEY',
  );
  process.exit(1);
}

const pb = new PocketBase(url);

const COVERS_DIR = path.resolve(process.cwd(), 'public', 'covers');

// Parse CLI arguments
const args = process.argv.slice(2);
const isTestRun = args.includes('--test') || args.includes('-t');
const isForce = args.includes('--force') || args.includes('-f');
const storyIndex = args.findIndex((arg) => arg.startsWith('--story='));
const targetStoryId =
  storyIndex !== -1 ? args[storyIndex].split('=')[1] : undefined;
const limitIndex = args.findIndex((arg) => arg.startsWith('--limit='));
const limitVal =
  limitIndex !== -1 ? parseInt(args[limitIndex].split('=')[1], 10) : undefined;
const maxToGenerate = isTestRun ? 2 : limitVal;

// Ensure output directory exists
if (!fs.existsSync(COVERS_DIR)) {
  console.log(`[Init] Creating covers directory at: ${COVERS_DIR}`);
  fs.mkdirSync(COVERS_DIR, { recursive: true });
}

async function main() {
  try {
    console.log(`==================================================`);
    console.log(`Starting Cover Generator CLI`);
    if (isTestRun) console.log(`Mode: TEST RUN (Limit: 2 new covers max)`);
    else if (maxToGenerate)
      console.log(`Mode: LIMITED RUN (Limit: ${maxToGenerate} new covers max)`);
    else console.log(`Mode: FULL RUN (All eligible stories)`);
    console.log(`==================================================`);

    console.log(`Connecting to PocketBase at: ${url}`);
    console.log(`Authenticating as: ${adminEmail}`);
    if (typeof (pb as any).admins !== 'undefined') {
      await (pb as any).admins.authWithPassword(adminEmail, adminPassword);
    } else {
      await pb
        .collection('_superusers')
        .authWithPassword(adminEmail, adminPassword);
    }
    console.log('Successfully authenticated as Admin/Superuser.');

    console.log('Fetching completed stories...');
    const stories = await pb.collection('stories').getFullList({
      filter: 'isCompleted = true',
      sort: '-created',
    });

    console.log(`Found ${stories.length} completed stories.`);

    let generatedCount = 0;

    for (const story of stories) {
      if (targetStoryId && story.id !== targetStoryId) {
        continue;
      }

      if (maxToGenerate !== undefined && generatedCount >= maxToGenerate) {
        console.log(
          `\n[Info] Reached generation limit of ${maxToGenerate}. Stopping execution.`,
        );
        break;
      }

      const coverPath = path.join(COVERS_DIR, `${story.id}.webp`);

      if (fs.existsSync(coverPath) && !isForce) {
        console.log(
          `[SKIP] "${story.title}" (ID: ${story.id}) - Cover already exists locally.`,
        );
        continue;
      }

      // Check if cover already exists on the remote server
      if (!isForce) {
        const appUrl = (process.env.APP_URL || url).replace(/\/$/, '');
        const remoteCoverUrl = `${appUrl}/covers/${story.id}.webp`;
        try {
          const checkRes = await fetch(remoteCoverUrl, { method: 'HEAD' });
          if (checkRes.ok) {
            console.log(
              `[SKIP] "${story.title}" (ID: ${story.id}) - Cover already exists on server (${remoteCoverUrl}).`,
            );
            continue;
          }
        } catch (err: any) {
          console.log(
            `[Warning] Failed to verify remote cover at ${remoteCoverUrl}: ${err.message}`,
          );
        }
      }

      console.log(`\n--------------------------------------------------`);
      console.log(
        `[PROCESS] Generating cover for: "${story.title}" (ID: ${story.id})`,
      );
      console.log(
        `Genre: ${story.genre} | CEFR: ${story.cefrLevel} | Language: ${story.language}`,
      );

      // Formulate a robust prompt to enforce a cozy, flat vector illustration, and strictly forbid
      // technical diagrams, flowcharts, floating icons, and device mockup frames.
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
      const resolvedGenre =
        genreLabels[story.genre] || story.genre || 'General';

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
        console.log(`[Cover Prompt Generator] Successfully generated custom prompt details for "${story.title}".
  Scene: ${sceneDescription}
  Style: ${visualStyle}`);
      } catch (llmErr) {
        console.error(
          `[Cover Prompt Generator] Failed to generate custom prompt with LLM for "${story.title}". Falling back to default genre rules:`,
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

      console.log(`Prompt: "${prompt}"`);
      console.log(`Model: ${modelId}`);

      try {
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
          throw new Error(
            `OpenRouter API error (status ${response.status}): ${errText}`,
          );
        }

        const data = (await response.json()) as any;
        const imageObj = data.data?.[0];

        if (!imageObj) {
          throw new Error(
            `Invalid response format from OpenRouter (no data array found).`,
          );
        }

        let buffer: Buffer;

        if (imageObj.b64_json) {
          console.log(
            `Image generated successfully (returned inline as base64). Converting to buffer...`,
          );
          buffer = Buffer.from(imageObj.b64_json, 'base64');
        } else if (imageObj.url) {
          console.log(
            `Image generated successfully. Downloading from URL: ${imageObj.url}`,
          );
          const imageRes = await fetch(imageObj.url);
          if (!imageRes.ok) {
            throw new Error(
              `Failed to download image from URL: ${imageObj.url}`,
            );
          }
          const arrayBuffer = await imageRes.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        } else {
          throw new Error(
            `Invalid response format: neither url nor b64_json was found in the response.`,
          );
        }

        console.log(
          `Processing image with sharp (crop & resize to 480x672, WebP and JPEG formats)...`,
        );

        const coverJpgPath = path.join(COVERS_DIR, `${story.id}.jpg`);

        // Resize to aspect-[3/4.2] -> 480x672 to match our front-end cover aspect ratio perfectly
        const processed = sharp(buffer).resize(480, 672, {
          fit: 'cover',
          position: 'center',
        });

        await Promise.all([
          processed.clone().webp({ quality: 80 }).toFile(coverPath),
          processed.clone().jpeg({ quality: 85 }).toFile(coverJpgPath),
        ]);

        console.log(
          `[SUCCESS] Saved covers to:\n  - WebP: ${coverPath} (${(fs.statSync(coverPath).size / 1024).toFixed(1)} KB)\n  - JPEG: ${coverJpgPath} (${(fs.statSync(coverJpgPath).size / 1024).toFixed(1)} KB)`,
        );
        generatedCount++;

        // Add a small delay between requests to avoid overloading the API
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err: any) {
        console.error(
          `[ERROR] Failed to generate cover for "${story.title}":`,
          err.message || err,
        );
      }
    }

    console.log(`\n==================================================`);
    console.log(`Cover generation run completed!`);
    console.log(`Total new covers generated: ${generatedCount}`);
  } catch (err: any) {
    console.error('An error occurred during cover generation:');
    console.error(err);
    process.exit(1);
  }
}

main();
