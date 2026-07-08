import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ChipDock,
  applyDockControl,
  createAskChipLiveBeat,
  createPendingDecisionsBeat,
  isRouteCoachingQuieted,
  persistRouteBeatProgress,
  resolveChipDockRoute,
  resolveEffectiveDockCollapsed,
  resolveNextRouteBeatIndex,
  type ChipDockControl,
  type ChipDockControlStore,
} from './ChipDock';
import type { DialogueCatalogEntry } from './dialogue/types';
import { CHIP_DOCK_STORAGE_KEY, createDefaultDockPrefs, readDockPrefs } from './dockPersistence';
import { CHIP_INTRO_STORAGE_KEY, CHIP_ONBOARDING_STORAGE_KEY } from './ChipHost';
import { CHIP_READ_RECEIPTS_STORAGE_KEY, readChipReadReceipts, writeChipReadReceipts } from './readReceipts';
import { ROUTE_BEAT_REGISTRY } from '../route-coaching/routeBeatRegistry';
import { useChipStore } from './store';
import { CHIP_ONBOARDING_STATE_STORAGE_KEY, readChipOnboardingState } from './onboardingMachine';

const chipDockCss = readFileSync(
  fileURLToPath(new URL('./ChipDock.css', import.meta.url)),
  'utf8',
);

class MemoryStorage implements Storage {
  private readonly backing = new Map<string, string>();

  get length() {
    return this.backing.size;
  }

  clear(): void {
    this.backing.clear();
  }

  getItem(key: string): string | null {
    return this.backing.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.backing.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.backing.delete(key);
  }

  setItem(key: string, value: string): void {
    this.backing.set(key, value);
  }
}

function renderDock(markup: React.ReactElement): string {
  return renderToStaticMarkup(markup);
}

function applyControl(control: ChipDockControl, storage = new MemoryStorage()) {
  const lastWeeklyDialogue: DialogueCatalogEntry = {
    id: 'chip.weekly.cleanWin',
    beat: 0,
    pose: 'celebrate',
    text: 'Recommended: open Roster and Depth Chart before Advance Week. Consequence: an unseen injury or wrong backup order can flip next week.',
    archetype: 'weekly',
  };
  const store: ChipDockControlStore = {
    setPose: vi.fn(),
    dismiss: vi.fn(),
    reset: vi.fn(),
    showWeeklyDialogue: vi.fn(),
    lastWeeklyDialogue,
  };
  const prefs = applyDockControl(control, {
    storage,
    chipStore: store,
    currentRoute: '/roster',
    currentWeek: 7,
    currentSeason: 2032,
    now: () => new Date('2026-04-29T19:00:00.000Z'),
  });
  return { prefs, store, storage };
}

