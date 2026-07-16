import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
import { resolve } from 'path';
import PocketBaseClass from 'pocketbase';
import sharp from 'sharp';

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
      const prompt = `A professional, clean, minimalist flat vector book cover design.
Title text: The image for the book cover must clearly feature the title "${story.title}" written in a clean, legible, and elegant font at the top or center, spelled correctly.
Author text: The image must clearly feature the author name "CEFR Stories" written in a smaller, clean, legible, and elegant font near the bottom, spelled correctly.
Visual style: A cozy, warm, and inviting soft vector illustration (lofi study vibe, pastel colors, clean lines, gentle shading). Flat 2D graphic from edge to edge.
Subject: A simple, serene scene symbolizing the theme of the book (${story.description || story.genre}). Depict this through a single character or a simple symbolic object (e.g. a person reading, walking in nature, or sitting by a window), rather than a literal diagram or depiction of abstract concepts. The image must be a flat 2D graphic with no physical borders. Do not include any other text, random letters, or other author names.`;

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
