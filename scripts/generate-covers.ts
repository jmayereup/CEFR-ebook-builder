import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
import { resolve } from 'path';
import PocketBaseClass from 'pocketbase';
import sharp from 'sharp';

const TJ_GEN_URL = (
  process.env.TJ_GEN_URL || 'https://gen.teacherjake.com'
).replace(/\/$/, '');

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

if (!url || !adminEmail || !adminPassword) {
  console.error('Missing required environment variables in .env file.');
  console.error(
    'Required: VITE_POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD',
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

      if (story.cover && !isForce) {
        console.log(
          `[SKIP] "${story.title}" (ID: ${story.id}) - Cover already exists in PocketBase (${story.cover}).`,
        );
        continue;
      }

      const coverPath = path.join(COVERS_DIR, `${story.id}.jpg`);

      if (fs.existsSync(coverPath) && !isForce) {
        console.log(
          `[SKIP] "${story.title}" (ID: ${story.id}) - Cover already exists locally.`,
        );
        continue;
      }

      // Check if cover already exists on the remote server
      if (!isForce) {
        const appUrl = (process.env.APP_URL || url || '').replace(/\/$/, '');
        const remoteCoverUrl = `${appUrl}/covers/${story.id}.jpg`;
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

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (openrouterApiKey) {
          headers['x-openrouter-api-key'] = openrouterApiKey;
        }
        if (pb.authStore.isValid && pb.authStore.token) {
          headers['authorization'] = `Bearer ${pb.authStore.token}`;
        } else if (process.env.INTERNAL_SERVICE_KEY) {
          headers['x-service-key'] = process.env.INTERNAL_SERVICE_KEY;
        }

        const response = await fetch(
          `${TJ_GEN_URL}/api/stories/generate-cover`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              storyId: story.id,
              force: isForce,
            }),
          },
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(
            `tj-gen API error (status ${response.status}): ${errText}`,
          );
        }

        const resData = (await response.json()) as any;
        if (resData.success) {
          console.log(
            `[SUCCESS] Cover generated for "${story.title}" via tj-gen.`,
          );
          generatedCount++;
        } else {
          console.error(
            `[ERROR] tj-gen reported failure for "${story.title}":`,
            resData.error,
          );
        }

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
