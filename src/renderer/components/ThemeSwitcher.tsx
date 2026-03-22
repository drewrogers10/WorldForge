import { useThemeStore, type ThemePreset } from '@renderer/store/themeStore';

const presets: { id: ThemePreset; label: string }[] = [
  { id: 'preset-a', label: 'Green' },
  { id: 'preset-b', label: 'Gold' },
  { id: 'preset-c', label: 'Red' },
  { id: 'preset-d', label: 'Violet' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useThemeStore();

  return (
    <select
      aria-label="Theme"
      className="secondary-button"
      onChange={(e) => {
        setTheme(e.target.value as ThemePreset);
      }}
      style={{ padding: '0.6rem 1rem', width: 'auto', cursor: 'pointer', appearance: 'auto' }}
      value={theme}
    >
      {presets.map((preset) => (
        <option key={preset.id} value={preset.id}>
          {preset.label}
        </option>
      ))}
    </select>
  );
}
