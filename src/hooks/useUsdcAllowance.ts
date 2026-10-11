/**
 * ---
 * @skill      https://llms.megapot.io/tasks/buy-tickets
 *             https://llms.megapot.io/tasks/claim-winnings
 *             https://llms.megapot.io/tasks/lp-deposit
 * @contract   USDC.allowance
 * @customize  Read the user's USDC allowance for a specific spender. Used by
 *             ERC-20 approval flows to decide whether an `approve` tx is
 *             needed before the next write (buy tickets, lp deposit, etc.).
 *             Pair with `useUsdcBalance` when both balance + allowance are
 *             needed; the two queries dedupe via wagmi/TanStack query keys.
 *             An optional confirmed amount enables 2-second polling until
 *             RPC allowance reads catch up with the approval receipt.
 * ---
 */
import { erc20Abi } from 'viem';
import { useReadContract } from 'wagmi';
import { USDC_ADDRESS, VIEM_CHAIN } from '@/config/contracts';

export function useUsdcAllowance(
  user: `0x${string}` | undefined,
  spender: `0x${string}` | undefined,
  /** Poll briefly while a confirmed approval has not reached this allowance yet. */
  confirmedAmount?: bigint,
) {
  const { data, isLoading, refetch } = useReadContract({
    address: USDC_ADDRESS,
    chainId: VIEM_CHAIN.id,
    abi: erc20Abi,
    functionName: 'allowance',
    args: user && spender ? [user, spender] : undefined,
    query: {
      enabled: !!user && !!spender,
      refetchInterval: (query) =>
        confirmedAmount !== undefined &&
        (query.state.data === undefined || query.state.data < confirmedAmount)
          ? 2000
          : false,
    },
  });

  return {
    allowance: data,
    isLoading,
    refetch,
  };
}
