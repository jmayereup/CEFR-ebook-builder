/**
 * Utility helper to get story cover image URL.
 * Prefers PocketBase record cover field (`story.cover`), falling back to `/covers/${story.id}.jpg`.
 */
export function getStoryCoverUrl(
  story: { id: string; cover?: string; updated?: string | Date },
  options: { absolute?: boolean } = {},
): string {
  const { absolute = false } = options;
  const t = story.updated ? `?t=${new Date(story.updated).getTime()}` : '';

  if (story.cover) {
    const rawPbUrl =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_POCKETBASE_URL) ||
      (typeof process !== 'undefined' && process.env?.VITE_POCKETBASE_URL) ||
      'https://pb.teacherjake.com';
    const pbBaseUrl = rawPbUrl.replace(/\/+$/, '');
    return `${pbBaseUrl}/api/files/stories/${story.id}/${story.cover}${t}`;
  }

  const relativePath = `/covers/${story.id}.jpg${t}`;
  if (absolute && typeof window !== 'undefined') {
    return `${window.location.origin}${relativePath}`;
  }
  return relativePath;
}
