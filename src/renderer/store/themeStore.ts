import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreset = 'preset-a' | 'preset-b' | 'preset-c' | 'preset-d';

type ThemeState = {
  theme: ThemePreset;
  setTheme: (theme: ThemePreset) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'preset-a',
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },
    }),
    {
      name: 'worldforge-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      },
    }
  )
);
