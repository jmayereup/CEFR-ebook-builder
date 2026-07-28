/**
 * One-time backfill: scan existing PUBLIC stories for copyrighted / fan-fiction
 * content and force-flag them private.
 *
 * Usage:
 *   npm run flag-copyright:dry   # dry run — prints a report, writes nothing
 *   npm run flag-copyright       # real run — updates flagged stories in PocketBase
 *
 * Options:
 *   --dry              Dry run (no database writes)
 *   --limit=N          Only scan the N most recent public stories
 *   --concurrency=N    Parallel classifier calls (default 4)
 *   --story=<id>       Scan a single story by ID
 *
 * After a real run, reset the server metadata cache (Admin dashboard button or
 * GET /api/stories/metadata?refresh=true&forceAll=true).
 */

import fs from 'node:fs';
import { config } from 'dotenv';
import { resolve } from 'path';
import PocketBaseClass from 'pocketbase';
import {
  cleanJSONString,
  handleModelCall,
  Type,
} from './src/server/lib/aiProviders';

const PocketBase = (PocketBaseClass as any).default || PocketBaseClass;

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.VITE_POCKETBASE_URL;
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const classifierModel =
  process.env.IP_CLASSIFIER_MODEL || 'google/gemini-3.6-flash';

if (!url || !adminEmail || !adminPassword || !openrouterApiKey) {
  console.error('Missing required environment variables in .env file.');
  console.error(
    'Required: VITE_POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD, OPENROUTER_API_KEY',
  );
  process.exit(1);
}

const pb = new PocketBase(url);

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry') || args.includes('-d');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
const concurrencyArg = args.find((a) => a.startsWith('--concurrency='));
const concurrency = concurrencyArg
  ? Math.max(1, parseInt(concurrencyArg.split('=')[1], 10))
  : 4;
const storyArg = args.find((a) => a.startsWith('--story='));
const targetStoryId = storyArg ? storyArg.split('=')[1] : undefined;

const CLASSIFY_SYSTEM_INSTRUCTION = `You are a copyright compliance classifier for a language-learning story library.
Decide whether a story references established copyrighted material that would require the copyright holder's permission to publish.

Set "ipRisk" to true ONLY when the content clearly references:
- Established copyrighted fictional characters (e.g. Harry Potter, Spider-Man, Pikachu, Darth Vader, Elsa from Frozen, Mario)
- Established copyrighted fictional universes or franchises (e.g. Star Wars, Marvel Cinematic Universe, DC Universe, Pokémon, Hogwarts / the Wizarding World)
- A close retelling of a specific copyrighted novel, film, or TV series

Set "ipRisk" to FALSE for:
- Generic genre tropes (wizards, vampires, space travel, dragons, detectives, school settings) without naming a specific copyrighted work
- Public-domain works and characters (Sherlock Holmes, Dracula, Frankenstein, Brothers Grimm / Hans Christian Andersen / Charles Perrault fairy tales, Greek/Roman/Norse mythology, King Arthur, Robin Hood, Jane Eyre, Alice in Wonderland, A Christmas Carol)
- Original characters in any genre setting
- Real historical events and figures (no copyright on facts)

When in doubt, set ipRisk to false. In "ipRiskReason", briefly name the specific copyrighted source if ipRisk is true, otherwise return an empty string.`;

const CLASSIFY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    ipRisk: {
      type: Type.BOOLEAN,
      description:
        'true ONLY if the story clearly references copyrighted material that would normally require permission. When in doubt, false.',
    },
    ipRiskReason: {
      type: Type.STRING,
      description:
        'If ipRisk is true, briefly name the specific copyrighted source. Otherwise an empty string.',
    },
  },
  required: ['ipRisk', 'ipRiskReason'],
};

interface ClassificationResult {
  storyId: string;
  title: string;
  creatorId: string;
  ipRisk: boolean;
  ipRiskReason: string;
  error?: string;
}

