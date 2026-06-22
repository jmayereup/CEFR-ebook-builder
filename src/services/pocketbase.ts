import PocketBase from 'pocketbase';
import type { TypedPocketBase } from './db/pocketbase-types';

const pbUrl =
  (typeof process !== 'undefined' && process.env?.VITE_POCKETBASE_URL) ||
  (typeof import.meta !== 'undefined' &&
    import.meta.env?.VITE_POCKETBASE_URL) ||
  'https://blog.teacherjake.com/api';

export const pb = new PocketBase(pbUrl) as TypedPocketBase;
pb.autoCancellation(false);
