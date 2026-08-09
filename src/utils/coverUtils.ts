function readEnv(key: string): string | undefined {
  if (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env as any)[key] !== undefined) {
    return (import.meta.env as any)[key] as string;
  }
  if (typeof process !== 'undefined' && process.env && process.env[key] !== undefined) {
    return process.env[key];
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

