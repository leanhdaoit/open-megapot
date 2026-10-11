/**
 * ---
 * @skill      https://llms.megapot.io/tasks/buy-tickets
 *             https://llms.megapot.io/tasks/buy-bulk
 *             https://llms.megapot.io/tasks/subscribe
 * @customize  Aurora presentation uses the shared card and brand tokens.
 *             API ball bounds and closing time drive the builder; price and
 *             lock state remain on-chain because the API omits them. Explicit
 *             one-time picks are bought in chunks of 10, preserving the rest
 *             for subsequent purchases. Subscription uses its own spender.
 * ---
 */

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { ApprovalButton } from '@/components/common/ApprovalButton';
import { Button } from '@/components/common/Button';
import { PageIntro } from '@/components/common/PageIntro';
import { TxStatus } from '@/components/common/TxStatus';
import { UsdcAmount } from '@/components/common/UsdcAmount';
import { BulkProgress } from '@/components/lottery/BulkProgress';
import { Countdown } from '@/components/lottery/Countdown';
import { type BuyMode, SubscriptionToggle } from '@/components/lottery/SubscriptionToggle';
import { TicketBuilder } from '@/components/lottery/TicketBuilder';
import { ActiveSubscription } from '@/components/tickets/ActiveSubscription';
import { JACKPOT_ADDRESS, JACKPOT_AUTO_SUBSCRIPTION_ADDRESS } from '@/config/contracts';
import { COPY } from '@/config/copy';
import { useActiveRound } from '@/hooks/useActiveRound';
import { useBulkPurchase } from '@/hooks/useBulkPurchase';
import { useBuyTickets } from '@/hooks/useBuyTickets';
import { useConfirmedFlash } from '@/hooks/useConfirmedFlash';
import { useJackpotState } from '@/hooks/useJackpotState';
import { useSubscribe } from '@/hooks/useSubscribe';
import { API_BASE_URL, QK } from '@/lib/api';
import type { ManagedTicket } from '@/lib/ticketGroups';
import { totalCost as computeTotalCost, isValidTicket } from '@/lib/tickets';

