/**
 * Safe local storage wrapper.
 * Prevents unhandled exceptions from crashing client operations.
 */

export function safeSetItem(key: string, value: string): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, value);
      return true;
    }
  } catch (error: any) {
    console.warn(
      `[Storage] localStorage.setItem failed for key "${key}":`,
      error,
    );
  }
  return false;
}

export function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.error(`[Storage] Failed to remove item for key "${key}":`, e);
  }
}
