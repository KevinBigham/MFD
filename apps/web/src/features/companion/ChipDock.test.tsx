import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ChipDock,
  applyDockControl,
  createPendingDecisionsBeat,
  persistRouteBeatProgress,
  resolveEffectiveDockCollapsed,
  resolveNextRouteBeatIndex,
  type ChipDockControl,
  type ChipDockControlStore,
} from './ChipDock';
import type { DialogueCatalogEntry } from './dialogue/types';
import { CHIP_DOCK_STORAGE_KEY, createDefaultDockPrefs, readDockPrefs } from './dockPersistence';
import { CHIP_ONBOARDING_STORAGE_KEY } from './ChipHost';
import { CHIP_READ_RECEIPTS_STORAGE_KEY, readChipReadReceipts } from './readReceipts';
import { ROUTE_BEAT_REGISTRY } from '../route-coaching/routeBeatRegistry';

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
    text: 'That was a grown-up win.',
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
    expect(markup).not.toContain('What now?');
  });

  it('renders a collapsed dock as a quiet Chip portrait without controls or bubble', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderDock(<ChipDock collapsed />);

    expect(markup).toContain('data-chip-dock="true"');
    expect(markup).toContain('data-chip-dock-state="collapsed"');
    expect(markup).toContain('data-chip-pose="idle"');
    expect(markup).not.toContain('data-chip-dock-controls');
    expect(markup).not.toContain('DYNASTY DESK // CHIP');
  });

  it('renders expanded dock controls and supplied broadcast-card dialogue', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderDock(
      <ChipDock collapsed={false}>
        <p>Monday briefing: we survived the road game.</p>
      </ChipDock>,
    );

    expect(markup).toContain('data-chip-dock-state="expanded"');
    expect(markup).toContain('data-chip-dock-controls="true"');
    expect(markup).toContain('Quiet for screen');
    expect(markup).toContain('Quiet until next week');
    expect(markup).toContain('Quiet this season');
    expect(markup).toContain('Reduce guidance');
    expect(markup).toContain('Disable animations');
    expect(markup).toContain('What now?');
    expect(markup).toContain('Monday briefing: we survived the road game.');
  });

  it('auto-expands and renders the first unseen route beat', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderDock(
      <ChipDock collapsed routeBeats={ROUTE_BEAT_REGISTRY.roster} storage={new MemoryStorage()} />,
    );

    expect(markup).toContain('data-chip-dock-state="expanded"');
    expect(markup).toContain('data-chip-route-beat="chip.route.roster.beat-1"');
    expect(markup).toContain('Start with the highlighted player.');
    expect(markup).toContain('Got it');
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

  it('creates pending-decisions dock copy with the live count', () => {
    expect(createPendingDecisionsBeat(1)).toEqual({
      id: 'chip.dock.pending',
      pose: 'thinking',
      text: '1 decisions waiting.',
    });
  });

  it('quiet-for-screen writes the current route and dismisses the active dialogue', () => {
    const { prefs, store, storage } = applyControl('quietForScreen');

    expect(prefs.quietForScreen).toBe('/roster');
    expect(readDockPrefs(storage).quietForScreen).toBe('/roster');
    expect(store.setPose).toHaveBeenCalledWith('idle');
    expect(store.dismiss).toHaveBeenCalledTimes(1);
  });

  it('quiet-until-next-week writes the current game week only', () => {
    const { prefs, storage } = applyControl('quietUntilNextWeek');

    expect(prefs.quietUntilWeek).toBe(7);
    expect(prefs.quietForSeason).toBeNull();
    expect(readDockPrefs(storage).quietUntilWeek).toBe(7);
  });

  it('quiet-this-season writes the current season only', () => {
    const { prefs, storage } = applyControl('quietThisSeason');

    expect(prefs.quietForSeason).toBe(2032);
    expect(prefs.quietUntilWeek).toBeNull();
    expect(readDockPrefs(storage).quietForSeason).toBe(2032);
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
      text: 'That was a grown-up win.',
    }));
    expect(readDockPrefs(storage)).toEqual(prefs);
    expect(prefs).toEqual(createDefaultDockPrefs());
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
});
