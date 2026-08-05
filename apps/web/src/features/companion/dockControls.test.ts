import { describe, expect, it, vi } from 'vitest';
import {
  applyDockControl,
  CHIP_INTRO_RECEIPT_STORAGE_KEY,
  CHIP_LEGACY_ONBOARDING_STORAGE_KEY,
  type ChipDockControl,
  type ChipDockControlStore,
} from './dockControls';
import { CHIP_DOCK_STORAGE_KEY, createDefaultDockPrefs, readDockPrefs } from './dockPersistence';
import { CHIP_ONBOARDING_STATE_STORAGE_KEY, readChipOnboardingState } from './onboardingMachine';
import { writeChipReadReceipts, readChipReadReceipts } from './readReceipts';
import { CHIP_MEMORY_STORAGE_KEY } from './chipMemory';
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

describe('dock controls', () => {
  it('flips the dock position right -> left -> right (E10)', () => {
    const storage = new MemoryStorage();

    const first = applyControl('dockPosition', storage);
    expect(first.prefs.dockPosition).toBe('left');
    expect(readDockPrefs(storage).dockPosition).toBe('left');

    const second = applyControl('dockPosition', storage);
    expect(second.prefs.dockPosition).toBe('right');
  });

  it('cycles the typewriter speed normal -> fast -> slow -> normal (H2)', () => {
    const storage = new MemoryStorage();

    const first = applyControl('typewriterSpeed', storage);
    expect(first.prefs.typewriterSpeed).toBe('fast');
    expect(readDockPrefs(storage).typewriterSpeed).toBe('fast');

    const second = applyControl('typewriterSpeed', storage);
    expect(second.prefs.typewriterSpeed).toBe('slow');

    const third = applyControl('typewriterSpeed', storage);
    expect(third.prefs.typewriterSpeed).toBe('normal');
  });

  it('replays the latest weekly line for What now without changing prefs', () => {
    const { prefs, store, storage } = applyControl('whatNow');

    expect(store.showWeeklyDialogue).toHaveBeenCalledWith(expect.objectContaining({
      id: 'chip.weekly.cleanWin',
      text: 'Recommended: open Roster and Depth Chart before Advance Week. Consequence: an unseen injury or wrong backup order can flip next week.',
    }));
    expect(readDockPrefs(storage)).toEqual(prefs);
    expect(prefs).toEqual(createDefaultDockPrefs());
  });

  it('resets first-ten onboarding progress, intro receipt, and legacy skip state without touching route receipts', () => {
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
    storage.setItem(
      CHIP_INTRO_RECEIPT_STORAGE_KEY,
      JSON.stringify({ seen: true, skipped: false, timestamp: '2026-04-30T03:30:00.000Z' }),
    );
    writeChipReadReceipts(storage, ['chip.first10.roster', 'chip.route.roster.beat-1']);

    const { prefs, store } = applyControl('resetOnboarding', storage);

    expect(readChipOnboardingState(storage).completedBeatIds).toEqual([]);
    expect(readChipReadReceipts(storage).has('chip.first10.roster')).toBe(false);
    expect(readChipReadReceipts(storage).has('chip.route.roster.beat-1')).toBe(true);
    expect(storage.getItem(CHIP_LEGACY_ONBOARDING_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(CHIP_INTRO_RECEIPT_STORAGE_KEY)).toBeNull();
    expect(store.reset).toHaveBeenCalledTimes(1);
    expect(prefs).toEqual(createDefaultDockPrefs());
  });

  it('clears the memory sidecar on resetOnboarding (B13)', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      CHIP_MEMORY_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        outcomes: [{ year: 2030, week: 4, variant: 'loss' }],
        lastFlavor: { variant: 'loss', line: 'Line one.' },
        lastAdvice: { year: 2030, week: 4, advice: 'Must Do: name the fix.' },
      }),
    );

    applyControl('resetOnboarding', storage);

    expect(storage.getItem(CHIP_MEMORY_STORAGE_KEY)).toBeNull();
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
