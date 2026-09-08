/**
 * Mapping between story genres and curated generic cover artwork assets.
 * Generic covers live in /covers/generic/{key}.jpg
 */

export const GENRE_COVER_MAP: Record<string, string> = {
  // Narrative genres
  adventure: 'adventure',
  mystery: 'mystery',
  scifi: 'scifi',
  fantasy: 'fantasy',
  scifi_fantasy: 'scifi',
  sliceoflife: 'sliceoflife',
  romance: 'romance',
  folklore: 'folklore',
  historical: 'historical',
  horror: 'horror',
  comedy: 'sliceoflife',
  fairy: 'fantasy',

  // Expository genres
  science_nature: 'nature',
  technology: 'technology',
  history_biography: 'historical',
  culture_society: 'folklore',
  health_wellness: 'nature',
  geography_travel: 'adventure',
  howto_hobbies: 'sliceoflife',
  nonfiction: 'historical',

  // Analytical genres
  science_tech_analysis: 'technology',
  historical_analysis: 'historical',
  social_cultural_issues: 'folklore',
  philosophy: 'nature',
  meditative: 'nature',
  environmental_systems: 'nature',

  // Descriptive genres
  nature_wildlife: 'nature',
  cities_architecture: 'historical',
  food_culture: 'sliceoflife',
  art_music: 'romance',
  daily_life_portraits: 'sliceoflife',
};

/**
 * Returns the asset key for a given genre (e.g. 'mystery', 'adventure').
 * Gracefully falls back to 'default' if not found.
 */
export function getGenericCoverKey(genreId?: string): string {
  if (!genreId) return 'default';
  const normalized = genreId.toLowerCase().trim();
  return GENRE_COVER_MAP[normalized] || 'default';
}

/**
 * Returns the public URL path for a generic cover image.
 */
export function getGenericCoverUrl(genreId?: string): string {
  const key = getGenericCoverKey(genreId);
  return `/covers/generic/${key}.jpg`;
}
