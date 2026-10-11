/**
 * ---
 * @skill      https://llms.megapot.io/tasks/read-state
 * @customize  Aurora prize hero. Only displays the supplied amount; decoration
 *             is hidden from assistive technology and stops within five seconds.
 * ---
 */
import { UsdcAmount } from '@/components/common/UsdcAmount';
import { COPY } from '@/config/copy';

export function PrizePool({ value }: { value: bigint | undefined }) {
  return (
    <section className="prize-hero" aria-label={COPY.prizePool}>
      <div className="aurora-orbit aurora-orbit-one" aria-hidden="true" />
      <div className="aurora-orbit aurora-orbit-two" aria-hidden="true" />
      <span className="hero-spark" aria-hidden="true">
        ✦
      </span>
      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
          {COPY.prizePool}
        </p>
        <p className="my-6 break-words text-4xl font-semibold tracking-tighter tabular-nums sm:text-5xl lg:text-6xl">
          <UsdcAmount value={value} precision={2} unit={false} />
        </p>
        <span className="rounded-full border border-emerald-200/25 bg-emerald-200/10 px-3 py-1 text-xs font-medium text-emerald-100">
          {COPY.settlementAsset}
        </span>
        <p className="mt-8 text-sm text-emerald-100/80">{COPY.prizeDescription}</p>
      </div>
    </section>
  );
}
