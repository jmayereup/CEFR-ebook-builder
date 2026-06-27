import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

const url = process.env.VITE_POCKETBASE_URL;
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!url || !adminEmail || !adminPassword) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const pb = new PocketBase(url);

async function main() {
  try {
    console.log(`Authenticating as ${adminEmail}...`);
    await pb.admins.authWithPassword(adminEmail, adminPassword);
    
    console.log("Fetching users collection info...");
    const usersCol = await pb.collections.getOne('users');

    try {
      await pb.collections.delete('saved_words');
      console.log('Deleted existing saved_words collection');
    } catch(e) {}

    console.log("Creating saved_words collection...");
    const collection = await pb.collections.create({
      name: 'saved_words',
      type: 'base',
      system: false,
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersCol.id,
          cascadeDelete: true,
          maxSelect: 1
        },
        { name: 'word', type: 'text', required: true },
        { name: 'partOfSpeech', type: 'text', required: false },
        { name: 'definition', type: 'text', required: true },
        { name: 'contextSentence', type: 'text', required: false },
        { name: 'language', type: 'text', required: false },
        { name: 'transliteration', type: 'text', required: false },
        { name: 'nextReviewDate', type: 'date', required: false },
        { name: 'repetition', type: 'number', required: false },
        { name: 'interval', type: 'number', required: false },
        { name: 'easeFactor', type: 'number', required: false }
      ],
      listRule: 'user = @request.auth.id',
      viewRule: 'user = @request.auth.id',
      createRule: 'user = @request.auth.id',
      updateRule: 'user = @request.auth.id',
      deleteRule: 'user = @request.auth.id'
    });

    console.log('Successfully created saved_words collection with ID:', collection.id);
  } catch (err: any) {
    console.error('Failed to create collection:');
    if (err.response) {
      console.error(JSON.stringify(err.response, null, 2));
    } else {
      console.error(err);
    }
  }
}

main();
