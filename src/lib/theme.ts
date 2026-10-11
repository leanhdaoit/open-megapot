/**
 * ---
 * @customize Saved appearance preference: light, dark, or system default.
 *             The resolved theme drives Tailwind, native controls and wallet UI.
 * ---
 */
export type ThemePreference = 'system' | 'light' | 'dark';
export const THEME_STORAGE_KEY = 'open-megapot:theme';
const CHANGE_EVENT = 'open-megapot:theme-change';

export function getThemePreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function getResolvedTheme(): 'light' | 'dark' {
  const preference = getThemePreference();
  return preference === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : preference;
}

export function saveThemePreference(preference: ThemePreference) {
  window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeTheme(onChange: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  media.addEventListener('change', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
    media.removeEventListener('change', onChange);
  };
}

export function initializeTheme() {
  const apply = () => {
    const theme = getResolvedTheme();
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  };
  apply();
  return subscribeTheme(apply);
}
