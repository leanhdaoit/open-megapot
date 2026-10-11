/**
 * ---
 * @customize  URL-backed pages use the History API via lib/navigation.ts.
 *             Refresh preserves the current page; Back/Forward follows popstate.
 *             Wallet-required pages show their existing connection prompts.
 * ---
 */
import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { Layout } from '@/components/layout/Layout';
import { LP_ENABLED } from '@/config/contracts';
import { getCurrentPage, navigateTo, type PageKey, subscribeNavigation } from '@/lib/navigation';
import { History } from '@/pages/History';
import { Home } from '@/pages/Home';
import { LP } from '@/pages/LP';
import { Play } from '@/pages/Play';
import { Settings } from '@/pages/Settings';
import { Tickets } from '@/pages/Tickets';

export default function App() {
  const active = useSyncExternalStore<PageKey>(subscribeNavigation, getCurrentPage, () => 'home');

  let page: ReactNode;
  switch (active) {
    case 'home':
      page = <Home onNavigate={navigateTo} />;
      break;
    case 'play':
      page = <Play />;
      break;
    case 'tickets':
      page = <Tickets onNavigate={navigateTo} />;
      break;
    case 'lp':
      // Defensive fallback for programmatic `active='lp'` while LP is
      // disabled (the nav entry is filtered out, so the user can't get here
      // by clicking). Renders Home instead of a blank screen.
      page = LP_ENABLED ? <LP /> : <Home onNavigate={navigateTo} />;
      break;
    case 'settings':
      page = <Settings />;
      break;
    case 'history':
      page = <History />;
      break;
  }

  return (
    <Layout active={active} onSelect={navigateTo}>
      {page}
    </Layout>
  );
}
