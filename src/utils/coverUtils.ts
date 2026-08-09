function readEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    return process.env[key];
  }
  try {
    if (key === 'VITE_COVER_CDN_URL') return import.meta.env.VITE_COVER_CDN_URL;
    if (key === 'COVER_CDN_URL') return (import.meta.env as any).COVER_CDN_URL;
    if (key === 'VITE_GEN_URL') return import.meta.env.VITE_GEN_URL;
    if (key === 'TJ_GEN_URL') return (import.meta.env as any).TJ_GEN_URL;
  } catch (e) {
    // Ignore in non-ESM environments
  }
  return undefined;
}

/**
 * Returns the URL for a story's cover image.
 *
 * Covers are always served from the tj-gen static file server at:
 *   ${VITE_GEN_URL}/covers/${storyId}.jpg
 *
 * The filename is deterministic (the record ID), so no PocketBase field lookup
 * is needed. A `?t=` cache-bust param is appended when `story.updated` is set,
 * so browsers pick up a newly-generated cover after regeneration.
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

