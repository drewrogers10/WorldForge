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

export function getThemeDetails(theme: ThemePreset) {
  switch (theme) {
    case 'preset-a':
      return {
        name: 'Organic Tech',
        heroLine1: 'Ecosystem is the',
        heroLine2: 'Evolution.',
      };
    case 'preset-b':
      return {
        name: 'Midnight Luxe',
        heroLine1: 'Excellence meets',
        heroLine2: 'Refinement.',
      };
    case 'preset-c':
      return {
        name: 'Brutalist Signal',
        heroLine1: 'Access the',
        heroLine2: 'Control.',
      };
    case 'preset-d':
      return {
        name: 'Vapor Clinic',
        heroLine1: 'Synthesis beyond',
        heroLine2: 'Transcendence.',
      };
    default:
      return {
        name: 'Default',
        heroLine1: 'System is',
        heroLine2: 'Engaged.',
      };
  }
}
