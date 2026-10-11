/**
 * ---
 * @skill      https://llms.megapot.io/data-api
 * @customize  Aurora presentation uses the shared card and brand tokens.
 *             Round list + per-round aggregates from `GET /v1/rounds`. Cards
 *             render winning numbers and per-tier payouts inline — all from
 *             the single API response, no RPC. Cursor pagination via the
 *             "Load more" button (`useInfiniteQuery`).
 * ---
 */

import { DataApiCredit } from '@/components/common/DataApiCredit';
import { PageIntro } from '@/components/common/PageIntro';
import { DrawingList } from '@/components/history/DrawingList';
import { COPY } from '@/config/copy';
import { useRoundsList } from '@/hooks/useRoundsList';
import { formatApiError } from '@/lib/api';

export function History() {
  // Fetch 21 per page because `/v1/rounds` returns the active round first
  // (newest) and we filter it out client-side — without the +1 the first
  // page would render 19 settled rounds, off-by-one against the natural
  // 20-row grid. Subsequent pages occasionally land on 21 visible rows
  // (no active round to filter), which is fine — the user reads "Load more"
  // as paginated, not strict-paged.
  const { rounds, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } =
    useRoundsList({ pageSize: 21 });

  // History is past-only — the active round lives on the Home page.
  const past = rounds.filter((r) => r.status === 'settled');

  return (
    <div className="page-content space-y-6">
      <PageIntro
        eyebrow={COPY.historyEyebrow}
        title={COPY.historyTitle}
        description={COPY.historyDescription}
      />
      <p className="text-xs text-zinc-500">
        <DataApiCredit />
      </p>

      {error ? (
        <p className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          Couldn't load drawing history — {formatApiError(error)}
        </p>
      ) : isLoading && past.length === 0 ? (
        <p className="card-pad-lg text-center text-sm text-zinc-500">Loading…</p>
      ) : (
        <>
          <DrawingList rounds={past} />
          {hasNextPage && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more drawings'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
