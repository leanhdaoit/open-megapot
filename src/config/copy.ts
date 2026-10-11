/**
 * ---
 * @customize  Single edit point for brand voice / i18n. Forks change the
 *             values below; React consumers stay unchanged.
 *
 *             This holds ONLY static UI copy — connect prompts, banners,
 *             section headings, action labels. Error messages from API
 *             responses and wagmi stay where they are (they're dynamic).
 *
 *             Patterns:
 *               - Use simple string literals; no template variables in
 *                 keys. If a string needs a parameter (e.g. ticket count),
 *                 keep the JSX templated and only hoist the static parts.
 *               - Group by surface: app-shell first, then per-page.
 * ---
 */
export const COPY = {
  // App shell
  /** Wallet-connect modal title — fallback for missing or blank VITE_APP_NAME. */
  appName: 'Open Megapot',
  /** Header brand block — full name shown on every viewport. */
  brandShort: 'Open Megapot',
  /** Optional suffix for forks; Open Megapot uses the full brandShort. */
  brandSuffix: '',

  // Page introductions
  homeEyebrow: 'The next possibility',
  playEyebrow: 'Enter the drawing',
  ticketsEyebrow: 'Your collection',
  historyEyebrow: 'The archive',
  lpEyebrow: 'Liquidity',
  emptyTicketsTitle: 'Your collection starts here',
  settlementAsset: 'USDC · On Base',
  claimable: 'Claimable',
  homeTitle: 'A little possibility. A bigger tomorrow.',
  homeDescription: 'Explore the live prize pool and join the next drawing on Base.',
  homeOpenSourceTitle: 'Open source. Built to be shared.',
  homeOpenSourceDescription:
    'Explore the code, contribute improvements, or fork Open Megapot to make it your own.',
  homeOpenSourceLink: 'View source on GitHub',
  playTitle: 'Make your next move.',
  playDescription: 'Choose your numbers, find your rhythm, and enter the next drawing.',
  ticketsTitle: 'Your tickets. Your possibilities.',
  ticketsDescription: 'Follow your entries, manage subscriptions, and claim your winnings.',
  historyTitle: 'Every drawing has a story.',
  historyDescription: 'Explore past results, winning numbers, and prize breakdowns.',
  lpTitle: 'Power the prize pool.',
  lpDescription: 'Manage your USDC liquidity, deposits, and withdrawals.',
  prizePool: 'The current prize pool',
  prizeDescription: 'One drawing. A world of possibility.',
  playNow: 'Choose your numbers →',
  paused: 'Tickets paused',
  drawingCloses: 'Drawing closes in',
  purchaseSteps: 'Choose tickets → Approve USDC → Confirm entry',

  // Referral settings
  settingsEyebrow: 'Settings',
  settingsTitle: 'Make it your own.',
  settingsDescription:
    'Choose your theme and manage your referral wallet and Data API key on this browser.',
  referralAddressLabel: 'Referral wallet address',
  referralHelp:
    'Leave blank and save to use the app default. Only a wallet address is needed; no connection or signature is required.',
  referralSave: 'Save referral settings',
  referralInvalid: 'Enter a valid, non-zero EVM wallet address, or leave the field blank.',
  referralSaved: 'Referral settings saved on this browser.',
  referralStorageError:
    'Could not save settings. Allow local storage in your browser and try again.',
  referralEffective: 'Current referral recipient',
  referralSourceLocal: 'Using the address saved on this browser.',
  referralSourceDefault: 'Using the app default.',
  referralDeadWarning:
    'The current recipient is the dead address. Referral fees sent here cannot be recovered.',
  referralScope:
    'Applies to new ticket purchases, batch orders, and subscriptions created from this browser. Existing tickets, batch orders, and subscriptions keep their original referral recipient. Fees accrue on-chain; connect the recipient wallet on Tickets to claim available referral fees.',
  referralFootnote:
    'Choose the wallet that receives referral fees for your future purchases in Settings. Your choice is saved only on this browser.',
  referralNavigate: 'Open Settings →',

  apiKeyLabel: 'API_KEY',
  apiKeyHelp: 'Get your own Megapot Data API key from',
  apiKeyStorage:
    'Saved locally on this browser. Leave blank and save to use the app’s default key, or anonymous access if none is configured. Use a browser API key, not a server secret.',
  apiKeySave: 'Save API key',
  apiKeySaved: 'API key settings saved. Data will refresh using your updated settings.',
  apiKeyInvalid:
    'Enter your full mpk_live_ or mpk_dev_ key, or leave blank. Do not enter the placeholder asterisks.',

  // Play page
  connectToBuy: 'Connect your wallet to buy tickets.',
  /** Rendered when the current drawing's lifecycle phase blocks ticket sales. */
  ticketsPaused: 'Ticket sales are paused for this drawing',

  // Tickets page
  connectToViewTickets: 'Connect your wallet to view your tickets and claim winnings.',
  unclaimedWinsHeading: 'Wins to claim',

  // LP page
  connectToProvideLiquidity: 'Connect your wallet to deposit or withdraw liquidity.',

  // Footer
  disclaimerLineDesktop:
    'Infrastructure Participant interface — not operated by, affiliated with, or endorsed by Megapot. Participating assets may be lost.',
  disclaimerLineMobile: 'Participating assets may be lost',
  disclaimerLinkText: 'full disclaimer',
} as const;

export type CopyKey = keyof typeof COPY;
