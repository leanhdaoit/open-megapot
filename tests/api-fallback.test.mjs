import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

const primary = 'mpk_live_primary';
const fallback = 'mpk_live_fallback';
const servers = [];
let client, keys;
const values = new Map();
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;

async function loadClient(primaryKey = primary, fallbackKey = fallback) {
  const server = await createServer({
    server: { middlewareMode: true, hmr: { server: createHttpServer() } },
    optimizeDeps: { noDiscovery: true, include: [] },
    define: {
      'import.meta.env.VITE_MEGAPOT_API_KEY': JSON.stringify(primaryKey),
      'import.meta.env.VITE_FALLBACK_MEGAPOT_API_KEY': JSON.stringify(fallbackKey),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify('https://api.megapot.io/v1'),
    },
  });
  servers.push(server);
  return {
    client: await server.ssrLoadModule('/src/lib/api.ts'),
    keys: await server.ssrLoadModule('/src/lib/apiKey.ts'),
  };
}

function errorResponse(status, code, headers = {}) {
  return new Response(
    JSON.stringify({ error: { code, message: 'Rejected', request_id: 'req_test' } }),
    {
      status,
      headers,
    },
  );
}

async function withResponses(responses, run) {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), ...options });
    const response = responses.shift();
    assert.ok(response, 'Unexpected extra request');
    if (typeof response === 'function') return response();
    return response;
  };
  try {
    await run(calls);
  } finally {
    globalThis.fetch = originalFetch;
    values.clear();
  }
}

before(async () => {
  globalThis.window = Object.assign(new EventTarget(), {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  });
  ({ client, keys } = await loadClient());
});
after(async () => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  await Promise.all(servers.map((server) => server.close()));
});

for (const [status, code] of [
  [401, 'invalid_api_key'],
  [403, 'revoked_api_key'],
  [403, 'key_environment_mismatch'],
]) {
  test(`falls back once for ${status} ${code}, preserving URL and signal`, async () => {
    const signal = new AbortController().signal;
    await withResponses(
      [errorResponse(status, code), Response.json({ data: [] })],
      async (calls) => {
        assert.deepEqual(await client.api.listRounds({ limit: 7, cursor: 'next token', signal }), {
          data: [],
        });
        assert.equal(calls.length, 2);
        assert.deepEqual(
          calls.map((c) => c.headers.Authorization),
          [`Bearer ${primary}`, `Bearer ${fallback}`],
        );
        assert.equal(calls[0].url, calls[1].url);
        assert.equal(new URL(calls[1].url).searchParams.get('cursor'), 'next token');
        assert.equal(calls[1].signal, signal);
      },
    );
  });
}

test('Settings key has priority, is not overwritten, and is tried again on the next request', async () => {
  keys.saveApiKey('mpk_live_personal');
  await withResponses(
    [errorResponse(401, 'invalid_api_key'), Response.json({}), Response.json({})],
    async (calls) => {
      await client.api.activeRound();
      assert.equal(keys.getApiKey(), 'mpk_live_personal');
      await client.api.activeRound();
      assert.deepEqual(
        calls.map((c) => c.headers.Authorization),
        ['Bearer mpk_live_personal', `Bearer ${fallback}`, 'Bearer mpk_live_personal'],
      );
    },
  );
});

for (const [status, code] of [
  [429, 'rate_limited'],
  [503, 'upstream_unavailable'],
  [500, 'internal_error'],
  [400, 'invalid_request'],
  [404, 'not_found'],
  [403, 'forbidden'],
  [401, 'unknown'],
  [500, 'invalid_api_key'],
]) {
  test(`does not rotate keys for ${status} ${code}`, async () => {
    await withResponses([errorResponse(status, code, { 'Retry-After': '17' })], async (calls) => {
      await assert.rejects(client.api.activeRound(), (error) => {
        assert.equal(error.status, status);
        assert.equal(error.code, code);
        assert.equal(error.requestId, 'req_test');
        assert.equal(error.retryAfter, 17);
        assert.equal(
          client.apiQueryRetry.retry(0, error),
          code === 'rate_limited' || code === 'upstream_unavailable',
        );
        assert.equal(client.apiQueryRetry.retry(3, error), false);
        assert.equal(client.apiQueryRetry.retryDelay(0, error), 17000);
        return true;
      });
      assert.equal(calls.length, 1);
    });
  });
}

test('fallback failure surfaces its error without a third request', async () => {
  await withResponses(
    [errorResponse(401, 'invalid_api_key'), errorResponse(403, 'revoked_api_key')],
    async (calls) => {
      await assert.rejects(client.api.activeRound(), { status: 403, code: 'revoked_api_key' });
      assert.equal(calls.length, 2);
    },
  );
});

test('network failure and malformed error envelopes do not rotate keys', async () => {
  for (const response of [
    () => {
      throw new TypeError('Network error');
    },
    new Response('not JSON', { status: 401 }),
    Response.json(null, { status: 403 }),
    Response.json({ error: {} }, { status: 401 }),
  ]) {
    await withResponses([response], async (calls) => {
      await assert.rejects(client.api.activeRound());
      assert.equal(calls.length, 1);
    });
  }
});

test('cancellation between auth rejection and fallback prevents another fetch', async () => {
  const controller = new AbortController();
  await withResponses(
    [
      () => {
        controller.abort();
        return errorResponse(401, 'invalid_api_key');
      },
    ],
    async (calls) => {
      await assert.rejects(client.api.activeRound({ signal: controller.signal }), {
        name: 'AbortError',
      });
      assert.equal(calls.length, 1);
    },
  );
});

test('missing or identical fallback never resends the rejected key', async () => {
  for (const fallbackKey of ['  ', ` ${primary} `]) {
    const { client: other } = await loadClient(primary, fallbackKey);
    await withResponses([errorResponse(401, 'invalid_api_key')], async (calls) => {
      await assert.rejects(other.api.activeRound(), { code: 'invalid_api_key' });
      assert.equal(calls.length, 1);
    });
  }
});

test('missing primary uses trimmed fallback directly, or anonymous when both are empty', async () => {
  for (const fallbackKey of [` ${fallback} `, '  ']) {
    const { client: other } = await loadClient(' ', fallbackKey);
    await withResponses([Response.json({})], async (calls) => {
      await other.api.activeRound();
      assert.equal(calls.length, 1);
      assert.equal(
        calls[0].headers.Authorization,
        fallbackKey.trim() ? `Bearer ${fallback}` : undefined,
      );
    });
  }
});
