/**
 * ---
 * @customize  Dev-mode boot diagnostics.
 *
 *             Houses two unrelated boot-time concerns:
 *               1. `BigInt.prototype.toJSON` polyfill — global, runs in all
 *                  environments. Megapot reads return uint256 → bigint
 *                  everywhere; the polyfill catches any rogue
 *                  `JSON.stringify` in dev tooling, wallet SES shims, error
 *                  reporters, or observer notify paths.
 *               2. Placeholder + config warnings — gated on
 *                  `import.meta.env.DEV` so production stays silent.
 *                  Catches the three most common hurried-forker footguns:
 *                  using the dead-address referral recipient, the
 *                  unchanged TICKET_SOURCE, or a missing
 *                  VITE_WALLETCONNECT_PROJECT_ID (which silently degrades
 *                  the wallet picker — see `src/config/wagmi.ts`).
 *
 *             Imported once from `main.tsx`; no exports — pure side effects.
 * ---
 */

import { stringToHex } from 'viem';
import { getReferralAddress } from '@/lib/referral';
import { REFERRER_DEAD_DEFAULT, TICKET_SOURCE } from './contracts';

// Belt + suspenders for bigint JSON serialization. See `main.tsx` for the
// rationale — keep alongside `hashFn` from wagmi/query so nothing in the
// React tree can blow up on a bigint serialization.
// biome-ignore lint/suspicious/noExplicitAny: BigInt.prototype.toJSON is non-standard
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

if (import.meta.env.DEV) {
  if (getReferralAddress().toLowerCase() === REFERRER_DEAD_DEFAULT.toLowerCase()) {
    // biome-ignore lint/suspicious/noConsole: deliberate dev-mode diagnostic
    console.warn(
      '[megapot] The effective referral recipient is the dead address — save a wallet in Settings or set VITE_REFERRER_ADDRESS in .env to earn referral fees on every ticket and claim through this app. Any fees earned on the default address are unrecoverable.',
    );
  }
  // Only the upstream placeholder is unconfigured; open-megapot is intentional.
  const DEFAULT_SOURCE = stringToHex('open-megapot', { size: 32 });
  if (TICKET_SOURCE === DEFAULT_SOURCE) {
    // biome-ignore lint/suspicious/noConsole: deliberate dev-mode diagnostic
    console.warn(
      '[megapot] TICKET_SOURCE is the placeholder — set yours in src/config/contracts.ts so your purchases are attributed correctly in on-chain analytics.',
    );
  }
  if (!import.meta.env.VITE_WALLETCONNECT_PROJECT_ID) {
    // biome-ignore lint/suspicious/noConsole: deliberate dev-mode diagnostic
    console.warn(
      '[megapot] VITE_WALLETCONNECT_PROJECT_ID is empty — degraded wallet picker. Only injected wallets (MetaMask extension, Rabby, Brave, Phantom, etc.) and Coinbase Wallet are available; the WalletConnect QR modal, Rainbow, and MetaMask mobile deep links are disabled. Get a free projectId at https://cloud.walletconnect.com to enable the full RainbowKit modal.',
    );
  }
}
