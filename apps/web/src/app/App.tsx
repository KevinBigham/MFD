import { lazy, Suspense } from 'react';
import { RouterProvider, createRouter, createRootRoute, createRoute, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard, Users, DollarSign, ArrowLeftRight,
  Search, FileText, Handshake, Gamepad2, GraduationCap,
  Trophy, Settings, Terminal, Inbox, Crown, ListOrdered,
  Play, ScrollText, Save,
} from 'lucide-react';
import { MfdTooltipProvider, MfdCommandPalette, PixelNav, type CommandItem } from '@mfd/design-system/components';
import { useGlobalKeyboard, useShortcut } from './hooks/useKeyboard';
import { useBootSequence } from './hooks/useBootSequence';
import { useUiStore } from './store/ui-store';
import { useGameStore } from './store/game-store';
import { NewGameScreen } from './NewGameScreen';
import { BootScreen } from './BootScreen';
import { MondayBriefing } from '../features/monday-briefing/MondayBriefing';
import { RosterManagement } from '../features/roster/RosterManagement';
import { ContractsCap } from '../features/contracts/ContractsCap';
import { CoachingStaff } from '../features/coaching/CoachingStaff';
import { InboxTriage } from '../features/inbox/InboxTriage';
import { OwnerMood } from '../features/owner/OwnerMood';
import { DepthChart } from '../features/depth-chart/DepthChart';
import { WeekAdvance } from '../features/week-advance/WeekAdvance';
import { HandshakeLedger } from '../features/handshake-ledger/HandshakeLedger';
import { GameDayRecap } from '../features/game-day/GameDayRecap';
import { TradeCenter } from '../features/trades/TradeCenter';
import { FreeAgencyHub } from '../features/free-agency/FreeAgencyHub';
import { Settings as SettingsScreen } from '../features/settings/Settings';

const LazyScoutingBoard = lazy(async () => ({ default: (await import('../features/scouting/ScoutingBoard')).ScoutingBoard }));
const LazyDraftBoard = lazy(async () => ({ default: (await import('../features/draft/DraftBoard')).DraftBoard }));
const LazyDynastyCartridge = lazy(async () => ({ default: (await import('../features/dynasty-cartridge/DynastyCartridge')).DynastyCartridge }));
const LazyLegacyTimeline = lazy(async () => ({ default: (await import('../features/legacy/LegacyTimeline')).LegacyTimeline }));

// ── Nav items ────────────────────────────────────────────────

interface NavItem {
  path: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  shortcut?: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/',             label: 'Monday Briefing', shortLabel: 'Briefing', icon: <LayoutDashboard size={16} />, shortcut: '1' },
  { path: '/roster',       label: 'Roster',          shortLabel: 'Roster',   icon: <Users size={16} />,          shortcut: '2' },
  { path: '/contracts',    label: 'Contracts',        shortLabel: 'Cap',      icon: <DollarSign size={16} />,     shortcut: '3' },
  { path: '/trades',       label: 'Trades',           shortLabel: 'Trades',   icon: <ArrowLeftRight size={16} />, shortcut: '4' },
  { path: '/scouting',     label: 'Scouting',         shortLabel: 'Scout',    icon: <Search size={16} />,         shortcut: '5' },
  { path: '/draft',        label: 'Draft',            shortLabel: 'Draft',    icon: <FileText size={16} />,       shortcut: '6' },
  { path: '/free-agency',  label: 'Free Agency',      shortLabel: 'FA',       icon: <Handshake size={16} />,      shortcut: '7' },
  { path: '/game-day',     label: 'Game Day',         shortLabel: 'Game',     icon: <Gamepad2 size={16} />,       shortcut: '8' },
  { path: '/inbox',          label: 'Inbox',            shortLabel: 'Inbox',    icon: <Inbox size={16} />,          shortcut: '9' },
  { path: '/depth-chart',   label: 'Depth Chart',      shortLabel: 'Depth',    icon: <ListOrdered size={16} /> },
  { path: '/coaching',      label: 'Coaching',         shortLabel: 'Coach',    icon: <GraduationCap size={16} /> },
  { path: '/owner',         label: 'Owner',            shortLabel: 'Owner',    icon: <Crown size={16} /> },
  { path: '/week-advance',  label: 'Advance Week',     shortLabel: 'Advance',  icon: <Play size={16} /> },
  { path: '/handshakes',    label: 'Handshakes',       shortLabel: 'Promises', icon: <ScrollText size={16} /> },
  { path: '/legacy',        label: 'Legacy',           shortLabel: 'Legacy',   icon: <Trophy size={16} /> },
  { path: '/dynasty',       label: 'Save/Load',        shortLabel: 'Save',     icon: <Save size={16} /> },
  { path: '/settings',      label: 'Settings',         shortLabel: 'Config',   icon: <Settings size={16} /> },
];

// ── Root Layout ─────────────────────────────────────────────

