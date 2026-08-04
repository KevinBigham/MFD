import { describe, expect, it } from 'vitest';
import {
  CHIP_EVENT_CATEGORY_PRECEDENCE,
  POSE_EVENT_PRECEDENCE,
  buildSessionMuteNoticeEntry,
  createChipEventBridge,
  resolveChipPoseReaction,
  sortPoseEventsByPrecedence,
  type ChipEvent,
  type ChipPoseEventTrigger,
  type ChipPosePriority,
  type ChipStoreSnapshot,
  type GameStoreSnapshot,
  type SubscribableStore,
} from './eventBridge';
import { isDialogueCatalogEntry } from './dialogue/types';
import { createDefaultDockPrefs, type DockPrefs } from './dockPersistence';
import { createEmptyChipMemory, type ChipMemory, type ChipMemoryStore } from './chipMemory';

class FakeMemoryStore implements ChipMemoryStore {
  state: ChipMemory;
  writes = 0;
  constructor(initial: ChipMemory = createEmptyChipMemory()) {
    this.state = initial;
  }
  read(): ChipMemory {
    return this.state;
  }
  write(memory: ChipMemory): ChipMemory {
    this.writes += 1;
    this.state = memory;
    return memory;
  }
}

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
  onSessionMute,
  memory,
}: {
  route?: string;
  prefs?: DockPrefs;
  onSessionMute?: (category: ChipEvent['category']) => void;
  memory?: ChipMemoryStore;
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
    onSessionMute,
    memory,
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
          topAction: 'Must Do: open Monday Briefing. Where: Action Center. Consequence: Advance Week locks saved lineups, cap moves, morale, and matchup calls.',
          whatChanged: 'Week 2: strong win; open Roster and Depth Chart for injury flags before changing starters.',
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

  it('fires gameComplete from an explicit completed-game marker instead of duplicate week rollover', () => {
    const { bridge, gameStore, events } = setupBridge();
    bridge.start();

    gameStore.setState(makeGame({
      currentWeek: 2,
      latestGameCompleteId: 'summary-2026-1-user',
      weeklyOutcome: 'cleanWin',
    }));

    expect(events).toEqual([
      expect.objectContaining({
        id: 'chip.event.gameComplete.2026.2',
        trigger: 'gameComplete',
        category: 'gameComplete',
        currentWeek: 2,
        gameOutcome: 'cleanWin',
        dialogueId: 'chip.weekly.cleanWin',
        guidance: expect.objectContaining({
          topAction: 'Must Do: open Postgame Recap before Advance Week. Where: Post-Week Command Deck, then Roster, Depth Chart, Game Plan. Consequence: next week uses unfixed injuries, morale, and matchup calls.',
          whatChanged: 'Final whistle, Week 2: strong win; open Roster and Depth Chart for injury flags before changing starters.',
        }),
      }),
    ]);
  });

  it('fires seasonEnd from an explicit season-end marker before game-complete markers', () => {
    const { bridge, gameStore, events } = setupBridge();
    bridge.start();

    gameStore.setState(makeGame({
      currentWeek: 1,
      currentSeason: 2027,
      latestGameCompleteId: 'summary-2026-22-user',
      latestSeasonEndId: 'season-end-2026-user-champion',
      weeklyOutcome: 'championship',
    }));

    expect(events).toEqual([
      expect.objectContaining({
        id: 'chip.event.seasonEnd.2027.1',
        trigger: 'seasonEnd',
        category: 'seasonEnd',
        currentSeason: 2027,
        gameOutcome: 'championship',
        dialogueId: 'chip.weekly.championship',
        guidance: expect.objectContaining({
          topAction: 'Must Do: open Season Recap before bids. Where: Season Recap, Contracts, Staff, Cap Lab, Free Agency. Consequence: rushed bids spend cap space on unneeded roles, miss extensions, or leave staff seats empty.',
          whatChanged: 'Season closed: offseason; open Contracts and Staff for expiring starters before spending.',
        }),
      }),
    ]);
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

  it('announces the session auto-mute exactly once when the second dismissal engages it (E3)', () => {
    const muted: ChipEvent['category'][] = [];
    const { bridge, gameStore, chipStore, events } = setupBridge({
      onSessionMute: (category) => muted.push(category),
    });
    bridge.start();

    gameStore.setState(makeGame({ currentWeek: 2 }));
    chipStore.setState(makeChip({ dismissed: true, currentDialogueId: null }));
    chipStore.setState(makeChip({ dismissed: false, currentDialogueId: 'chip.weekly.midseason' }));
    gameStore.setState(makeGame({ currentWeek: 3 }));
    expect(muted).toEqual([]);

    chipStore.setState(makeChip({ dismissed: true, currentDialogueId: null }));
    expect(muted).toEqual(['weekRollover']);

    // A third dismissal must not re-announce, and the category stays muted.
    chipStore.setState(makeChip({ dismissed: false, currentDialogueId: 'chip.weekly.midseason' }));
    chipStore.setState(makeChip({ dismissed: true, currentDialogueId: null }));
    gameStore.setState(makeGame({ currentWeek: 4 }));
    expect(muted).toEqual(['weekRollover']);
    expect(events.map((event) => event.currentWeek)).toEqual([2, 3]);
  });

  it('builds a valid one-bubble session-mute notice entry (E3)', () => {
    const entry = buildSessionMuteNoticeEntry('weekRollover');
    expect(isDialogueCatalogEntry(entry)).toBe(true);
    expect(entry.id).toBe('chip.weekly.sessionMute.weekRollover');
    expect(entry.text).toContain('Ask Chip');
    expect(entry.text).toContain('fresh session');
    expect(entry.pose).toBe('idle');
  });

  it('attributes dismissal-mute to the category of the shown guidance dialogue id', () => {
    const { bridge, gameStore, chipStore, events } = setupBridge();
    bridge.start();

    gameStore.setState(makeGame({ currentWeek: 2 }));
    chipStore.setState(makeChip({ dismissed: true, currentDialogueId: 'chip.weekly.guidance.2' }));
    chipStore.setState(makeChip({ dismissed: false, currentDialogueId: 'chip.weekly.guidance.2' }));
    gameStore.setState(makeGame({ currentWeek: 3 }));
    chipStore.setState(makeChip({ dismissed: true, currentDialogueId: 'chip.weekly.guidance.3' }));
    gameStore.setState(makeGame({ currentWeek: 4 }));

    expect(events.map((event) => event.currentWeek)).toEqual([2, 3]);
  });

  it('bounds the dialogue-category map so long dynasties cannot grow it forever', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('./eventBridge.ts', import.meta.url), 'utf8'),
    );

    expect(source).toContain('MAX_DIALOGUE_CATEGORY_ENTRIES');
    expect(source).toContain('categoryByDialogueId.size > MAX_DIALOGUE_CATEGORY_ENTRIES');
    expect(source).toContain('rememberDialogueCategory(guidance.id, category)');
  });

  it.each([
    ['USER_TEAM_TOUCHDOWN', 'rallying', 4000, 'celebrate'],
    ['USER_TEAM_FIRST_LAUNCH', 'greeting', 5000, 'routine'],
    ['CAP_PROJECTION_OVER_LIMIT', 'head-in-hands', 3500, 'warning'],
    ['OWNER_PATIENCE_CRITICAL', 'warning', 5000, 'warning'],
    ['USER_TEAM_LOSS_BIG', 'facepalm', 6000, 'sad'],
    ['USER_TEAM_BLOWOUT_WIN', 'celebrate', 4500, 'celebrate'],
    ['USER_TEAM_SHUTOUT_WIN', 'celebrate', 4500, 'celebrate'],
    ['USER_TEAM_WIN_STREAK', 'excited', 4500, 'celebrate'],
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

  it('emits same-transition pose stacks in ascending precedence so the top trigger wins (C13)', () => {
    const { bridge, gameStore, poseSets } = setupBridge();
    bridge.start();

    // Deliberately reversed emitter order: the record-broken reaction must
    // still resolve above the blowout-win and decision-locked reactions.
    gameStore.setState(makeGame({
      poseEvents: [
        makePoseEvent('USER_DECISION_LOCKED_IN', 'stack-decision'),
        makePoseEvent('USER_TEAM_RECORD_BROKEN', 'stack-record'),
        makePoseEvent('USER_TEAM_BLOWOUT_WIN', 'stack-blowout'),
      ],
    }));

    expect(poseSets.map((call) => call.pose)).toEqual(['fist-bump', 'celebrate', 'proud']);
    expect(poseSets.map((call) => call.priority)).toEqual(['routine', 'celebrate', 'celebrate']);
  });

  it('resolves a sad-vs-celebrate stack by precedence, not emitter order (C13)', () => {
    const { bridge, gameStore, poseSets } = setupBridge();
    bridge.start();

    gameStore.setState(makeGame({
      poseEvents: [
        makePoseEvent('USER_TEAM_WIN_STREAK', 'stack-streak'),
        makePoseEvent('USER_TEAM_LOSS_BIG', 'stack-loss'),
      ],
    }));

    // USER_TEAM_LOSS_BIG (60) outranks USER_TEAM_WIN_STREAK (55), so the sad
    // reaction emits last and survives the store's equal-window resolution.
    expect(poseSets.map((call) => call.pose)).toEqual(['excited', 'facepalm']);
    expect(poseSets.map((call) => call.priority)).toEqual(['celebrate', 'sad']);
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

describe('B5/B13 memory sidecar wiring', () => {
  it('records the outcome, served flavor line, and Must Do advice after an emit', () => {
    const memory = new FakeMemoryStore();
    const { bridge, gameStore, events } = setupBridge({ memory });
    bridge.start();

    gameStore.setState(makeGame({ currentWeek: 2, weeklyOutcome: 'cleanWin' }));

    expect(memory.writes).toBe(1);
    expect(memory.state.outcomes).toEqual([{ year: 2026, week: 2, variant: 'cleanWin' }]);
    expect(memory.state.lastFlavor).toEqual({
      variant: 'cleanWin',
      line: events[0]!.guidance!.sidelineNote,
    });
    expect(memory.state.lastAdvice).toEqual({
      year: 2026,
      week: 2,
      advice: events[0]!.guidance!.mustDo,
    });
  });

  it('dodges the remembered flavor line on the next emit', () => {
    const first = new FakeMemoryStore();
    const firstRun = setupBridge({ memory: first });
    firstRun.bridge.start();
    firstRun.gameStore.setState(makeGame({ currentWeek: 2, weeklyOutcome: 'cleanWin' }));
    firstRun.bridge.stop();
    const servedNote = firstRun.events[0]!.guidance!.sidelineNote;

    // A fresh bridge holding the prior week's memory must not serve the same
    // flavor line for the identical deterministic inputs.
    const second = new FakeMemoryStore(first.state);
    const secondRun = setupBridge({ memory: second });
    secondRun.bridge.start();
    secondRun.gameStore.setState(makeGame({ currentWeek: 2, weeklyOutcome: 'cleanWin' }));
    secondRun.bridge.stop();

    expect(secondRun.events[0]!.guidance!.sidelineNote).not.toBe(servedNote);
  });

  it('forms no memories when quiet prefs suppress the dialogue', () => {
    const memory = new FakeMemoryStore();
    const prefs = { ...createDefaultDockPrefs(), quietForSeason: 2026 };
    const { bridge, gameStore, events } = setupBridge({ memory, prefs });
    bridge.start();

    gameStore.setState(makeGame({ currentWeek: 2, weeklyOutcome: 'cleanWin' }));

    expect(events).toEqual([]);
    expect(memory.writes).toBe(0);
    expect(memory.state).toEqual(createEmptyChipMemory());
  });

  it('keeps emitting when the default memory store has no browser storage', () => {
    const { bridge, gameStore, events } = setupBridge();
    bridge.start();

    gameStore.setState(makeGame({ currentWeek: 2, weeklyOutcome: 'cleanWin' }));

    expect(events).toHaveLength(1);
  });
});

describe('C13 precedence tables', () => {
  it('gives every dialogue category a distinct precedence with seasonEnd on top', () => {
    expect(Object.keys(CHIP_EVENT_CATEGORY_PRECEDENCE).sort()).toEqual([
      'gameComplete',
      'seasonEnd',
      'weekRollover',
    ]);
    expect(CHIP_EVENT_CATEGORY_PRECEDENCE.weekRollover).toBeLessThan(CHIP_EVENT_CATEGORY_PRECEDENCE.gameComplete);
    expect(CHIP_EVENT_CATEGORY_PRECEDENCE.gameComplete).toBeLessThan(CHIP_EVENT_CATEGORY_PRECEDENCE.seasonEnd);
  });

  it('covers every pose trigger exactly once with a total order', () => {
    const entries = Object.entries(POSE_EVENT_PRECEDENCE);
    expect(entries).toHaveLength(20);
    const values = entries.map(([, value]) => value);
    expect(new Set(values).size).toBe(values.length);
    for (const trigger of entries.map(([trigger]) => trigger) as ChipPoseEventTrigger[]) {
      expect(typeof resolveChipPoseReaction(trigger).pose).toBe('string');
    }
  });

  it('sorts pose events ascending by precedence with an id tiebreak', () => {
    const sorted = sortPoseEventsByPrecedence([
      makePoseEvent('USER_TEAM_ELIMINATED', 'b-elim'),
      makePoseEvent('USER_TEAM_TOUCHDOWN', 'a-td'),
      makePoseEvent('USER_TEAM_CLINCH', 'c-clinch'),
    ]);
    expect(sorted.map((event) => event.trigger)).toEqual([
      'USER_TEAM_TOUCHDOWN',
      'USER_TEAM_CLINCH',
      'USER_TEAM_ELIMINATED',
    ]);
  });
});
