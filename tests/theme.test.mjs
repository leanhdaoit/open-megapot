import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';
let server, theme, cleanup;
const values = new Map();
const media = Object.assign(new EventTarget(), { matches: false });
const classes = new Set();
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: { server: createHttpServer() } } });
  globalThis.window = Object.assign(new EventTarget(), {
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
    matchMedia: () => media,
  });
  globalThis.document = { documentElement: { classList: { toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name) }, style: {} } };
  theme = await server.ssrLoadModule('/src/lib/theme.ts');
  cleanup = theme.initializeTheme();
});
after(async () => { cleanup(); delete globalThis.window; delete globalThis.document; await server.close(); });
test('system default responds to device changes', () => {
  assert.equal(theme.getThemePreference(), 'system');
  media.matches = true;
  media.dispatchEvent(new Event('change'));
  assert.ok(classes.has('dark'));
  assert.equal(document.documentElement.style.colorScheme, 'dark');
});
test('saved light preference overrides a dark device and is restored on initialization', () => {
  theme.saveThemePreference('light');
  assert.equal(values.get(theme.THEME_STORAGE_KEY), 'light');
  assert.equal(theme.getResolvedTheme(), 'light');
  assert.equal(classes.has('dark'), false);
  cleanup();
  cleanup = theme.initializeTheme();
  assert.equal(document.documentElement.style.colorScheme, 'light');
});
test('dark preference persists and returning to default follows the device again', () => {
  theme.saveThemePreference('dark');
  media.matches = false;
  media.dispatchEvent(new Event('change'));
  assert.equal(theme.getResolvedTheme(), 'dark');
  theme.saveThemePreference('system');
  assert.equal(theme.getResolvedTheme(), 'light');
  assert.equal(classes.has('dark'), false);
});
test('cross-tab preferences synchronize and invalid storage falls back to system', () => {
  values.set(theme.THEME_STORAGE_KEY, 'dark');
  window.dispatchEvent(new Event('storage'));
  assert.ok(classes.has('dark'));
  values.set(theme.THEME_STORAGE_KEY, 'invalid');
  window.dispatchEvent(new Event('storage'));
  assert.equal(theme.getThemePreference(), 'system');
  assert.equal(classes.has('dark'), false);
});
