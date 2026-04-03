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

  it('assigns player training through the store and persists the updated game', async () => {
    const game = createSeedGameState(222, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster[0]!;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.assignTraining(userTeam.id, player.id, 'film_study');

    expect(useGameStore.getState().game?.teams[userTeam.id]?.trainingAssignments[player.id]?.focus).toBe('film_study');
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('creates and submits a user trade proposal through the store', async () => {
    const game = createSeedGameState(333, 0, 'pro');
    game.phase = 'offseason';
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const partner = Object.values(game.teams).find((team) => !team.isUser)!;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    const created = await useGameStore.getState().actions.createTradeProposal(
      userTeam.id,
      partner.id,
      [{ type: 'pick', teamId: userTeam.id, playerId: null, pickId: `${userTeam.id}-${game.year}-1-1-${userTeam.id}`, description: 'Round 1 pick' }],
      [{ type: 'pick', teamId: partner.id, playerId: null, pickId: `${partner.id}-${game.year}-7-7-${partner.id}`, description: 'Round 7 pick' }],
    );

    expect(created).not.toBeNull();
    const submitted = await useGameStore.getState().actions.submitTradeProposal(created!.id);

    expect(submitted?.status).not.toBe('draft');
    expect(useGameStore.getState().game?.activeProposals.length).toBeGreaterThan(0);
    expect(autosaveDynasty).toHaveBeenCalledTimes(2);
  });

  it('routes IR placement and activation through the store', async () => {
    const game = createSeedGameState(444, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster[0]!;
    player.injury = {
      id: 'inj-store',
      type: 'hamstring',
      severity: 'out',
      severityTier: 'severe',
      gamesOut: 2,
      gamesRecovered: 0,
      reinjuryRisk: 0.2,
      affectedRatings: ['speed'],
      ratingPenalty: 0,
      onIR: false,
    };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.placeOnIR(userTeam.id, player.id);
    expect(useGameStore.getState().game?.teams[userTeam.id]?.roster[0]?.injury?.onIR).toBe(true);

    const clearedGame = structuredClone(useGameStore.getState().game!);
    clearedGame.teams[userTeam.id]!.roster[0]!.injury!.gamesOut = 0;
    useGameStore.setState((state) => ({
      ...state,
      game: clearedGame,
      initialized: true,
    }));
    await useGameStore.getState().actions.activateFromIR(userTeam.id, player.id);

    expect(useGameStore.getState().game?.teams[userTeam.id]?.roster[0]?.injury?.onIR).toBe(false);
    expect(autosaveDynasty).toHaveBeenCalledTimes(2);
  });

  it('upgrades facilities and hires medical staff through the store', async () => {
    const game = createSeedGameState(555, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    game.phase = 'offseason';
    game.availableMedicalStaff = [{
      id: 'med-store',
      name: 'Parker Lane',
      tier: 'elite',
      salary: 2.8,
      recoveryBonus: 0.8,
      preventionBonus: 0.8,
    }];

    const startingBudget = userTeam.facilityState.budget;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.upgradeFacility(userTeam.id, 'film_room');
    await useGameStore.getState().actions.hireMedicalStaff(userTeam.id, 'med-store');

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.teams[userTeam.id]!.facilityState.budget).toBeLessThan(startingBudget);
    expect(nextGame.teams[userTeam.id]!.medicalStaff?.id).toBe('med-store');
    expect(autosaveDynasty).toHaveBeenCalledTimes(2);
  });
});