function RootLayout() {
  useGlobalKeyboard();
  const commandPaletteOpen = useUiStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const router = useRouter();

  useShortcut('k', () => setCommandPaletteOpen(true), 'Open command palette', { meta: true });

  const commandItems: CommandItem[] = [
    ...NAV_ITEMS.map((nav): CommandItem => ({
      id: `screen-${nav.path}`,
      label: nav.label,
      category: 'screen',
      icon: nav.icon,
      keywords: [nav.shortLabel],
      onSelect: () => router.navigate({ to: nav.path }),
    })),
    {
      id: 'action-advance-week',
      label: 'Advance Week',
      category: 'action',
      icon: <Terminal size={16} />,
      keywords: ['next', 'sim', 'advance'],
      onSelect: () => {},
    },
  ];

  return (
    <MfdTooltipProvider>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--mfd-bg)',
        color: 'var(--mfd-text)',
        fontFamily: 'var(--mfd-font-sans)',
      }}>
        <TopNav />
        <main style={{
          flex: 1,
          padding: 'var(--mfd-sp-lg) var(--mfd-sp-xl)',
          overflow: 'auto',
        }}>
          <Outlet />
        </main>
        <MfdCommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          items={commandItems}
        />
      </div>
    </MfdTooltipProvider>
  );
}

// ── Top Nav ─────────────────────────────────────────────────

function TopNav() {
  const router = useRouter();
  const activePath = useRouterState({ select: (state) => state.location.pathname });

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '12px 16px',
      borderBottom: '3px solid var(--mfd-gold)',
      background: 'linear-gradient(180deg, #080808 0%, #000 100%)',
      flexShrink: 0,
      flexWrap: 'wrap',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        paddingRight: '8px',
      }}>
        <span style={{
          fontFamily: 'var(--mfd-font-pixel)',
          fontSize: '8px',
          color: 'var(--mfd-green)',
          letterSpacing: '1px',
        }}>
          MFD NETWORK
        </span>
        <span style={{
          fontFamily: 'var(--mfd-font-display)',
          fontSize: '28px',
          lineHeight: 1,
          color: 'var(--mfd-gold)',
          letterSpacing: '1px',
        }}>
          MFD
        </span>
      </div>

      <div style={{
        flex: 1,
        minWidth: '280px',
      }}>
        <PixelNav
          items={NAV_ITEMS.map((item) => ({
            key: item.path,
            label: item.shortLabel,
            icon: item.icon,
          }))}
          activeKey={activePath}
          onSelect={(path) => {
            void router.navigate({ to: path });
          }}
          style={{ paddingBottom: '2px' }}
        />
      </div>

      <CommandPaletteTrigger />
    </header>
  );
}

function CommandPaletteTrigger() {
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <button
      onClick={() => setOpen(true)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 10px',
        fontSize: '8px',
        fontFamily: 'var(--mfd-font-pixel)',
        color: 'var(--mfd-cyan)',
        background: 'rgba(0, 229, 255, 0.08)',
        border: '3px solid var(--mfd-cyan)',
        cursor: 'pointer',
        textTransform: 'uppercase',
      }}
    >
      <Search size={12} />
      <span>Cmd Deck</span>
      <kbd style={{
        padding: '2px 4px',
        fontSize: '0.5625rem',
        fontFamily: 'var(--mfd-font-mono)',
        background: '#04141a',
        color: '#9be7ff',
        border: '2px solid rgba(0, 229, 255, 0.35)',
      }}>
        {isMac ? '\u2318' : 'Ctrl+'}K
      </kbd>
    </button>
  );
}

function LazyRouteFrame({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Suspense fallback={(
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
        fontFamily: 'var(--mfd-font-mono)',
        color: 'var(--mfd-text-faint)',
        fontSize: '0.875rem',
      }}>
        Loading {label}...
      </div>
    )}
    >
      {children}
    </Suspense>
  );
}

// ── Router setup ────────────────────────────────────────────

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MondayBriefing,
});

const rosterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/roster',
  component: RosterManagement,
});

const contractsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/contracts',
  component: ContractsCap,
});

const tradesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/trades',
  component: TradeCenter,
});

const scoutingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/scouting',
  component: () => (
    <LazyRouteFrame label="scouting board">
      <LazyScoutingBoard />
    </LazyRouteFrame>
  ),
});

const draftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/draft',
  component: () => (
    <LazyRouteFrame label="draft board">
      <LazyDraftBoard />
    </LazyRouteFrame>
  ),
});

const freeAgencyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/free-agency',
  component: FreeAgencyHub,
});

const gameDayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game-day',
  component: GameDayRecap,
});

const inboxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inbox',
  component: InboxTriage,
});

const depthChartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/depth-chart',
  component: DepthChart,
});

const coachingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/coaching',
  component: CoachingStaff,
});

const ownerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/owner',
  component: OwnerMood,
});

const weekAdvanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/week-advance',
  component: WeekAdvance,
});

const handshakeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/handshakes',
  component: HandshakeLedger,
});

const legacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/legacy',
  component: () => (
    <LazyRouteFrame label="legacy timeline">
      <LazyLegacyTimeline />
    </LazyRouteFrame>
  ),
});

const dynastyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dynasty',
  component: () => (
    <LazyRouteFrame label="dynasty cartridge">
      <LazyDynastyCartridge />
    </LazyRouteFrame>
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsScreen,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  rosterRoute, contractsRoute, tradesRoute,
  scoutingRoute, draftRoute, freeAgencyRoute,
  gameDayRoute, inboxRoute, depthChartRoute, coachingRoute,
  ownerRoute, weekAdvanceRoute, handshakeRoute,
  legacyRoute, dynastyRoute, settingsRoute,
]);

const router = createRouter({ routeTree });

// ── App entry ───────────────────────────────────────────────

export function App() {
  const boot = useBootSequence();
  const gameLoaded = useGameStore((s) => s.initialized);

  if (boot.shouldShow && !boot.isComplete) {
    return <BootScreen lines={boot.visibleLines} onSkip={boot.skip} />;
  }

  if (!gameLoaded) {
    return <NewGameScreen />;
  }

  return <RouterProvider router={router} />;
}
