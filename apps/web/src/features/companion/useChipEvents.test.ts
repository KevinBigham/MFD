import { describe, expect, it, vi } from 'vitest';
import {
  createChipEventsController,
  createChipStoreBridgeAdapter,
  createGameStoreBridgeAdapter,
  deriveConsecutiveOutcomeWeeks,
  isChipEventsEnabled,
  resolveChipEventRoute,
} from './useChipEvents';
import type { ChipEvent, ChipEventBridge } from './eventBridge';
import { createDefaultDockPrefs } from './dockPersistence';
import { buildWeeklyGuidance } from './weeklyGuidance';

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
        contextDetails: expect.arrayContaining([
          'What changed: Week 2: close win; open Recap for injuries, backup order, and Game Plan miss.',
          'Deadline: Open Monday Briefing. Fix or accept any Action Center injury, backup, morale, cap, or matchup note before Advance Week.',
          'Optional: Make any legal roster, depth chart, training, game plan, cap space, trade, waiver, practice-squad, free-agency, scouting, coaching, facility, or medical move this week; prioritize moves that change lineup, cap space, market offer, staff plan, recovery, or matchup before Advance Week.',
          'Where: Action Center, then any legal football-ops screen: Roster, Depth Chart, Training Camp, Game Plan, Contracts, Cap Lab, Trades, Waiver Wire, Practice Squad, Free Agency, Scouting, Coaching, or Front Office.',
          'Optional later: Open awards, records, and history after you fix or accept Monday Briefing and Action Center notes; awards, records, and history do not change the next game.',
          'Consequence: Skipping Monday Briefing leaves a named injury, unassigned first backup, tight cap choice, or uncovered matchup call locked into Advance Week.',
        ]),
      }),
    );
    const playerFacingCopy = [
      showWeeklyDialogue.mock.calls[0]?.[0]?.text,
      ...(showWeeklyDialogue.mock.calls[0]?.[0]?.contextDetails ?? []),
    ].join(' ');
    expect(showWeeklyDialogue.mock.calls[0]?.[0]?.text).toBe(
      'Must Do: open Monday Briefing. Where: Action Center. Consequence: Advance Week locks saved lineups, cap moves, morale, and matchup calls.',
    );
    expect(showWeeklyDialogue.mock.calls[0]?.[0]?.text.length).toBeLessThanOrEqual(240);
    expect(showWeeklyDialogue.mock.calls[0]?.[0]?.contextDetails).toContain(
      'Why: Monday Briefing names injuries, backup gaps, morale drops, or uncovered protection, coverage, or run-defense calls before Advance Week locks the next game.',
    );
    expect(showWeeklyDialogue.mock.calls[0]?.[0]?.text).not.toMatch(/Must Do:.*Must Do:/i);
    expect(playerFacingCopy).toContain('cap space');
    expect(playerFacingCopy).not.toMatch(/Urgent:/i);
    expect(playerFacingCopy).toContain('Deadline:');
    expect(playerFacingCopy).not.toMatch(/Can wait:|Awards, records, and history can wait/i);
    expect(playerFacingCopy).not.toMatch(/No single fire/i);
    expect(playerFacingCopy).not.toMatch(/\btriage\b/i);
    expect(playerFacingCopy).not.toMatch(/uglyWin|cleanWin|threeLossStreak|stale game plan/i);
    expect(playerFacingCopy).not.toMatch(/bad depth unresolved/i);
    expect(playerFacingCopy).not.toMatch(/\bcap room\b/i);
    expect(playerFacingCopy).not.toMatch(/warning signs|based on its warnings/i);
    expect(playerFacingCopy).not.toMatch(/Review history and awards after|Monday Briefing, Roster, Depth Chart|when they are legal|weekly review before Advance Week/i);
    expect(playerFacingCopy).not.toMatch(/Read Monday Briefing first|Where: Read Monday Briefing/i);
    expect(playerFacingCopy).toContain('Make any legal roster, depth chart, training');
    expect(playerFacingCopy).toContain('prioritize moves that change lineup, cap space, market offer, staff plan, recovery, or matchup');
    expect(playerFacingCopy).not.toMatch(/screen's deadline|screen deadline|current plan|mismatched/i);
    expect(playerFacingCopy).toContain('Open awards, records, and history after you fix or accept Monday Briefing and Action Center notes');
    expect(playerFacingCopy).toContain('awards, records, and history do not change the next game');
    expect(playerFacingCopy).toContain('Open Action Center for current notes');
    expect(playerFacingCopy).toContain('any legal roster, depth chart, training');
    expect(playerFacingCopy).toContain('medical move remains available');
    expect(playerFacingCopy).not.toContain('only when a named issue changes this week');
    expect(playerFacingCopy).not.toContain('only for a named injury, backup, cap, or matchup fix');
    expect(playerFacingCopy).not.toMatch(/Check injuries, backup order, cap space, and next opponent before kickoff|Open Monday Briefing, then check Roster, Depth Chart, and Game Plan before Advance Week/i);
    expect(playerFacingCopy).not.toContain('Open Action Center first');
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ gameOutcome: 'uglyWin' }));
  });

  it('renders event-specific guidance while keeping the weekly dialogue id stable', () => {
    const showWeeklyDialogue = vi.fn();
    const controller = createChipEventsController({
      bridge: { start: vi.fn(), stop: vi.fn() },
      chipStore: { showWeeklyDialogue },
    });

    controller.handleEvent(makeWeekEvent({
      trigger: 'gameComplete',
      category: 'gameComplete',
      gameOutcome: 'loss',
      guidance: buildWeeklyGuidance({
        outcome: 'loss',
        currentWeek: 2,
        eventTrigger: 'gameComplete',
      }),
    }));

    expect(showWeeklyDialogue).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'chip.weekly.loss',
        text: expect.stringContaining('Must Do: open Postgame Recap before Advance Week. Where: Post-Week Command Deck, then Roster, Depth Chart, Game Plan. Consequence: next week uses unfixed injuries, morale, and matchup calls.'),
        contextDetails: expect.arrayContaining([
          expect.stringContaining('What changed: Final whistle, Week 2: loss; name the failed call or position before fixes.'),
        ]),
      }),
    );
  });

  it('sets a deterministic reduced-motion pose on the piped weekly entry (B8)', () => {
    const showWeeklyDialogue = vi.fn();
    const controller = createChipEventsController({
      bridge: { start: vi.fn(), stop: vi.fn() },
      chipStore: { showWeeklyDialogue },
    });

    controller.handleEvent(makeWeekEvent({ gameOutcome: 'uglyWin' }));
    const firstPose = showWeeklyDialogue.mock.calls[0]?.[0]?.reducedMotionPose;
    expect(firstPose).toBeDefined();

    const replaySpy = vi.fn();
    const replay = createChipEventsController({
      bridge: { start: vi.fn(), stop: vi.fn() },
      chipStore: { showWeeklyDialogue: replaySpy },
    });
    replay.handleEvent(makeWeekEvent({ gameOutcome: 'uglyWin' }));
    expect(replaySpy.mock.calls[0]?.[0]?.reducedMotionPose).toBe(firstPose);
  });

  it('threads average morale and owner patience into the weekly guidance snapshot (A5)', () => {
    const adapter = createGameStoreBridgeAdapter({
      getState: () => ({
        game: {
          week: 6,
          year: 2028,
          seed: 101,
          phase: 'regular_season',
          teams: {
            user: { id: 'user', city: 'Chicago', name: 'Monsters', isUser: true, ownerId: 'owner-1' },
          },
          owners: { 'owner-1': { patience: 25 } },
          players: {
            p1: { teamId: 'user', morale: 40 },
            p2: { teamId: 'user', morale: 50 },
            p3: { teamId: 'rival', morale: 90 },
          },
          weekSummaries: [{ result: 'win', teamScore: 24, opponentScore: 14 }],
        },
      }),
      subscribe: () => () => undefined,
    });

    const snapshot = adapter.getState();
    expect(snapshot.weeklyGuidance?.averageMorale).toBe(45);
    expect(snapshot.weeklyGuidance?.ownerPatience).toBe(25);
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
      latestGameCompleteId: 'summary:2028:4:user:loss:17:24',
      latestSeasonEndId: undefined,
      weeklyOutcome: 'loss',
    });
    expect(adapter.subscribe(listener)).toBe(unsubscribe);
    expect(listener).toHaveBeenCalledWith(
      {
        currentWeek: 5,
        currentSeason: 2028,
        dynastySeed: 101,
        latestGameCompleteId: 'summary:2028:5:user:win:24:14',
        latestSeasonEndId: undefined,
        weeklyOutcome: 'cleanWin',
      },
      {
        currentWeek: 4,
        currentSeason: 2028,
        dynastySeed: 101,
        latestGameCompleteId: 'summary:2028:4:user:loss:17:24',
        latestSeasonEndId: undefined,
        weeklyOutcome: 'loss',
      },
    );
  });

  it('derives seasonEnd markers from offseason franchise history for the user team', () => {
    const adapter = createGameStoreBridgeAdapter({
      getState: () => ({
        game: {
          week: 1,
          year: 2028,
          seed: 101,
          phase: 'offseason',
          teams: {
            user: { id: 'user', city: 'Chicago', name: 'Monsters', isUser: true },
          },
          franchiseHistory: [
            { teamId: 'user', year: 2028, playoffFinish: 'champion' },
          ],
        },
      }),
      subscribe: () => () => undefined,
    });

    expect(adapter.getState()).toMatchObject({
      currentWeek: 1,
      currentSeason: 2028,
      dynastySeed: 101,
      latestGameCompleteId: undefined,
      latestSeasonEndId: 'season-end:2028:user:champion',
      weeklyOutcome: 'championship',
    });
  });

  it('serves preseason guidance when the regular season has no results yet', () => {
    const adapter = createGameStoreBridgeAdapter({
      getState: () => ({
        game: {
          week: 1,
          year: 2028,
          seed: 101,
          phase: 'regular_season',
          weekSummaries: [],
        },
      }),
      subscribe: () => () => undefined,
    });

    expect(adapter.getState()).toMatchObject({ weeklyOutcome: 'preseason' });
  });

  it('keeps the midseason fallback when later weeks still lack summaries', () => {
    const adapter = createGameStoreBridgeAdapter({
      getState: () => ({
        game: {
          week: 8,
          year: 2028,
          seed: 101,
          phase: 'regular_season',
          weekSummaries: [],
        },
      }),
      subscribe: () => () => undefined,
    });

    expect(adapter.getState()).toMatchObject({ weeklyOutcome: 'midseason' });
  });

  it('counts consecutive weeks with the same derived outcome for continuity copy', () => {
    expect(deriveConsecutiveOutcomeWeeks({
      week: 4,
      year: 2028,
      seed: 101,
      phase: 'regular_season',
      weekSummaries: [
        { result: 'win', teamScore: 24, opponentScore: 14 },
        { result: 'win', teamScore: 27, opponentScore: 10 },
        { result: 'win', teamScore: 31, opponentScore: 17 },
      ],
    })).toBe(3);

    expect(deriveConsecutiveOutcomeWeeks({
      week: 4,
      year: 2028,
      seed: 101,
      phase: 'regular_season',
      weekSummaries: [
        { result: 'loss', teamScore: 10, opponentScore: 24 },
        { result: 'win', teamScore: 27, opponentScore: 10 },
        { result: 'win', teamScore: 31, opponentScore: 17 },
      ],
    })).toBe(2);

    expect(deriveConsecutiveOutcomeWeeks({
      week: 2,
      year: 2028,
      seed: 101,
      phase: 'regular_season',
      weekSummaries: [
        { result: 'win', teamScore: 27, opponentScore: 10 },
        { result: 'loss', teamScore: 10, opponentScore: 24 },
      ],
    })).toBeUndefined();

    expect(deriveConsecutiveOutcomeWeeks({
      week: 1,
      year: 2028,
      seed: 101,
      phase: 'regular_season',
      weekSummaries: [{ result: 'win', teamScore: 27, opponentScore: 10 }],
    })).toBeUndefined();

    expect(deriveConsecutiveOutcomeWeeks(null)).toBeUndefined();
  });

  it('adapts Chip store state without exposing dialogue text to the bridge', () => {
    const adapter = createChipStoreBridgeAdapter({
      getState: () => ({
        dismissed: true,
        currentDialogueId: 'chip.weekly.cleanWin',
        currentDialogueText: 'Recommended: open Roster and Depth Chart before Advance Week. Consequence: an unseen injury or wrong backup order can flip next week.',
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

  it('normalizes event bridge routes through the hash-history app route helper', () => {
    expect(resolveChipEventRoute({ hash: '#/league/weather', pathname: '/MFD/' }, '/MFD/')).toBe('/league/weather');
    expect(resolveChipEventRoute({ hash: '', pathname: '/MFD/roster' }, '/MFD/')).toBe('/roster');
    expect(resolveChipEventRoute(null, '/MFD/')).toBe('/');
  });
});

describe('B7 conversation wiring', () => {
  it('queues reaction + coaching beats for big-moment outcomes', () => {
    const showWeeklyDialogue = vi.fn();
    const queueDialogue = vi.fn();
    const controller = createChipEventsController({
      bridge: { start: vi.fn(), stop: vi.fn() },
      chipStore: { showWeeklyDialogue, queueDialogue },
    });

    controller.handleEvent(makeWeekEvent({ gameOutcome: 'blowoutLoss', dialogueId: 'chip.weekly.blowoutLoss' }));

    expect(queueDialogue).toHaveBeenCalledTimes(1);
    const conversation = queueDialogue.mock.calls[0]![0] as Array<{ id: string; text: string; contextDetails?: string[] }>;
    expect(conversation.length).toBeGreaterThanOrEqual(2);
    expect(conversation[0]!.id).toMatch(/\.reaction/);
    expect(conversation.at(-1)!.id).toMatch(/\.plan/);
    expect(conversation.at(-1)!.contextDetails?.length).toBeGreaterThan(0);
    expect(showWeeklyDialogue).not.toHaveBeenCalled();
  });

  it('keeps the single-bubble path for non-big outcomes', () => {
    const showWeeklyDialogue = vi.fn();
    const queueDialogue = vi.fn();
    const controller = createChipEventsController({
      bridge: { start: vi.fn(), stop: vi.fn() },
      chipStore: { showWeeklyDialogue, queueDialogue },
    });

    controller.handleEvent(makeWeekEvent({ gameOutcome: 'cleanWin', dialogueId: 'chip.weekly.cleanWin' }));

    expect(queueDialogue).not.toHaveBeenCalled();
    expect(showWeeklyDialogue).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'chip.weekly.cleanWin' }),
    );
  });

  it('falls back to showWeeklyDialogue with the first beat when the store has no queue', () => {
    const showWeeklyDialogue = vi.fn();
    const controller = createChipEventsController({
      bridge: { start: vi.fn(), stop: vi.fn() },
      chipStore: { showWeeklyDialogue },
    });

    controller.handleEvent(makeWeekEvent({ gameOutcome: 'championship', dialogueId: 'chip.weekly.championship' }));

    expect(showWeeklyDialogue).toHaveBeenCalledTimes(1);
    expect(showWeeklyDialogue.mock.calls[0]![0].id).toMatch(/\.reaction/);
  });
});

describe('C13 stacked-moment precedence', () => {
  function makeQueueStore(active: { currentDialogueId: string | null; dismissed: boolean }) {
    return {
      showWeeklyDialogue: vi.fn(),
      queueDialogue: vi.fn(),
      appendDialogueQueue: vi.fn(),
      getDialogueState: vi.fn(() => active),
    };
  }

  it('appends a lower-precedence event behind the active conversation instead of overwriting', () => {
    const chipStore = makeQueueStore({ currentDialogueId: 'chip.weekly.championship', dismissed: false });
    const controller = createChipEventsController({
      bridge: { start: vi.fn(), stop: vi.fn() },
      chipStore,
    });

    controller.handleEvent(makeWeekEvent({
      category: 'seasonEnd',
      trigger: 'seasonEnd',
      gameOutcome: 'championship',
      dialogueId: 'chip.weekly.championship',
    }));
    expect(chipStore.queueDialogue).toHaveBeenCalledTimes(1);
    expect(chipStore.appendDialogueQueue).not.toHaveBeenCalled();

    controller.handleEvent(makeWeekEvent({
      category: 'weekRollover',
      trigger: 'weekRollover',
      gameOutcome: 'cleanWin',
      dialogueId: 'chip.weekly.cleanWin',
      currentWeek: 3,
    }));

    expect(chipStore.appendDialogueQueue).toHaveBeenCalledTimes(1);
    expect(chipStore.queueDialogue).toHaveBeenCalledTimes(1);
    expect(chipStore.showWeeklyDialogue).not.toHaveBeenCalled();
  });

  it('lets a strictly higher-precedence event preempt the active conversation', () => {
    const chipStore = makeQueueStore({ currentDialogueId: 'chip.weekly.cleanWin', dismissed: false });
    const controller = createChipEventsController({
      bridge: { start: vi.fn(), stop: vi.fn() },
      chipStore,
    });

    controller.handleEvent(makeWeekEvent({ gameOutcome: 'cleanWin' }));
    controller.handleEvent(makeWeekEvent({
      category: 'seasonEnd',
      trigger: 'seasonEnd',
      gameOutcome: 'championship',
      dialogueId: 'chip.weekly.championship',
    }));

    expect(chipStore.appendDialogueQueue).not.toHaveBeenCalled();
    // The championship conversation replaces the mid-read weekly beat.
    expect(chipStore.queueDialogue).toHaveBeenCalledTimes(1);
  });

  it('replaces normally when the active dialogue was dismissed or nothing is showing', () => {
    const chipStore = makeQueueStore({ currentDialogueId: 'chip.weekly.cleanWin', dismissed: true });
    const controller = createChipEventsController({
      bridge: { start: vi.fn(), stop: vi.fn() },
      chipStore,
    });

    controller.handleEvent(makeWeekEvent({ gameOutcome: 'cleanWin' }));
    controller.handleEvent(makeWeekEvent({ gameOutcome: 'cleanWin', currentWeek: 3 }));

    expect(chipStore.appendDialogueQueue).not.toHaveBeenCalled();
    expect(chipStore.showWeeklyDialogue).toHaveBeenCalledTimes(2);
  });

  it('keeps legacy replace behavior when the store predates the C13 surface', () => {
    const showWeeklyDialogue = vi.fn();
    const queueDialogue = vi.fn();
    const controller = createChipEventsController({
      bridge: { start: vi.fn(), stop: vi.fn() },
      chipStore: { showWeeklyDialogue, queueDialogue },
    });

    controller.handleEvent(makeWeekEvent({ gameOutcome: 'blowoutLoss', dialogueId: 'chip.weekly.blowoutLoss' }));
    controller.handleEvent(makeWeekEvent({ gameOutcome: 'cleanWin', currentWeek: 3 }));

    expect(queueDialogue).toHaveBeenCalledTimes(1);
    expect(showWeeklyDialogue).toHaveBeenCalledTimes(1);
  });
});

describe('D8 explicit tie handling', () => {
  function outcomeFor(summaries: readonly { result: 'win' | 'loss' | 'tie'; teamScore: number; opponentScore: number }[], week = 6) {
    const adapter = createGameStoreBridgeAdapter({
      getState: () => ({
        game: {
          week,
          year: 2028,
          seed: 101,
          phase: 'regular_season',
          weekSummaries: summaries,
        },
      }),
      subscribe: () => () => undefined,
    });
    return adapter.getState().weeklyOutcome;
  }

  it('serves the neutral midseason variant for a tie week, not win or loss copy', () => {
    expect(outcomeFor([
      { result: 'win', teamScore: 27, opponentScore: 10 },
      { result: 'tie', teamScore: 17, opponentScore: 17 },
    ])).toBe('midseason');
  });

  it('breaks a loss streak on a tie week instead of extending it', () => {
    // L-L-T-L: the tie resets the count, so the latest loss stands alone.
    expect(outcomeFor([
      { result: 'loss', teamScore: 10, opponentScore: 24 },
      { result: 'loss', teamScore: 13, opponentScore: 27 },
      { result: 'tie', teamScore: 20, opponentScore: 20 },
      { result: 'loss', teamScore: 17, opponentScore: 20 },
    ])).toBe('loss');

    // Sanity: three straight losses still trigger the streak variant...
    expect(outcomeFor([
      { result: 'loss', teamScore: 10, opponentScore: 24 },
      { result: 'loss', teamScore: 13, opponentScore: 27 },
      { result: 'loss', teamScore: 17, opponentScore: 20 },
    ])).toBe('threeLossStreak');

    // ...and a fresh three-loss run after a tie counts again.
    expect(outcomeFor([
      { result: 'tie', teamScore: 20, opponentScore: 20 },
      { result: 'loss', teamScore: 10, opponentScore: 24 },
      { result: 'loss', teamScore: 13, opponentScore: 27 },
      { result: 'loss', teamScore: 17, opponentScore: 20 },
    ])).toBe('threeLossStreak');
  });

  it('never lets a tie week inherit the streak variant', () => {
    expect(outcomeFor([
      { result: 'loss', teamScore: 10, opponentScore: 24 },
      { result: 'loss', teamScore: 13, opponentScore: 27 },
      { result: 'loss', teamScore: 17, opponentScore: 20 },
      { result: 'tie', teamScore: 23, opponentScore: 23 },
    ])).toBe('midseason');
  });
});
