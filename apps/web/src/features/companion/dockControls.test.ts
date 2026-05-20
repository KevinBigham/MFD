import { describe, expect, it, vi } from 'vitest';
import {
  applyDockControl,
  CHIP_LEGACY_ONBOARDING_STORAGE_KEY,
  type ChipDockControl,
  type ChipDockControlStore,
} from './dockControls';
import { CHIP_DOCK_STORAGE_KEY, createDefaultDockPrefs, readDockPrefs } from './dockPersistence';
import { CHIP_ONBOARDING_STATE_STORAGE_KEY, readChipOnboardingState } from './onboardingMachine';
import { writeChipReadReceipts, readChipReadReceipts } from './readReceipts';
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

  it('resets first-ten onboarding progress and legacy skip state without touching route receipts', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      CHIP_ONBOARDING_STATE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        completedBeatIds: ['chip.first10.roster'],
        snoozedUntilWeek: null,
        disabled: false,
        lastUpdated: '2026-04-30T04:00:00.000Z',
      }),
    );
    storage.setItem(
      CHIP_LEGACY_ONBOARDING_STORAGE_KEY,
      JSON.stringify({ skipped: true, lastBeat: 9, timestamp: '2026-04-30T04:00:00.000Z' }),
    );
    writeChipReadReceipts(storage, ['chip.first10.roster', 'chip.route.roster.beat-1']);

    const { prefs, store } = applyControl('resetOnboarding', storage);

    expect(readChipOnboardingState(storage).completedBeatIds).toEqual([]);
    expect(readChipReadReceipts(storage).has('chip.first10.roster')).toBe(false);
    expect(readChipReadReceipts(storage).has('chip.route.roster.beat-1')).toBe(true);
    expect(storage.getItem(CHIP_LEGACY_ONBOARDING_STORAGE_KEY)).toBeNull();
    expect(store.reset).toHaveBeenCalledTimes(1);
    expect(prefs).toEqual(createDefaultDockPrefs());
  });

  it('snoozes first-ten onboarding at the current week', () => {
    const { storage } = applyControl('snoozeOnboarding');

    expect(readChipOnboardingState(storage).snoozedUntilWeek).toBe(7);
  });

  it('re-enables guidance by clearing quiet prefs while preserving guidance cadence prefs', () => {
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
    expect(prefs.reducedGuidance).toBe(true);
    expect(prefs.animationsDisabled).toBe(true);
  });
});
