import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
import { resolve } from 'path';
import PocketBaseClass from 'pocketbase';

const PocketBase = (PocketBaseClass as any).default || PocketBaseClass;

// Load environment variables from .env files
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

const pbUrl = process.env.VITE_POCKETBASE_URL || 'https://pb.teacherjake.com';
const cdnUrl = (
  process.env.VITE_COVER_CDN_URL || 'https://files.teacherjake.com'
).replace(/\/+$/, '');
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
const userEmail = process.env.POCKETBASE_EMAIL || adminEmail;
const userPassword = process.env.POCKETBASE_PASSWORD || adminPassword;

const pb = new PocketBase(pbUrl);

const tempCoversDir = path.resolve(process.cwd(), 'temp', 'covers');
const publicCoversDir = path.resolve(process.cwd(), 'public', 'covers');

// Parse CLI flags
const args = process.argv.slice(2);
const isReupload = args.includes('--reupload') || args.includes('--fix');
const isGenerateMissing = args.includes('--generate');
const storyArg = args.find((a) => a.startsWith('--story='));
const targetStoryId = storyArg ? storyArg.split('=')[1] : undefined;

interface StatusReport {
  storyId: string;
  title: string;
  coverField: string | null;
  r2Url: string | null;
  r2Status: 'VALID' | 'MISSING_404' | 'NO_COVER_FIELD' | 'ERROR';
  localCoverPath: string | null;
  actionTaken: string;
}

function findLocalCover(storyId: string, coverField?: string): string | null {
  const possiblePaths = [];

  if (coverField) {
    possiblePaths.push(path.join(tempCoversDir, coverField));
    possiblePaths.push(path.join(publicCoversDir, coverField));
  }

  possiblePaths.push(path.join(tempCoversDir, `${storyId}.jpg`));
  possiblePaths.push(path.join(publicCoversDir, `${storyId}.jpg`));
  possiblePaths.push(path.join(tempCoversDir, `${storyId}.png`));
  possiblePaths.push(path.join(publicCoversDir, `${storyId}.png`));

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

async function checkUrlValid(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (PocketBase-Check/1.0)' },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) return true;
    if (res.status === 405 || res.status === 403) {
      const getRes = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (PocketBase-Check/1.0)',
          Range: 'bytes=0-10',
        },
        signal: AbortSignal.timeout(3000),
      });
      return getRes.ok || getRes.status === 206;
    }
    return false;
  } catch (err) {
    return false;
  }
}

