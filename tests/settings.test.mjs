import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server, keys, navigation, api;
const values = new Map();
before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: { server: createHttpServer() } },
    define: {
      'import.meta.env.VITE_MEGAPOT_API_KEY': '"mpk_live_environment"',
      'import.meta.env.VITE_FALLBACK_MEGAPOT_API_KEY': '""',
    },
  });
  globalThis.window = Object.assign(new EventTarget(), {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  });
  keys = await server.ssrLoadModule('/src/lib/apiKey.ts');
  navigation = await server.ssrLoadModule('/src/lib/navigation.ts');
  api = await server.ssrLoadModule('/src/lib/api.ts');
});
after(async () => {
  delete globalThis.window;
  await server?.close();
});
test('local key overrides env, blank clears, invalid values are rejected', () => {
  assert.equal(keys.getApiKey(), 'mpk_live_environment');
  keys.saveApiKey(' mpk_live_personal ');
  assert.equal(keys.getApiKey(), 'mpk_live_personal');
  assert.throws(() => keys.saveApiKey('mpk_live_****'));
  assert.throws(() => keys.saveApiKey('bad key'));
  assert.equal(keys.getApiKey(), 'mpk_live_personal');
  keys.saveApiKey(' ');
  assert.equal(keys.getApiKey(), 'mpk_live_environment');
  values.set(keys.API_KEY_STORAGE_KEY, 'corrupt');
  assert.equal(keys.getApiKey(), 'mpk_live_environment');
});
test('each API request uses the current saved key without reloading the client', async () => {
  const original = globalThis.fetch;
  const headers = [];
  globalThis.fetch = async (_url, options) => {
    headers.push(options.headers.Authorization);
    return new Response(JSON.stringify({ data: {} }), { status: 200 });
  };
  try {
    keys.saveApiKey('mpk_live_first');
    await api.api.activeRound();
    keys.saveApiKey('mpk_live_second');
    await api.api.activeRound();
    keys.saveApiKey('');
    await api.api.activeRound();
    assert.deepEqual(headers, [
      'Bearer mpk_live_first',
      'Bearer mpk_live_second',
      'Bearer mpk_live_environment',
    ]);
  } finally {
    globalThis.fetch = original;
  }
});
test('routes resolve direct links, trailing slash, legacy referral, and disabled LP', () => {
  for (const page of ['play', 'tickets', 'history', 'settings']) {
    assert.equal(navigation.pageFromPath(`/${page}`), page);
    assert.equal(navigation.pageFromPath(`/${page}/`), page);
  }
  assert.equal(navigation.pageFromPath('/'), 'home');
  assert.equal(navigation.pageFromPath('/referral'), 'settings');
  assert.equal(navigation.pageFromPath('/lp'), 'home');
  assert.equal(navigation.pageFromPath('/unknown'), 'home');
});

test('blocked storage falls back to env and reports save errors', () => {
  const storage = window.localStorage;
  window.localStorage = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
    removeItem() {
      throw new Error('blocked');
    },
  };
  try {
    assert.equal(keys.getApiKey(), 'mpk_live_environment');
    assert.throws(() => keys.saveApiKey('mpk_live_personal'));
    assert.throws(() => keys.saveApiKey(''));
  } finally {
    window.localStorage = storage;
  }
});

test('blank environment and no local key produce anonymous request headers', async () => {
  const anonymousServer = await createServer({
    server: { middlewareMode: true, hmr: { server: createHttpServer() } },
    define: {
      'import.meta.env.VITE_MEGAPOT_API_KEY': '"  "',
      'import.meta.env.VITE_FALLBACK_MEGAPOT_API_KEY': '""',
    },
  });
  const original = globalThis.fetch;
  try {
    values.clear();
    const client = await anonymousServer.ssrLoadModule('/src/lib/api.ts');
    let authorization;
    globalThis.fetch = async (_url, options) => {
      authorization = options.headers.Authorization;
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    };
    await client.api.activeRound();
    assert.equal(authorization, undefined);
  } finally {
    globalThis.fetch = original;
    await anonymousServer.close();
  }
});