describe('ChipDock', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    useChipStore.getState().reset();
  });

  it('returns children only when the Chip feature flag is disabled', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'false');

    const markup = renderDock(
      <ChipDock>
        <main data-app-shell="true">Shell</main>
      </ChipDock>,
    );

    expect(markup).toContain('data-app-shell="true"');
    expect(markup).not.toContain('data-chip-dock');
    expect(markup).not.toContain('Ask Chip');
  });

  it('renders a collapsed dock as a bottom-left Ask Chip handle without controls or bubble', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderDock(<ChipDock collapsed />);

    expect(markup).toContain('data-chip-dock="true"');
    expect(markup).toContain('data-chip-dock-state="collapsed"');
    expect(markup).toContain('data-chip-ask-dock-button="true"');
    expect(markup).toContain('aria-label="Ask Chip"');
    expect(markup).toContain('Ask Chip');
    expect(markup).not.toContain('data-chip-dock-controls');
    expect(markup).not.toContain('FRANCHISE OPS // CHIP');
  });

  it('renders expanded dock controls and supplied broadcast-card dialogue', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderDock(
      <ChipDock
        collapsed={false}
        whereAmI={{
          week: 1,
          seasonWeeks: 18,
          wins: 0,
          losses: 0,
          divisionRank: 2,
          pendingTotal: 0,
        }}
      >
        <p>Monday briefing: open Roster, Depth Chart, and Game Plan before Advance Week.</p>
      </ChipDock>,
    );

    expect(markup).toContain('data-chip-dock-state="expanded"');
    expect(markup).toContain('data-chip-dock-beat="idle"');
    expect(markup).toContain('data-chip-dock-controls="true"');
    expect(markup).toContain('not now Chip!');
    expect(markup).toContain('Not this week Chip!');
    expect(markup).toContain('Mute season');
    expect(markup).toContain('Reduce guidance');
    expect(markup).toContain('Disable animations');
    expect(markup).toContain('Ask Chip');
    expect(markup).toContain('Where am I?');
    expect(markup).not.toContain('Current board');
    expect(markup).toContain('data-chip-control-id="whatNow"');
    expect(markup).toContain('data-chip-control-weight="primary"');
    expect(markup).toContain('data-chip-control-id="quietForScreen"');
    expect(markup).toContain('data-chip-control-weight="quiet"');
    expect(markup).toContain('Monday briefing: open Roster, Depth Chart, and Game Plan before Advance Week.');
  });

  it('uses the store currentPose for the portrait when no live beat overrides it', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');
    useChipStore.getState().setPose('warning');

    const markup = renderDock(<ChipDock collapsed={false} storage={new MemoryStorage()} />);

    expect(markup).toContain('data-chip-pose="warning"');
  });

  it('auto-expands and renders the first unseen route beat', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderDock(
      <ChipDock collapsed routeBeats={ROUTE_BEAT_REGISTRY.roster} storage={new MemoryStorage()} />,
    );

    expect(markup).toContain('data-chip-dock-state="expanded"');
    expect(markup).toContain('data-chip-route-beat="chip.route.roster.beat-1"');
    expect(markup).toContain('Recommended: decide starter, backup, trade, or cut. Where: highlighted player. Consequence: extra names do not fix the role.');
    expect(markup).toContain('Got it');
  });

  it('renders unanchored governance route beats', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const cbaMarkup = renderDock(
      <ChipDock collapsed routeBeats={ROUTE_BEAT_REGISTRY.cba} storage={new MemoryStorage()} />,
    );
    const rulesMarkup = renderDock(
      <ChipDock collapsed routeBeats={ROUTE_BEAT_REGISTRY['league-rules']} storage={new MemoryStorage()} />,
    );

    expect(cbaMarkup).toContain('data-chip-route-beat="chip.route.cba.beat-1"');
    expect(cbaMarkup).toContain('vote accept, reject, or abstain before the CBA deadline');
    expect(cbaMarkup).toContain('delays stall cap, roster, or labor-rule changes.');
    expect(cbaMarkup).not.toContain('delayed voting stalls');
    expect(rulesMarkup).toContain('data-chip-route-beat="chip.route.league-rules.beat-1"');
    expect(rulesMarkup).toContain('active cap, roster, trade, waiver, and practice-squad rules');
    expect(rulesMarkup).toContain('old rule numbers make claims or cuts illegal.');
    expect(rulesMarkup).not.toContain('stale values make deadlines illegal.');
    expect(rulesMarkup).not.toContain('wrong values make deadlines illegal.');
    expect(rulesMarkup).not.toContain('Wrong assumptions make');
  });

  it('does not auto-expand when there are no active route beats', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderDock(<ChipDock collapsed routeBeats={[]} storage={new MemoryStorage()} />);

    expect(markup).toContain('data-chip-dock-state="collapsed"');
    expect(markup).not.toContain('data-chip-route-beat');
  });

  it('advances route beat index from Got it until the sequence is complete', () => {
    expect(resolveNextRouteBeatIndex(0, ROUTE_BEAT_REGISTRY.roster)).toEqual({
      nextIndex: 1,
      complete: false,
    });
    expect(resolveNextRouteBeatIndex(1, ROUTE_BEAT_REGISTRY.roster)).toEqual({
      nextIndex: 1,
      complete: true,
    });
  });

  it('persists final route beat dismissal to the read-receipt key and store', () => {
    const storage = new MemoryStorage();
    const markBeatSeen = vi.fn();

    persistRouteBeatProgress({
      storage,
      beatIds: ['chip.route.roster.beat-1', 'chip.route.roster.beat-2'],
      markBeatSeen,
    });

    expect(readChipReadReceipts(storage)).toEqual(new Set([
      'chip.route.roster.beat-1',
      'chip.route.roster.beat-2',
    ]));
    expect(storage.getItem(CHIP_READ_RECEIPTS_STORAGE_KEY)).toBe(JSON.stringify([
      'chip.route.roster.beat-1',
      'chip.route.roster.beat-2',
    ]));
    expect(markBeatSeen).toHaveBeenCalledWith('chip.route.roster.beat-1');
    expect(markBeatSeen).toHaveBeenCalledWith('chip.route.roster.beat-2');
  });

  it('lets the global onboarding skip suppress route-beat auto expansion', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');
    const storage = new MemoryStorage();
    storage.setItem(
      CHIP_ONBOARDING_STORAGE_KEY,
      JSON.stringify({ skipped: true, lastBeat: 9, timestamp: '2026-04-30T03:00:00.000Z' }),
    );

    const markup = renderDock(
      <ChipDock collapsed routeBeats={ROUTE_BEAT_REGISTRY.staff} storage={storage} />,
    );

    expect(markup).toContain('data-chip-dock-state="collapsed"');
    expect(markup).not.toContain('data-chip-route-beat');
  });

  it('persists a mid-sequence dock dismissal to the read receipt key', () => {
    const storage = new MemoryStorage();

    persistRouteBeatProgress({
      storage,
      beatIds: ['chip.route.roster.beat-1'],
    });

    expect(readChipReadReceipts(storage)).toEqual(new Set(['chip.route.roster.beat-1']));
  });

  it('does not replay the same route after every route beat is read', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');
    const storage = new MemoryStorage();
    storage.setItem(CHIP_READ_RECEIPTS_STORAGE_KEY, JSON.stringify([
      'chip.route.roster.beat-1',
      'chip.route.roster.beat-2',
    ]));

    const markup = renderDock(
      <ChipDock collapsed routeBeats={ROUTE_BEAT_REGISTRY.roster} storage={storage} />,
    );

    expect(markup).toContain('data-chip-dock-state="collapsed"');
    expect(markup).not.toContain('data-chip-route-beat');
  });

  it('still shows a different route when that route has unseen beats', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');
    const storage = new MemoryStorage();
    storage.setItem(CHIP_READ_RECEIPTS_STORAGE_KEY, JSON.stringify([
      'chip.route.roster.beat-1',
      'chip.route.roster.beat-2',
    ]));

    const markup = renderDock(
      <ChipDock collapsed routeBeats={ROUTE_BEAT_REGISTRY.staff} storage={storage} />,
    );

    expect(markup).toContain('data-chip-dock-state="expanded"');
    expect(markup).toContain('data-chip-route-beat="chip.route.staff.beat-1"');
  });

  it('keeps route replay suppressed when global skip is set even if receipts are empty', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');
    const storage = new MemoryStorage();
    storage.setItem(
      CHIP_ONBOARDING_STORAGE_KEY,
      JSON.stringify({ skipped: true, lastBeat: 9, timestamp: '2026-04-30T04:00:00.000Z' }),
    );

    const markup = renderDock(
      <ChipDock collapsed routeBeats={ROUTE_BEAT_REGISTRY['trade-center']} storage={storage} />,
    );

    expect(markup).toContain('data-chip-dock-state="collapsed"');
    expect(markup).not.toContain('data-chip-route-beat');
  });

  it('forwards reduced motion to Chip and the dock data attribute', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderDock(<ChipDock collapsed={false} reducedMotion />);

    expect(markup).toContain('data-chip-dock-motion="reduced"');
    expect(markup).toContain('data-chip-motion="reduced"');
  });

  it('defines smooth dock entrance motion with reduced-motion cutouts', () => {
    expect(chipDockCss).toContain('@keyframes mfd-chip-dock-panel-enter');
    expect(chipDockCss).toContain('@keyframes mfd-chip-dock-bubble-enter');
    expect(chipDockCss).toContain('@keyframes mfd-chip-dock-portrait-ready');
    expect(chipDockCss).toContain(".mfd-chip-dock[data-chip-dock-state='collapsed']");
    expect(chipDockCss).toContain('left: max(12px, env(safe-area-inset-left));');
    expect(chipDockCss).toContain(".mfd-chip-dock[data-chip-dock-motion='animated'] .mfd-chip-dock__panel");
    expect(chipDockCss).toContain(".mfd-chip-dock[data-chip-dock-motion='reduced'] .mfd-chip-dock__bubble");
    expect(chipDockCss).toContain('.mfd-chip-dock .mfd-chip-dock__portrait .mfd-chip');
    expect(chipDockCss).toContain('grid-template-columns: repeat(4, minmax(40px, 1fr));');
    expect(chipDockCss).toContain(".mfd-chip-dock[data-chip-dock-beat='route'] .mfd-chip-dock__controls");
    expect(chipDockCss).toContain(".mfd-chip-dock__control[data-chip-control-weight='utility']");
    expect(chipDockCss).toContain(".mfd-chip-dock__control[data-chip-control-weight='quiet'] .mfd-chip-dock__control-label");
    expect(chipDockCss).toContain(".mfd-chip-dock__control[data-chip-control-id='quietForScreen']");
    expect(chipDockCss).toContain(".mfd-chip-dock__control[data-chip-control-id='quietForScreen'] .mfd-chip-dock__control-label");
    expect(chipDockCss).toContain(".mfd-chip-dock__control[data-chip-control-id='quietThisSeason']");
    expect(chipDockCss).toContain(".mfd-chip-dock__control[data-chip-control-id='quietThisSeason'] .mfd-chip-dock__control-label");
  });

  it('keeps route guidance prominent instead of shrinking it into a text-only strip', () => {
    const routePanelBlock = chipDockCss
      .slice(chipDockCss.indexOf(".mfd-chip-dock[data-chip-dock-beat='route'] .mfd-chip-dock__panel"))
      .split('}')[0];

    expect(routePanelBlock).toContain('max-width: min(540px, calc(100vw - 44px));');
    expect(chipDockCss).not.toContain(".mfd-chip-dock[data-chip-dock-beat='route'] .mfd-chip-dock__portrait {\n  display: none;");
    expect(chipDockCss).not.toContain('max-height: 112px;');
    expect(chipDockCss).not.toContain('max-height: 104px;');
    expect(chipDockCss).not.toContain('max-height: 42px;');
  });

  it('hides the pending-decisions badge at zero', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderDock(<ChipDock collapsed={false} pendingDecisions={{ total: 0 }} />);

    expect(markup).not.toContain('data-chip-pending-decisions');
  });

  it('shows a gold pending-decisions count badge when positive', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderDock(<ChipDock collapsed pendingDecisions={{ total: 7 }} />);

    expect(markup).toContain('data-chip-pending-decisions="true"');
    expect(markup).toContain('aria-label="7 decisions pending"');
    expect(markup).toContain('>7</button>');
  });

  it('treats the pending-decisions beat as an active dock expansion', () => {
    expect(resolveEffectiveDockCollapsed({
      activeRouteBeat: false,
      activeLiveBeat: true,
      controlledCollapsed: true,
      localCollapsed: true,
    })).toBe(false);
  });

  it('can keep a route beat collapsed for narrow first-load coaching', () => {
    expect(resolveEffectiveDockCollapsed({
      activeRouteBeat: true,
      activeLiveBeat: false,
      controlledCollapsed: false,
      localCollapsed: false,
      preferRouteBeatCollapsed: true,
    })).toBe(true);
  });

  it('lets live beats override route-beat auto-collapse', () => {
    expect(resolveEffectiveDockCollapsed({
      activeRouteBeat: true,
      activeLiveBeat: true,
      controlledCollapsed: true,
      localCollapsed: true,
      preferRouteBeatCollapsed: true,
    })).toBe(false);
  });

  it('creates pending-decisions dock copy with the live count', () => {
    expect(createPendingDecisionsBeat(1)).toEqual({
      id: 'chip.dock.pending',
      pose: 'reviewing-tablet',
      text: 'Must Do: choose or defer 1 decision before Advance Week. Where: Inbox, Action Center, or highlighted screen badge. Consequence: the offer, promise, vote, cap, lineup, or morale choice expires or locks at Advance Week.',
    });
    expect(createPendingDecisionsBeat(3).text).toBe(
      'Must Do: choose or defer 3 decisions before Advance Week. Where: Inbox, Action Center, or highlighted screen badges. Consequence: offers, promises, votes, cap, lineup, and morale expire or lock at Advance Week.',
    );
    expect(createPendingDecisionsBeat(3).text.length).toBeLessThanOrEqual(240);
    const allCategoryCopy = createPendingDecisionsBeat({
      tradeOffers: 2,
      expiringContracts: 1,
      emptyDepthSlots: 7,
      unspentPicks: 2,
      openStaffSlots: 2,
      total: 14,
    }).text;
    expect(allCategoryCopy).toBe(
      'Must Do: choose or defer before Advance Week. Where: Trades (2), Contracts (1), Depth Chart (7), Draft (2), and Coaching (2). Consequence: offers expire, players hit free agency, empty slots force unassigned backups, draft window closes, and staff gaps slow practice.',
    );
    expect(allCategoryCopy.length).toBeLessThanOrEqual(285);
  });

  it('chooses useful ask-chip live guidance instead of reopening to empty idle chrome', () => {
    const whereAmI = {
      week: 14,
      seasonWeeks: 18,
      wins: 9,
      losses: 4,
      divisionRank: 2,
      pendingTotal: 0,
    };

    expect(createAskChipLiveBeat({
      pendingDecisionTotal: 2,
      pendingDecisions: { tradeOffers: 1, expiringContracts: 1, total: 2 },
      whereAmI,
    })).toMatchObject({
      id: 'chip.dock.pending',
      text: 'Must Do: choose or defer before Advance Week. Where: Trades (1) and Contracts (1). Consequence: offers expire and players hit free agency.',
    });
    expect(createAskChipLiveBeat({ pendingDecisionTotal: 0, whereAmI })).toEqual({
      id: 'chip.dock.summary',
      pose: 'thinking',
      text: 'Week 14/18, 9-4, Division 2. Must Do: none right now. Recommended: open Monday Briefing. Where: Action Center, then any legal team screen: roster, depth, cap, market, staff, scouting, medical, or Game Plan. Consequence: Advance Week locks saved lineups, cap, morale, and matchup calls.',
    });
    expect(createAskChipLiveBeat({ pendingDecisionTotal: 0, whereAmI: null })).toBeNull();
  });

  it('keeps generated Ask Chip copy structured around action and consequence', () => {
    const pendingBeat = createPendingDecisionsBeat({
      tradeOffers: 1,
      expiringContracts: 1,
      emptyDepthSlots: 1,
      unspentPicks: 1,
      total: 4,
    }).text;
    const summaryBeat = createAskChipLiveBeat({
      pendingDecisionTotal: 0,
      whereAmI: {
        week: 10,
        seasonWeeks: 18,
        wins: 6,
        losses: 3,
        divisionRank: 1,
        pendingTotal: 0,
      },
    })?.text ?? '';

    expect(pendingBeat).toContain('Must Do:');
    expect(pendingBeat).toContain('Consequence:');
    expect(pendingBeat).toContain('before Advance Week');
    expect(pendingBeat).toContain('Where:');
    expect(pendingBeat).toContain('Trades (1)');
    expect(pendingBeat).toContain('Contracts (1)');
    expect(pendingBeat).toContain('Depth Chart (1)');
    expect(pendingBeat).toContain('Draft (1)');
    expect(pendingBeat).toContain('offers expire');
    expect(pendingBeat).toContain('players hit free agency');
    expect(pendingBeat).toContain('empty slots force unassigned backups');
    expect(pendingBeat).toContain('draft window closes');
    expect(pendingBeat).not.toContain('empty slots put unassigned backups on field');
    expect(pendingBeat).not.toContain('the pick window closes before you choose a player');
    expect(pendingBeat).not.toContain('the pick window can pass before you choose a player');
    expect(pendingBeat).not.toContain('unused picks leave the board');
    expect(pendingBeat).not.toContain('waiting decision screen');
    expect(pendingBeat).not.toContain('unanswered choices');
    expect(pendingBeat).not.toContain('lock in without your answer');
    expect(pendingBeat).not.toContain('picks pass');
    expect(pendingBeat).not.toContain('staff vacancies slow prep');
    expect(pendingBeat).not.toContain('flagged decision');
    expect(summaryBeat).toContain('Must Do: none right now.');
    expect(summaryBeat).toContain('Recommended:');
    expect(summaryBeat).toContain('Recommended: open Monday Briefing.');
    expect(summaryBeat).toContain('Where: Action Center, then any legal team screen');
    expect(summaryBeat).toContain('roster, depth, cap, market, staff, scouting, medical, or Game Plan');
    expect(summaryBeat).toContain('Consequence: Advance Week locks saved lineups, cap, morale, and matchup calls.');
    expect(summaryBeat).not.toContain('open Monday Briefing first');
    expect(summaryBeat).not.toContain('use Monday Briefing first');
    expect(summaryBeat).not.toContain('review injuries, depth, cap space, and Game Plan');
    expect(summaryBeat).not.toContain('only if injuries, backup order, cap space, or matchup calls need a change');
    expect(`${pendingBeat} ${summaryBeat}`).not.toMatch(/just|maybe|occasional advice|check back later|carry into the sim|normal sim risk|normal matchup risk|No required action is stopping|No true blockers|true blockers|affect Advance Week|backup or plan risk|can wait/i);
  });

  it('quiet-for-screen writes the current route and dismisses the active dialogue', () => {
    const { prefs, store, storage } = applyControl('quietForScreen');

    expect(prefs.collapsed).toBe(true);
    expect(prefs.quietForScreen).toBe('/roster');
    expect(readDockPrefs(storage).collapsed).toBe(true);
    expect(readDockPrefs(storage).quietForScreen).toBe('/roster');
    expect(store.setPose).toHaveBeenCalledWith('idle');
    expect(store.dismiss).toHaveBeenCalledTimes(1);
  });

  it('normalizes fallback routes through the hash-history app route helper', () => {
    expect(resolveChipDockRoute('', { hash: '#/league/weather', pathname: '/MFD/' }, '/MFD/')).toBe('/league/weather');
    expect(resolveChipDockRoute('', { hash: '', pathname: '/MFD/roster' }, '/MFD/')).toBe('/roster');
    expect(resolveChipDockRoute('/inbox', { hash: '#/roster', pathname: '/MFD/' }, '/MFD/')).toBe('/inbox');
    expect(resolveChipDockRoute('', null, '/MFD/')).toBe('screen');
  });

  it('quiet-until-next-week writes the current game week only', () => {
    const { prefs, storage } = applyControl('quietUntilNextWeek');

    expect(prefs.collapsed).toBe(true);
    expect(prefs.quietUntilWeek).toBe(7);
    expect(prefs.quietForSeason).toBeNull();
    expect(readDockPrefs(storage).collapsed).toBe(true);
    expect(readDockPrefs(storage).quietUntilWeek).toBe(7);
  });

  it('quiet-this-season writes the current season only', () => {
    const { prefs, storage } = applyControl('quietThisSeason');

    expect(prefs.collapsed).toBe(true);
    expect(prefs.quietForSeason).toBe(2032);
    expect(prefs.quietUntilWeek).toBeNull();
    expect(readDockPrefs(storage).collapsed).toBe(true);
    expect(readDockPrefs(storage).quietForSeason).toBe(2032);
  });

  it('ask-chip expansion clears quiet preferences so guidance can return', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      CHIP_DOCK_STORAGE_KEY,
      JSON.stringify({
        ...createDefaultDockPrefs(),
        collapsed: true,
        quietForScreen: '/roster',
        quietUntilWeek: 7,
        quietForSeason: 2032,
      }),
    );

    const { prefs } = applyControl('expand', storage);

    expect(prefs.collapsed).toBe(false);
    expect(prefs.quietForScreen).toBeNull();
    expect(prefs.quietUntilWeek).toBeNull();
    expect(prefs.quietForSeason).toBeNull();
    expect(readDockPrefs(storage).quietForScreen).toBeNull();
    expect(readDockPrefs(storage).quietUntilWeek).toBeNull();
    expect(readDockPrefs(storage).quietForSeason).toBeNull();
  });

  it('mute chip persists through a fresh dock render and keeps route coaching quiet', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');
    const storage = new MemoryStorage();

    applyDockControl('quietThisSeason', {
      storage,
      currentRoute: '/roster',
      currentWeek: 7,
      currentSeason: 2032,
      now: () => new Date('2026-04-29T19:10:00.000Z'),
    });

    const markup = renderDock(
      <ChipDock
        collapsed
        currentRoute="/roster"
        currentWeek={8}
        currentSeason={2032}
        routeBeats={ROUTE_BEAT_REGISTRY.roster}
        storage={storage}
      />,
    );

    expect(readDockPrefs(storage).quietForSeason).toBe(2032);
    expect(markup).toContain('data-chip-dock-state="collapsed"');
    expect(markup).not.toContain('data-chip-route-beat');
  });

  it('reduce-guidance toggles only the reduced guidance preference', () => {
    const { prefs, storage } = applyControl('reduceGuidance');

    expect(prefs.reducedGuidance).toBe(true);
    expect(prefs.animationsDisabled).toBe(false);
    expect(readDockPrefs(storage).reducedGuidance).toBe(true);
  });

  it('disable-animations toggles animation preference and resets Chip to idle', () => {
    const { prefs, store, storage } = applyControl('disableAnimations');

    expect(prefs.animationsDisabled).toBe(true);
    expect(readDockPrefs(storage).animationsDisabled).toBe(true);
    expect(store.setPose).toHaveBeenCalledWith('idle');
  });

  it('what-now replays the most recent weekly dialogue without changing prefs', () => {
    const { prefs, store, storage } = applyControl('whatNow');

    expect(store.showWeeklyDialogue).toHaveBeenCalledWith(expect.objectContaining({
      id: 'chip.weekly.cleanWin',
      text: 'Recommended: open Roster and Depth Chart before Advance Week. Consequence: an unseen injury or wrong backup order can flip next week.',
    }));
    expect(readDockPrefs(storage)).toEqual(prefs);
    expect(prefs).toEqual(createDefaultDockPrefs());
  });

  it('reset-onboarding clears first-ten progress, receipts, intro receipt, and legacy skip state', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      CHIP_ONBOARDING_STATE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        completedBeatIds: ['chip.first10.roster'],
        snoozedUntilWeek: null,
        disabled: false,
        lastUpdated: '2026-05-05T16:00:00.000Z',
      }),
    );
    storage.setItem(
      CHIP_ONBOARDING_STORAGE_KEY,
      JSON.stringify({ skipped: true, lastBeat: 9, timestamp: '2026-05-05T16:00:00.000Z' }),
    );
    storage.setItem(
      CHIP_INTRO_STORAGE_KEY,
      JSON.stringify({ seen: true, skipped: false, timestamp: '2026-05-05T15:00:00.000Z' }),
    );
    writeChipReadReceipts(storage, ['chip.first10.roster', 'chip.route.roster.beat-1']);

    const { store } = applyControl('resetOnboarding', storage);

    expect(readChipOnboardingState(storage).completedBeatIds).toEqual([]);
    expect(readChipReadReceipts(storage).has('chip.first10.roster')).toBe(false);
    expect(readChipReadReceipts(storage).has('chip.route.roster.beat-1')).toBe(true);
    expect(storage.getItem(CHIP_ONBOARDING_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(CHIP_INTRO_STORAGE_KEY)).toBeNull();
    expect(store.reset).toHaveBeenCalledTimes(1);
  });

  it('snooze-onboarding stores a one-week onboarding snooze', () => {
    const { storage } = applyControl('snoozeOnboarding');

    expect(readChipOnboardingState(storage).snoozedUntilWeek).toBe(7);
  });

  it('enable-guidance clears quiet prefs and reenables the onboarding machine', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      CHIP_DOCK_STORAGE_KEY,
      JSON.stringify({
        ...createDefaultDockPrefs(),
        quietForScreen: '/roster',
        quietUntilWeek: 7,
        quietForSeason: 2032,
      }),
    );

    const { prefs } = applyControl('enableGuidance', storage);

    expect(prefs.quietForScreen).toBeNull();
    expect(prefs.quietUntilWeek).toBeNull();
    expect(prefs.quietForSeason).toBeNull();
    expect(readChipOnboardingState(storage).disabled).toBe(false);
  });

  it('persists collapsed state at the single dock localStorage key', () => {
    const storage = new MemoryStorage();

    applyDockControl('collapse', {
      storage,
      currentRoute: '/briefing',
      currentWeek: 1,
      currentSeason: 2026,
      now: () => new Date('2026-04-29T19:05:00.000Z'),
    });

    expect(JSON.parse(storage.getItem(CHIP_DOCK_STORAGE_KEY) ?? '{}')).toMatchObject({
      ...createDefaultDockPrefs(),
      collapsed: true,
      lastUpdated: '2026-04-29T19:05:00.000Z',
    });
  });

  describe('quiet preference enforcement (5-pass review fix [3])', () => {
    it('isRouteCoachingQuieted returns true when quietForScreen matches the current route', () => {
      expect(
        isRouteCoachingQuieted({
          prefs: { quietForScreen: '/roster', quietUntilWeek: null, quietForSeason: null },
          currentRoute: '/roster',
          currentWeek: 5,
          currentSeason: 2032,
        }),
      ).toBe(true);
    });

    it('isRouteCoachingQuieted returns true when quietForSeason matches the current season', () => {
      expect(
        isRouteCoachingQuieted({
          prefs: { quietForScreen: null, quietUntilWeek: null, quietForSeason: 2032 },
          currentRoute: '/roster',
          currentWeek: 5,
          currentSeason: 2032,
        }),
      ).toBe(true);
    });

    it('isRouteCoachingQuieted returns true while currentWeek <= quietUntilWeek', () => {
      expect(
        isRouteCoachingQuieted({
          prefs: { quietForScreen: null, quietUntilWeek: 7, quietForSeason: null },
          currentRoute: '/roster',
          currentWeek: 7,
          currentSeason: 2032,
        }),
      ).toBe(true);
      expect(
        isRouteCoachingQuieted({
          prefs: { quietForScreen: null, quietUntilWeek: 7, quietForSeason: null },
          currentRoute: '/roster',
          currentWeek: 8,
          currentSeason: 2032,
        }),
      ).toBe(false);
    });

    it('isRouteCoachingQuieted returns false when no quiet preference applies', () => {
      expect(
        isRouteCoachingQuieted({
          prefs: { quietForScreen: '/cap-laboratory', quietUntilWeek: null, quietForSeason: null },
          currentRoute: '/roster',
          currentWeek: 5,
          currentSeason: 2032,
        }),
      ).toBe(false);
    });

    it('keeps the dock collapsed when quietForScreen suppresses the active route', () => {
      vi.stubEnv('VITE_CHIP_ENABLED', 'true');
      const storage = new MemoryStorage();
      storage.setItem(
        CHIP_DOCK_STORAGE_KEY,
        JSON.stringify({
          ...createDefaultDockPrefs(),
          quietForScreen: '/roster',
        }),
      );

      const markup = renderDock(
        <ChipDock
          collapsed
          currentRoute="/roster"
          routeBeats={ROUTE_BEAT_REGISTRY.roster}
          storage={storage}
        />,
      );

      expect(markup).toContain('data-chip-dock-state="collapsed"');
      expect(markup).not.toContain('data-chip-route-beat');
    });

    it('keeps the dock collapsed when quietForSeason suppresses route beats', () => {
      vi.stubEnv('VITE_CHIP_ENABLED', 'true');
      const storage = new MemoryStorage();
      storage.setItem(
        CHIP_DOCK_STORAGE_KEY,
        JSON.stringify({
          ...createDefaultDockPrefs(),
          quietForSeason: 2032,
        }),
      );

      const markup = renderDock(
        <ChipDock
          collapsed
          currentRoute="/roster"
          currentSeason={2032}
          routeBeats={ROUTE_BEAT_REGISTRY.roster}
          storage={storage}
        />,
      );

      expect(markup).toContain('data-chip-dock-state="collapsed"');
      expect(markup).not.toContain('data-chip-route-beat');
    });

    it('keeps the dock collapsed while currentWeek <= quietUntilWeek', () => {
      vi.stubEnv('VITE_CHIP_ENABLED', 'true');
      const storage = new MemoryStorage();
      storage.setItem(
        CHIP_DOCK_STORAGE_KEY,
        JSON.stringify({
          ...createDefaultDockPrefs(),
          quietUntilWeek: 7,
        }),
      );

      const markup = renderDock(
        <ChipDock
          collapsed
          currentRoute="/roster"
          currentWeek={7}
          routeBeats={ROUTE_BEAT_REGISTRY.roster}
          storage={storage}
        />,
      );

      expect(markup).toContain('data-chip-dock-state="collapsed"');
      expect(markup).not.toContain('data-chip-route-beat');
    });
  });

  describe('animations preference propagation (5-pass review fix [2])', () => {
    it('renders reduced motion when animationsDisabled is persisted in storage', () => {
      vi.stubEnv('VITE_CHIP_ENABLED', 'true');
      const storage = new MemoryStorage();
      storage.setItem(
        CHIP_DOCK_STORAGE_KEY,
        JSON.stringify({
          ...createDefaultDockPrefs(),
          animationsDisabled: true,
        }),
      );

      const markup = renderDock(<ChipDock collapsed={false} storage={storage} />);

      expect(markup).toContain('data-chip-dock-motion="reduced"');
    });

    it('renders animated motion when animationsDisabled is false in storage', () => {
      vi.stubEnv('VITE_CHIP_ENABLED', 'true');
      const storage = new MemoryStorage();
      storage.setItem(CHIP_DOCK_STORAGE_KEY, JSON.stringify(createDefaultDockPrefs()));

      const markup = renderDock(<ChipDock collapsed={false} storage={storage} />);

      expect(markup).toContain('data-chip-dock-motion="animated"');
    });

    it('marks dock toggle controls with pressed state for assistive tech and styling', () => {
      vi.stubEnv('VITE_CHIP_ENABLED', 'true');
      const storage = new MemoryStorage();
      storage.setItem(
        CHIP_DOCK_STORAGE_KEY,
        JSON.stringify({
          ...createDefaultDockPrefs(),
          reducedGuidance: true,
          animationsDisabled: true,
        }),
      );

      const markup = renderDock(<ChipDock collapsed={false} storage={storage} />);

      expect(markup).toContain('data-chip-control-id="reduceGuidance"');
      expect(markup).toContain('data-chip-control-id="disableAnimations"');
      expect(markup).toContain('aria-pressed="true"');
    });
  });

  describe('mobile route tolerance', () => {
    it('keeps the staged dock and control layers clickable', () => {
      const baseDockBlock = chipDockCss
        .slice(chipDockCss.indexOf('.mfd-chip-dock {'))
        .split('}')[0];
      const panelBlock = chipDockCss
        .slice(chipDockCss.indexOf('.mfd-chip-dock__panel {'))
        .split('}')[0];
      const contentBlock = chipDockCss
        .slice(chipDockCss.indexOf('.mfd-chip-dock__content {'))
        .split('}')[0];
      const bubbleBlock = chipDockCss
        .slice(chipDockCss.indexOf('.mfd-chip-dock__bubble {'))
        .split('}')[0];
      const controlsBlock = chipDockCss
        .slice(chipDockCss.indexOf('.mfd-chip-dock__controls {'))
        .split('}')[0];
      const beatActionsBlock = chipDockCss
        .slice(chipDockCss.indexOf('.mfd-chip-dock__beat-actions {'))
        .split('}')[0];

      expect(baseDockBlock).toContain('pointer-events: none;');
      expect(panelBlock).toContain('pointer-events: auto;');
      expect(contentBlock).toContain('pointer-events: auto;');
      expect(bubbleBlock).toContain('pointer-events: auto;');
      expect(controlsBlock).toContain('pointer-events: auto;');
      expect(beatActionsBlock).toContain('pointer-events: auto;');
    });

    it('keeps the expanded dock from becoming a full-height phone overlay', () => {
      const mobileBlock = chipDockCss.slice(chipDockCss.indexOf('@media (max-width: 720px)'));
      const pendingBadgeBlock = chipDockCss
        .slice(chipDockCss.indexOf('.mfd-chip-dock__pending-badge'))
        .split('}')[0];

      expect(mobileBlock).toContain('bottom: calc(var(--mfd-mobile-nav-height) + 6px + env(safe-area-inset-bottom));');
      expect(mobileBlock).toContain('max-height: min(26vh, 218px);');
      expect(mobileBlock).toContain('grid-template-columns: minmax(0, 1fr);');
      expect(mobileBlock).toContain('grid-template-areas:');
      expect(mobileBlock).toContain('overflow-y: auto;');
      expect(mobileBlock).toContain('display: none;');
      expect(mobileBlock).toContain('display: contents;');
      expect(mobileBlock).toContain('grid-auto-flow: column;');
      expect(mobileBlock).toContain('grid-auto-columns: 48px;');
      expect(mobileBlock).toContain('width: 100%;');
      expect(mobileBlock).toContain('overflow-x: auto;');
      expect(mobileBlock).toContain('top: -38px;');
      expect(mobileBlock).toContain('.mfd-chip-dock__beat-actions,\n  .mfd-chip-dock__controls {\n    pointer-events: auto;');
      expect(mobileBlock).toContain('.mfd-chip-dock .mfd-chip-bubble {\n    box-sizing: border-box;');
      expect(mobileBlock).toContain('width: 100%;');
      expect(pendingBadgeBlock).toContain('box-sizing: border-box;');
      expect(pendingBadgeBlock).toContain('min-width: 60px;');
    });
  });
});