export function Play() {
  const { isConnected } = useAccount();
  const { state, phase, drawingId, refetch: refetchJackpotState } = useJackpotState();
  const activeRound = useActiveRound();
  const round = activeRound.data;
  const ballMax = round?.ball_pool.normals_max;
  const bonusballMax = round?.ball_pool.bonusball_max;
  const ticketPrice = state?.ticketPrice;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const closesAt = round?.ended_at ? Date.parse(round.ended_at) : NaN;
  const roundReady =
    !!round &&
    !activeRound.isError &&
    round.status === 'active' &&
    Number.isFinite(closesAt) &&
    now < closesAt &&
    String(drawingId) === round.id;

  const [mode, setMode] = useState<BuyMode>(() => {
    const initial = new URLSearchParams(window.location.search).get('mode');
    return initial === 'combo' || initial === 'subscription' ? initial : 'one-time';
  });
  function changeMode(next: BuyMode) {
    setMode(next);
    const url = new URL(window.location.href);
    if (next === 'one-time') url.searchParams.delete('mode');
    else url.searchParams.set('mode', next);
    window.history.replaceState(null, '', url);
  }
  const [totalDays, setTotalDays] = useState<number>(7);
  const [selections, setSelections] = useState<Record<BuyMode, ManagedTicket[]>>({
    'one-time': [],
    combo: [],
    subscription: [],
  });
  const customTickets = selections[mode];
  const selectionHandlers = useMemo(
    () =>
      Object.fromEntries(
        (['one-time',  'combo', 'subscription'] as const).map((tab) => [
          tab,
          (tickets: ManagedTicket[]) =>
            setSelections((previous) => ({ ...previous, [tab]: tickets })),
        ]),
      ) as Record<BuyMode, (tickets: ManagedTicket[]) => void>,
    [],
  );
  const [purchasedIds, setPurchasedIds] = useState<Record<BuyMode, number[]>>({
    'one-time': [],
    combo: [],
    subscription: [],
  });
  const submittedMode = useRef<BuyMode>('one-time');
  const submitted = useRef<ManagedTicket[]>([]);
  const handledHash = useRef<string | undefined>(undefined);
  const count = customTickets.length;

  const route = mode === 'subscription' ? 'subscribe' : 'jackpot';

  const cost = useMemo(
    () =>
      ticketPrice !== undefined
        ? computeTotalCost({
            ticketPriceUsdcRaw: ticketPrice,
            count,
            totalDays: mode === 'subscription' ? totalDays : 1,
          })
        : undefined,
    [ticketPrice, count, totalDays, mode],
  );

  const spender = route === 'subscribe' ? JACKPOT_AUTO_SUBSCRIPTION_ADDRESS : JACKPOT_ADDRESS;

  const buy = useBuyTickets();
  const bulk = useBulkPurchase();
  useEffect(() => {
    if (!buy.isSuccess || !buy.txHash || handledHash.current === buy.txHash) return;
    handledHash.current = buy.txHash;
    const ids = submitted.current.map((ticket) => ticket.id);
    const tab = submittedMode.current;
    setPurchasedIds((previous) => ({ ...previous, [tab]: ids }));
    setSelections((previous) => ({
      ...previous,
      [tab]: previous[tab].filter((ticket) => !ids.includes(ticket.id)),
    }));
  }, [buy.isSuccess, buy.txHash]);
  const sub = useSubscribe();
  const queryClient = useQueryClient();

  // Reset write-hook state when route changes so a stale "Confirmed" pill from
  // one route doesn't leak into another. `route` is the change trigger; the
  // `.reset` callbacks are stable references but listed so Biome knows we're
  // calling them deliberately.
  // biome-ignore lint/correctness/useExhaustiveDependencies: route is the trigger; reset() bodies do not use it
  useEffect(() => {
    buy.reset();
    bulk.create.reset();
    sub.create.reset();
  }, [route, buy.reset, bulk.create.reset, sub.create.reset]);

  // Invalidate the wallet-scoped Data API caches the moment a buy confirms so
  // the Tickets page reflects the new ticket without waiting for staleTime to
  // expire. The matching read paths live in `useUserTickets`,
  // `useWalletWins`, and `useWalletStats`.
  //
  // Also force-refetch the jackpot state — `globalTicketsBought` (rendered as
  // "Tickets sold" on Home) has no contract event we can subscribe to, so
  // without an explicit refetch the homepage stat lags by up to one
  // polling window (30 s during the `open` phase). USDC balance + allowance
  // self-refresh via their own Transfer / Approval event watchers in
  // `useUsdcBalance` + `useUsdcAllowance`, so nothing else needs nudging here.
  const buyJustConfirmed = buy.isSuccess || bulk.create.isSuccess || sub.create.isSuccess;
  useEffect(() => {
    if (!buyJustConfirmed) return;
    for (const resource of [
      QK.walletTicketsByRound,
      QK.walletTickets,
      QK.walletStats,
      QK.walletWins,
    ]) {
      queryClient.invalidateQueries({
        queryKey: [QK.NS, API_BASE_URL, resource],
      });
    }
    refetchJackpotState();
  }, [buyJustConfirmed, queryClient, refetchJackpotState]);

  const buyDisabled =
    !isConnected ||
    !cost ||
    !roundReady ||
    !ballMax ||
    !bonusballMax ||
    customTickets.some((ticket) => !isValidTicket(ticket, { ballMax, bonusballMax })) ||
    phase !== 'open';

  const onSubmit = () => {
    if (buyDisabled || Date.now() >= closesAt) return;
    const randomCount = Math.max(0, count - customTickets.length);
    if (route === 'jackpot') {
      if (!ballMax || !bonusballMax) return;
      submittedMode.current = mode;
      submitted.current = customTickets.slice(0, 10);
      buy.buy({
        customTickets: submitted.current,
        randomCount,
        ballMax,
        bonusballMax,
      });
    } else {
      sub.createSubscription({
        totalDays,
        dynamicCount: randomCount,
        staticTickets: customTickets,
      });
    }
  };

  const activeWrite = route === 'jackpot' ? buy : sub.create;

  // Brief "✓ Done!" window after the tx confirms — keeps the user on the same
  // page (no jarring snap back to the idle label) and auto-resets the write
  // hook so the button returns to its normal state once the moment passes.
  const confirmed = useConfirmedFlash(activeWrite.isSuccess, activeWrite.reset);

  // In-flight bulk order surfacing — read on mount + live event updates
  const orderInfo = bulk.orderInfo as
    | {
        batchOrder: {
          totalTicketsOrdered: bigint;
          remainingTickets: bigint;
          remainingUSDC: bigint;
        };
      }
    | undefined;
  const hasInFlightOrder = orderInfo && orderInfo.batchOrder.remainingTickets > 0n;

  return (
    <div className="page-content space-y-6">
      <PageIntro
        eyebrow={COPY.playEyebrow}
        title={COPY.playTitle}
        description={COPY.playDescription}
      />
      {!isConnected && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          {COPY.connectToBuy}
        </div>
      )}

      {phase !== 'open' && isConnected && (
        <div className="rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {COPY.ticketsPaused}. Wait for the next drawing to open.
        </div>
      )}

      {hasInFlightOrder && orderInfo && (
        <BulkProgress
          totalTickets={orderInfo.batchOrder.totalTicketsOrdered}
          remainingTickets={orderInfo.batchOrder.remainingTickets}
          remainingUSDC={orderInfo.batchOrder.remainingUSDC}
        />
      )}

      <section className="card-pad-lg mx-auto max-w-3xl space-y-6">
        <p className="eyebrow">{COPY.purchaseSteps}</p>
        <fieldset disabled={buy.isPending || sub.create.isPending}>
          <SubscriptionToggle
            mode={mode}
            onModeChange={changeMode}
            totalDays={totalDays}
            onTotalDaysChange={setTotalDays}
          />
        </fieldset>

        {/*
          Subscription mode is a two-flow surface. When an active
          subscription exists, the contract reverts
          `createSubscription` with `ActiveSubscriptionExists()` — the
          user must cancel and wait for on-chain confirmation before
          creating a new one. Rather than show both Create + Cancel
          surfaces (the pre-cleanup behavior), branch on
          `hasActiveSubscription` so only one path is ever visible:
            - active   → <ActiveSubscription /> (Cancel-only)
            - inactive → <TicketBuilder /> + Subscribe submit
          After `sub.cancel` confirms, `getSubscriptionInfo` reverts,
          `hasActiveSubscription` flips false, and the UI swaps to the
          Create surface naturally.

          The one-time mode is unaffected — the
          builder/total/approve/buy block below renders for any
          non-subscription route.
        */}
        {mode === 'subscription' && sub.hasActiveSubscription ? (
          <ActiveSubscription />
        ) : (
          <>
            <div className="text-sm text-zinc-500">
              Round #{round?.id ?? '—'} · Ticket price:{' '}
              <UsdcAmount value={ticketPrice} precision={2} />
              <Countdown
                drawingTimeUnix={
                  Number.isFinite(closesAt) ? BigInt(Math.floor(closesAt / 1000)) : undefined
                }
              />
              <p>
                {phase === 'open' && roundReady
                  ? 'Open for tickets'
                  : 'Purchases paused — waiting for an open round.'}
              </p>
            </div>
            <fieldset disabled={activeWrite.isPending}>
              {ballMax && bonusballMax ? (
                (['one-time', 'combo', 'subscription'] as const).map((tab) => (
                  <div key={tab} hidden={mode !== tab}>
                    {tab === 'combo' && (
                      <div className="mb-4 space-y-2">
                        <h2 className="text-xl font-semibold">Combo Play</h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Your numbers, every combination. Pick 6–12 main numbers and one bonus.
                          Selected tickets enter the current round with a one-time purchase.
                        </p>
                      </div>
                    )}
                    <TicketBuilder
                      combo={tab === 'combo'}
                      ballMax={ballMax}
                      bonusballMax={bonusballMax}
                      purchasedIds={purchasedIds[tab]}
                      onTicketsChange={selectionHandlers[tab]}
                    />
                  </div>
                ))
              ) : (
                <p>
                  {activeRound.isError
                    ? 'Unable to load the active round. Please retry.'
                    : 'Loading active round…'}
                </p>
              )}
            </fieldset>
            {mode !== 'subscription' && count > 10 && (
              <p className="text-sm text-zinc-500">
                {count} tickets selected. Buy up to 10 per transaction; confirmed tickets are
                deselected automatically. Remaining tickets stay ready for the next purchase.
              </p>
            )}
            <div className="flex flex-wrap items-baseline justify-between gap-3 rounded-2xl border border-brand-primary-200 bg-brand-primary-50 p-5 dark:border-brand-primary-900 dark:bg-brand-primary-950/50">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Total {mode === 'subscription' ? '(paid upfront)' : ''}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                <UsdcAmount value={cost} precision={2} />
              </span>
            </div>

            {mode !== 'subscription' && count > 10 && (
              <p className="text-sm">
                Next transaction:{' '}
                <UsdcAmount
                  value={ticketPrice === undefined ? undefined : ticketPrice * 10n}
                  precision={2}
                />
              </p>
            )}
            <ApprovalButton spender={spender} amount={cost ?? 0n}>
              <Button
                variant="primary"
                size="md"
                onClick={onSubmit}
                disabled={buyDisabled || activeWrite.isPending || confirmed}
                className="w-full"
              >
                {activeWrite.isWaitingSignature
                  ? 'Sign in your wallet…'
                  : activeWrite.isMining
                    ? 'Confirming on-chain…'
                    : confirmed
                      ? route === 'subscribe'
                        ? '✓ Subscribed!'
                        : '✓ Bought!'
                      : route === 'jackpot'
                        ? `Buy ${Math.min(count, 10)} ${count === 1 ? 'ticket' : 'tickets'}${count > 10 ? ' · next batch' : ''}`
                        : `Subscribe — ${count} ${count === 1 ? 'ticket' : 'tickets'} per drawing for ${totalDays} ${totalDays === 1 ? 'drawing' : 'drawings'}`}
              </Button>
            </ApprovalButton>

            <TxStatus
              hash={activeWrite.txHash}
              isPending={activeWrite.isPending}
              isSuccess={activeWrite.isSuccess}
              error={activeWrite.error}
            />

            {import.meta.env.DEV && (
              <p className="text-center text-xs text-zinc-500">
                Routing via{' '}
                <span className="font-[ui-monospace,SFMono-Regular,Menlo,Consolas,monospace] font-medium">
                  {route}
                </span>
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
