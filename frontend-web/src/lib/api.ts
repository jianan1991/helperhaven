import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from './auth';

/**
 * Single axios instance used by everything except the bare login/signup calls
 * (those use `apiPublic`). Attaches the access token, and on 401 tries one
 * refresh-token round-trip before giving up and signing the user out.
 */
const baseURL = import.meta.env.VITE_API_BASE ?? '/api';

export const apiPublic = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) cfg.headers.set('Authorization', `Bearer ${token}`);
  return cfg;
});

let refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  const refresh = useAuthStore.getState().refreshToken;
  if (!refresh) return null;
  try {
    const { data } = await apiPublic.post<{
      accessToken: string;
      refreshToken: string;
    }>('/auth/refresh', { refreshToken: refresh });
    useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    useAuthStore.getState().signOut();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      refreshing ??= tryRefresh().finally(() => {
        refreshing = null;
      });
      const token = await refreshing;
      if (token) {
        // Delete the stale header — the request interceptor will re-attach
        // the fresh token from the store on the retry.
        original.headers?.delete?.('Authorization');
        return api.request(original);
      }
    }
    // Any 403 on the interests endpoint means wrong account type — sign out so the user
    // is immediately prompted to log in with the correct account.
    if (err.response?.status === 403 && err.config?.url?.includes('/interests/')) {
      useAuthStore.getState().signOut();
    }
    return Promise.reject(err);
  }
);

/** Extract a friendly message from an axios error response. */
export function asMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; error?: string } | undefined;
    return data?.message ?? data?.error ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
