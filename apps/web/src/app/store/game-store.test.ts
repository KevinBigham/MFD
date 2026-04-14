import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContingencyRule, DraftProspect } from '@mfd/engine';
import { initializeDeadline, initializeOffseasonState, mulberry32 } from '@mfd/engine';
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
    region: 'south',
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
      broadcastGameId: null,
    }));
    vi.stubGlobal('PopStateEvent', class PopStateEventMock {
      type: string;

      constructor(type: string) {
        this.type = type;
      }
    });
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
      broadcastGameId: null,
    }));
    vi.unstubAllGlobals();
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

  it('runs a private workout and spends one scouting workout slot', async () => {
    const game = createSeedGameState(8, 0, 'pro');
    game.year = 2027;
    game.phase = 'offseason';
    game.offseasonState = initializeOffseasonState(game);
    game.draftClass = [makeProspect('workout-prospect')];

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.runPrivateWorkout('workout-prospect');

    const nextGame = useGameStore.getState().game!;
    const scouting = nextGame.offseasonState?.scoutingState['workout-prospect'];
    expect(scouting?.actions).toContain('private_workout');
    expect(scouting?.privateWorkoutRatings).toEqual(expect.any(Array));
    expect(nextGame.scoutingDepartment.privateWorkoutsRemaining).toBe(2);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('toggles a scouting watchlist entry through the store', async () => {
    const game = createSeedGameState(9, 0, 'pro');
    game.year = 2027;
    game.phase = 'offseason';
    game.offseasonState = initializeOffseasonState(game);
    game.draftClass = [makeProspect('watch-prospect')];

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.toggleScoutingWatchlist('watch-prospect');

    expect(useGameStore.getState().game?.offseasonState?.scoutingWatchlist).toEqual(['watch-prospect']);
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
  }, 15000);

  it('hydrates postgame UI queues after advancing the week', async () => {
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

  it('persists call your shot declarations through the store', async () => {
    const game = createSeedGameState(777, 0, 'pro');

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.setCallYourShot('air_attack');

    expect(useGameStore.getState().game?.activeCallYourShot).toBe('air_attack');
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('stores contingency rules and trick plays on weekly prep plans', async () => {
    const game = createSeedGameState(888, 0, 'pro');
    game.phase = 'regular_season';
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const matchup = game.schedule.find((week) => week.week === game.week)?.games
      .find((entry) => entry.homeTeamId === userTeam.id || entry.awayTeamId === userTeam.id)!;
    const opponentTeamId = matchup.homeTeamId === userTeam.id ? matchup.awayTeamId : matchup.homeTeamId;
    const contingencyRule: ContingencyRule = {
      id: 'contingency-1',
      trigger: 'trailing_14_at_half',
      action: { type: 'go_aggressive' },
      label: 'IF: Trailing by 14+ at half → Go Aggressive',
      description: 'If we are down big at halftime, empty the clip.',
    };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.saveWeeklyPrepPlan({
      teamId: userTeam.id,
      opponentTeamId,
      year: game.year,
      week: game.week,
      offensiveFocus: 'balanced',
      defensiveFocus: 'heat_qb',
      practiceIntensity: 'normal',
      keyMatchupPlayerId: null,
      snapManagement: 'normal',
      specialSituation: 'third_down',
      contingencyRules: [contingencyRule],
      trickPlays: ['flea_flicker', 'fake_punt'],
    });

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.weeklyPrepPlans?.[userTeam.id]?.contingencyRules).toEqual([contingencyRule]);
    expect(nextGame.weeklyPrepPlans?.[userTeam.id]?.trickPlays).toEqual(['flea_flicker', 'fake_punt']);
    expect(nextGame.gamePlan?.contingencyRules).toEqual([contingencyRule]);
    expect(nextGame.gamePlan?.trickPlays).toEqual(['flea_flicker', 'fake_punt']);
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

  it('advances and dismisses tutorial state through the store', async () => {
    const game = createSeedGameState(345, 0, 'pro');

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.advanceTutorial();
    expect(useGameStore.getState().game?.tutorialState.currentStepIndex).toBe(1);

    await useGameStore.getState().actions.advanceTutorial('screen:/roster');
    expect(useGameStore.getState().game?.tutorialState.currentStepIndex).toBe(2);

    await useGameStore.getState().actions.dismissTutorial();
    expect(useGameStore.getState().game?.tutorialState.dismissed).toBe(true);
    expect(autosaveDynasty).toHaveBeenCalledTimes(3);
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

  it('routes locker room meetings through the store', async () => {
    const game = createSeedGameState(606, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    userTeam.lockerRoom = {
      cliques: [
        { id: 0, label: 'Vets', playerIds: [userTeam.roster[0]!.id], cohesion: 62, influence: 55 },
        { id: 1, label: 'Young Core', playerIds: [userTeam.roster[1]!.id], cohesion: 58, influence: 45 },
        { id: 2, label: 'Stars', playerIds: [], cohesion: 50, influence: 0 },
      ],
      captains: [{ playerId: userTeam.roster[0]!.id, playerName: userTeam.roster[0]!.name, captainMoments: 0, rallyCooldown: 0, perks: ['rally_cry'] }],
      culture: 'stable',
      cultureScore: 54,
      tensions: [{ id: 'ten-1', type: 'playing_time', involvedPlayerIds: [userTeam.roster[0]!.id], involvedCliqueIds: [0], severity: 'minor', weekCreated: 1, resolved: false, narrative: 'Snap count tension.' }],
      lastMeetingWeek: null,
    };

    useGameStore.setState((state) => ({ ...state, game, initialized: true }));

    await useGameStore.getState().actions.callTeamMeeting();

    const nextLockerRoom = useGameStore.getState().game!.teams[userTeam.id]!.lockerRoom;
    expect(nextLockerRoom.lastMeetingWeek).toBe(game.week);
    expect(nextLockerRoom.tensions.some((tension) => tension.resolved)).toBe(true);
  });

  it('routes captain rallies through the store', async () => {
    const game = createSeedGameState(707, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    userTeam.streak = -3;
    userTeam.lockerRoom = {
      cliques: [
        { id: 0, label: 'Vets', playerIds: [userTeam.roster[0]!.id], cohesion: 50, influence: 55 },
        { id: 1, label: 'Young Core', playerIds: [userTeam.roster[1]!.id], cohesion: 51, influence: 45 },
        { id: 2, label: 'Stars', playerIds: [], cohesion: 52, influence: 0 },
      ],
      captains: [{ playerId: userTeam.roster[0]!.id, playerName: userTeam.roster[0]!.name, captainMoments: 0, rallyCooldown: 0, perks: ['rally_cry'] }],
      culture: 'fragile',
      cultureScore: 39,
      tensions: [],
      lastMeetingWeek: null,
    };

    useGameStore.setState((state) => ({ ...state, game, initialized: true }));

    await useGameStore.getState().actions.triggerCaptainRally(userTeam.roster[0]!.id);

    const nextLockerRoom = useGameStore.getState().game!.teams[userTeam.id]!.lockerRoom;
    expect(nextLockerRoom.cliques[0]?.cohesion).toBe(55);
    expect(nextLockerRoom.captains[0]?.rallyCooldown).toBe(4);
  });

  it('accepts endorsement offers through the store', async () => {
    const game = createSeedGameState(818, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster[0]!;
    game.endorsementOffers = [{
      id: 'offer-store',
      playerId: player.id,
      brandName: 'Apex Athletics',
      revenuePerYear: 5.2,
      yearsTotal: 3,
      yearsRemaining: 3,
      tier: 'national',
      moraleBonus: 4,
      requirement: { type: 'min_ovr', value: 80 },
      active: false,
    }];

    useGameStore.setState((state) => ({ ...state, game, initialized: true }));

    await useGameStore.getState().actions.acceptEndorsement('offer-store');

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.endorsementOffers).toHaveLength(0);
    expect(nextGame.players[player.id]!.endorsements).toHaveLength(1);
    expect(nextGame.players[player.id]!.endorsements[0]?.active).toBe(true);
  });

  it('declines endorsement offers through the store', async () => {
    const game = createSeedGameState(819, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    game.endorsementOffers = [{
      id: 'offer-decline',
      playerId: userTeam.roster[0]!.id,
      brandName: 'Metro Health',
      revenuePerYear: 1.2,
      yearsTotal: 2,
      yearsRemaining: 2,
      tier: 'regional',
      moraleBonus: 3,
      requirement: { type: 'team_wins', value: 8 },
      active: false,
    }];

    useGameStore.setState((state) => ({ ...state, game, initialized: true }));

    await useGameStore.getState().actions.declineEndorsement('offer-decline');

    expect(useGameStore.getState().game?.endorsementOffers).toHaveLength(0);
  });

  it('starts farewell tours and elects captains through the store', async () => {
    const game = createSeedGameState(920, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster[0]!;
    player.age = 38;
    player.yearsExp = 15;
    player.ovr = Math.max(player.ovr, 80);
    userTeam.lockerRoom = {
      cliques: [
        { id: 0, label: 'Vets', playerIds: [player.id], cohesion: 60, influence: 55 },
        { id: 1, label: 'Young Core', playerIds: [], cohesion: 50, influence: 0 },
        { id: 2, label: 'Stars', playerIds: [], cohesion: 50, influence: 0 },
      ],
      captains: [],
      culture: 'stable',
      cultureScore: 50,
      tensions: [],
      lastMeetingWeek: null,
    };

    useGameStore.setState((state) => ({ ...state, game, initialized: true }));

    await useGameStore.getState().actions.startFarewellTour(player.id);
    await useGameStore.getState().actions.electCaptain(player.id);

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.farewellTours.some((tour) => tour.playerId === player.id)).toBe(true);
    expect(nextGame.teams[userTeam.id]!.lockerRoom.captains.some((captain) => captain.playerId === player.id)).toBe(true);
  });

  it('stores the selected broadcast game and navigates to the broadcast route', () => {
    const pushState = vi.fn();
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', {
      history: { pushState },
      dispatchEvent,
    });

    useGameStore.getState().actions.watchBroadcast('game-42');

    expect(useUiStore.getState().broadcastGameId).toBe('game-42');
    expect(pushState).toHaveBeenCalledWith({}, '', '/broadcast');
    expect(dispatchEvent).toHaveBeenCalled();
  });

  it('interrupts week 9 with the trade deadline and routes to the countdown screen', async () => {
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

  it('starts a fresh scenario challenge from the current user franchise identity', async () => {
    const pushState = vi.fn();
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', {
      history: { pushState },
      dispatchEvent,
    });

    const game = createSeedGameState(1001, 5, 'legend');
    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    const previousUser = Object.values(game.teams).find((team) => team.isUser)!;
    await useGameStore.getState().actions.startScenarioChallenge('the_savant');

    const nextGame = useGameStore.getState().game!;
    const nextUser = Object.values(nextGame.teams).find((team) => team.isUser)!;
    expect(nextGame.scenarioState?.activeScenario?.id).toBe('the_savant');
    expect(nextGame.scenarioState?.activeScenario?.constraints.blockTrades).toBe(true);
    expect(nextUser.city).toBe(previousUser.city);
    expect(nextUser.name).toBe(previousUser.name);
    expect(pushState).toHaveBeenCalledWith({}, '', '/');
  });

  it('files an owner petition for a new league rule proposal', async () => {
    const game = createSeedGameState(1200, 0, 'pro');
    game.phase = 'offseason';

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.petitionRuleChange('practice_squad_size', 10);

    const proposal = useGameStore.getState().game?.commissionerState.activeProposals[0];
    expect(proposal?.source).toBe('owner_petition');
    expect(proposal?.ruleKey).toBe('practice_squad_size');
    expect(proposal?.proposedValue).toBe(10);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('resolves a passed rule proposal and records the vote result', async () => {
    const game = createSeedGameState(1300, 0, 'pro');
    game.phase = 'offseason';
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const supportingTeam = Object.values(game.teams).find((team) => team.id !== userTeam.id)!;

    game.commissionerState.activeProposals = [{
      id: 'proposal-pass',
      ruleKey: 'practice_squad_size',
      currentValue: 8,
      proposedValue: 10,
      rationale: 'Expand practice depth.',
      source: 'commissioner',
      votes: { [supportingTeam.id]: 'yes' },
      requiredMajority: 2,
      deadline: game.year,
      effectiveYear: game.year + 1,
      proposedByTeamId: null,
    }];

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.voteOnProposal('proposal-pass', 'yes');

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.commissionerState.activeProposals).toHaveLength(0);
    expect(nextGame.commissionerState.history.at(-1)?.passed).toBe(true);
    expect(nextGame.leagueRules.entries.practice_squad_size.value).toBe(10);
    expect(nextGame.leagueRules.entries.practice_squad_size.effectiveYear).toBe(game.year + 1);
  });

  it('charges owner goodwill when a user petition fails', async () => {
    const game = createSeedGameState(1400, 0, 'pro');
    game.phase = 'offseason';
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const startingMood = userTeam.ownerMood;

    game.commissionerState.activeProposals = [{
      id: 'proposal-fail',
      ruleKey: 'schedule_weeks',
      currentValue: 18,
      proposedValue: 19,
      rationale: 'Stretch the season.',
      source: 'owner_petition',
      votes: {},
      requiredMajority: 99,
      deadline: game.year,
      effectiveYear: game.year + 1,
      proposedByTeamId: userTeam.id,
    }];

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.voteOnProposal('proposal-fail', 'no');

    expect(useGameStore.getState().game?.teams[userTeam.id]?.ownerMood).toBe(startingMood - 10);
    expect(useGameStore.getState().game?.commissionerState.history.at(-1)?.passed).toBe(false);
  });

  it('advances one cba negotiation round from an expired agreement', async () => {
    const game = createSeedGameState(1500, 0, 'pro');
    game.phase = 'offseason';
    game.cbaState.status = 'expired';
    if (game.cbaState.currentDeal) {
      game.cbaState.currentDeal.endYear = game.year - 1;
    }

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.advanceCBANegotiation();

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.cbaState.negotiationState?.round).toBe(1);
    expect(['negotiating', 'awaiting_owner_vote', 'lockout']).toContain(nextGame.cbaState.status);
  });

  it('ratifies a cba proposal after owner approval and applies its rule changes', async () => {
    const game = createSeedGameState(1600, 0, 'pro');
    game.phase = 'offseason';
    const currentTerms = game.cbaState.currentDeal!.terms;
    const proposal = {
      id: 'cba-proposal',
      side: 'owners' as const,
      year: game.year,
      round: 2,
      rationale: 'A compromise is ready for approval.',
      terms: {
        ...currentTerms,
        capGrowthRate: Number((currentTerms.capGrowthRate + 0.005).toFixed(3)),
        practiceSquadSize: currentTerms.practiceSquadSize + 2,
      },
    };

    game.cbaState.status = 'awaiting_owner_vote';
    game.cbaState.negotiationState = {
      round: 2,
      ownersProposal: proposal,
      playersProposal: proposal,
      currentProposal: proposal,
      gap: 10,
      mediator: true,
      publicPressure: 70,
      ownerVotes: {},
      userVote: null,
    };

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.voteOnCBA('approve');

    const nextGame = useGameStore.getState().game!;
    expect(nextGame.cbaState.status).toBe('active');
    expect(nextGame.cbaState.currentDeal?.terms.practiceSquadSize).toBe(currentTerms.practiceSquadSize + 2);
    expect(nextGame.leagueRules.entries.practice_squad_size.value).toBe(currentTerms.practiceSquadSize + 2);
    expect(nextGame.laborState.activeStoppage).toBeNull();
  });

  it('applies a cap move through the store and records the cap reaction post', async () => {
    const game = createSeedGameState(1700, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster.find((entry) => entry.contract && entry.contract.years > 1)!;
    const startingCapSpace = userTeam.capSpace;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.executeCapMove({ type: 'restructure', playerId: player.id });

    const nextGame = useGameStore.getState().game!;
    const nextTeam = nextGame.teams[userTeam.id]!;
    expect(nextTeam.capSpace).toBeGreaterThan(startingCapSpace);
    expect(nextGame.socialFeed[0]?.content).toContain(player.name);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });

  it('applies multiple cap moves sequentially and updates the player contract state', async () => {
    const game = createSeedGameState(1800, 0, 'pro');
    const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
    const player = userTeam.roster.find((entry) => entry.contract && entry.contract.years > 1)!;

    useGameStore.setState((state) => ({
      ...state,
      game,
      initialized: true,
    }));

    await useGameStore.getState().actions.executeCapMoves([
      { type: 'backload', playerId: player.id, params: { voidYears: 1 } },
      { type: 'extend', playerId: player.id, params: { years: 3, avgSalary: 18 } },
    ]);

    const nextPlayer = useGameStore.getState().game!.players[player.id]!;
    expect(nextPlayer.contract?.years).toBe(3);
    expect(nextPlayer.contract?.voidYears).toBeGreaterThanOrEqual(0);
    expect(useGameStore.getState().game!.socialFeed[0]?.content).toContain(player.name);
    expect(autosaveDynasty).toHaveBeenCalledTimes(1);
  });
});
