import { useState, useCallback } from 'react';
import { RouterProvider, createRouter, createRootRoute, createRoute, Outlet, Link, useRouter } from '@tanstack/react-router';
import {
  LayoutDashboard, Users, DollarSign, ArrowLeftRight,
  Search, FileText, Handshake, Gamepad2, GraduationCap,
  Trophy, Settings, Terminal, Inbox, Crown, ListOrdered,
  Play, ScrollText, Save,
} from 'lucide-react';
import { MfdTooltipProvider, MfdCommandPalette, type CommandItem } from '@mfd/design-system/components';
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
import { DynastyCartridge } from '../features/dynasty-cartridge/DynastyCartridge';

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
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      padding: '0 var(--mfd-sp-lg)',
      height: 44,
      borderBottom: '1px solid var(--mfd-border)',
      background: 'var(--mfd-bg-2)',
      flexShrink: 0,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--mfd-sp-sm)',
        paddingRight: 'var(--mfd-sp-lg)',
        marginRight: 'var(--mfd-sp-sm)',
        borderRight: '1px solid var(--mfd-border)',
      }}>
        <span style={{
          fontFamily: 'var(--mfd-font-serif)',
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--mfd-gold)',
          letterSpacing: '0.02em',
        }}>
          MFD
        </span>
      </div>

      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        flex: 1,
        overflow: 'auto',
      }}>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.path} item={item} />
        ))}
      </nav>

      <CommandPaletteTrigger />
    </header>
  );
}

function NavLink({ item }: { item: NavItem }) {
  return (
    <Link
      to={item.path}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        fontSize: '0.75rem',
        fontFamily: 'var(--mfd-font-sans)',
        fontWeight: 500,
        color: 'var(--mfd-text-dim)',
        textDecoration: 'none',
        borderRadius: 'var(--mfd-rad-md)',
        whiteSpace: 'nowrap',
        transition: 'color var(--mfd-motion-fast), background var(--mfd-motion-fast)',
      }}
      activeProps={{
        style: {
          color: 'var(--mfd-gold)',
          background: 'var(--mfd-gold-dim)',
        },
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        if (!el.getAttribute('data-status')?.includes('active')) {
          el.style.color = 'var(--mfd-text)';
          el.style.background = 'var(--mfd-bg-3)';
        }
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        if (!el.getAttribute('data-status')?.includes('active')) {
          el.style.color = 'var(--mfd-text-dim)';
          el.style.background = 'transparent';
        }
      }}
    >
      {item.icon}
      {item.shortLabel}
    </Link>
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
        padding: '4px 10px',
        fontSize: '0.6875rem',
        fontFamily: 'var(--mfd-font-mono)',
        color: 'var(--mfd-text-faint)',
        background: 'var(--mfd-bg)',
        border: '1px solid var(--mfd-border)',
        borderRadius: 'var(--mfd-rad-md)',
        cursor: 'pointer',
        transition: 'border-color var(--mfd-motion-fast)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--mfd-border-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--mfd-border)';
      }}
    >
      <Search size={12} />
      <span>Search</span>
      <kbd style={{
        padding: '1px 4px',
        fontSize: '0.5625rem',
        background: 'var(--mfd-bg-3)',
        border: '1px solid var(--mfd-border)',
        borderRadius: 'var(--mfd-rad-xs)',
      }}>
        {isMac ? '\u2318' : 'Ctrl+'}K
      </kbd>
    </button>
  );
}

// ── Feature route stubs ─────────────────────────────────────

function FeatureStub({ name }: { name: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      fontFamily: 'var(--mfd-font-mono)',
      color: 'var(--mfd-text-faint)',
      fontSize: '0.875rem',
    }}>
      {name} — Phase 2+
    </div>
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
  component: () => <FeatureStub name="Trade Center" />,
});

const scoutingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/scouting',
  component: () => <FeatureStub name="Scouting" />,
});

const draftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/draft',
  component: () => <FeatureStub name="Draft Board" />,
});

const freeAgencyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/free-agency',
  component: () => <FeatureStub name="Free Agency" />,
});

const gameDayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/game-day',
  component: () => <FeatureStub name="Game Day" />,
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
  component: () => <FeatureStub name="Legacy & Dynasty" />,
});

const dynastyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dynasty',
  component: DynastyCartridge,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: () => <FeatureStub name="Settings" />,
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
