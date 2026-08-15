import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
import { resolve } from 'path';
import PocketBaseClass from 'pocketbase';

const PocketBase = (PocketBaseClass as any).default || PocketBaseClass;

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.VITE_POCKETBASE_URL || 'https://pb.teacherjake.com';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'jake@teacherjake.com';
const adminPassword =
  process.env.POCKETBASE_ADMIN_PASSWORD || 'FHgo-uqVSSntM0WPbR_C';
const userEmail = process.env.POCKETBASE_EMAIL || adminEmail;
const userPassword = process.env.POCKETBASE_PASSWORD || adminPassword;

const pb = new PocketBase(url);

const tempCoversDir = path.resolve(process.cwd(), 'temp', 'covers');
const publicCoversDir = path.resolve(process.cwd(), 'public', 'covers');
const COVERS_DIR = fs.existsSync(tempCoversDir)
  ? tempCoversDir
  : publicCoversDir;

async function main() {
  console.log(`==================================================`);
  console.log(`Uploading Local JPEG Covers to PocketBase Record Fields`);
  console.log(`==================================================`);

  try {
    if (typeof (pb as any).admins !== 'undefined') {
      await (pb as any).admins.authWithPassword(adminEmail, adminPassword);
    } else {
      await pb
        .collection('_superusers')
        .authWithPassword(adminEmail, adminPassword);
    }
  } catch (err) {
    console.log('Superuser login failed, trying users collection...');
    await pb.collection('users').authWithPassword(userEmail, userPassword);
  }
  console.log('Authenticated with PocketBase.');

  const files = fs.readdirSync(COVERS_DIR).filter((f) => f.endsWith('.jpg'));
  console.log(`Found ${files.length} JPEG cover files in ${COVERS_DIR}`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const storyId = file.replace(/\.jpg$/, '');
    const filePath = path.join(COVERS_DIR, file);

    try {
      const record = await pb.collection('stories').getOne(storyId);
      if (record.cover) {
        const coll = record.collectionId || 'pbc_232317621';
        const testUrl = `https://files.teacherjake.com/${coll}/${record.id}/${record.cover}`;
        try {
          const checkRes = await fetch(testUrl, { method: 'HEAD' });
          if (checkRes.ok) {
            skippedCount++;
            continue;
          }
        } catch (e) {
          // Fall through to upload
        }
      }

      console.log(
        `[UPLOAD] Uploading cover for story: ${storyId} (${record.title})`,
      );
      const fileBuf = fs.readFileSync(filePath);
      const formData = new FormData();
      formData.append(
        'cover',
        new Blob([fileBuf], { type: 'image/jpeg' }),
        file,
      );

      await pb.collection('stories').update(storyId, formData);
      successCount++;
    } catch (err: any) {
      if (err.status === 404) {
        console.warn(`[SKIP] Story record ${storyId} not found in PocketBase.`);
        skippedCount++;
      } else {
        console.error(
          `[ERROR] Failed to upload cover for story ${storyId}:`,
          err.message || err,
        );
        errorCount++;
      }
    }
  }

  console.log(`==================================================`);
  console.log(`Upload Complete:`);
  console.log(`- Uploaded: ${successCount}`);
  console.log(`- Skipped: ${skippedCount}`);
  console.log(`- Errors: ${errorCount}`);
  console.log(`==================================================`);
}

main().catch((err) => {
  console.error('Fatal upload error:', err);
  process.exit(1);
});
