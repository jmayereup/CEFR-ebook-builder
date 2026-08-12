import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
dotenv.config();

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL || 'admin@teacherjake.com';
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || 'password123';

const pb = new PocketBase(pbUrl);

const NEW_FIELDS = [
  {
    name: 'embedUrl',
    type: 'text',
    required: false,
    presentable: false,
    primaryKey: false,
    hidden: false,
    autogeneratePattern: '',
  },
  {
    name: 'sourceType',
    type: 'text',
    required: false,
    presentable: false,
    primaryKey: false,
    hidden: false,
    autogeneratePattern: '',
  },
];

async function main() {
  console.log(`Connecting to PocketBase at ${pbUrl}...`);
  console.log(`Authenticating as ${adminEmail}...`);

  try {
    if (typeof (pb as any).admins !== 'undefined') {
      await (pb as any).admins.authWithPassword(adminEmail, adminPassword);
    } else {
      await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword);
    }
  } catch (err) {
    console.error('Superuser authentication failed:', err);
    process.exit(1);
  }

  console.log('Fetching stories collection schema...');
  const stories = await pb.collections.getOne('stories');

  const existingNames = new Set((stories.fields || []).map((f: any) => f.name));
  const fieldsToAdd = NEW_FIELDS.filter((f) => !existingNames.has(f.name));

  if (fieldsToAdd.length === 0) {
    console.log('All embed fields (embedUrl, sourceType) already exist — skipping.');
    return;
  }

  console.log(`Adding ${fieldsToAdd.length} field(s): ${fieldsToAdd.map((f) => f.name).join(', ')}`);
  const mergedFields = [...(stories.fields || []), ...fieldsToAdd];

  await pb.collections.update(stories.id, { fields: mergedFields });
  console.log('Successfully updated stories collection with embedUrl and sourceType fields!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
