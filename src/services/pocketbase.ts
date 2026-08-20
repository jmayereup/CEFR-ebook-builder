import PocketBase from 'pocketbase';
import type { TypedPocketBase } from './db/pocketbase-types';

const rawUrl =
  (typeof process !== 'undefined' && process.env?.VITE_POCKETBASE_URL) ||
  (typeof import.meta !== 'undefined' &&
    import.meta.env?.VITE_POCKETBASE_URL) ||
  'https://pb.teacherjake.com';

const pbUrl = rawUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');

export const pb = new PocketBase(pbUrl) as TypedPocketBase;
pb.autoCancellation(false);

/**
 * Returns authorization headers containing the active PocketBase user token if logged in.
 */
export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...customHeaders };
  if (pb.authStore.isValid && pb.authStore.token) {
    headers['Authorization'] = `Bearer ${pb.authStore.token}`;
  }
  return headers;
}