async function classifyStory(story: any): Promise<ClassificationResult> {
  const firstChapterContent = (story.chapters?.[0]?.content || '').slice(
    0,
    2000,
  );
  const contentToClassify = [
    story.title ? `Title: ${story.title}` : '',
    story.description ? `Description: ${story.description}` : '',
    story.outline ? `Outline: ${String(story.outline).slice(0, 3000)}` : '',
    story.promptNotes
      ? `Author concept notes: ${String(story.promptNotes).slice(0, 1500)}`
      : '',
    firstChapterContent
      ? `Opening excerpt: ${firstChapterContent}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();

  const base: Omit<ClassificationResult, 'ipRisk' | 'ipRiskReason'> = {
    storyId: story.id,
    title: story.title || '(untitled)',
    creatorId: story.creatorId || '',
  };

  if (!contentToClassify) {
    return { ...base, ipRisk: false, ipRiskReason: '' };
  }

  try {
    const responseText = await handleModelCall({
      model: classifierModel,
      systemInstruction: CLASSIFY_SYSTEM_INSTRUCTION,
      prompt: `Classify the following story:\n\n${contentToClassify}`,
      responseSchema: CLASSIFY_SCHEMA,
      temperature: 0,
      action: 'classify-ip-backfill',
    });

    const parsed = JSON.parse(cleanJSONString(responseText || '{}'));
    return {
      ...base,
      ipRisk: parsed.ipRisk === true,
      ipRiskReason:
        typeof parsed.ipRiskReason === 'string' ? parsed.ipRiskReason : '',
    };
  } catch (err: any) {
    return {
      ...base,
      ipRisk: false,
      ipRiskReason: '',
      error: err?.message || String(err),
    };
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  limit: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (index < items.length) {
        const current = index++;
        results[current] = await worker(items[current]);
      }
    })(),
  );
  await Promise.all(runners);
  return results;
}

async function main() {
  console.log('==================================================');
  console.log('Copyright Backfill Scanner');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no writes)' : 'LIVE RUN'}`);
  console.log(`Classifier model: ${classifierModel}`);
  console.log(`Concurrency: ${concurrency}`);
  console.log('==================================================');

  console.log(`Connecting to PocketBase at: ${url}`);
  if (typeof (pb as any).admins !== 'undefined') {
    await (pb as any).admins.authWithPassword(adminEmail, adminPassword);
  } else {
    await pb
      .collection('_superusers')
      .authWithPassword(adminEmail, adminPassword);
  }
  console.log('Authenticated.');

  const filter = targetStoryId
    ? `id = "${targetStoryId}"`
    : 'isPublic = true && copyrightFlag != true';
  const stories = await pb.collection('stories').getFullList({
    filter,
    sort: '-created',
  });

  const toScan =
    !targetStoryId && limit ? stories.slice(0, limit) : stories;

  console.log(
    `Found ${stories.length} public unflagged stories; scanning ${toScan.length}.`,
  );

  let done = 0;
  const results = await runWithConcurrency(
    toScan,
    async (story) => {
      const result = await classifyStory(story);
      done++;
      const marker = result.error
        ? 'ERROR'
        : result.ipRisk
          ? 'FLAGGED'
          : 'clean';
      console.log(
        `[${done}/${toScan.length}] ${marker} — "${result.title}" (${result.storyId})${result.ipRiskReason ? ` :: ${result.ipRiskReason}` : ''}`,
      );
      return result;
    },
    concurrency,
  );

  const flagged = results.filter((r) => r.ipRisk);
  const errored = results.filter((r) => r.error);

  console.log('==================================================');
  console.log(
    `Scan complete: ${results.length} scanned, ${flagged.length} flagged, ${errored.length} classifier errors.`,
  );

  const reportPath = resolve(
    process.cwd(),
    `copyright-backfill-report-${Date.now()}.json`,
  );
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Report written to: ${reportPath}`);

  if (flagged.length === 0) {
    console.log('Nothing to flag.');
    return;
  }

  if (isDryRun) {
    console.log('');
    console.log('DRY RUN — the following stories WOULD be flagged & privatized:');
    for (const f of flagged) {
      console.log(`  - "${f.title}" (${f.storyId}): ${f.ipRiskReason}`);
    }
    console.log('');
    console.log('Re-run without --dry to apply.');
    return;
  }

  console.log('');
  console.log(`Flagging ${flagged.length} stories...`);
  let updated = 0;
  for (const f of flagged) {
    try {
      await pb.collection('stories').update(f.storyId, {
        copyrightFlag: true,
        copyrightFlagReason: f.ipRiskReason || null,
        copyrightFlagSource: 'backfill',
        copyrightFlaggedAt: new Date().toISOString(),
        isPublic: false,
      });
      updated++;
      console.log(`  Flagged: "${f.title}" (${f.storyId})`);
    } catch (err: any) {
      console.error(
        `  FAILED to flag "${f.title}" (${f.storyId}):`,
        err?.message || err,
      );
    }
  }

  console.log('');
  console.log(`Done. ${updated}/${flagged.length} stories flagged & privatized.`);
  console.log(
    'IMPORTANT: now reset the server metadata cache (Admin dashboard "Reset Metadata Cache" button, or GET /api/stories/metadata?refresh=true&forceAll=true).',
  );
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
