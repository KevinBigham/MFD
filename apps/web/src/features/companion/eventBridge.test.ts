import { describe, expect, it } from 'vitest';
import {
  createChipEventBridge,
  type ChipEvent,
  type ChipStoreSnapshot,
  type GameStoreSnapshot,
  type SubscribableStore,
} from './eventBridge';
import { createDefaultDockPrefs, type DockPrefs } from './dockPersistence';

class FakeStore<TState> implements SubscribableStore<TState> {
  private state: TState;
  private readonly listeners = new Set<(state: TState, previousState: TState) => void>();

  constructor(initialState: TState) {
    this.state = initialState;
  }

  getState(): TState {
    return this.state;
  }

  setState(nextState: TState): void {
    const previousState = this.state;
    this.state = nextState;
    for (const listener of this.listeners) {
      listener(this.state, previousState);
    }
  }

  subscribe(listener: (state: TState, previousState: TState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  listenerCount(): number {
    return this.listeners.size;
  }
}

function makeGame(overrides: Partial<GameStoreSnapshot> = {}): GameStoreSnapshot {
  return {
    currentWeek: 1,
    currentSeason: 2026,
    dynastySeed: 42,
    weeklyOutcome: 'midseason',
    ...overrides,
  };
}

function makeChip(overrides: Partial<ChipStoreSnapshot> = {}): ChipStoreSnapshot {
  return {
    dismissed: false,
    currentDialogueId: null,
    ...overrides,
  };
}

function setupBridge({
  route = '/briefing',
  prefs = createDefaultDockPrefs(),
}: {
  route?: string;
  prefs?: DockPrefs;
} = {}) {
  const gameStore = new FakeStore(makeGame());
  const chipStore = new FakeStore(makeChip());
  const events: ChipEvent[] = [];
  const bridge = createChipEventBridge({
    gameStore,
    chipStore,
    dockPrefs: () => prefs,
    currentRoute: () => route,
    now: () => new Date('2026-04-29T20:00:00.000Z'),
    onEvent: (event) => events.push(event),
  });
  return { bridge, gameStore, chipStore, events };
}

describe('createChipEventBridge', () => {
  it('fires one weekRollover event when currentWeek advances', () => {
    const { bridge, gameStore, events } = setupBridge();
    bridge.start();

    gameStore.setState(makeGame({ currentWeek: 2, weeklyOutcome: 'cleanWin' }));

    expect(events).toEqual([
      {
        id: 'chip.event.weekRollover.2026.2',
        trigger: 'weekRollover',
        category: 'weekRollover',
        currentWeek: 2,
        currentSeason: 2026,
        dynastySeed: 42,
        gameOutcome: 'cleanWin',
        dialogueId: 'chip.weekly.cleanWin',
        occurredAt: '2026-04-29T20:00:00.000Z',
      },
    ]);
  });

  it('frequency-caps duplicate emissions for the same week', () => {
    const { bridge, gameStore, events } = setupBridge();
    bridge.start();

    gameStore.setState(makeGame({ currentWeek: 2 }));
    gameStore.setState(makeGame({ currentWeek: 1 }));
    gameStore.setState(makeGame({ currentWeek: 2 }));

    expect(events).toHaveLength(1);
  });

  it('suppresses events on setup routes', () => {
    const { bridge, gameStore, events } = setupBridge({ route: '/setup/agm' });
    bridge.start();

    gameStore.setState(makeGame({ currentWeek: 2 }));

    expect(events).toEqual([]);
  });

  it('honors quiet-until-week dock preferences', () => {
    const prefs = {
      ...createDefaultDockPrefs(),
      quietUntilWeek: 2,
    };
    const { bridge, gameStore, events } = setupBridge({ prefs });
    bridge.start();

    gameStore.setState(makeGame({ currentWeek: 2 }));
    gameStore.setState(makeGame({ currentWeek: 3 }));

    expect(events.map((event) => event.currentWeek)).toEqual([3]);
  });

  it('mutes the weekRollover category after two consecutive dismissals', () => {
    const { bridge, gameStore, chipStore, events } = setupBridge();
    bridge.start();

    gameStore.setState(makeGame({ currentWeek: 2 }));
    chipStore.setState(makeChip({ dismissed: true, currentDialogueId: null }));
    chipStore.setState(makeChip({ dismissed: false, currentDialogueId: 'chip.weekly.midseason' }));
    gameStore.setState(makeGame({ currentWeek: 3 }));
    chipStore.setState(makeChip({ dismissed: true, currentDialogueId: null }));
    gameStore.setState(makeGame({ currentWeek: 4 }));

    expect(events.map((event) => event.currentWeek)).toEqual([2, 3]);
  });

  it('start and stop manage subscriptions without import-time side effects', () => {
    const { bridge, gameStore, chipStore } = setupBridge();

    expect(gameStore.listenerCount()).toBe(0);
    expect(chipStore.listenerCount()).toBe(0);

    bridge.start();
    expect(gameStore.listenerCount()).toBe(1);
    expect(chipStore.listenerCount()).toBe(1);

    bridge.stop();
    expect(gameStore.listenerCount()).toBe(0);
    expect(chipStore.listenerCount()).toBe(0);
  });

  it('is deterministic for repeated identical transition sequences', () => {
    const runSequence = () => {
      const { bridge, gameStore, events } = setupBridge();
      bridge.start();
      gameStore.setState(makeGame({ currentWeek: 2, weeklyOutcome: 'uglyWin' }));
      gameStore.setState(makeGame({ currentWeek: 3, weeklyOutcome: 'loss' }));
      bridge.stop();
      return events;
    };

    const first = runSequence();

    for (let index = 0; index < 100; index += 1) {
      expect(runSequence()).toEqual(first);
    }
  });
});
