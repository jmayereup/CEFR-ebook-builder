/**
 * Programmatic migration: adds performance indexes to the PocketBase `stories` collection.
 *
 * Indexes added:
 *   1. `idx_stories_creator_public` ON `stories (creatorId, isPublic)`
 *      - Optimizes private story lookup by owner (`creatorId = "..." && isPublic = false`)
 *   2. `idx_stories_public_created` ON `stories (isPublic, created)`
 *      - Optimizes metadata cache sync & public listings (`isPublic = true`, `sort: -created`)
 *
 * Idempotent: safe to re-run; existing indexes are detected and skipped.
 *
 * Usage: npx tsx migrate_story_indexes.ts
 */

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
  console.error(
    'Missing required environment variables (VITE_POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD).',
  );
  process.exit(1);
}

const TARGET_INDEXES = [
  'CREATE INDEX idx_stories_creator_public ON stories (creatorId, isPublic)',
  'CREATE INDEX idx_stories_public_created ON stories (isPublic, created)',
];

async function main() {
  console.log(`Connecting to PocketBase at ${url}...`);
  const pb = new PocketBase(url);

  console.log(`Authenticating as ${adminEmail}...`);
  if (typeof (pb as any).admins !== 'undefined') {
    try {
      await (pb as any).admins.authWithPassword(adminEmail, adminPassword);
    } catch {
      await pb
        .collection('_superusers')
        .authWithPassword(adminEmail, adminPassword);
    }
  } else {
    await pb
      .collection('_superusers')
      .authWithPassword(adminEmail, adminPassword);
  }

  console.log('Fetching stories collection schema...');
  const stories = await pb.collections.getOne('stories');

  const currentIndexes: string[] = stories.indexes || [];
  console.log('Current indexes on stories collection:', currentIndexes);

  const missingIndexes = TARGET_INDEXES.filter((targetIdx) => {
    // Standardize spacing to compare robustly
    const targetNormalized = targetIdx.replace(/\s+/g, ' ').toLowerCase();
    return !currentIndexes.some(
      (idx) => idx.replace(/\s+/g, ' ').toLowerCase() === targetNormalized,
    );
  });

  if (missingIndexes.length === 0) {
    console.log('All target indexes already exist on stories collection — skipping migration.');
    return;
  }

  console.log(`Adding ${missingIndexes.length} missing index(es):`);
  for (const idx of missingIndexes) {
    console.log(`  + ${idx}`);
  }

  const updatedIndexes = [...currentIndexes, ...missingIndexes];

  console.log('Updating stories collection schema in PocketBase...');
  await pb.collections.update(stories.id, {
    indexes: updatedIndexes,
  });

  console.log('Successfully updated PocketBase stories collection indexes!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