async function main() {
  console.log(`==================================================`);
  console.log(`PocketBase Story Cover Verification & Reupload Tool`);
  console.log(`==================================================`);
  console.log(`PocketBase URL: ${pbUrl}`);
  console.log(`CDN URL:        ${cdnUrl}`);
  console.log(
    `Mode:           ${isReupload ? 'REUPLOAD / FIX' : 'DRY RUN (Use --reupload to upload missing covers)'}`,
  );
  if (targetStoryId) console.log(`Target Story:   ${targetStoryId}`);
  console.log(`==================================================\n`);

  try {
    if (typeof (pb as any).admins !== 'undefined') {
      await (pb as any).admins.authWithPassword(adminEmail, adminPassword);
    } else {
      await pb
        .collection('_superusers')
        .authWithPassword(adminEmail, adminPassword);
    }
    console.log('Authenticated with PocketBase as Admin/Superuser.');
  } catch (err) {
    try {
      await pb.collection('users').authWithPassword(userEmail, userPassword);
      console.log('Authenticated with PocketBase as User.');
    } catch (authErr) {
      console.error('Authentication failed:', authErr);
      process.exit(1);
    }
  }

  console.log('Fetching stories from PocketBase...');
  let filter = '';
  if (targetStoryId) {
    filter = `id = "${targetStoryId}"`;
  }
  const stories = await pb
    .collection('stories')
    .getFullList({ filter, sort: '-created' });
  console.log(`Fetched ${stories.length} stories.\n`);

  const reports: StatusReport[] = [];
  let validCount = 0;
  let missingR2Count = 0;
  let localFoundCount = 0;
  let reuploadedCount = 0;
  let errorCount = 0;

  // Process in concurrent batches of 15 for fast performance
  const BATCH_SIZE = 15;
  for (let i = 0; i < stories.length; i += BATCH_SIZE) {
    const batch = stories.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (story: any) => {
        const collectionId = story.collectionId || 'pbc_232317621';
        const coverField = story.cover || null;
        const localPath = findLocalCover(story.id, story.cover);

        let r2Url: string | null = null;
        let r2Status: StatusReport['r2Status'] = 'NO_COVER_FIELD';
        let actionTaken = 'None';

        if (coverField) {
          r2Url = `${cdnUrl}/${collectionId}/${story.id}/${coverField}`;
          const isValid = await checkUrlValid(r2Url);
          if (isValid) {
            r2Status = 'VALID';
            validCount++;
            actionTaken = 'Verified valid on R2';
          } else {
            r2Status = 'MISSING_404';
            missingR2Count++;
          }
        } else {
          r2Status = 'NO_COVER_FIELD';
          missingR2Count++;
        }

        if (r2Status !== 'VALID') {
          if (localPath) {
            localFoundCount++;
            if (isReupload) {
              try {
                console.log(
                  `[REUPLOAD] Uploading ${localPath} for story ${story.id} ("${story.title}")...`,
                );
                const fileBuf = fs.readFileSync(localPath);
                const ext = path.extname(localPath).toLowerCase();
                const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
                const formData = new FormData();
                formData.append(
                  'cover',
                  new Blob([fileBuf], { type: mimeType }),
                  `${story.id}${ext}`,
                );

                const updated = await pb
                  .collection('stories')
                  .update(story.id, formData);
                reuploadedCount++;
                actionTaken = `Successfully reuploaded (new cover: ${updated.cover})`;
                console.log(`  -> Success! Cover set to: ${updated.cover}`);
              } catch (uploadErr: any) {
                errorCount++;
                actionTaken = `Failed to reupload: ${uploadErr.message || uploadErr}`;
                console.error(
                  `  -> Error reuploading for ${story.id}:`,
                  uploadErr.message || uploadErr,
                );
              }
            } else {
              actionTaken = `Local cover found (${path.basename(localPath)}). Ready for --reupload`;
            }
          } else {
            actionTaken =
              'Missing on R2 & No local cover found. Needs cover generation.';
          }
        }

        reports.push({
          storyId: story.id,
          title: story.title,
          coverField,
          r2Url,
          r2Status,
          localCoverPath: localPath,
          actionTaken,
        });
      }),
    );
  }

  console.log(`\n==================================================`);
  console.log(`SUMMARY REPORT`);
  console.log(`==================================================`);
  console.log(`Total Stories Checked:        ${stories.length}`);
  console.log(`Valid Images on R2:           ${validCount}`);
  console.log(`Missing / Broken Images:      ${missingR2Count}`);
  console.log(`  - Local cover files found:  ${localFoundCount}`);
  console.log(
    `  - Local cover files missing:${missingR2Count - localFoundCount}`,
  );
  if (isReupload) {
    console.log(`Reuploaded to PocketBase/R2:  ${reuploadedCount}`);
    console.log(`Failed Reuploads:             ${errorCount}`);
  }
  console.log(`==================================================\n`);

  const missingOrBroken = reports.filter((r) => r.r2Status !== 'VALID');
  if (missingOrBroken.length > 0) {
    console.log(
      `DETAILS FOR MISSING / BROKEN STORIES (${missingOrBroken.length}):`,
    );
    console.log(`--------------------------------------------------`);
    for (const r of missingOrBroken) {
      console.log(`- Story ID:   ${r.storyId}`);
      console.log(`  Title:      "${r.title}"`);
      console.log(`  Cover Field: ${r.coverField || '(empty)'}`);
      console.log(`  R2 URL:      ${r.r2Url || '(none)'}`);
      console.log(
        `  Local Cover: ${r.localCoverPath ? r.localCoverPath : 'NOT FOUND'}`,
      );
      console.log(`  Status:      ${r.actionTaken}`);
      console.log(`--------------------------------------------------`);
    }
  }

  if (!isReupload && localFoundCount > 0) {
    console.log(
      `\nTo automatically reupload all ${localFoundCount} local cover images to PocketBase/R2, run:`,
    );
    console.log(`  npx tsx scripts/check-and-reupload-covers.ts --reupload\n`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
