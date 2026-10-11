/**
 * ---
 * @customize  Small History API router. Root is Home; named paths survive reload
 *             and popstate handles Back/Forward. Hosts must serve index.html for
 *             app paths. Unknown paths and disabled LP fall back to Home.
 * ---
 */
import { LP_ENABLED } from '@/config/contracts';

export const PAGE_PATHS = {
  home: '/',
  play: '/play',
  tickets: '/tickets',
  history: '/history',
  settings: '/settings',
  lp: '/lp',
} as const;
export type PageKey = keyof typeof PAGE_PATHS;
const CHANGE_EVENT = 'open-megapot:navigate';

export function pageFromPath(path: string): PageKey {
  const normalized = path.replace(/\/+$/, '') || '/';
  if (normalized === '/referral') return 'settings';
  const page = (Object.keys(PAGE_PATHS) as PageKey[]).find((key) => PAGE_PATHS[key] === normalized);
  return page && (page !== 'lp' || LP_ENABLED) ? page : 'home';
}
export function getCurrentPage(): PageKey {
  return pageFromPath(window.location.pathname);
}
export function navigateTo(page: PageKey): void {
  const path = PAGE_PATHS[page === 'lp' && !LP_ENABLED ? 'home' : page];
  if (window.location.pathname === path) return;
  window.history.pushState(null, '', path);
  window.dispatchEvent(new Event(CHANGE_EVENT));
  window.scrollTo(0, 0);
}
export function subscribeNavigation(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}
