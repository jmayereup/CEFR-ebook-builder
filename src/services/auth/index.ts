/**
 * Auth service factory and convenience re-exports.
 *
 * All application code should import auth helpers from HERE, not from
 * any provider-specific module directly.
 *
 * To switch providers, replace the active `PocketBaseAuthService` instance with
 * a new implementation class — nothing else needs to change.
 */

import type { IUser } from '../types';
import type { IAuthService, Unsubscribe } from './AuthService';
import { PocketBaseAuthService } from './PocketBaseAuthService';

// ---------------------------------------------------------------------------
// Active provider instance
// ---------------------------------------------------------------------------

const authService: IAuthService = new PocketBaseAuthService();

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

export const initAuth = (
  onSuccess?: (user: IUser, token: string) => void,
  onFailure?: () => void,
): Unsubscribe =>
  authService.initAuth(onSuccess ?? (() => {}), onFailure ?? (() => {}));

export const googleSignIn = () => authService.signIn();

export const emailSignIn = (email: string, password: string) =>
  authService.signInWithEmail(email, password);

export const emailSignUp = (email: string, password: string, name?: string) =>
  authService.signUpWithEmail(email, password, name);

export const logout = () => authService.signOut();

export const getAccessToken = () => authService.getAccessToken();

export const syncUserProfile = (user: IUser) =>
  authService.syncUserProfile(user);

export type { IAuthService, Unsubscribe };
// Export the active service instance for advanced use
export { authService };
