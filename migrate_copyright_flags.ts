/**
 * One-time backfill / scanner: scan existing PUBLIC stories for copyrighted / fan-fiction
 * or explicit adult content and force-flag them private.
 *
 * Automatically keeps explicit adult content private while strictly protecting
 * non-explicit LGBT+ friendly stories and romance.
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

const TJ_GEN_URL = (
  process.env.TJ_GEN_URL || 'https://gen.teacherjake.com'
).replace(/\/$/, '');

const PocketBase = (PocketBaseClass as any).default || PocketBaseClass;

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.VITE_POCKETBASE_URL;
const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
const classifierModel =
  process.env.IP_CLASSIFIER_MODEL || 'google/gemini-2.5-flash-lite';

if (!url || !adminEmail || !adminPassword) {
  console.error('Missing required environment variables in .env file.');
  console.error(
    'Required: VITE_POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL, POCKETBASE_ADMIN_PASSWORD',
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

interface ClassificationResult {
  storyId: string;
  title: string;
  creatorId: string;
  flagged: boolean;
  flagReason: string;
  ipRisk: boolean;
  ipRiskReason: string;
  adultRisk: boolean;
  adultRiskReason: string;
  error?: string;
}

async function classifyStory(story: any): Promise<ClassificationResult> {
  const chs = Array.isArray(story.chapters) ? story.chapters : [];
  const firstChapterExcerpt = (chs[0]?.content || '').slice(0, 2000);
  const middleChapterExcerpt =
    chs.length > 2
      ? (chs[Math.floor(chs.length / 2)]?.content || '').slice(0, 1500)
      : '';
  const lastChapterExcerpt =
    chs.length > 1 ? (chs[chs.length - 1]?.content || '').slice(0, 1000) : '';

  const contentToClassify = [
    story.title ? `Title: ${story.title}` : '',
    story.description ? `Description: ${story.description}` : '',
    story.outline ? `Outline: ${String(story.outline).slice(0, 2500)}` : '',
    story.promptNotes
      ? `Author concept notes: ${String(story.promptNotes).slice(0, 1000)}`
      : '',
    firstChapterExcerpt
      ? `Opening chapter excerpt: ${firstChapterExcerpt}`
      : '',
    middleChapterExcerpt
      ? `Middle chapter excerpt: ${middleChapterExcerpt}`
      : '',
    lastChapterExcerpt ? `Later chapter excerpt: ${lastChapterExcerpt}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();

  const base: Omit<
    ClassificationResult,
    | 'flagged'
    | 'flagReason'
    | 'ipRisk'
    | 'ipRiskReason'
    | 'adultRisk'
    | 'adultRiskReason'
  > = {
    storyId: story.id,
    title: story.title || '(untitled)',
    creatorId: story.creatorId || '',
  };

  if (!contentToClassify) {
    return {
      ...base,
      flagged: false,
      flagReason: '',
      ipRisk: false,
      ipRiskReason: '',
      adultRisk: false,
      adultRiskReason: '',
    };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (openrouterApiKey) {
      headers['x-openrouter-api-key'] = openrouterApiKey;
    }

    const res = await fetch(`${TJ_GEN_URL}/api/stories/classify-ip`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: story.title,
        outline: story.outline,
        description: story.description,
        promptNotes: story.promptNotes,
        model: classifierModel,
      }),
    });
    const parsed = await res.json();
    const ipRisk = parsed.ipRisk === true;
    const ipRiskReason =
      typeof parsed.ipRiskReason === 'string' ? parsed.ipRiskReason : '';
    const adultRisk = parsed.adultRisk === true;
    const adultRiskReason =
      typeof parsed.adultRiskReason === 'string' ? parsed.adultRiskReason : '';
    const flagged = parsed.flagged === true || ipRisk || adultRisk;
    const flagReason =
      (typeof parsed.flagReason === 'string' && parsed.flagReason) ||
      (adultRisk
        ? `[Explicit Content] ${adultRiskReason || 'Explicit adult content'}`
        : '') ||
      (ipRisk ? `[Copyright] ${ipRiskReason || 'Copyrighted material'}` : '');

    return {
      ...base,
      flagged,
      flagReason,
      ipRisk,
      ipRiskReason,
      adultRisk,
      adultRiskReason,
    };
  } catch (err: any) {
    return {
      ...base,
      flagged: false,
      flagReason: '',
      ipRisk: false,
      ipRiskReason: '',
      adultRisk: false,
      adultRiskReason: '',
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
  console.log('Content & Copyright Backfill Scanner');
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

  const toScan = !targetStoryId && limit ? stories.slice(0, limit) : stories;

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
        : result.adultRisk && result.ipRisk
          ? 'FLAGGED (IP + ADULT)'
          : result.adultRisk
            ? 'FLAGGED (ADULT)'
            : result.ipRisk
              ? 'FLAGGED (IP)'
              : 'clean';
      console.log(
        `[${done}/${toScan.length}] ${marker} — "${result.title}" (${result.storyId})${result.flagReason ? ` :: ${result.flagReason}` : ''}`,
      );
      return result;
    },
    concurrency,
  );

  const flagged = results.filter((r) => r.flagged);
  const ipFlagged = results.filter((r) => r.ipRisk);
  const adultFlagged = results.filter((r) => r.adultRisk);
  const errored = results.filter((r) => r.error);

  console.log('==================================================');
  console.log(
    `Scan complete: ${results.length} scanned, ${flagged.length} flagged (${ipFlagged.length} IP, ${adultFlagged.length} adult content), ${errored.length} classifier errors.`,
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
    console.log(
      'DRY RUN — the following stories WOULD be flagged & privatized:',
    );
    for (const f of flagged) {
      console.log(`  - "${f.title}" (${f.storyId}): ${f.flagReason}`);
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
        copyrightFlagReason:
          f.flagReason || f.adultRiskReason || f.ipRiskReason || null,
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
  console.log(
    `Done. ${updated}/${flagged.length} stories flagged & privatized.`,
  );
  console.log(
    'IMPORTANT: now reset the server metadata cache (Admin dashboard "Reset Metadata Cache" button, or GET /api/stories/metadata?refresh=true&forceAll=true).',
  );
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
