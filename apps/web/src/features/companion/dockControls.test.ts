import { describe, expect, it, vi } from 'vitest';
import {
  applyDockControl,
  CHIP_LEGACY_ONBOARDING_STORAGE_KEY,
  type ChipDockControl,
  type ChipDockControlStore,
} from './dockControls';
import { CHIP_DOCK_STORAGE_KEY, createDefaultDockPrefs, readDockPrefs } from './dockPersistence';
import { CHIP_ONBOARDING_PROGRESS_KEY, readChipOnboardingProgress } from './onboardingMachine';
import type { DialogueCatalogEntry } from './dialogue/types';

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

describe('dock controls', () => {
  it('replays the latest weekly line for What now without changing prefs', () => {
    const { prefs, store, storage } = applyControl('whatNow');

    expect(store.showWeeklyDialogue).toHaveBeenCalledWith(expect.objectContaining({
      id: 'chip.weekly.cleanWin',
      text: 'That was a grown-up win.',
    }));
    expect(readDockPrefs(storage)).toEqual(prefs);
    expect(prefs).toEqual(createDefaultDockPrefs());
  });

  it('clears the legacy skip flag and writes replayable onboarding progress', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      CHIP_LEGACY_ONBOARDING_STORAGE_KEY,
      JSON.stringify({ skipped: true, lastBeat: 9, timestamp: '2026-04-30T04:00:00.000Z' }),
    );

    const { store } = applyControl('replayOnboarding', storage);
    const progress = readChipOnboardingProgress(storage);

    expect(storage.getItem(CHIP_LEGACY_ONBOARDING_STORAGE_KEY)).toBeNull();
    expect(progress.status).toBe('intro_seen');
    expect(progress.shownBeatIds).toEqual(['chip.first10.welcome']);
    expect(store.showWeeklyDialogue).toHaveBeenCalledWith(expect.objectContaining({
      id: 'chip.first10.welcome',
      text: expect.stringContaining('Welcome to the chair.'),
      archetype: 'host',
    }));
  });

  it('resets new and legacy onboarding progress without touching dock prefs', () => {
    const storage = new MemoryStorage();
    storage.setItem(CHIP_ONBOARDING_PROGRESS_KEY, JSON.stringify({ stale: true }));
    storage.setItem(
      CHIP_LEGACY_ONBOARDING_STORAGE_KEY,
      JSON.stringify({ skipped: true, lastBeat: 9, timestamp: '2026-04-30T04:00:00.000Z' }),
    );

    const { prefs, store } = applyControl('resetOnboarding', storage);

    expect(storage.getItem(CHIP_ONBOARDING_PROGRESS_KEY)).toBeNull();
    expect(storage.getItem(CHIP_LEGACY_ONBOARDING_STORAGE_KEY)).toBeNull();
    expect(store.reset).toHaveBeenCalledTimes(1);
    expect(prefs).toEqual(createDefaultDockPrefs());
  });

  it('re-enables guidance by clearing quiet prefs while preserving animation prefs', () => {
    const storage = new MemoryStorage();
    storage.setItem(CHIP_DOCK_STORAGE_KEY, JSON.stringify({
      ...createDefaultDockPrefs(),
      quietForScreen: '/roster',
      quietUntilWeek: 9,
      quietForSeason: 2032,
      reducedGuidance: true,
      animationsDisabled: true,
    }));

    const { prefs } = applyControl('enableGuidance', storage);

    expect(prefs.quietForScreen).toBeNull();
    expect(prefs.quietUntilWeek).toBeNull();
    expect(prefs.quietForSeason).toBeNull();
    expect(prefs.reducedGuidance).toBe(false);
    expect(prefs.animationsDisabled).toBe(true);
  });
});
