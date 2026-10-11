/**
 * ---
 * @skill      https://llms.megapot.io/tasks/buy-tickets
 * @customize  Generic USDC approve flow. Pass any `spender` so one wrapper
 *             works across Jackpot / BatchPurchaseFacilitator /
 *             JackpotAutoSubscription / JackpotLPManager. Approves the exact
 *             amount (no leftover allowance) — change to `maxUint256` for
 *             "approve once" UX at the cost of a larger trust surface.
 *
 *             Children-passthrough pattern. Wrap the downstream submit
 *             button inside `<ApprovalButton>`; when allowance is
 *             insufficient we render the Approve button instead of the
 *             children, so the user only ever sees one CTA at a time:
 *
 *               <ApprovalButton spender={addr} amount={cost}>
 *                 <Button variant="primary" onClick={submit}>Buy</Button>
 *               </ApprovalButton>
 *
 *             Children show through whenever:
 *               - wallet is disconnected
 *               - amount is 0n (nothing to approve yet)
 *               - allowance query is still loading
 *               - allowance is already ≥ amount
 *
 *             so the submit CTA stays visible (and the parent can keep it
 *             disabled via its own guard) in every state except the brief
 *             "approval required" gate. Submitted approvals poll receipts every
 *             2 seconds on the configured chain; keep the hash and refresh
 *             allowance until the confirmed amount is visible before resetting.
 * ---
 */
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { erc20Abi } from 'viem';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { USDC_ADDRESS, VIEM_CHAIN } from '@/config/contracts';
import { useUsdcAllowance } from '@/hooks/useUsdcAllowance';
import { Button } from './Button';
import { TxStatus } from './TxStatus';
import { UsdcAmount } from './UsdcAmount';

export function ApprovalButton({
  spender,
  amount,
  onApproved,
  children,
}: {
  spender: `0x${string}`;
  amount: bigint;
  onApproved?: () => void;
  /** Rendered when no approval is needed (sufficient allowance, or pre-resolution states). */
  children?: ReactNode;
}) {
  const { address } = useAccount();
  const [submitted, setSubmitted] = useState<{
    owner: string;
    spender: string;
    amount: bigint;
  } | null>(null);
  const [replaced, setReplaced] = useState(false);
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: VIEM_CHAIN.id,
    pollingInterval: 2000,
    onReplaced: ({ reason }) => {
      // A fee bump preserves the approval; cancellation or a different tx does not.
      if (reason !== 'repriced') setReplaced(true);
    },
  });
  const matchesSubmission = submitted?.owner === address && submitted?.spender === spender;
  const confirmed = receipt.isSuccess && !replaced && matchesSubmission;
  const { allowance, refetch } = useUsdcAllowance(
    address,
    spender,
    confirmed ? submitted.amount : undefined,
  );
  const syncingAllowance = confirmed && (allowance === undefined || allowance < submitted.amount);
  const firedHashRef = useRef<typeof txHash | null>(null);

  // Keep the hash until allowance catches up. RPC reads may briefly lag behind
  // the receipt, so useUsdcAllowance continues polling while the value is short.
  useEffect(() => {
    if (confirmed) void refetch();
  }, [confirmed, refetch]);

  useEffect(() => {
    if (!confirmed || !txHash || syncingAllowance) return;
    if (firedHashRef.current === txHash) return;
    firedHashRef.current = txHash;
    if (allowance !== undefined && allowance >= amount) onApproved?.();
    reset();
  }, [confirmed, txHash, syncingAllowance, allowance, amount, onApproved, reset]);

  // We only swap to the Approve CTA when we KNOW the allowance is short.
  // Undefined allowance (loading, no wallet, or amount = 0) → fall through.
  const needsApproval =
    !!address &&
    amount > 0n &&
    (syncingAllowance || (allowance !== undefined && allowance < amount));

  if (!needsApproval) return <>{children}</>;

  const onClick = () => {
    if (!address) return;
    setSubmitted({ owner: address, spender, amount });
    setReplaced(false);
    writeContract({
      chainId: VIEM_CHAIN.id,
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amount],
    });
  };
  const busy = isPending || receipt.isLoading || syncingAllowance;
  const approvalError =
    error ??
    receipt.error ??
    (replaced ? new Error('Approval transaction was replaced or cancelled.') : null);

  return (
    <div className="space-y-1">
      <Button variant="primary" size="md" onClick={onClick} disabled={busy} className="w-full">
        {isPending ? (
          'Sign in your wallet…'
        ) : receipt.isLoading ? (
          'Approving on-chain…'
        ) : syncingAllowance ? (
          'Updating allowance…'
        ) : (
          <>
            Approve <UsdcAmount value={amount} precision={2} />
          </>
        )}
      </Button>
      <TxStatus
        hash={receipt.data?.transactionHash ?? txHash}
        isPending={isPending || receipt.isLoading}
        isSuccess={confirmed}
        error={approvalError}
      />
      {receipt.error && (
        <button
          type="button"
          className="text-xs underline"
          onClick={() => {
            void receipt.refetch();
          }}
        >
          Check transaction again
        </button>
      )}
    </div>
  );
}
