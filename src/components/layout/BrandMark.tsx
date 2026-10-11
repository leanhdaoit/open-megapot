/**
 * ---
 * @customize  Open Megapot's open-orbit M mark. Keep public/favicon.svg in
 *             sync when changing its emerald, mint, and cyan SVG geometry.
 * ---
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className ?? ''}`}
    >
      <rect width="40" height="40" rx="13" fill="#064e3b" />
      <path d="M30 12a14 14 0 1 0 3 13" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M12 26V15l8 8 8-8v11"
        stroke="#ecfdf5"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="16" r="2" fill="#67e8f9" />
    </svg>
  );
}
