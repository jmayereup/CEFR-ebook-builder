import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const pbUrl = process.env.VITE_POCKETBASE_URL || 'https://blog.teacherjake.com';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

async function main() {
  const pb = new PocketBase(pbUrl);
  await pb.admins.authWithPassword(adminEmail, adminPassword);

  const checkIds = ['qkci03ebhtv8t3u'];
  for (const id of checkIds) {
    try {
      const record = await pb.collection('stories').getOne(id);
      console.log(`ID: ${id} -> Found!`);
      console.log('Record details:', {
        id: record.id,
        title: record.title,
        creatorId: record.creatorId,
        creatorEmail: record.creatorEmail,
        isPublic: record.isPublic,
      });
    } catch (err) {
      console.log(`ID: ${id} -> Error:`, err.message || err);
    }
  }
}

main().catch(console.error);
