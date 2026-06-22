import { create } from 'zustand';
import type { IUser } from '../services/types';

interface AuthState {
  currentUser: IUser | null;
  authChecking: boolean;
  setCurrentUser: (user: IUser | null) => void;
  setAuthChecking: (checking: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  authChecking: true,
  setCurrentUser: (user) => set({ currentUser: user }),
  setAuthChecking: (checking) => set({ authChecking: checking }),
}));
