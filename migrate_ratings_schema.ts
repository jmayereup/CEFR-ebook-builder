/**
 * Migration script: creates the `story_ratings` collection in PocketBase
 * and migrates existing ratings from the legacy `stories.ratings` JSON field.
 *
 * Fields:
 *   - user    (relation to users, required, cascadeDelete: true)
 *   - story   (relation to stories, required, cascadeDelete: true)
 *   - rating  (number, required, min: 1, max: 5, onlyInt: true)
 *
 * Indexes:
 *   - UNIQUE (story, user)
 *
 * API Rules:
 *   - listRule:   'story.isPublic = true || user = @request.auth.id || story.creatorId = @request.auth.id'
 *   - viewRule:   'story.isPublic = true || user = @request.auth.id || story.creatorId = @request.auth.id'
 *   - createRule: '@request.auth.id != "" && user = @request.auth.id'
 *   - updateRule: '@request.auth.id != "" && user = @request.auth.id'
 *   - deleteRule: '@request.auth.id != "" && user = @request.auth.id'
 *
 * Idempotent: safe to re-run.
 *
 * Usage: npm run migrate:ratings-schema
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import PocketBaseClass from 'pocketbase';

const PocketBase = (PocketBaseClass as any).default || PocketBaseClass;

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.VITE_POCKETBASE_URL || process.env.POCKETBASE_URL;
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

if (!url || !adminEmail || !adminPassword) {
  console.error(
    'Missing required environment variables (VITE_POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD).',
  );
  process.exit(1);
}

const pb = new PocketBase(url);
pb.autoCancellation(false);

async function main() {
  console.log(`Connecting to PocketBase at ${url}...`);
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

  console.log('Fetching users and stories collections...');
  const usersCol = await pb.collections.getOne('users');
  const storiesCol = await pb.collections.getOne('stories');

  let existingCollection: any = null;
  try {
    existingCollection = await pb.collections.getOne('story_ratings');
    console.log(
      `Found existing story_ratings collection (ID: ${existingCollection.id})`,
    );
  } catch {
    console.log('story_ratings collection does not exist yet. Creating...');
  }

  const fields = [
    {
      name: 'user',
      type: 'relation',
      required: true,
      collectionId: usersCol.id,
      cascadeDelete: true,
      maxSelect: 1,
    },
    {
      name: 'story',
      type: 'relation',
      required: true,
      collectionId: storiesCol.id,
      cascadeDelete: true,
      maxSelect: 1,
    },
    {
      name: 'rating',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
      onlyInt: true,
    },
    {
      name: 'created',
      type: 'autodate',
      onCreate: true,
      onUpdate: false,
    },
    {
      name: 'updated',
      type: 'autodate',
      onCreate: true,
      onUpdate: true,
    },
  ];

  const indexes = [
    'CREATE UNIQUE INDEX idx_story_ratings_story_user ON story_ratings (story, user)',
  ];

  const rules = {
    listRule:
      'story.isPublic = true || user = @request.auth.id || story.creatorId = @request.auth.id',
    viewRule:
      'story.isPublic = true || user = @request.auth.id || story.creatorId = @request.auth.id',
    createRule: '@request.auth.id != "" && user = @request.auth.id',
    updateRule: '@request.auth.id != "" && user = @request.auth.id',
    deleteRule: '@request.auth.id != "" && user = @request.auth.id',
  };

  if (!existingCollection) {
    const created = await pb.collections.create({
      name: 'story_ratings',
      type: 'base',
      system: false,
      fields,
      indexes,
      ...rules,
    });
    console.log(
      'Successfully created story_ratings collection with ID:',
      created.id,
    );
  } else {
    console.log('Updating story_ratings collection schema, indexes, and rules...');
    const updated = await pb.collections.update(existingCollection.id, {
      fields,
      indexes,
      ...rules,
    });
    console.log(
      'Successfully updated story_ratings collection ID:',
      updated.id,
    );
  }

  // Migrate existing ratings from stories.ratings JSON field
  console.log('Checking existing stories for legacy ratings to migrate...');
  const [stories, users, existingRatings] = await Promise.all([
    pb.collection('stories').getFullList({ fields: 'id,ratings' }),
    pb.collection('users').getFullList({ fields: 'id' }),
    pb.collection('story_ratings').getFullList({ fields: 'id,story,user,rating' }),
  ]);

  const validUserIds = new Set(users.map((u: any) => u.id));
  const existingMap = new Map<string, any>();
  for (const r of existingRatings) {
    existingMap.set(`${r.story}::${r.user}`, r);
  }

  let migrated = 0;
  let skippedExisting = 0;
  let skippedInvalid = 0;

  for (const story of stories) {
    const ratings = story.ratings as Record<string, number> | null | undefined;
    if (!ratings || typeof ratings !== 'object') continue;

    for (const [userId, rawRating] of Object.entries(ratings)) {
      const ratingNum = Math.round(Number(rawRating));
      if (!validUserIds.has(userId) || ratingNum < 1 || ratingNum > 5) {
        skippedInvalid++;
        console.warn(
          `  Skipping invalid/orphaned rating: story=${story.id} user=${userId} rating=${rawRating}`,
        );
        continue;
      }

      const key = `${story.id}::${userId}`;
      if (existingMap.has(key)) {
        skippedExisting++;
        continue;
      }

      await pb.collection('story_ratings').create({
        story: story.id,
        user: userId,
        rating: ratingNum,
      });
      migrated++;
    }
  }

  console.log(
    `Migration complete! Migrated: ${migrated}, Already existed: ${skippedExisting}, Skipped invalid/orphaned: ${skippedInvalid}`,
  );
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
