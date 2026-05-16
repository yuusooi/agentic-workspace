import { create } from 'zustand';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  can_create_project: boolean;
  avatar: string | null;
}

const TOKEN_KEY = 'aw_access_token';
const REFRESH_KEY = 'aw_refresh_token';
const USER_KEY = 'aw_user';

function loadFromStorage(): { accessToken: string | null; refreshToken: string | null; user: AuthUser | null } {
  try {
    const accessToken = localStorage.getItem(TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    const user = userJson ? JSON.parse(userJson) : null;
    return { accessToken, refreshToken, user };
  } catch {
    return { accessToken: null, refreshToken: null, user: null };
  }
}

function saveToStorage(user: AuthUser, accessToken: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;

  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const stored = loadFromStorage();

export const useAuthStore = create<AuthState>((set) => ({
  user: stored.user,
  isAuthenticated: !!stored.accessToken && !!stored.user,
  accessToken: stored.accessToken,
  refreshToken: stored.refreshToken,

  setAuth: (user, accessToken, refreshToken) => {
    saveToStorage(user, accessToken, refreshToken);
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    set({ accessToken, refreshToken });
  },

  logout: () => {
    clearStorage();
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));
