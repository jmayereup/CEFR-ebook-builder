import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

const url = process.env.VITE_POCKETBASE_URL;
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!url || !adminEmail || !adminPassword) {
  console.error("Missing required environment variables in .env file.");
  console.error("Required: VITE_POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD");
  process.exit(1);
}

const pb = new PocketBase(url);

async function main() {
  try {
    console.log(`Connecting to PocketBase at: ${url}`);
    console.log(`Authenticating as: ${adminEmail}`);
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    console.log("Successfully authenticated as Admin.");

    console.log("Fetching completed stories...");
    const stories = await pb.collection('stories').getFullList({
      filter: 'isCompleted = true',
    });

    console.log(`Found ${stories.length} completed stories. Scanning for setup data to clean up...`);

    let cleanedCount = 0;
    for (const story of stories) {
      // Check if any of the setup fields have non-empty or non-null content
      const needsCleanup =
        (story.promptNotes && story.promptNotes !== '') ||
        (story.outline && story.outline !== '') ||
        story.storyBible !== null ||
        story.consistencyAudits !== null ||
        (story.toneRefreshGuidance && story.toneRefreshGuidance !== '');

      if (needsCleanup) {
        console.log(`Cleaning up story: "${story.title}" (ID: ${story.id})`);
        await pb.collection('stories').update(story.id, {
          promptNotes: '',
          outline: '',
          storyBible: null,
          consistencyAudits: null,
          toneRefreshGuidance: '',
        });
        cleanedCount++;
      }
    }

    console.log(`\nCleanup task completed!`);
    console.log(`Total completed stories processed: ${stories.length}`);
    console.log(`Stories successfully cleaned: ${cleanedCount}`);
  } catch (err: any) {
    console.error('An error occurred during cleanup:');
    if (err.response) {
      console.error(JSON.stringify(err.response, null, 2));
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

main();
