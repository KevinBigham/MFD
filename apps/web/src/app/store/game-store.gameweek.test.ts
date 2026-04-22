/**
 * Week-advancing / halftime / playoff-lore / trade-deadline tests for the
 * game store.
 *
 * Split 2026-04-22 from the monolithic `game-store.test.ts`. That file grew
 * to 43 tests running ~60s on CI and sat at the edge of vitest's internal
 * worker RPC timeout ("Timeout calling onTaskUpdate"), producing red CI runs
 * even when every test passed.
 *
 * The 11 tests here all exercise heavy sim paths (`advanceWeek`,
 * `resolveHalftimeDecision`, `finalizeDeadline`, trade offer accept/reject).
 * The remaining 32 offseason/cap/cba/IR/tutorial tests stay in
 * `game-store.test.ts`.
 *
 * Both files share `MemoryStorage`, `buildTradeOffer`, and `seedSuperBowlWeek`
 * from `./game-store.test-helpers`.
 *
 * Note: `vi.mock('./persistence', ...)` must live inline in every test file
 * — vitest hoists it per-file, so it cannot be extracted to a shared helper.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeDeadline, initializeOffseasonState, mulberry32 } from '@mfd/engine';
import { createSeedGameState } from './seed';
import { selectLatestGameDayPackage, useGameStore } from './game-store';
import { autosaveDynasty } from './persistence';
import { useUiStore } from './ui-store';
import { deriveDynastyId } from '../../lib/career-meta';
import { readPendingPlayoffLoreCards } from '../../lib/scrapbook-store';
import {
  MemoryStorage,
  buildTradeOffer,
  seedSuperBowlWeek,
} from './game-store.test-helpers';

vi.mock('./persistence', () => ({
  autosaveDynasty: vi.fn().mockResolvedValue(1),
  loadLatestAutosaveGame: vi.fn().mockResolvedValue(null),
}));

describe('game store game-week advancing actions', () => {
  beforeEach(() => {
    useGameStore.setState((state) => ({
      ...state,
      game: null,
      initialized: false,
      pendingPlayoffLoreReveal: null,
    }));
    useUiStore.setState((state) => ({
      ...state,
      autosaveEnabled: true,
      simSpeed: 'normal',
      broadcastGameId: null,
    }));
    vi.stubGlobal('PopStateEvent', class PopStateEventMock {
      type: string;

      constructor(type: string) {
        this.type = type;
      }
    });
    vi.stubGlobal('localStorage', new MemoryStorage());
    vi.clearAllMocks();
  });

  afterEach(() => {
    useGameStore.setState((state) => ({
      ...state,
      game: null,
      initialized: false,
      pendingPlayoffLoreReveal: null,
    }));
    useUiStore.setState((state) => ({
      ...state,
      autosaveEnabled: true,
      simSpeed: 'normal',
      broadcastGameId: null,
    }));
    vi.unstubAllGlobals();
  });

  it('queues a trade-complete cue when the user accepts an offer', { timeout: 15_000 }, async () => {
    const game = createSeedGameState(22, 0, 'pro');
    game.phase = 'offseason';
    game.offseasonState = initializeOffseasonState(game);
    game.offseasonState.tradeOffers = [buildTradeOffer(game)];

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.acceptTradeOffer('trade-store-offer');

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.offseasonState?.tradeOffers[0]?.status).toBe('accepted');
    expect(nextGame.postGameUi?.audioCueQueue.at(-1)?.event).toBe('trade_complete');
  });

  it('queues a trade-rejected cue when the user declines an offer', { timeout: 15_000 }, async () => {
    const game = createSeedGameState(23, 0, 'pro');
    game.phase = 'offseason';
    game.offseasonState = initializeOffseasonState(game);
    game.offseasonState.tradeOffers = [buildTradeOffer(game)];

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.rejectTradeOffer('trade-store-offer');

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.offseasonState?.tradeOffers[0]?.status).toBe('rejected');
    expect(nextGame.postGameUi?.audioCueQueue.at(-1)?.event).toBe('trade_rejected');
  });

  it('exposes the latest game day package after advancing a simulated week', { timeout: 15_000 }, async () => {
    const game = createSeedGameState(99, 0, 'pro');
    game.phase = 'regular_season';
    game.settings.halftimeDecisions = 'off';

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.advanceWeek();

    const nextState = useGameStore.getState();
    const latestPackage = selectLatestGameDayPackage(nextState);
    expect(latestPackage).not.toBeNull();
    expect(latestPackage?.headline).toBe(nextState.game?.weekSummaries.at(-1)?.headline);
    expect(latestPackage?.autopsy.nextFocus.length).toBeGreaterThan(0);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('hydrates postgame UI queues after advancing the week', { timeout: 15_000 }, async () => {
    const game = createSeedGameState(313, 0, 'pro');
    game.phase = 'regular_season';
    game.settings.halftimeDecisions = 'off';

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.advanceWeek();

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.postGameUi?.audioCueQueue.length).toBeGreaterThan(0);
    expect(nextGame.postGameUi?.audioCueQueue.some((cue) => cue.event === 'game_end')).toBe(true);
    expect(nextGame.postGameUi?.pressConferenceQueue.length).toBeGreaterThan(0);
    expect(nextGame.postGameUi?.pressConferenceQueue[0]?.conferenceId).toBe(nextGame.recentPressConferences[0]?.id);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('pauses for halftime and resumes the week after a choice is made', { timeout: 15_000 }, async () => {
    const game = createSeedGameState(314, 0, 'pro');
    game.phase = 'regular_season';
    game.settings.halftimeDecisions = 'on';

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.advanceWeek();

    const paused = useGameStore.getState().game!;
    expect(paused.postGameUi?.pendingHalftimeDecision).not.toBeNull();
    expect(paused.week).toBe(game.week);

    await useGameStore.getState().actions.resolveHalftimeDecision('switch');

    const resumed = useGameStore.getState().game!;
    expect(resumed.postGameUi?.pendingHalftimeDecision).toBeNull();
    expect(resumed.week).toBeGreaterThan(game.week);
    expect(selectLatestGameDayPackage(useGameStore.getState())).not.toBeNull();
    expect(autosaveDynasty).toHaveBeenCalledTimes(2);
  });

  it('does not stage playoff lore for regular-season user games', { timeout: 15_000 }, async () => {
    const game = createSeedGameState(401, 0, 'pro');
    game.phase = 'regular_season';
    game.settings.halftimeDecisions = 'off';
    const dynastyId = deriveDynastyId(game);

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.advanceWeek();

    expect(useGameStore.getState().pendingPlayoffLoreReveal).toBeNull();
    expect(readPendingPlayoffLoreCards(dynastyId, game.year)).toEqual([]);
  });

  it('does not stage playoff lore for cpu-only playoff weeks', { timeout: 15_000 }, async () => {
    const game = createSeedGameState(402, 0, 'pro');
    const cpuTeams = Object.values(game.teams).filter((team) => !team.isUser);
    seedSuperBowlWeek(game, {
      homeTeamId: cpuTeams[0]!.id,
      awayTeamId: cpuTeams[1]!.id,
    });
    const dynastyId = deriveDynastyId(game);

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.advanceWeek();

    expect(useGameStore.getState().pendingPlayoffLoreReveal).toBeNull();
    expect(readPendingPlayoffLoreCards(dynastyId, game.year)).toEqual([]);
  });

  it('stages one playoff lore card and an immediate reveal for user-team playoff advances', { timeout: 15_000 }, async () => {
    const game = createSeedGameState(403, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const opponent = Object.values(game.teams).find((team) => !team.isUser)!;
    const dynastyId = deriveDynastyId(game);
    seedSuperBowlWeek(game, {
      homeTeamId: userTeam.id,
      awayTeamId: opponent.id,
    });

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.advanceWeek();

    const reveal = useGameStore.getState().pendingPlayoffLoreReveal;
    const pendingCards = readPendingPlayoffLoreCards(dynastyId, game.year);

    expect(reveal).not.toBeNull();
    expect(reveal?.round).toBe('super_bowl');
    expect(pendingCards).toHaveLength(1);
    expect(pendingCards[0]?.gameId).toBe(reveal?.gameId);
  });

  it('stages playoff lore after the halftime decision resume path too', { timeout: 15_000 }, async () => {
    const game = createSeedGameState(404, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const opponent = Object.values(game.teams).find((team) => !team.isUser)!;
    const dynastyId = deriveDynastyId(game);
    seedSuperBowlWeek(game, {
      homeTeamId: userTeam.id,
      awayTeamId: opponent.id,
    });
    game.postGameUi = {
      pressConferenceQueue: [],
      audioCueQueue: [],
      pendingHalftimeDecision: {
        teamId: userTeam.id,
        year: game.year,
        week: game.week,
        phase: game.phase,
        homeTeamId: userTeam.id,
        awayTeamId: opponent.id,
        homeScore: 14,
        awayScore: 17,
        suggestion: {
          direction: 'more_pass',
          responseLabel: 'Lean into the air game',
          summary: 'The pivot opens up the throw menu.',
          reason: 'The box is overloaded and the throw game is there.',
        },
      },
    };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.resolveHalftimeDecision('switch');

    expect(useGameStore.getState().pendingPlayoffLoreReveal).not.toBeNull();
    expect(readPendingPlayoffLoreCards(dynastyId, game.year)).toHaveLength(1);
  });

  it('interrupts week 9 with the trade deadline and routes to the countdown screen', { timeout: 15_000 }, async () => {
    const pushState = vi.fn();
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', {
      history: { pushState },
      dispatchEvent,
    });

    const game = createSeedGameState(808, 0, 'pro');
    game.phase = 'regular_season';
    game.week = 9;
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    userTeam.roster[0]!.tradeBlock = true;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.advanceWeek();

    expect(useGameStore.getState().game?.tradeDeadlineState).toBeDefined();
    expect(useGameStore.getState().game?.week).toBe(9);
    expect(pushState).toHaveBeenCalledWith({}, '', '/trade-deadline');
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('finalizes the trade deadline and resumes the same week advance', { timeout: 15_000 }, async () => {
    const pushState = vi.fn();
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', {
      history: { pushState },
      dispatchEvent,
    });

    const game = createSeedGameState(909, 0, 'pro');
    game.phase = 'regular_season';
    game.week = 9;
    game.tradeDeadlineState = initializeDeadline(game, mulberry32(17));
    game.tradeDeadlineState.minutesRemaining = 0;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.finalizeDeadline();

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.tradeDeadlineState).toBeUndefined();
    expect(nextGame.week).toBe(10);
    expect(pushState).toHaveBeenCalledWith({}, '', '/game-day');
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });
});
