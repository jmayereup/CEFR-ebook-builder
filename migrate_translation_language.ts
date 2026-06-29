import { config } from 'dotenv';
import { resolve } from 'path';
import PocketBase from 'pocketbase';

config({ path: resolve(process.cwd(), '.env') });

const url = process.env.VITE_POCKETBASE_URL;
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!url || !adminEmail || !adminPassword) {
  console.error('Missing required environment variables.');
  process.exit(1);
}

const pb = new PocketBase(url);

async function main() {
  try {
    console.log(`Authenticating as ${adminEmail}...`);
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    console.log('Fetching all stories...');
    const stories = await pb.collection('stories').getFullList({
      sort: '-created',
    });

    console.log(`Found ${stories.length} stories in total.`);
    let updatedCount = 0;

    for (const story of stories) {
      if (!story.translationLanguage) {
        console.log(`Updating story "${story.title}" (${story.id}) - setting translationLanguage to "English"`);
        await pb.collection('stories').update(story.id, {
          translationLanguage: 'English',
        });
        updatedCount++;
      }
    }

    console.log(`Successfully updated ${updatedCount} stories.`);
  } catch (err: any) {
    console.error('Migration failed:');
    if (err.response) {
      console.error(JSON.stringify(err.response, null, 2));
    } else {
      console.error(err);
    }
  }
}

main();
