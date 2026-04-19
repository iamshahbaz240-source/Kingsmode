import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'golden';

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
}

export const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute('data-theme', theme);
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'golden' : 'dark';
        applyTheme(next);
        set({ theme: next });
      },
    }),
    { name: 'kingsmode-theme' }
  )
);
