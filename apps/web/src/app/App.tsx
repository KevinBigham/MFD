import { RouterProvider, createRouter, createRootRoute, createRoute } from '@tanstack/react-router';

// Feature route stubs
const rootRoute = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--mfd-bg)',
      color: 'var(--mfd-text)',
      fontFamily: 'var(--mfd-font-sans)',
    }}>
      <header style={{
        padding: 'var(--mfd-sp-md) var(--mfd-sp-xl)',
        borderBottom: '1px solid var(--mfd-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--mfd-sp-lg)',
      }}>
        <span style={{
          fontFamily: 'var(--mfd-font-serif)',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--mfd-gold)',
        }}>
          MFD
        </span>
        <span style={{
          fontFamily: 'var(--mfd-font-mono)',
          fontSize: '0.75rem',
          color: 'var(--mfd-text-dim)',
        }}>
          v0.0.1 // PHASE 0
        </span>
      </header>
      <main style={{ padding: 'var(--mfd-sp-xl)' }}>
        <div style={{
          fontFamily: 'var(--mfd-font-mono)',
          color: 'var(--mfd-green)',
          fontSize: '0.875rem',
          lineHeight: 1.8,
        }}>
          <p>&gt; MR. FOOTBALL DYNASTY</p>
          <p>&gt; Engine initialized. All systems nominal.</p>
          <p>&gt; Phase 0: Foundation complete.</p>
          <p style={{ color: 'var(--mfd-gold)' }}>&gt; Ready for Phase 1._</p>
        </div>
      </main>
    </div>
  );
}

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: RootLayout,
});

// Feature route stubs — one per game domain
const rosterRoute = createRoute({ getParentRoute: () => rootRoute, path: '/roster' });
const contractsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/contracts' });
const tradesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/trades' });
const scoutingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/scouting' });
const draftRoute = createRoute({ getParentRoute: () => rootRoute, path: '/draft' });
const freeAgencyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/free-agency' });
const gameDayRoute = createRoute({ getParentRoute: () => rootRoute, path: '/game-day' });
const coachingRoute = createRoute({ getParentRoute: () => rootRoute, path: '/coaching' });
const legacyRoute = createRoute({ getParentRoute: () => rootRoute, path: '/legacy' });
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings' });

const routeTree = rootRoute.addChildren([
  indexRoute,
  rosterRoute, contractsRoute, tradesRoute,
  scoutingRoute, draftRoute, freeAgencyRoute,
  gameDayRoute, coachingRoute, legacyRoute, settingsRoute,
]);

const router = createRouter({ routeTree });

export function App() {
  return <RouterProvider router={router} />;
}
