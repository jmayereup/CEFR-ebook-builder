/**
 * Safe local storage wrapper.
 * Prevents QuotaExceededErrors from crashing client-side database saving operations
 * by catching writing exceptions and automatically evicting old cached story data.
 */

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    console.warn(
      `[Storage] localStorage.setItem failed for key "${key}":`,
      error,
    );

    const isQuotaError =
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.number === -2147024882; // IE/Edge specific

    if (isQuotaError) {
      console.log(
        '[Storage] Attempting to free space by evicting cached stories...',
      );
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          // Only evict cached story documents, which represent the largest payload
          if (k?.startsWith('cefr_story_cache_')) {
            keysToRemove.push(k);
          }
        }

        for (const k of keysToRemove) {
          localStorage.removeItem(k);
        }

        // Try setting the item again after evicting the caches
        localStorage.setItem(key, value);
        console.log(
          '[Storage] Successfully saved item after evicting cached stories.',
        );
        return true;
      } catch (retryError) {
        console.error(
          '[Storage] Failed to save even after evicting cached stories:',
          retryError,
        );
      }
    }
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error(`[Storage] Failed to remove item for key "${key}":`, e);
  }
}
