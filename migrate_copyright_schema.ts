/**
 * One-time schema migration: adds copyright-guard fields to the stories
 * collection and hardens its API rules.
 *
 * Fields added (flat format, PocketBase v0.23+):
 *   - copyrightFlag        (bool)
 *   - copyrightFlagReason  (text)
 *   - copyrightFlagSource  (select: ai | admin | backfill | user)
 *   - copyrightFlaggedAt   (date)
 *
 * Rule changes:
 *   - listRule / viewRule: public records require copyrightFlag != true;
 *     owners and admins can still see everything.
 *   - updateRule: admins unrestricted; owners can edit their own stories but
 *     CANNOT clear copyrightFlag and CANNOT set isPublic = true on a flagged
 *     story.
 *   - createRule / deleteRule: unchanged.
 *
 * Idempotent: safe to re-run; existing fields and already-migrated rules are
 * detected and skipped.
 *
 * Usage: npm run migrate:copyright-schema
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

const NEW_FIELDS: Record<string, unknown>[] = [
  { name: 'copyrightFlag', type: 'bool', required: false },
  { name: 'copyrightFlagReason', type: 'text', required: false, max: 500 },
  {
    name: 'copyrightFlagSource',
    type: 'select',
    required: false,
    maxSelect: 1,
    values: ['ai', 'admin', 'backfill', 'user'],
  },
  { name: 'copyrightFlaggedAt', type: 'date', required: false },
];

async function main() {
  console.log(`Authenticating as ${adminEmail}...`);
  if (typeof (pb as any).admins !== 'undefined') {
    await (pb as any).admins.authWithPassword(adminEmail, adminPassword);
  } else {
    await pb
      .collection('_superusers')
      .authWithPassword(adminEmail, adminPassword);
  }

  console.log('Fetching stories collection...');
  const stories = await pb.collections.getOne('stories');

  // ── Fields ──────────────────────────────────────────────────────────────
  const existingNames = new Set(
    (stories.fields || []).map((f: any) => f.name),
  );
  const fieldsToAdd = NEW_FIELDS.filter((f) => !existingNames.has(f.name));

  if (fieldsToAdd.length === 0) {
    console.log('All copyright fields already exist — skipping field creation.');
  } else {
    console.log(
      `Adding ${fieldsToAdd.length} field(s): ${fieldsToAdd.map((f) => f.name).join(', ')}`,
    );
  }
  const mergedFields = [...(stories.fields || []), ...fieldsToAdd];

  // ── Step 1: fields (must land before rules reference them) ─────────────
  if (fieldsToAdd.length > 0) {
    console.log('Patching stories collection fields...');
    await pb.collections.update(stories.id, { fields: mergedFields });
  }

  // ── Step 2: rules (validated against the now-updated schema) ───────────
  const alreadyMigrated = (rule: string | null | undefined) =>
    typeof rule === 'string' && rule.includes('copyrightFlag');

  if (alreadyMigrated(stories.listRule) && alreadyMigrated(stories.updateRule)) {
    console.log('API rules already contain copyrightFlag — skipping rule patch.');
  } else {
    console.log('Patching stories collection API rules...');
    await pb.collections.update(stories.id, {
      listRule:
        '(isPublic = true && copyrightFlag != true) || @request.auth.id = creatorId || @request.auth.isAdmin = true',
      viewRule:
        '(isPublic = true && copyrightFlag != true) || @request.auth.id = creatorId || @request.auth.isAdmin = true',
      // Owners can edit their own stories but cannot change copyrightFlag
      // (:changed modifier) and cannot set isPublic = true on a flagged story.
      updateRule:
        '@request.auth.id != "" && (@request.auth.isAdmin = true || (@request.auth.id = creatorId && @request.body.copyrightFlag:changed = false && (copyrightFlag != true || @request.body.isPublic != true)))',
    });
  }

  const verify = await pb.collections.getOne('stories');
  console.log('Migration complete. Current state:');
  console.log(
    '  fields:',
    (verify.fields || []).map((f: any) => f.name).join(', '),
  );
  console.log('  listRule:', verify.listRule);
  console.log('  viewRule:', verify.viewRule);
  console.log('  updateRule:', verify.updateRule);
  console.log('');
  console.log('Next steps:');
  console.log('  1. npm run flag-copyright:dry   (review the backfill report)');
  console.log('  2. npm run flag-copyright       (apply flags to existing stories)');
  console.log(
    '  3. Reset the server metadata cache (Admin dashboard button, or GET /api/stories/metadata?refresh=true&forceAll=true)',
  );
}

main().catch((err: any) => {
  console.error('Migration failed:');
  if (err?.response) {
    console.error(JSON.stringify(err.response, null, 2));
  } else {
    console.error(err);
  }
  process.exit(1);
});
