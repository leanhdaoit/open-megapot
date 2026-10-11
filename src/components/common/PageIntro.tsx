/**
 * ---
 * @customize  Shared editorial page heading. Copy comes from config/copy;
 *             no live region so polling never interrupts screen readers.
 * ---
 */
export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
    </header>
  );
}
