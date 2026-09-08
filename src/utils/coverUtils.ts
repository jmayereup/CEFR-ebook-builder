import {
  getGenericCoverKey,
  getGenericCoverUrl,
} from '../constants/genreCovers';

export { getGenericCoverKey, getGenericCoverUrl };

function readEnv(key: string): string | undefined {
  if (
    typeof process !== 'undefined' &&
    process.env &&
    process.env[key] !== undefined
  ) {
    return process.env[key];
  }
  try {
    if (key === 'VITE_COVER_CDN_URL') return import.meta.env.VITE_COVER_CDN_URL;
    if (key === 'COVER_CDN_URL') return (import.meta.env as any).COVER_CDN_URL;
    if (key === 'VITE_GEN_URL') return import.meta.env.VITE_GEN_URL;
    if (key === 'TJ_GEN_URL') return (import.meta.env as any).TJ_GEN_URL;
    if (key === 'VITE_POCKETBASE_URL')
      return import.meta.env.VITE_POCKETBASE_URL;
    if (key === 'POCKETBASE_URL')
      return (import.meta.env as any).POCKETBASE_URL;
  } catch (_e) {
    // Ignore in non-ESM environments
  }
  return undefined;
}

/**
 * Checks whether a story has a custom uploaded/generated cover image.
 */
export function hasCustomCover(story?: { cover?: string } | null): boolean {
  return Boolean(story?.cover && story.cover.trim() !== '');
}

/**
 * Returns CEFR-themed styling classes for offline/text fallback cards.
 */
export function getCefrCoverStyles(cefrLevel: string = 'A1') {
  const lvl = (cefrLevel || 'A1').toUpperCase();
  if (lvl.startsWith('A')) {
    // Birch / Parchment / Pale Linen (soft natural paper colors)
    return {
      card: 'bg-gradient-to-br from-[#FAF6EE] to-[#EBE4D5] dark:from-[#2D2B28] dark:to-[#1C1A18] text-[#2D2A26] dark:text-[#EBE4D5] border-[#D0C7B2]/40 dark:border-[#5A5348]/40',
      textMuted: 'text-[#615C54] dark:text-[#9B9384]',
      line: 'border-[#D0C7B2]/30 dark:border-[#5A5348]/30',
    };
  }
  if (lvl.startsWith('B')) {
    // Sage / Soft Green Pine / Olive Wood (soft natural green woods)
    return {
      card: 'bg-gradient-to-br from-[#F0F2E8] to-[#DCE0CC] dark:from-[#20231D] dark:to-[#131612] text-[#20291D] dark:text-[#DCE0CC] border-[#C1C9A9]/40 dark:border-[#4C5340]/40',
      textMuted: 'text-[#535F4F] dark:text-[#8F9983]',
      line: 'border-[#C1C9A9]/30 dark:border-[#4C5340]/30',
    };
  }
  // Warm Cedar / Oak / Sandalwood / Terracotta (C levels - Advanced)
  return {
    card: 'bg-gradient-to-br from-[#FAF0E3] to-[#EBD7BE] dark:from-[#312318] dark:to-[#1C130D] text-[#3B250D] dark:text-[#EBD7BE] border-[#D9BD9C]/40 dark:border-[#624A35]/40',
    textMuted: 'text-[#7A5A39] dark:text-[#AB9074]',
    line: 'border-[#D9BD9C]/30 dark:border-[#624A35]/30',
  };
}

/**
 * Returns the URL for a story's cover image.
 *
 * If a custom AI-generated cover exists, returns CDN or PocketBase URL.
 * Otherwise, returns the curated generic cover URL for the story's genre.
 */
export function getStoryCoverUrl(
  story: {
    id: string;
    collectionId?: string;
    cover?: string;
    genre?: string;
    updated?: string | Date;
  },
  options: { absolute?: boolean } = {},
): string {
  const t = story.updated ? `?t=${new Date(story.updated).getTime()}` : '';

  if (story.cover && story.cover.trim() !== '') {
    const cdnUrl = (
      readEnv('VITE_COVER_CDN_URL') ||
      readEnv('COVER_CDN_URL') ||
      'https://files.teacherjake.com'
    ).replace(/\/+$/, '');
    const collection = story.collectionId || 'pbc_232317621';
    return `${cdnUrl}/${collection}/${story.id}/${story.cover}${t}`;
  }

  // Fallback to genre-specific generic cover
  const genericPath = getGenericCoverUrl(story.genre);
  if (options.absolute) {
    const baseUrl = (
      readEnv('VITE_APP_URL') ||
      readEnv('APP_URL') ||
      'https://teacherjake.com'
    ).replace(/\/+$/, '');
    return `${baseUrl}${genericPath}`;
  }

  return genericPath;
}

/**
 * Returns an array of candidate cover URLs for a story in order of priority.
 * Useful for fetching cover blobs with CORS fallback handling.
 */
export function getStoryCoverUrls(story: {
  id: string;
  collectionId?: string;
  cover?: string;
  genre?: string;
  updated?: string | Date;
}): string[] {
  const t = story.updated ? `?t=${new Date(story.updated).getTime()}` : '';
  const urls: string[] = [];

  const genBaseUrl = (
    readEnv('VITE_GEN_URL') ||
    readEnv('TJ_GEN_URL') ||
    'https://gen.teacherjake.com'
  ).replace(/\/+$/, '');

  const pbUrl = (
    readEnv('VITE_POCKETBASE_URL') ||
    readEnv('POCKETBASE_URL') ||
    'https://pb.teacherjake.com'
  ).replace(/\/+$/, '');

  if (story.cover && story.cover.trim() !== '') {
    const cdnUrl = (
      readEnv('VITE_COVER_CDN_URL') ||
      readEnv('COVER_CDN_URL') ||
      'https://files.teacherjake.com'
    ).replace(/\/+$/, '');
    const collection = story.collectionId || 'pbc_232317621';

    // 1. Direct CDN / R2 URL
    urls.push(`${cdnUrl}/${collection}/${story.id}/${story.cover}${t}`);

    // 2. PocketBase API proxy URL (with CORS headers for browser fetch)
    urls.push(
      `${pbUrl}/api/files/${collection}/${story.id}/${story.cover}${t}`,
    );
  }

  // 3. Fallback to tj-gen static cover URL (legacy)
  urls.push(`${genBaseUrl}/covers/${story.id}.jpg${t}`);

  // 4. Genre generic cover URL
  urls.push(getGenericCoverUrl(story.genre));

  return Array.from(new Set(urls));
}
