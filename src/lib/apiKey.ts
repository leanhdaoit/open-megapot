/**
 * ---
 * @customize  Browser API key override. Resolve at request time, falling back
 *             to VITE_MEGAPOT_API_KEY, then anonymous requests. Never log keys.
 *             Blank saves remove the override; storage failures reach the form.
 * ---
 */
export const API_KEY_STORAGE_KEY = 'open-megapot:api-key';
const CHANGE_EVENT = 'open-megapot:api-key-changed';

export function isValidApiKey(value: string): boolean {
  return /^mpk_(live|dev)_[A-Za-z0-9_-]+$/.test(value.trim());
}

export function getSavedApiKey(): string | null {
  try {
    const key = window.localStorage.getItem(API_KEY_STORAGE_KEY)?.trim();
    return key && isValidApiKey(key) ? key : null;
  } catch {
    return null;
  }
}

export function getApiKey(): string | undefined {
  return getSavedApiKey() ?? (import.meta.env.VITE_MEGAPOT_API_KEY?.trim() || undefined);
}

export function saveApiKey(value: string): void {
  const key = value.trim();
  if (key && !isValidApiKey(key)) throw new Error('Invalid API key format');
  if (key) window.localStorage.setItem(API_KEY_STORAGE_KEY, key);
  else window.localStorage.removeItem(API_KEY_STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeApiKey(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === API_KEY_STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
