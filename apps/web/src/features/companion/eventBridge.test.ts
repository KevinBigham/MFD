import { describe, expect, it } from 'vitest';
import {
  createChipEventBridge,
  type ChipEvent,
  type ChipPoseEventTrigger,
  type ChipPosePriority,
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

function makePoseEvent(trigger: ChipPoseEventTrigger, id = `chip.pose.${trigger}`) {
  return { id, trigger };
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
  const poseSets: Array<{
    pose: string;
    durationMs: number;
    nowMs: number;
    priority: ChipPosePriority;
  }> = [];
  const bridge = createChipEventBridge({
    gameStore,
    chipStore,
    dockPrefs: () => prefs,
    currentRoute: () => route,
    now: () => new Date('2026-04-29T20:00:00.000Z'),
    setPose: (pose, options) => {
      const normalized = typeof options === 'number' ? { durationMs: options } : options;
      poseSets.push({
        pose,
        durationMs: normalized?.durationMs ?? 0,
        nowMs: normalized?.nowMs ?? 0,
        priority: normalized?.priority ?? 'routine',
      });
    },
    onEvent: (event) => events.push(event),
  });
  return { bridge, gameStore, chipStore, events, poseSets };
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
        guidance: expect.objectContaining({
          topAction: 'Start with the Monday Briefing.',
          whatChanged: 'Week 2: a clean win.',
        }),
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

  it.each([
    ['USER_TEAM_TOUCHDOWN', 'rallying', 4000, 'celebrate'],
    ['USER_TEAM_FIRST_LAUNCH', 'greeting', 5000, 'routine'],
    ['CAP_PROJECTION_OVER_LIMIT', 'head-in-hands', 3500, 'warning'],
    ['USER_TEAM_LOSS_BIG', 'facepalm', 6000, 'sad'],
    ['PLAYOFF_UPSET_WIN', 'laughing', 4000, 'routine'],
    ['TRADE_RUMOR_FOR_USER_PLAYER', 'on-phone', 3500, 'routine'],
    ['PLAYER_RETIREMENT_USER_HOF', 'head-in-hands', 4000, 'sad'],
    ['USER_DECISION_LOCKED_IN', 'fist-bump', 1500, 'routine'],
  ] as const)(
    'maps %s pose events to %s for %dms',
    (trigger, pose, durationMs, priority) => {
      const { bridge, gameStore, poseSets } = setupBridge();
      bridge.start();

      gameStore.setState(makeGame({
        poseEvents: [makePoseEvent(trigger)],
      }));

      expect(poseSets).toEqual([
        {
          pose,
          durationMs,
          nowMs: Date.parse('2026-04-29T20:00:00.000Z'),
          priority,
        },
      ]);
    },
  );

  it('dedupes pose event ids across repeated snapshots', () => {
    const { bridge, gameStore, poseSets } = setupBridge();
    bridge.start();

    gameStore.setState(makeGame({
      poseEvents: [makePoseEvent('CAP_PROJECTION_OVER_LIMIT', 'cap-warning-1')],
    }));
    gameStore.setState(makeGame({
      currentWeek: 2,
      poseEvents: [makePoseEvent('CAP_PROJECTION_OVER_LIMIT', 'cap-warning-1')],
    }));

    expect(poseSets).toHaveLength(1);
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
