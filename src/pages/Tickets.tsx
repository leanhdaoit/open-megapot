/**
 * ---
 * @skill      https://llms.megapot.io/data-api
 *             https://llms.megapot.io/tasks/read-state
 *             https://llms.megapot.io/tasks/claim-winnings
 *             https://llms.megapot.io/tasks/claim-referral-fees
 *             https://llms.megapot.io/tasks/subscribe
 * @customize  Aurora presentation uses the shared card and brand tokens.
 *             Reads split between live + historical:
 *               - WalletStatsCard, UnclaimedWins, PastRoundTickets → Data API (api.megapot.io)
 *               - CurrentDrawingTickets, ActiveSubscription, ClaimReferralFees → RPC
 *             ClaimReferralFees + ActiveSubscription render conditionally
 *             (no earnings / no subscription = hidden).
 *             PastRoundTickets uses `api.walletTickets` for the outer card
 *             list and `api.round` (lazy, on expansion) for matched-ball
 *             highlighting.
 * ---
 */

import { useAccount } from 'wagmi';
import { PageIntro } from '@/components/common/PageIntro';
import type { NavKey } from '@/components/layout/Nav';
import { ActiveSubscription } from '@/components/tickets/ActiveSubscription';
import { ClaimReferralFees } from '@/components/tickets/ClaimReferralFees';
import { CurrentDrawingTickets } from '@/components/tickets/CurrentDrawingTickets';
import { PastRoundTickets } from '@/components/tickets/PastRoundTickets';
import { UnclaimedWins } from '@/components/tickets/UnclaimedWins';
import { WalletStatsCard } from '@/components/tickets/WalletStatsCard';
import { COPY } from '@/config/copy';
import { useJackpotState } from '@/hooks/useJackpotState';

export function Tickets({ onNavigate }: { onNavigate: (k: NavKey) => void }) {
  const { address, isConnected } = useAccount();
  const { drawingId } = useJackpotState();

  if (!isConnected || !address) {
    return (
      <div className="page-content space-y-6">
        <PageIntro
          eyebrow={COPY.ticketsEyebrow}
          title={COPY.ticketsTitle}
          description={COPY.ticketsDescription}
        />
        <section className="empty-state card-pad-lg">
          <span aria-hidden="true" className="empty-orbit">
            ✧
          </span>
          <h2 className="text-xl font-semibold">{COPY.emptyTicketsTitle}</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {COPY.connectToViewTickets}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-content space-y-6">
      <PageIntro
        eyebrow={COPY.ticketsEyebrow}
        title={COPY.ticketsTitle}
        description={COPY.ticketsDescription}
      />
      <WalletStatsCard address={address} />
      <ClaimReferralFees />
      <ActiveSubscription />
      <CurrentDrawingTickets drawingId={drawingId} onNavigate={onNavigate} />
      <UnclaimedWins />
      <PastRoundTickets />
    </div>
  );
}
