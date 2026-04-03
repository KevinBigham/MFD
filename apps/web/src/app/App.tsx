import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { RouterProvider, createRouter, createRootRoute, createRoute, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard, Users, DollarSign, ArrowLeftRight,
  Search, FileText, Handshake, Gamepad2, GraduationCap,
  Trophy, Settings, Terminal, Inbox, Crown, ListOrdered,
  Play, ScrollText, Save, TrendingUp, Newspaper, BarChart3, Activity,
} from 'lucide-react';
import { MfdTooltipProvider, MfdCommandPalette, type CommandItem } from '@mfd/design-system/components';
import { useGlobalKeyboard, useShortcut } from './hooks/useKeyboard';
import { useBootSequence } from './hooks/useBootSequence';
import { useUiStore } from './store/ui-store';
import { selectCeremonies, selectTutorial, useGameStore } from './store/game-store';
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
import { CeremonyViewer } from '../features/legacy/CeremonyViewer';
import { TutorialOverlay } from '../features/onboarding/TutorialOverlay';

const LazyScoutingBoard = lazy(async () => ({ default: (await import('../features/scouting/ScoutingBoard')).ScoutingBoard }));
const LazyDraftBoard = lazy(async () => ({ default: (await import('../features/draft/DraftBoard')).DraftBoard }));
const LazyDynastyCartridge = lazy(async () => ({ default: (await import('../features/dynasty-cartridge/DynastyCartridge')).DynastyCartridge }));
const LazyLegacyTimeline = lazy(async () => ({ default: (await import('../features/legacy/LegacyTimeline')).LegacyTimeline }));
const LazyPowerRankings = lazy(async () => ({ default: (await import('../features/power-rankings/PowerRankings')).PowerRankings }));
const LazyLeagueNews = lazy(async () => ({ default: (await import('../features/league-news/LeagueNews')).LeagueNews }));
const LazyLeagueStandings = lazy(async () => ({ default: (await import('../features/standings/LeagueStandings')).LeagueStandings }));
const LazyAnalyticsDashboard = lazy(async () => ({ default: (await import('../features/analytics/AnalyticsDashboard')).AnalyticsDashboard }));

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
  { path: '/news',          label: 'News',             shortLabel: 'News',     icon: <Newspaper size={16} /> },
  { path: '/standings',     label: 'Standings',        shortLabel: 'Stand',    icon: <BarChart3 size={16} /> },
  { path: '/analytics',     label: 'Analytics',        shortLabel: 'Data',     icon: <Activity size={16} /> },
  { path: '/power-rankings',label: 'Power Rankings',   shortLabel: 'Rankings', icon: <TrendingUp size={16} /> },
  { path: '/legacy',        label: 'Legacy',           shortLabel: 'Legacy',   icon: <Trophy size={16} /> },
  { path: '/dynasty',       label: 'Save/Load',        shortLabel: 'Save',     icon: <Save size={16} /> },
  { path: '/settings',      label: 'Settings',         shortLabel: 'Config',   icon: <Settings size={16} /> },
];

// ── Root Layout ─────────────────────────────────────────────

