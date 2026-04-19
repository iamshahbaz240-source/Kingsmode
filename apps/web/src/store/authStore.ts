import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  streak: number;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        localStorage.setItem('kingsmode_token', token);
        set({ user, token, isAuthenticated: true });
      },
      updateUser: (updates) =>
        set((s) => ({ user: s.user ? { ...s.user, ...updates } : null })),
      logout: () => {
        localStorage.removeItem('kingsmode_token');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    { name: 'kingsmode-auth' }
  )
);
