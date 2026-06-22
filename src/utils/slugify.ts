/**
 * Generates a URL-friendly, Unicode-aware slug from a text string.
 * Retains letters and numbers from all languages (e.g. Spanish accent marks, Thai, Korean).
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]+/gu, '') // Keep letters/numbers in any language
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with -
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

/**
 * Extracts the story ID from a slugified segment (e.g. "my-title-story123" -> "story123").
 */
export function getStoryIdFromSegment(segment: string): string {
  const match = segment.match(/(story-?[a-z0-9]+)$/i);
  if (match) {
    return match[1];
  }
  const parts = segment.split('-');
  return parts[parts.length - 1];
}
