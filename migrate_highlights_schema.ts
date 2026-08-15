/**
 * Migration script: creates the story_highlights collection in PocketBase.
 *
 * Fields:
 *   - user            (relation to users, cascadeDelete: true)
 *   - story           (relation to stories, cascadeDelete: true)
 *   - chapterIndex    (number, required)
 *   - paragraphIndex  (number, required)
 *   - startOffset     (number, required)
 *   - endOffset       (number, required)
 *   - text            (text, required)
 *   - color           (text, required)
 *   - note            (text, optional)
 *
 * API Rules:
 *   - listRule:   'user = @request.auth.id'
 *   - viewRule:   'user = @request.auth.id'
 *   - createRule: 'user = @request.auth.id'
 *   - updateRule: 'user = @request.auth.id'
 *   - deleteRule: 'user = @request.auth.id'
 *
 * Idempotent: safe to re-run.
 *
 * Usage: npm run migrate:highlights-schema
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

const pb = new PocketBase(url);

async function main() {
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
    existingCollection = await pb.collections.getOne('story_highlights');
    console.log(
      'Found existing story_highlights collection (ID: ' +
        existingCollection.id +
        ')',
    );
  } catch {
    console.log('story_highlights collection does not exist yet. Creating...');
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
    { name: 'chapterIndex', type: 'number', required: false },
    { name: 'paragraphIndex', type: 'number', required: false },
    { name: 'startOffset', type: 'number', required: false },
    { name: 'endOffset', type: 'number', required: false },
    { name: 'text', type: 'text', required: true },
    { name: 'color', type: 'text', required: true },
    { name: 'note', type: 'text', required: false },
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

  const rules = {
    listRule: 'user = @request.auth.id',
    viewRule: 'user = @request.auth.id',
    createRule: 'user = @request.auth.id',
    updateRule: 'user = @request.auth.id',
    deleteRule: 'user = @request.auth.id',
  };

  if (!existingCollection) {
    const created = await pb.collections.create({
      name: 'story_highlights',
      type: 'base',
      system: false,
      fields,
      ...rules,
    });
    console.log(
      'Successfully created story_highlights collection with ID:',
      created.id,
    );
  } else {
    // Update existing collection rules and ensure fields
    console.log('Updating story_highlights collection rules and fields...');
    const updated = await pb.collections.update(existingCollection.id, {
      fields,
      ...rules,
    });
    console.log(
      'Successfully updated story_highlights collection ID:',
      updated.id,
    );
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
