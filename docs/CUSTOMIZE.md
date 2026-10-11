# Customize

Every rebrand seam in the kit, ordered as a checklist. Each section links
to the file you'd touch and the decision behind it.

If you want the reasoning behind a particular choice (e.g. "why RainbowKit
vs ConnectKit", "why exact-allowance approvals"), see
[`ARCHITECTURE.md`](./ARCHITECTURE.md) § "Decisions worth knowing".

Work through the sections in order. Most forks only touch the brand
identity + referrer attribution before shipping; everything else has
sane defaults.

## Brand identity

The visible "this is your app" surface. Five files cover it.

- **Logo** — [`src/components/layout/BrandMark.tsx`](../src/components/layout/BrandMark.tsx).
  Open-orbit M SVG; keep `public/favicon.svg` in sync. Replace the `<svg>` body
  with your mark; the header displays a 36×36 mark.
- **Color scale** — [`tailwind.config.ts`](../tailwind.config.ts) under
  `theme.extend.colors.brand.primary`. Edit the 50–950 emerald scale to
  your brand color; every `bg-brand-primary-600` / `text-brand-primary-900`
  in `src/` updates in one go.
- **User-facing English** — [`src/config/copy.ts`](../src/config/copy.ts).
  Single edit surface for connect prompts, headings, footer disclaimer
  lines, action labels. Dynamic error strings stay where they are.
- **HTML head** — [`index.html`](../index.html). Search for the
  `<!-- update on rebrand -->` markers — three spots: page title,
  `<meta name="theme-color">`, and the OG meta. Match `theme-color` to
  your brand palette. Aurora surfaces and finite animations live in `src/index.css`;
  wallet modal themes live in `src/main.tsx`. Keep their colors in sync.
- **Wallet-connect modal label** — `VITE_APP_NAME` in `.env` (read by
  [`src/config/wagmi.ts`](../src/config/wagmi.ts)). Falls back to
  `"Open Megapot"` if unset or blank. Shown in the RainbowKit / WalletConnect
  popups when a user signs.

## Referrer attribution

Where your fork earns money and how purchases are attributed in on-chain
analytics.

- **Settings page** — users can save a non-zero EVM wallet address locally.
  The order is **localStorage override → `VITE_REFERRER_ADDRESS` →
  `REFERRER_DEAD_DEFAULT`**. Saving a blank field clears the local override.
- **`VITE_REFERRER_ADDRESS`** (env) — deployment-default recipient when no
  valid local preference exists. Empty/whitespace uses
  `0x000000000000000000000000000000000000dEaD`; fees sent there are unrecoverable.
  Protocol fee rates remain `Jackpot.getDrawingState().referralFee` and
  `.referralWinShare`; choosing a recipient does not change the rates.
- **Storage and integration** — `src/lib/referral.ts` validates and reads
  `open-megapot:referrer-address`. The three purchase hooks read it immediately
  before submitting. This setting applies to new purchases/orders/subscriptions,
  not existing ones. Storage is origin-specific and shared between tabs, not
  tied to the connected wallet. Invalid stored addresses are ignored; failed
  writes are shown on the referrer form in Settings. Claims still require the recipient
  wallet and use the existing Tickets page.
- **`TICKET_SOURCE`** (in
  [`src/config/contracts.ts`](../src/config/contracts.ts)) — a `bytes32`
  identifier passed to `Jackpot.buyTickets` so your purchases are
  filterable in on-chain analytics. The default is
  `stringToHex('open-megapot', { size: 32 })`.

## Wallet provider

The kit ships with RainbowKit. Treated as a swappable boundary — only
two files know about it. The wallet picker degrades gracefully if
`VITE_WALLETCONNECT_PROJECT_ID` is empty (injected + Coinbase Wallet
only; no WC modal, Rainbow, or MetaMask mobile).

- [`src/config/wagmi.ts`](../src/config/wagmi.ts) — the
  `getDefaultConfig` call (chains, transports, projectId, appName).
- [`src/main.tsx`](../src/main.tsx) — the `<RainbowKitProvider>` wrapper
  + the `@rainbow-me/rainbowkit/styles.css` import.

Swap path to Privy / ConnectKit / vanilla wagmi: replace the config + the
provider wrapper. Everything downstream uses wagmi's vendor-neutral hooks
(`useAccount`, `useReadContract`, `useWriteContract`,
`useWatchContractEvent`) and stays untouched.

See `ARCHITECTURE.md` § "RainbowKit" for the choice rationale.

## Chain

Mainnet vs testnet is one env var.

- `VITE_CHAIN=mainnet | testnet` in `.env`.
- `VITE_RPC_URL` must agree with the chain — see
  [`.env.example`](../.env.example) for the mainnet/testnet defaults.

All contract addresses (USDC, Jackpot, BatchPurchaseFacilitator,
JackpotAutoSubscription, JackpotLPManager, etc.) and explorer URLs are
chain-resolved in [`src/config/contracts.ts`](../src/config/contracts.ts).
No code change needed.

## LP feature toggle

`LP_ENABLED` in
[`src/config/contracts.ts`](../src/config/contracts.ts) gates the LP
page and its nav entry. Default `false` — most forks surface only the
user-facing flows (Home / Play / Tickets / History / Settings). Flip to `true` to
expose deposit / withdraw to your users (typically operator-facing
forks).

The LP page module and its hooks/components stay in the bundle either
way; this is a runtime visibility toggle, not a tree-shake. A fork
that wants the bundle reduction can swap `src/App.tsx`'s LP import to
`React.lazy` and wrap the case in `<Suspense>`.

## API key settings and safety

The Settings page accepts a personal browser key from https://megapot.io/dashboard.
It overrides `VITE_MEGAPOT_API_KEY`; saving blank restores the environment key or
anonymous access. Settings uses `open-megapot:api-key` in localStorage.

Three tiers documented in [`.env.example`](../.env.example) and reasoned
about in [`ARCHITECTURE.md`](./ARCHITECTURE.md) § "Three-tier API key
handling".

- **Anonymous (default)** — no key, 10/min, 500/day. Static-host friendly.
- **Browser key** — `VITE_MEGAPOT_API_KEY`, 60/min, 10K/day. Key in the
  browser bundle; acceptable for the read-only Data API.
- **Proxy** — `MEGAPOT_API_KEY` (server-side) +
  `VITE_API_BASE_URL=/api/megapot` + deploy
  [`server/proxy.ts`](../server/proxy.ts). Wrappers in
  [`examples/`](../examples/README.md).

Mint keys at https://megapot.io/dashboard. The kit detects `mpk_dev_*`
keys in production builds and warns at boot.

## ApprovalButton allowance strategy

[`src/components/common/ApprovalButton.tsx`](../src/components/common/ApprovalButton.tsx)
approves the exact purchase amount by default — smaller blast radius if
any of the four USDC spenders is ever compromised.

To switch to approve-once (`maxUint256`) UX: edit one line — the `args`
of the `writeContract` call. The JSDoc on the file explains the
trade-off inline.

To swap or remove:

- **Repoint** to your disclaimer URL — edit `DISCLAIMER_URL` at the top
  of `DisclaimerLink.tsx` and update `docs/DISCLAIMER.md` (or your
  equivalent) so the two stay in sync.
- **Remove entirely** — drop the `<DisclaimerLink />` reference from
  [`src/components/layout/Footer.tsx`](../src/components/layout/Footer.tsx).
  No env plumbing, no string juggling.

## UI copy / brand voice

[`src/config/copy.ts`](../src/config/copy.ts) is the single edit surface
for all static user-facing English in the kit. Connect prompts, section
headings, footer lines, action labels. React consumers stay unchanged
when you swap the strings.

Dynamic error strings (from the API or wagmi) stay where they are —
they're not in `copy.ts` because they're not static.

## See also

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — design layer + decisions
- [`../AGENTS.md`](../AGENTS.md) — JSDoc convention used in every src file
- [`../examples/README.md`](../examples/README.md) — proxy deploy wrappers
- [`../README.md`](../README.md) — fork-in-5 + env + deploy
