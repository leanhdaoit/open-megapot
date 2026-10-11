import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { after, before, test } from 'node:test';
import { createServer } from 'vite';

let server;
let referral;
let values;
const envAddress = '0x2222222222222222222222222222222222222222';
const localAddress = '0x1111111111111111111111111111111111111111';

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: { server: createHttpServer() } },
    define: { 'import.meta.env.VITE_REFERRER_ADDRESS': JSON.stringify(envAddress) },
  });
  referral = await server.ssrLoadModule('/src/lib/referral.ts');
  values = new Map();
  globalThis.window = Object.assign(new EventTarget(), {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  });
});

after(async () => {
  delete globalThis.window;
  await server?.close();
});

test('saved address overrides env; clearing it restores env and keeps other storage', () => {
  values.clear();
  values.set('unrelated', 'keep');
  assert.equal(referral.getReferralAddress(), envAddress);
  referral.saveReferralAddress(`  ${localAddress}  `);
  assert.equal(referral.getReferralAddress(), localAddress);
  assert.equal(values.get(referral.REFERRAL_STORAGE_KEY), localAddress);
  referral.saveReferralAddress('   ');
  assert.equal(referral.getReferralAddress(), envAddress);
  assert.equal(values.has(referral.REFERRAL_STORAGE_KEY), false);
  assert.equal(values.get('unrelated'), 'keep');
});

test('invalid and zero addresses cannot replace a saved preference', () => {
  referral.saveReferralAddress(localAddress);
  for (const value of ['not-a-wallet', '0x1234', `0x${'0'.repeat(40)}`]) {
    assert.throws(() => referral.saveReferralAddress(value));
    assert.equal(referral.getReferralAddress(), localAddress);
  }
  values.set(referral.REFERRAL_STORAGE_KEY, 'corrupt');
  assert.equal(referral.getReferralAddress(), envAddress);
});

test('normalizes valid addresses to checksum format', () => {
  referral.saveReferralAddress('0x52908400098527886e0f7030069857d2e4169ee7');
  assert.equal(referral.getReferralAddress(), '0x52908400098527886E0F7030069857D2E4169EE7');
});

test('storage failures do not crash reads or falsely report a successful save', () => {
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
  assert.equal(referral.getReferralAddress(), envAddress);
  assert.throws(() => referral.saveReferralAddress(localAddress));
  assert.throws(() => referral.saveReferralAddress(''));
  window.localStorage = storage;
});

test('notifies current tab and relevant cross-tab changes; cleanup unsubscribes', () => {
  let changes = 0;
  const unsubscribe = referral.subscribeReferralAddress(() => changes++);
  referral.saveReferralAddress(localAddress);
  for (const key of [referral.REFERRAL_STORAGE_KEY, null, 'unrelated']) {
    window.dispatchEvent(Object.assign(new Event('storage'), { key }));
  }
  assert.equal(changes, 3);
  unsubscribe();
  referral.saveReferralAddress('');
  assert.equal(changes, 3);
});

test('missing, blank, and whitespace env values resolve to dead fallback', async () => {
  values.clear();
  for (const value of [undefined, '', '  ']) {
    const fallbackServer = await createServer({
      server: { middlewareMode: true, hmr: { server: createHttpServer() } },
      define: { 'import.meta.env.VITE_REFERRER_ADDRESS': JSON.stringify(value) ?? 'undefined' },
    });
    try {
      const fallback = await fallbackServer.ssrLoadModule('/src/lib/referral.ts');
      assert.equal(fallback.getReferralAddress(), '0x000000000000000000000000000000000000dEaD');
      fallback.saveReferralAddress(localAddress);
      assert.equal(fallback.getReferralAddress(), localAddress);
      fallback.saveReferralAddress('');
    } finally {
      await fallbackServer.close();
    }
  }
});
