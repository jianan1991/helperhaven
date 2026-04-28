import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiPublic, api } from './api';

export type UserRole = 'EMPLOYER' | 'HELPER' | 'ADMIN';
export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  locale: string;
  emailVerified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: AuthUser | null) => void;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (input: SignupInput) => Promise<AuthUser>;
  signOut: () => void;
  fetchMe: () => Promise<AuthUser | null>;
}

export interface SignupInput {
  email: string;
  password: string;
  role: 'EMPLOYER' | 'HELPER';
  locale?: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),

      signIn: async (email, password) => {
        const { data } = await apiPublic.post<AuthResponse>('/auth/login', { email, password });
        set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
        return data.user;
      },

      signUp: async (input) => {
        const { data } = await apiPublic.post<AuthResponse>('/auth/signup', {
          locale: 'en',
          ...input,
        });
        set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
        return data.user;
      },

      signOut: () => {
        set({ user: null, accessToken: null, refreshToken: null });
      },

      fetchMe: async () => {
        if (!get().accessToken) return null;
        try {
          const { data } = await api.get<AuthUser>('/auth/me');
          set({ user: data });
          return data;
        } catch {
          return null;
        }
      },
    }),
    {
      name: 'helperhaven.auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setUser(state.user);
        // Mark hydrated so guarded routes know it's safe to read tokens.
        useAuthStore.setState({ hydrated: true });
      },
    }
  )
);
