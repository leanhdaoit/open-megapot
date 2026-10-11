/**
 * ---
 * @customize  Aurora presentation uses the shared card and brand tokens.
 *             Single source of truth for the ball/number circle used across
 *             TicketCard, the History winning-numbers strip, the
 *             TicketBuilder random preview, and the TicketPicker grid.
 *             Edit the palette tokens here to rebrand every ball at once.
 *
 *             Variants:
 *               - normal — emerald palette when selected, neutral outline
 *                          when not.
 *               - bonus  — amber palette in both states.
 *             Sizes:
 *               - sm   — h-5 w-5 text-[11px] (random preview, tight rows)
 *               - md   — h-6 w-6 text-xs    (default; rows on Tickets/History)
 *               - lg   — h-8 w-8 text-sm    (editable ticket rows)
 *               - fill — aspect-square w-full (picker grid cells)
 *             Set `interactive` to render as a focusable <button aria-pressed>;
 *             omit for a decorative <span>.
 * ---
 */
import type { CSSProperties } from 'react';

export type BallVariant = 'normal' | 'bonus';
export type BallSize = 'sm' | 'md' | 'lg' | 'fill';

const SIZE_CLASSES: Record<BallSize, string> = {
  sm: 'h-5 w-5 text-[11px]',
  md: 'h-6 w-6 text-xs',
  lg: 'h-8 w-8 text-sm',
  fill: 'aspect-square w-full text-sm',
};

const NORMAL_SELECTED =
  'border-brand-primary-700 bg-brand-primary-700 text-white ' +
  'dark:border-brand-primary-500 dark:bg-brand-primary-900/60 dark:text-brand-primary-100';
const NORMAL_UNSELECTED = 'border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300';
const BONUS_SELECTED =
  'border-amber-500 bg-amber-100 text-amber-900 ' +
  'dark:border-amber-500 dark:bg-amber-900/60 dark:text-amber-100';
const BONUS_UNSELECTED =
  'border-amber-300 bg-amber-50 text-amber-800 ' +
  'dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200';

export type BallProps = {
  n: number | string;
  variant?: BallVariant;
  selected?: boolean;
  size?: BallSize;
  interactive?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
  title?: string;
  style?: CSSProperties;
};

export function Ball({
  n,
  variant = 'normal',
  selected = false,
  size = 'md',
  interactive = false,
  onClick,
  ariaLabel,
  className = '',
  title,
  style,
}: BallProps) {
  const palette =
    variant === 'bonus'
      ? selected
        ? BONUS_SELECTED
        : BONUS_UNSELECTED
      : selected
        ? NORMAL_SELECTED
        : NORMAL_UNSELECTED;

  const base =
    'inline-flex shrink-0 items-center justify-center rounded-full border shadow-sm ' +
    'font-mono tabular-nums transition-[color,background-color,transform,box-shadow] duration-150 ' +
    SIZE_CLASSES[size] +
    ' ' +
    palette +
    (className ? ` ${className}` : '');

  if (interactive) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        aria-label={ariaLabel ?? String(n)}
        onClick={onClick}
        title={title}
        style={style}
        className={`${base} cursor-pointer hover:opacity-90 active:scale-95`}
      >
        {n}
      </button>
    );
  }

  return (
    <span title={title} style={style} className={base}>
      {n}
    </span>
  );
}
