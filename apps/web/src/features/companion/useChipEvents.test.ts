import { describe, expect, it, vi } from 'vitest';
import {
  createChipEventsController,
  createChipStoreBridgeAdapter,
  createGameStoreBridgeAdapter,
  isChipEventsEnabled,
} from './useChipEvents';
import type { ChipEvent, ChipEventBridge } from './eventBridge';
import { createDefaultDockPrefs } from './dockPersistence';

function makeWeekEvent(overrides: Partial<ChipEvent> = {}): ChipEvent {
  return {
    id: 'chip.event.weekRollover.2026.2',
    trigger: 'weekRollover',
    category: 'weekRollover',
    currentWeek: 2,
    currentSeason: 2026,
    dynastySeed: 42,
    gameOutcome: 'cleanWin',
    dialogueId: 'chip.weekly.cleanWin',
    occurredAt: '2026-04-29T21:00:00.000Z',
    ...overrides,
  };
}

describe('useChipEvents adapter', () => {
  it('treats only VITE_CHIP_ENABLED=true as enabled', () => {
    expect(isChipEventsEnabled({ VITE_CHIP_ENABLED: 'true' })).toBe(true);
    expect(isChipEventsEnabled({ VITE_CHIP_ENABLED: 'false' })).toBe(false);
    expect(isChipEventsEnabled({})).toBe(false);
  });

  it('starts and stops the bridge through the controller lifecycle', () => {
    const bridge: ChipEventBridge = {
      start: vi.fn(),
      stop: vi.fn(),
    };
    const controller = createChipEventsController({
      bridge,
      chipStore: { showWeeklyDialogue: vi.fn() },
    });

    controller.start();
    controller.stop();

    expect(bridge.start).toHaveBeenCalledTimes(1);
    expect(bridge.stop).toHaveBeenCalledTimes(1);
  });

  it('pipes weekRollover events to the matching weekly dialogue entry', () => {
    const showWeeklyDialogue = vi.fn();
    const onEvent = vi.fn();
    const controller = createChipEventsController({
      bridge: { start: vi.fn(), stop: vi.fn() },
      chipStore: { showWeeklyDialogue },
      onEvent,
    });

    controller.handleEvent(makeWeekEvent({ gameOutcome: 'uglyWin' }));

    expect(showWeeklyDialogue).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'chip.weekly.uglyWin',
        archetype: 'weekly',
      }),
    );
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ gameOutcome: 'uglyWin' }));
  });

  it('adapts app game store state into bridge snapshots', () => {
    const unsubscribe = vi.fn();
    const listener = vi.fn();
    const adapter = createGameStoreBridgeAdapter({
      getState: () => ({
        game: {
          week: 4,
          year: 2028,
          seed: 101,
          phase: 'regular_season',
          weekSummaries: [{ result: 'loss', teamScore: 17, opponentScore: 24 }],
        },
      }),
      subscribe: (callback) => {
        callback(
          {
            game: {
              week: 5,
              year: 2028,
              seed: 101,
              phase: 'regular_season',
              weekSummaries: [{ result: 'win', teamScore: 24, opponentScore: 14 }],
            },
          },
          {
            game: {
              week: 4,
              year: 2028,
              seed: 101,
              phase: 'regular_season',
              weekSummaries: [{ result: 'loss', teamScore: 17, opponentScore: 24 }],
            },
          },
        );
        return unsubscribe;
      },
    });

    expect(adapter.getState()).toEqual({
      currentWeek: 4,
      currentSeason: 2028,
      dynastySeed: 101,
      weeklyOutcome: 'loss',
    });
    expect(adapter.subscribe(listener)).toBe(unsubscribe);
    expect(listener).toHaveBeenCalledWith(
      {
        currentWeek: 5,
        currentSeason: 2028,
        dynastySeed: 101,
        weeklyOutcome: 'cleanWin',
      },
      {
        currentWeek: 4,
        currentSeason: 2028,
        dynastySeed: 101,
        weeklyOutcome: 'loss',
      },
    );
  });

  it('adapts Chip store state without exposing dialogue text to the bridge', () => {
    const adapter = createChipStoreBridgeAdapter({
      getState: () => ({
        dismissed: true,
        currentDialogueId: 'chip.weekly.cleanWin',
        currentDialogueText: 'That was a grown-up win.',
      }),
      subscribe: () => () => undefined,
    });

    expect(adapter.getState()).toEqual({
      dismissed: true,
      currentDialogueId: 'chip.weekly.cleanWin',
    });
  });

  it('provides default dock prefs to bridge construction without touching dynasty saves', () => {
    expect(createDefaultDockPrefs()).toMatchObject({
      collapsed: false,
      quietUntilWeek: null,
      quietForSeason: null,
    });
  });
});
