function readEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    return process.env[key];
  }
  try {
    if (key === 'VITE_COVER_CDN_URL') return import.meta.env.VITE_COVER_CDN_URL;
    if (key === 'COVER_CDN_URL') return (import.meta.env as any).COVER_CDN_URL;
    if (key === 'VITE_GEN_URL') return import.meta.env.VITE_GEN_URL;
    if (key === 'TJ_GEN_URL') return (import.meta.env as any).TJ_GEN_URL;
    if (key === 'VITE_POCKETBASE_URL') return import.meta.env.VITE_POCKETBASE_URL;
    if (key === 'POCKETBASE_URL') return (import.meta.env as any).POCKETBASE_URL;
  } catch (e) {
    // Ignore in non-ESM environments
  }
  return undefined;
}

/**
 * Returns the URL for a story's cover image.
 *
 * Covers are served from CDN or tj-gen static file server.
 */
export function getStoryCoverUrl(
  story: {
    id: string;
    collectionId?: string;
    cover?: string;
    updated?: string | Date;
  },
  options: { absolute?: boolean } = {},
): string {
  const t = story.updated ? `?t=${new Date(story.updated).getTime()}` : '';

  if (story.cover) {
    const cdnUrl = (
      readEnv('VITE_COVER_CDN_URL') ||
      readEnv('COVER_CDN_URL') ||
      'https://files.teacherjake.com'
    ).replace(/\/+$/, '');
    const collection = story.collectionId || 'pbc_232317621';
    return `${cdnUrl}/${collection}/${story.id}/${story.cover}${t}`;
  }

  const genBaseUrl = (
    readEnv('VITE_GEN_URL') ||
    readEnv('TJ_GEN_URL') ||
    'https://gen.teacherjake.com'
  ).replace(/\/+$/, '');

  return `${genBaseUrl}/covers/${story.id}.jpg${t}`;
}

/**
 * Returns an array of candidate cover URLs for a story in order of priority.
 * Useful for fetching cover blobs with CORS fallback handling.
 */
export function getStoryCoverUrls(
  story: {
    id: string;
    collectionId?: string;
    cover?: string;
    updated?: string | Date;
  },
): string[] {
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

  if (story.cover) {
    const cdnUrl = (
      readEnv('VITE_COVER_CDN_URL') ||
      readEnv('COVER_CDN_URL') ||
      'https://files.teacherjake.com'
    ).replace(/\/+$/, '');
    const collection = story.collectionId || 'pbc_232317621';

    // 1. Direct CDN / R2 URL
    urls.push(`${cdnUrl}/${collection}/${story.id}/${story.cover}${t}`);

    // 2. PocketBase API proxy URL (with CORS headers for browser fetch)
    urls.push(`${pbUrl}/api/files/${collection}/${story.id}/${story.cover}${t}`);
  }

  // 3. Fallback to tj-gen static cover URL
  urls.push(`${genBaseUrl}/covers/${story.id}.jpg${t}`);

  return Array.from(new Set(urls));
}


