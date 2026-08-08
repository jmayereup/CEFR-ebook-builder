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
 * Utility helper to get story cover image URL.
 * Prefers a direct CDN URL (when VITE_COVER_CDN_URL is set), then the PocketBase
 * record cover field (`story.cover`), falling back to `/covers/${story.id}.jpg`.
 *
 * CDN path layout: `${VITE_COVER_CDN_URL}/${collectionId}/${story.id}/${cover}`
 * — matches PocketBase's S3 key structure so a CDN fronting the same bucket works
 * without any extra upload pipeline.
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
  const { absolute = false } = options;
  const t = story.updated ? `?t=${new Date(story.updated).getTime()}` : '';

  if (story.cover) {
    const cdnUrl = readEnv('VITE_COVER_CDN_URL');
    if (cdnUrl && story.collectionId) {
      return `${cdnUrl.replace(/\/+$/, '')}/${story.collectionId}/${story.id}/${story.cover}${t}`;
    }

    const rawPbUrl =
      readEnv('VITE_POCKETBASE_URL') || 'https://pb.teacherjake.com';
    const pbBaseUrl = rawPbUrl.replace(/\/+$/, '');
    return `${pbBaseUrl}/api/files/stories/${story.id}/${story.cover}${t}`;
  }

  const relativePath = `/covers/${story.id}.jpg${t}`;
  if (absolute && typeof window !== 'undefined') {
    return `${window.location.origin}${relativePath}`;
  }
  return relativePath;
}
