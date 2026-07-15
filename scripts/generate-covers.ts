import { config } from 'dotenv';
import { resolve } from 'path';
import PocketBase from 'pocketbase';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Load environment variables from .env files
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.VITE_POCKETBASE_URL;
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const modelId = process.env.COVER_IMAGE_MODEL || 'black-forest-labs/flux.2-klein-4b';

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
const limitIndex = args.findIndex(arg => arg.startsWith('--limit='));
const limitVal = limitIndex !== -1 ? parseInt(args[limitIndex].split('=')[1], 10) : undefined;
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
    else if (maxToGenerate) console.log(`Mode: LIMITED RUN (Limit: ${maxToGenerate} new covers max)`);
    else console.log(`Mode: FULL RUN (All eligible stories)`);
    console.log(`==================================================`);

    console.log(`Connecting to PocketBase at: ${url}`);
    console.log(`Authenticating as: ${adminEmail}`);
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log('Successfully authenticated as Admin.');

    console.log('Fetching completed stories...');
    const stories = await pb.collection('stories').getFullList({
      filter: 'isCompleted = true',
      sort: '-created',
    });

    console.log(`Found ${stories.length} completed stories.`);

    let generatedCount = 0;

    for (const story of stories) {
      if (maxToGenerate !== undefined && generatedCount >= maxToGenerate) {
        console.log(`\n[Info] Reached generation limit of ${maxToGenerate}. Stopping execution.`);
        break;
      }

      const coverPath = path.join(COVERS_DIR, `${story.id}.webp`);

      if (fs.existsSync(coverPath)) {
        console.log(`[SKIP] "${story.title}" (ID: ${story.id}) - Cover already exists.`);
        continue;
      }

      console.log(`\n--------------------------------------------------`);
      console.log(`[PROCESS] Generating cover for: "${story.title}" (ID: ${story.id})`);
      console.log(`Genre: ${story.genre} | CEFR: ${story.cefrLevel} | Language: ${story.language}`);

      // Formulate prompt instructing the model to produce a flat vector illustration suitable for a book cover,
      // clearly printing the title, using clean design.
      const prompt = `A clean, minimalist flat vector illustration for a book cover. The book cover must clearly feature the title "${story.title}" written in a clean, legible, and elegant font at the top or center. Subject: A scene representing ${story.description || story.genre}. Cozy atmosphere, professional artistic illustration, clean design. Ensure the title text is spelled correctly and is highly readable against the background art.`;

      console.log(`Prompt: "${prompt}"`);
      console.log(`Model: ${modelId}`);

      try {
        const requestBody: any = {
          model: modelId,
          prompt: prompt,
          response_format: 'url',
        };

        if (modelId.includes('gemini') || modelId.includes('flux') || modelId.includes('recraft')) {
          requestBody.aspect_ratio = '3:4';
        } else {
          requestBody.size = '1024x1024';
        }

        const response = await fetch('https://openrouter.ai/api/v1/images', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`OpenRouter API error (status ${response.status}): ${errText}`);
        }

        const data = (await response.json()) as any;
        const imageObj = data.data?.[0];

        if (!imageObj) {
          throw new Error(`Invalid response format from OpenRouter (no data array found).`);
        }

        let buffer: Buffer;

        if (imageObj.b64_json) {
          console.log(`Image generated successfully (returned inline as base64). Converting to buffer...`);
          buffer = Buffer.from(imageObj.b64_json, 'base64');
        } else if (imageObj.url) {
          console.log(`Image generated successfully. Downloading from URL: ${imageObj.url}`);
          const imageRes = await fetch(imageObj.url);
          if (!imageRes.ok) {
            throw new Error(`Failed to download image from URL: ${imageObj.url}`);
          }
          const arrayBuffer = await imageRes.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        } else {
          throw new Error(`Invalid response format: neither url nor b64_json was found in the response.`);
        }

        console.log(`Processing image with sharp (crop & resize to 480x672, WebP format)...`);
        
        // Resize to aspect-[3/4.2] -> 480x672 to match our front-end cover aspect ratio perfectly
        await sharp(buffer)
          .resize(480, 672, {
            fit: 'cover',
            position: 'center',
          })
          .webp({ quality: 80 })
          .toFile(coverPath);

        console.log(`[SUCCESS] Saved cover to: ${coverPath} (${(fs.statSync(coverPath).size / 1024).toFixed(1)} KB)`);
        generatedCount++;

        // Add a small delay between requests to avoid overloading the API
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err: any) {
        console.error(`[ERROR] Failed to generate cover for "${story.title}":`, err.message || err);
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