function RootLayout() {
  useGlobalKeyboard();
  const commandPaletteOpen = useUiStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const tutorial = useGameStore(selectTutorial);
  const ceremonies = useGameStore(selectCeremonies);
  const advanceTutorial = useGameStore((s) => s.actions.advanceTutorial);
  const dismissTutorial = useGameStore((s) => s.actions.dismissTutorial);
  const router = useRouter();
  const activePath = useRouterState({ select: (state) => state.location.pathname });
  const [seenCeremonies, setSeenCeremonies] = useState<string[]>([]);
  const [activeCeremonyId, setActiveCeremonyId] = useState<string | null>(null);

  useShortcut('k', () => setCommandPaletteOpen(true), 'Open command palette', { meta: true });

  const currentTutorialStep = tutorial.steps[tutorial.currentStepIndex] ?? null;
  const activeCeremony = useMemo(
    () => ceremonies.find((ceremony) => ceremony.id === activeCeremonyId) ?? null,
    [activeCeremonyId, ceremonies],
  );

  useEffect(() => {
    if (!tutorial.active || tutorial.dismissed || !currentTutorialStep?.action?.startsWith('screen:')) {
      return;
    }
    if (currentTutorialStep.targetScreen !== activePath) {
      return;
    }
    void advanceTutorial(currentTutorialStep.action);
  }, [activePath, advanceTutorial, currentTutorialStep, tutorial.active, tutorial.dismissed]);

  useEffect(() => {
    const latest = ceremonies[0];
    if (!latest || activeCeremonyId || seenCeremonies.includes(latest.id)) {
      return;
    }

    setSeenCeremonies((current) => [...current, latest.id]);
    setActiveCeremonyId(latest.id);
  }, [activeCeremonyId, ceremonies, seenCeremonies]);

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
        <style>{`
          @keyframes mfdTutorialPulse {
            0% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.55); }
            70% { box-shadow: 0 0 0 8px rgba(255, 215, 0, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0); }
          }
        `}</style>
        <TopNav highlightedPath={tutorial.active && !tutorial.dismissed ? currentTutorialStep?.targetScreen ?? null : null} activePath={activePath} />
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
        {tutorial.active && !tutorial.dismissed && currentTutorialStep ? (
          <TutorialOverlay
            step={currentTutorialStep}
            stepIndex={Math.min(tutorial.currentStepIndex + 1, tutorial.steps.length)}
            totalSteps={tutorial.steps.length}
            onNext={() => { void advanceTutorial(); }}
            onSkip={() => { void dismissTutorial(); }}
          />
        ) : null}
        <CeremonyViewer
          ceremony={activeCeremony}
          open={!!activeCeremony}
          onOpenChange={(open) => {
            if (!open) setActiveCeremonyId(null);
          }}
        />
      </div>
    </MfdTooltipProvider>
  );
}

// ── Top Nav ─────────────────────────────────────────────────

function TopNav({
  highlightedPath,
  activePath,
}: {
  highlightedPath: string | null;
  activePath: string;
}) {
  const router = useRouter();

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
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
      }}>
        {NAV_ITEMS.map((item) => {
          const active = item.path === activePath;
          const highlighted = item.path === highlightedPath;
          return (
            <div
              key={item.path}
              style={{
                animation: highlighted ? 'mfdTutorialPulse 1.2s infinite' : undefined,
                border: highlighted ? '3px solid rgba(255, 215, 0, 0.85)' : '3px solid transparent',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  void router.navigate({ to: item.path });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '32px',
                  padding: '7px 10px',
                  border: `3px solid ${active ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
                  background: active ? 'rgba(255, 215, 0, 0.1)' : 'var(--mfd-bg-2)',
                  color: active ? 'var(--mfd-gold)' : highlighted ? '#ffe27a' : 'var(--mfd-text-dim)',
                  fontFamily: 'var(--mfd-font-pixel)',
                  fontSize: '8px',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                {item.icon}
                <span>{item.shortLabel.toUpperCase()}</span>
              </button>
            </div>
          );
        })}
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

const newsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/news',
  component: () => (
    <LazyRouteFrame label="league news">
      <LazyLeagueNews />
    </LazyRouteFrame>
  ),
});

const standingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/standings',
  component: () => (
    <LazyRouteFrame label="standings">
      <LazyLeagueStandings />
    </LazyRouteFrame>
  ),
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: () => (
    <LazyRouteFrame label="analytics">
      <LazyAnalyticsDashboard />
    </LazyRouteFrame>
  ),
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

const powerRankingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/power-rankings',
  component: () => (
    <LazyRouteFrame label="power rankings">
      <LazyPowerRankings />
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
  newsRoute, standingsRoute, analyticsRoute,
  powerRankingsRoute, legacyRoute, dynastyRoute, settingsRoute,
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
