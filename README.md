# Open Megapot

Live app: [open-megapot.vercel.app](https://open-megapot.vercel.app/)

- Independent, customizable frontend for the Megapot on-chain lottery
- USDC-denominated on Base — mainnet (chain ID 8453) or Sepolia (84532)
- React 19 + wagmi v2 + Vite 6 + Tailwind v3 — zero backend required

## What this is

An emerald–cyan Aurora interface with responsive layouts, system light/dark themes,
and reduced-motion support. Built from the [Megapot starter kit](https://github.com/coordinationlabs/megapot-starter-kit).

A working six-page app you can clone, customize, and ship. Pages
cover the core protocol surface: live drawing state, ticket purchase
(jackpot / bulk / subscription), wallet stats + claims, LP deposit /
withdraw, paginated round history, and browser-local referral and API key settings.

This is the implementation companion to the
[`megapot-developer-toolkit`](https://llms.megapot.io) — the skills /
recipes / examples repo. Where the toolkit teaches *how to call the
contracts*, this kit shows *how to compose those calls into a working
app*.

Audience: human developers AND AI coding agents. Every file in `src/`
carries a JSDoc header with `@skill / @contract / @endpoint / @customize`
metadata so an agent dropped into the repo orients in one read. See
[`AGENTS.md`](./AGENTS.md) for the convention.

## Fork in 5 minutes

1. `git clone https://github.com/leanhdaoit/open-megapot open-megapot`
2. `cd open-megapot && pnpm bootstrap` — copies `.env.example`
   → `.env` (if missing) and runs `pnpm install`
3. Open `.env` and set `VITE_REFERRER_ADDRESS` to your wallet — you
   earn referral fees on tickets using the app default and their winnings;
   users may override the recipient in Settings. This is the one value most forks need
   to change; the kit ships with a dead-address default so it runs
   out of the box, but anything earned on the default is unrecoverable
4. (Optional, both recommended) Also in `.env`:
   - `VITE_MEGAPOT_API_KEY` — mint one at
     [megapot.io/dashboard](https://megapot.io/dashboard); lifts the
     anonymous tier (10/min, 500/day) to the partner tier (60/min,
     10K/day) so Tickets and History don't throttle under traffic
   - `VITE_WALLETCONNECT_PROJECT_ID` — without it, only browser-extension
     wallets (MetaMask, Rabby, Brave, etc.) and Coinbase Wallet work; the
     WalletConnect QR modal, Rainbow, and MetaMask mobile are disabled
5. `pnpm dev` — http://localhost:5173

The kit logs dev-mode warnings when `VITE_REFERRER_ADDRESS` or
`TICKET_SOURCE` are still the placeholders (see
[`src/config/diagnostics.ts`](./src/config/diagnostics.ts)) — so you
can't accidentally ship without setting attribution.

## Environment variables

| Var | What | What breaks if blank |
|---|---|---|
| `VITE_REFERRER_ADDRESS` | Default referral recipient when no browser override is saved | Defaults to a dead address (`0x…dEaD`); fees earned on it are unrecoverable |
| `VITE_CHAIN` | `mainnet` or `testnet` | Defaults to `mainnet`; must agree with `VITE_RPC_URL` |
| `VITE_RPC_URL` | Base / Base Sepolia HTTPS RPC | Defaults to public RPC — rate-limited, fine for local dev only |
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID | WC QR + Rainbow + MetaMask mobile disabled; injected wallets + Coinbase Wallet still work |
| `VITE_MEGAPOT_API_KEY` | Data API key (browser tier) — [Get a key](https://megapot.io/dashboard) | Empty = anonymous tier (10/min, 500/day) |
| `VITE_API_BASE_URL` | Override Data API URL — set to `/api/megapot` for the proxy tier | Empty = `https://api.megapot.io/v1` |
| `VITE_APP_NAME` | Label in wallet-connect modals | Falls back to `"Open Megapot"` |
| `MEGAPOT_API_KEY` | Server-side Data API key (proxy tier only) — [Get a key](https://megapot.io/dashboard) | Required if you deploy `server/proxy.ts` |

Full reference + commented defaults: [`.env.example`](./.env.example).

## File map

```
open-megapot/
  README.md            you are here
  AGENTS.md            JSDoc convention for agents      ⚙
  LICENSE              MIT
  llms.txt             flat file manifest
  .env.example         every env var with rationale
  index.html           HTML root + rebrand markers      ⚙
  tailwind.config.ts   brand.primary token scale        ⚙
  biome.json           lint + format config

  docs/
    ARCHITECTURE.md    API/RPC division + cadence + decisions
    CUSTOMIZE.md       rebrand checklist                ⚙
    DISCLAIMER.md      Infrastructure Participant notice
    designs/           historical specs

  src/
    main.tsx           providers + polyfills            ⚙
    App.tsx            URL-backed pages + Layout shell         ⚙
    config/            chain, wagmi, copy, diagnostics  ⚙
    hooks/             TanStack Query wrappers
    components/        UI primitives + sections         ⚙ (BrandMark, DisclaimerLink, Button)
    pages/             one per top-level tab
    lib/               api.ts, tickets.ts

  server/
    proxy.ts           framework-agnostic Hono proxy

  examples/
    deploy-vercel-function.ts
    deploy-cloudflare-worker.ts
    README.md
```

Files marked ⚙ are rebrand seams — see [`docs/CUSTOMIZE.md`](./docs/CUSTOMIZE.md).

## Customize

Nine ordered rebrand seams — brand identity, referrer attribution,
wallet provider, chain, LP feature toggle, API-key safety, allowance
strategy, disclaimer line, UI copy. Each is a single edit point with
a short rationale in [`docs/CUSTOMIZE.md`](./docs/CUSTOMIZE.md).

## Design choices

The kit makes a handful of deliberate choices that ripple beyond
their immediate file — API vs RPC split, exact-allowance approvals,
RainbowKit as a swappable wallet boundary, `useState` tab routing,
`bigint` everywhere for amounts. Rationale + swap paths in
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) § "Decisions worth
knowing".

## Deploy

The kit produces a static `dist/` (`pnpm build`). Three deploy shapes,
matching the three Data API key tiers — pick once per fork.

### Static hosting (anonymous tier)

No backend, no API key. Works on Vercel static, Cloudflare Pages,
GitHub Pages, Netlify, S3 + CloudFront, or any static host. Rate
limit: 10/min, 500/day per IP. Fine for local dev and low-traffic
deploys.

### With a browser key (higher tier)

Set `VITE_MEGAPOT_API_KEY` in your host's env vars. Higher tier
(60/min, 10K/day). Key ships in the browser bundle — acceptable for
the read-only Data API, rotate from the
[Megapot dashboard](https://megapot.io/dashboard) if leaked. Still
static-host friendly.

### With a proxy (recommended for production keys)

Deploy [`server/proxy.ts`](./server/proxy.ts) alongside the static
site, set `MEGAPOT_API_KEY` server-side and
`VITE_API_BASE_URL=/api/megapot` in the build. Key never reaches the
browser. The proxy is framework-agnostic (Hono); platform wrappers in
[`examples/`](./examples/README.md) cover Vercel Functions and
Cloudflare Workers.

## Documentation

- [`AGENTS.md`](./AGENTS.md) — JSDoc convention guide
- [`llms.txt`](./llms.txt) — flat file manifest for AI agents
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — API/RPC division +
  decisions
- [`docs/CUSTOMIZE.md`](./docs/CUSTOMIZE.md) — every rebrand seam
- [`docs/DISCLAIMER.md`](./docs/DISCLAIMER.md) — Infrastructure
  Participant interface notice
- Inline `@skill` links in every `src/` file → protocol-side docs at
  [`llms.megapot.io`](https://llms.megapot.io)

## License

MIT — see [`LICENSE`](./LICENSE).

## Disclaimer

This application is an Infrastructure Participant interface, not
operated by, affiliated with, or endorsed by Megapot. Participating
assets may be lost. Full text in
[`docs/DISCLAIMER.md`](./docs/DISCLAIMER.md).

## Settings

Open **Settings** next to **History**, enter a non-zero EVM wallet address,
and choose **Save referral settings**. No wallet connection or signature is needed.
The Home prize-tier footnote also links to this page.

Recipient priority is **saved browser address → `VITE_REFERRER_ADDRESS` →
`REFERRER_DEAD_DEFAULT`**. Save an empty field to remove the browser override.
Settings persist in localStorage on this browser/origin; they are not shared
with other devices and are not a referral link. Invalid input is rejected.
Invalid stored data is ignored; unavailable storage falls back to the app default
and failed saves show an error.

New direct purchases, batch orders, and subscriptions use the effective address
at submission time. Existing tickets/orders/subscriptions retain their original
recipient. To claim accrued fees, connect the recipient wallet and open Tickets.
Fees attributed to the dead-address fallback cannot be recovered.

Run `pnpm test:referral` to check address validation, local/env/dead precedence,
storage errors, and change notifications without sending transactions.

### Personal API key

On **Settings**, enter your own key in **API_KEY** (placeholder `mpk_live_****`).
Create a key at [Megapot dashboard](https://megapot.io/dashboard); enter the full
key, not the placeholder. Save it to localStorage on this browser. Blank + Save
removes the override: local key → `VITE_MEGAPOT_API_KEY` → anonymous access.
Use a browser key; server credentials belong in the backend proxy. Saving refreshes
Data API queries; it does not connect a wallet or send an on-chain transaction.

### Page URLs and refresh

Home is `/`; Play `/play`, Tickets `/tickets`, History `/history`, Settings
`/settings`. `/lp` is available only when LP is enabled. Navigation and browser
Back/Forward update the selected page; refreshing preserves it. Play and Tickets
show a connect-wallet message when disconnected; History and Settings stay public.
Configure production hosting to rewrite these page paths to `/index.html` with
HTTP 200, without rewriting `/api/*` or static assets. Vite provides this fallback
in development. Unknown paths display Home; `/referral` opens Settings.

Run `pnpm test:settings` for API key precedence, request headers, storage failures,
and URL route resolution.
