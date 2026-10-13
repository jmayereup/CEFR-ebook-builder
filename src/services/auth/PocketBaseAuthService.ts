import { useAuthStore } from '../../store/authStore';
import { pb } from '../pocketbase';
import type { IUser } from '../types';
import type { IAuthService, Unsubscribe } from './AuthService';

function toIUser(record: any): IUser {
  return {
    uid: record.id,
    email: record.email || null,
    displayName: record.name || null,
    photoURL: record.photoUrl || record.photoURL || null,
    isAdmin: record.isAdmin === true,
    emailVerified: record.verified === true || record.emailVerified === true,
  };
}

export class PocketBaseAuthService implements IAuthService {
  initAuth(
    onSuccess: (user: IUser, token: string) => void,
    onFailure: () => void,
  ): Unsubscribe {
    let lastUserId: string | null = null;

    // If already logged in and token is valid, invoke onSuccess immediately
    if (pb.authStore.isValid && pb.authStore.record) {
      lastUserId = pb.authStore.record.id;
      onSuccess(toIUser(pb.authStore.record), pb.authStore.token);

      // Asynchronously refresh the token to keep it valid and verify with server
      pb.collection('users')
        .authRefresh()
        .then((authData) => {
          if (authData.record) {
            onSuccess(toIUser(authData.record), authData.token);
          }
        })
        .catch((err) => {
          console.warn(
            '[PocketBaseAuthService] Auto authRefresh on mount failed:',
            err,
          );
          if (err.status === 401 || err.status === 403) {
            pb.authStore.clear();
            lastUserId = null;
            onFailure();
          }
        });
    } else {
      // Clear expired or invalid stored credentials so stale record doesn't block future login
      pb.authStore.clear();
      lastUserId = null;
      onFailure();
    }

    // Listen for auth store changes (login/logout/token refreshes)
    const unsubscribe = pb.authStore.onChange((token, record) => {
      if (record && pb.authStore.isValid) {
        // If already recognized as logged in with this exact user in both lastUserId and authStore, skip redundant notification
        if (
          record.id === lastUserId &&
          useAuthStore.getState().currentUser?.uid === record.id
        ) {
          return;
        }
        lastUserId = record.id;
        onSuccess(toIUser(record), token);
      } else {
        if (
          lastUserId === null &&
          useAuthStore.getState().currentUser === null
        ) {
          return;
        }
        lastUserId = null;
        onFailure();
      }
    });

    return unsubscribe;
  }

  async signIn(): Promise<{ user: IUser; accessToken: string } | null> {
    try {
      const authData = await pb
        .collection('users')
        .authWithOAuth2({ provider: 'google' });
      if (authData.record) {
        const user = toIUser(authData.record);
        useAuthStore.getState().setCurrentUser(user);
        return {
          user,
          accessToken: authData.token,
        };
      }
      return null;
    } catch (error) {
      console.error('PocketBase OAuth error:', error);
      throw error;
    }
  }

  async signInWithEmail(
    email: string,
    password: string,
  ): Promise<{ user: IUser; accessToken: string } | null> {
    try {
      const authData = await pb
        .collection('users')
        .authWithPassword(email, password);
      if (authData.record) {
        const user = toIUser(authData.record);
        useAuthStore.getState().setCurrentUser(user);
        return {
          user,
          accessToken: authData.token,
        };
      }
      return null;
    } catch (error) {
      console.error('PocketBase email sign in error:', error);
      throw error;
    }
  }

  async signUpWithEmail(
    email: string,
    password: string,
    name?: string,
  ): Promise<{ user: IUser; accessToken: string } | null> {
    try {
      const _record = await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name: name || 'Learner',
        emailVisibility: true,
        isPaid: false,
        isAdmin: false,
        savedVocab: [],
        bookshelf: [],
        recentlyRead: [],
        streak: null,
      });

      const authData = await pb
        .collection('users')
        .authWithPassword(email, password);
      if (authData.record) {
        const user = toIUser(authData.record);
        useAuthStore.getState().setCurrentUser(user);
        return {
          user,
          accessToken: authData.token,
        };
      }
      return null;
    } catch (error) {
      console.error('PocketBase email sign up error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    pb.authStore.clear();
    useAuthStore.getState().setCurrentUser(null);
  }

  async getAccessToken(): Promise<string | null> {
    return pb.authStore.isValid ? pb.authStore.token : null;
  }

  async syncUserProfile(user: IUser): Promise<{ isPaid: boolean }> {
    if (
      !pb.authStore.isValid ||
      !pb.authStore.record ||
      pb.authStore.record.id !== user.uid
    ) {
      console.log(
        '[PocketBase] Skipping syncUserProfile: User is not authenticated or ID mismatch.',
      );
      return { isPaid: false };
    }

    try {
      const record = await pb.collection('users').getOne(user.uid);
      const targetName = user.displayName || record.name || 'Learner';
      const targetPhotoUrl = user.photoURL || record.photoUrl || '';

      // Sync display name and photo url ONLY if they changed
      if (record.name !== targetName || record.photoUrl !== targetPhotoUrl) {
        const updated = await pb.collection('users').update(user.uid, {
          name: targetName,
          photoUrl: targetPhotoUrl,
        });
        return {
          isPaid: updated.isAdmin === true ? true : updated.isPaid === true,
        };
      }

      return {
        isPaid: record.isAdmin === true ? true : record.isPaid === true,
      };
    } catch (error: any) {
      // If not found, create the profile
      if (error.status === 404) {
        try {
          const _created = await pb.collection('users').create({
            id: user.uid,
            email: user.email || '',
            name: user.displayName || 'Learner',
            photoUrl: user.photoURL || '',
            isPaid: false,
            isAdmin: false,
            savedVocab: [],
            bookshelf: [],
            recentlyRead: [],
            streak: null,
          });
          return { isPaid: false };
        } catch (createErr) {
          console.error(
            'PocketBase syncUserProfile failed to create profile:',
            createErr,
          );
          return { isPaid: false };
        }
      }
      console.error('PocketBase syncUserProfile error:', error);
      return { isPaid: false };
    }
  }

  async updateUsername(userId: string, displayName: string): Promise<IUser> {
    const record = await pb.collection('users').update(userId, {
      name: displayName,
    });
    // Also update pb.authStore.record
    if (pb.authStore.record && pb.authStore.record.id === userId) {
      pb.authStore.record.name = displayName;
    }
    return toIUser(record);
  }
}
