/**
 * IAuthService — provider-agnostic authentication interface.
 *
 * Any backend (PocketBase, Supabase, etc.) must implement this
 * interface. The rest of the app imports from `../services/auth` and never
 * depends on provider-specific types directly.
 */

import type { IUser } from '../types';

/** A function that cancels an auth-state subscription. */
export type Unsubscribe = () => void;

export interface IAuthService {
  /**
   * Start listening to auth state changes.
   * @param onSuccess  Called when a user is signed in.
   * @param onFailure  Called when no user is present or the session ends.
   * @returns          An unsubscribe function to clean up the listener.
   */
  initAuth(
    onSuccess: (user: IUser, token: string) => void,
    onFailure: () => void,
  ): Unsubscribe;

  /** Open the provider sign-in flow (e.g. Google popup). */
  signIn(): Promise<{ user: IUser; accessToken: string } | null>;

  /** Sign the current user out. */
  signOut(): Promise<void>;

  /** Return a cached access token without triggering a new sign-in. */
  getAccessToken(): Promise<string | null>;

  /** Sign in using email and password. */
  signInWithEmail(
    email: string,
    password: string,
  ): Promise<{ user: IUser; accessToken: string } | null>;

  /** Sign up / register using email and password. */
  signUpWithEmail(
    email: string,
    password: string,
    name?: string,
  ): Promise<{ user: IUser; accessToken: string } | null>;

  /**
   * Sync the signed-in user to the user-profiles collection.
   * Creates the document on first login; updates display info on subsequent ones.
   * Returns whether the user has paid-tier access (read from the `isPaid` field)
   * or admin access (read from the `isAdmin` field).
   */
  syncUserProfile(user: IUser): Promise<{ isPaid: boolean }>;
}
