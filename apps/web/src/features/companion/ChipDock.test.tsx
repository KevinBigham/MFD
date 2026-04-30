import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ChipDock,
  applyDockControl,
  type ChipDockControl,
  type ChipDockControlStore,
} from './ChipDock';
import type { DialogueCatalogEntry } from './dialogue/types';
import { CHIP_DOCK_STORAGE_KEY, createDefaultDockPrefs, readDockPrefs } from './dockPersistence';

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

  it('forwards reduced motion to Chip and the dock data attribute', () => {
    vi.stubEnv('VITE_CHIP_ENABLED', 'true');

    const markup = renderDock(<ChipDock collapsed={false} reducedMotion />);

    expect(markup).toContain('data-chip-dock-motion="reduced"');
    expect(markup).toContain('data-chip-motion="reduced"');
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
