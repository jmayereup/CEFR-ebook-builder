/**
 * Shared data-transfer types for the provider-agnostic service layer.
 *
 * IUser is the minimal user representation exposed to the rest of the app.
 * It intentionally avoids provider-specific types so the auth service can be
 * swapped without touching any consumer code.
 */

export interface IUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Re-export domain types consumed by service interfaces so callers can import
// everything they need from a single services path.
export type {
  Chapter,
  ConsistencyAudit,
  GenerationLimitData,
  LookupLimitData,
  RecentlyReadItem,
  Story,
  StoryBible,
  UserProfileData,
  UserStreakData,
  VocabularyTerm,
} from '../types';
