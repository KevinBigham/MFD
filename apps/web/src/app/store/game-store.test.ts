import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftProspect } from '@mfd/engine';
import { initializeOffseasonState } from '@mfd/engine';
import { createSeedGameState } from './seed';
import { selectLatestGameDayPackage, useGameStore } from './game-store';
import { autosaveDynasty } from './persistence';
import { useUiStore } from './ui-store';

vi.mock('./persistence', () => ({
  autosaveDynasty: vi.fn().mockResolvedValue(1),
  loadLatestAutosaveGame: vi.fn().mockResolvedValue(null),
}));

function makeProspect(id: string): DraftProspect {
  return {
    id,
    firstName: 'Store',
    lastName: 'Prospect',
    pos: 'WR',
    college: 'Test State',
    ratings: { awareness: 82, speed: 84, stamina: 83 },
    projectedRound: 1,
    scoutGrade: 76,
    trueGrade: 84,
    personality: { workEthic: 7, loyalty: 5, greed: 4, pressure: 6, ambition: 7 },
    traits: [],
    archetype: null,
    characterArchetype: 'balanced',
    bustProbability: 0.12,
    stealProbability: 0.08,
    scoutingReports: [],
    combine: null,
  };
}

describe('game store offseason actions', () => {
  beforeEach(() => {
    useGameStore.setState((state) => ({
      ...state,
      game: null,
      initialized: false,
    }));
    useUiStore.setState((state) => ({
      ...state,
      autosaveEnabled: true,
      simSpeed: 'normal',
    }));
    vi.clearAllMocks();
  });

  afterEach(() => {
    useGameStore.setState((state) => ({
      ...state,
      game: null,
      initialized: false,
    }));
    useUiStore.setState((state) => ({
      ...state,
      autosaveEnabled: true,
      simSpeed: 'normal',
    }));
  });

  it('stores a re-sign offer and autosaves the updated game', async () => {
    const game = createSeedGameState(42, 0, 'pro');
    game.year = 2027;
    game.phase = 'offseason';
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    userTeam.roster[0]!.contract!.years = 1;
    game.offseasonState = initializeOffseasonState(game);

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    const asking = game.offseasonState.reSignDecisions[userTeam.roster[0]!.id]!.askingPrice;
    await useGameStore.getState().actions.submitReSignOffer(userTeam.roster[0]!.id, asking);

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.offseasonState?.reSignDecisions[userTeam.roster[0]!.id]?.lastOffer).toEqual(asking);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('records scouting actions through the store and persists the result', async () => {
    const game = createSeedGameState(7, 0, 'pro');
    game.year = 2027;
    game.phase = 'offseason';
    game.offseasonState = initializeOffseasonState(game);
    game.draftClass = [makeProspect('store-prospect')];

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.runScoutingAction('store-prospect', 'film');

    const scouting = useGameStore.getState().game?.offseasonState?.scoutingState['store-prospect'];
    expect(scouting?.actions).toEqual(['film']);
    expect(scouting?.accuracy).toBeGreaterThan(0);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('drafts a player through the store and advances the user draft index', async () => {
    const game = createSeedGameState(11, 0, 'pro');
    game.year = 2027;
    game.phase = 'draft';
    game.offseasonState = initializeOffseasonState(game);
    game.draftClass = [makeProspect('draft-store-prospect')];
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    game.offseasonState.draftOrder = [{
      id: 'user-2027-1-1-user',
      teamId: userTeam.id,
      round: 1,
      pick: 1,
      overall: 1,
      originalTeamId: userTeam.id,
    }];
    game.offseasonState.currentDraftPickIndex = 0;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.makeDraftPick('draft-store-prospect');

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.teams[userTeam.id]!.roster.some((player) => player.id === 'draft-store-prospect')).toBe(true);
    expect(nextGame.offseasonState?.currentDraftPickIndex).toBe(1);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('exposes the latest game day package after advancing a simulated week', async () => {
    const game = createSeedGameState(99, 0, 'pro');
    game.phase = 'regular_season';

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

  it('updates difficulty without autosaving when UI autosave is disabled', async () => {
    const game = createSeedGameState(123, 0, 'pro');

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));
    useUiStore.setState((state) => ({
      ...state,
      autosaveEnabled: false,
    }));

    await useGameStore.getState().actions.setDifficulty('legend');

    expect(useGameStore.getState().game?.difficulty).toBe('legend');
    expect(autosaveDynasty).not.toHaveBeenCalled();
  });
});
