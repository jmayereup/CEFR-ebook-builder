import { config } from 'dotenv';
import { resolve } from 'path';
import PocketBaseClass from 'pocketbase';

const PocketBase = (PocketBaseClass as any).default || PocketBaseClass;

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.VITE_POCKETBASE_URL;
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!url || !adminEmail || !adminPassword) {
  console.error('Missing env vars.');
  process.exit(1);
}

async function main() {
  const pb = new PocketBase(url);
  if (typeof (pb as any).admins !== 'undefined') {
    await (pb as any).admins.authWithPassword(adminEmail, adminPassword);
  } else {
    await pb
      .collection('_superusers')
      .authWithPassword(adminEmail, adminPassword);
  }

  const stories = await pb.collection('stories').getFullList({
    filter: 'title ~ "Elena"',
  });

  console.log('Matching stories:');
  for (const s of stories) {
    console.log(`ID: ${s.id} | Title: ${s.title} | Genre: ${s.genre}`);
  }
}

main();
