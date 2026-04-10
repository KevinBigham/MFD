import { describe, expect, it } from 'vitest';
import { rookieSlotContract } from '../config/rookie-slots';
import type { DraftOrderEntry, DraftPick, DraftProspect, GameState } from '../types';
import { ensureDraftClass, finalizePostDraft, makeDraftPick, runPrivateWorkout, runScoutingAction, advanceDraft } from './draft';
import { initializeOffseasonState } from './offseason';
import { makeLeagueState, makePlayer } from './test-helpers';

function addPick(teamId: string, year: number, round: number, pick: number): DraftPick {
  return {
    round,
    pick,
    originalTeamId: teamId,
    currentTeamId: teamId,
    year,
    isCompPick: false,
  };
}

function makeDraftEntry(teamId: string, year: number, round: number, pick: number, overall = pick): DraftOrderEntry {
  return {
    id: `${teamId}-${year}-${round}-${pick}-${teamId}`,
    teamId,
    round,
    pick,
    overall,
    originalTeamId: teamId,
  };
}

function makeProspect(id: string, pos: DraftProspect['pos'], trueGrade: number): DraftProspect {
  return {
    id,
    firstName: 'Draft',
    lastName: id,
    pos,
    college: 'Test U',
    region: 'south',
    ratings: { awareness: trueGrade, speed: trueGrade, stamina: trueGrade },
    projectedRound: 1,
    scoutGrade: trueGrade - 2,
    trueGrade,
    personality: { workEthic: 7, loyalty: 5, greed: 5, pressure: 5, ambition: 7 },
    traits: [],
    archetype: null,
    characterArchetype: 'balanced',
    bustProbability: 0.1,
    stealProbability: 0.1,
    scoutingReports: [],
    combine: null,
  };
}

describe('draft direct coverage', () => {
  it('generates identical draft classes for the same seed and year', () => {
    const left = makeLeagueState('draft', 1);
    const right = makeLeagueState('draft', 1);

    ensureDraftClass(left);
    ensureDraftClass(right);

    expect(left.draftClass.map((prospect) => ({
      id: prospect.id,
      pos: prospect.pos,
      trueGrade: prospect.trueGrade,
      scoutGrade: prospect.scoutGrade,
    }))).toEqual(right.draftClass.map((prospect) => ({
      id: prospect.id,
      pos: prospect.pos,
      trueGrade: prospect.trueGrade,
      scoutGrade: prospect.scoutGrade,
    })));
  });

  it('changes the generated draft class when the seed changes', () => {
    const left = makeLeagueState('draft', 1);
    const right = makeLeagueState('draft', 1);
    right.seed = 99;

    ensureDraftClass(left);
    ensureDraftClass(right);

    expect(left.draftClass.slice(0, 5).map((prospect) => prospect.trueGrade))
      .not.toEqual(right.draftClass.slice(0, 5).map((prospect) => prospect.trueGrade));
  });

  it('creates at least the minimum 64-player class with unique prospect ids', () => {
    const game = makeLeagueState('draft', 1);

    ensureDraftClass(game);

    expect(game.draftClass).toHaveLength(64);
    expect(new Set(game.draftClass.map((prospect) => prospect.id)).size).toBe(64);
  });

  it('does not regenerate the draft class once prospects already exist', () => {
    const game = makeLeagueState('draft', 1);
    game.draftClass = [makeProspect('existing-prospect', 'QB', 88)];

    ensureDraftClass(game);

    expect(game.draftClass).toHaveLength(1);
    expect(game.draftClass[0]?.id).toBe('existing-prospect');
  });

  it('produces a positionally diverse class', () => {
    const game = makeLeagueState('draft', 1);

    ensureDraftClass(game);

    const positions = new Set(game.draftClass.map((prospect) => prospect.pos));
    expect(positions.has('QB')).toBe(true);
    expect(positions.has('WR')).toBe(true);
    expect(positions.has('DL')).toBe(true);
    expect(positions.has('CB')).toBe(true);
    expect(positions.size).toBeGreaterThanOrEqual(7);
  });

  it('updates scouting state without mutating a prospect true grade', () => {
    const game = makeLeagueState('offseason', 1);
    game.draftClass = [makeProspect('prospect-film', 'QB', 88)];
    game.offseasonState = initializeOffseasonState(game);

    const result = runScoutingAction(game, 'prospect-film', 'film');

    expect(result.nextState.offseasonState?.scoutingState['prospect-film']?.actions).toEqual(['film']);
    expect(result.nextState.offseasonState?.scoutingState['prospect-film']?.accuracy).toBeGreaterThan(0);
    expect(result.nextState.draftClass[0]?.trueGrade).toBe(88);
  });

  it('consumes a private workout slot and records the workout action', () => {
    const game = makeLeagueState('offseason', 1);
    game.draftClass = [makeProspect('prospect-workout', 'WR', 84)];
    game.offseasonState = initializeOffseasonState(game);

    const result = runPrivateWorkout(game, 'prospect-workout');

    expect(result.nextState.scoutingDepartment.privateWorkoutsRemaining).toBe(2);
    expect(result.nextState.offseasonState?.scoutingState['prospect-workout']?.actions).toContain('private_workout');
  });

  it('lets better scout accuracy drive more precise visible grades on interviews', () => {
    const game = makeLeagueState('offseason', 1);
    game.draftClass = [makeProspect('prospect-interview-grade', 'WR', 84)];
    game.offseasonState = initializeOffseasonState(game);
    game.scoutingDepartment.scouts = [
      { id: 'elite-scout', name: 'Elite Scout', tier: 'elite', specialty: 'WR', scope: 'national', region: null, salary: 2.4, accuracy: 0.95 },
    ];

    const eliteResult = runScoutingAction(game, 'prospect-interview-grade', 'combine');
    const eliteDelta = Math.abs((eliteResult.nextState.offseasonState?.scoutingState['prospect-interview-grade']?.visibleScoutGrade ?? 0) - 84);

    const worseGame = makeLeagueState('offseason', 1);
    worseGame.draftClass = [makeProspect('prospect-interview-grade', 'WR', 84)];
    worseGame.offseasonState = initializeOffseasonState(worseGame);
    worseGame.scoutingDepartment.scouts = [
      { id: 'poor-scout', name: 'Poor Scout', tier: 'poor', specialty: null, scope: 'national', region: null, salary: 0.4, accuracy: 0.6 },
    ];

    const poorResult = runScoutingAction(worseGame, 'prospect-interview-grade', 'combine');
    const poorDelta = Math.abs((poorResult.nextState.offseasonState?.scoutingState['prospect-interview-grade']?.visibleScoutGrade ?? 0) - 84);

    expect(eliteDelta).toBeLessThanOrEqual(poorDelta);
  });

  it('only reveals character intel on interviews when scout reliability clears the threshold', () => {
    const tapeGame = makeLeagueState('offseason', 1);
    tapeGame.draftClass = [makeProspect('prospect-character', 'WR', 84)];
    tapeGame.offseasonState = initializeOffseasonState(tapeGame);
    tapeGame.scoutingDepartment.scouts = [
      { id: 'regional-tape', name: 'Regional Tape', tier: 'good', specialty: 'WR', scope: 'regional', region: 'south', salary: 1.8, accuracy: 0.9 },
    ];

    const tapeResult = runScoutingAction(tapeGame, 'prospect-character', 'interview');

    const lowSignalGame = makeLeagueState('offseason', 1);
    lowSignalGame.draftClass = [makeProspect('prospect-character', 'WR', 84,)];
    lowSignalGame.offseasonState = initializeOffseasonState(lowSignalGame);
    lowSignalGame.scoutingDepartment.scouts = [
      { id: 'general-scout', name: 'General Scout', tier: 'poor', specialty: null, scope: 'national', region: null, salary: 0.4, accuracy: 0.6 },
    ];

    const lowSignalResult = runScoutingAction(lowSignalGame, 'prospect-character', 'interview');

    expect(tapeResult.nextState.offseasonState?.scoutingState['prospect-character']?.characterRead).not.toBe('unknown');
    expect(lowSignalResult.nextState.offseasonState?.scoutingState['prospect-character']?.characterRead).toBe('unknown');
  });

  it('auto-drafts for ai teams until the user team is on the clock', () => {
    const game = makeLeagueState('draft', 1);
    game.teams.afce1.draftPicks = [addPick('afce1', game.year, 1, 2)];
    game.teams.afce2.draftPicks = [addPick('afce2', game.year, 1, 1)];
    game.offseasonState = {
      ...initializeOffseasonState(game),
      draftOrder: [
        makeDraftEntry('afce2', game.year, 1, 1, 1),
        makeDraftEntry('afce1', game.year, 1, 2, 2),
      ],
      currentDraftPickIndex: 0,
      completedDraftPickIds: [],
    };
    game.draftClass = [
      makeProspect('best-qb', 'QB', 90),
      makeProspect('best-wr', 'WR', 85),
    ];

    advanceDraft(game);

    expect(game.offseasonState?.currentDraftPickIndex).toBe(1);
    expect(game.teams.afce2.roster.some((player) => player.id === 'best-qb')).toBe(true);
    expect(game.teams.afce1.roster.some((player) => player.id === 'best-wr')).toBe(false);
    expect(game.phase).toBe('draft');
  });

  it('adds the drafted rookie to the user roster with the correct slot contract and advances the board', () => {
    const game = makeLeagueState('draft', 1);
    game.teams.afce1.draftPicks = [addPick('afce1', game.year, 1, 1)];
    game.offseasonState = {
      ...initializeOffseasonState(game),
      draftOrder: [makeDraftEntry('afce1', game.year, 1, 1, 1)],
      currentDraftPickIndex: 0,
      completedDraftPickIds: [],
    };
    game.draftClass = [makeProspect('user-qb', 'QB', 89)];

    const result = makeDraftPick(game, 'user-qb');
    const rookie = result.nextState.teams.afce1.roster.find((player) => player.id === 'user-qb')!;
    const slot = rookieSlotContract(1, 1);

    expect(rookie.contract?.baseSalary).toBe(slot.salary);
    expect(rookie.contract?.years).toBe(slot.years);
    expect(rookie.contract?.signingBonus).toBe(slot.signingBonus);
    expect(result.nextState.offseasonState?.currentDraftPickIndex).toBe(1);
    expect(result.nextState.offseasonState?.completedDraftPickIds).toEqual([`afce1-${game.year}-1-1-afce1`]);
    expect(result.nextState.phase).toBe('post_draft');
  });

  it('finalizes post-draft state by resetting the league for training camp', () => {
    const game = makeLeagueState('post_draft', 3);
    game.teams.afce1.wins = 11;
    game.teams.afce1.losses = 6;
    game.teams.afce1.streak = 4;
    game.teams.afce1.roster[0]!.injury = {
      id: 'inj-1',
      type: 'ankle_sprain',
      severity: 'out',
      severityTier: 'moderate',
      gamesOut: 3,
      gamesRecovered: 0,
      reinjuryRisk: 0.2,
      affectedRatings: [],
      ratingPenalty: 4,
      onIR: false,
    };
    game.teams.afce1.roster[0]!.stats.passYds = 4100;
    const freeAgent = makePlayer('fa-post', null, 'WR', 72, false);
    freeAgent.stats.recYds = 800;
    freeAgent.injury = {
      id: 'inj-fa',
      type: 'hamstring',
      severity: 'out',
      severityTier: 'minor',
      gamesOut: 1,
      gamesRecovered: 0,
      reinjuryRisk: 0.1,
      affectedRatings: [],
      ratingPenalty: 2,
      onIR: false,
    };
    game.players[freeAgent.id] = freeAgent;
    game.freeAgents = [freeAgent.id];
    game.draftClass = [makeProspect('leftover', 'S', 81)];
    game.offseasonState = initializeOffseasonState(game);
    game.weekSummaries = [{
      id: 'wk-1',
      year: game.year,
      week: 1,
      phase: 'playoffs',
      teamId: 'afce1',
      opponentTeamId: 'afce2',
      opponentName: 'AFCE2 Club',
      result: 'win',
      teamScore: 24,
      opponentScore: 21,
      record: '11-6',
      headline: 'Test',
      ownerDelta: 2,
      injuries: [],
      mvpPlayerId: null,
      notes: [],
    }];
    game.playoffBracket = {
      season: game.year,
      afc: [],
      nfc: [],
      matchups: [],
      championTeamId: 'afce1',
    };

    finalizePostDraft(game);

    expect(game.phase).toBe('training_camp');
    expect(game.week).toBe(1);
    expect(game.weekSummaries).toEqual([]);
    expect(game.playoffBracket).toBeNull();
    expect(game.offseasonState).toBeNull();
    expect(game.draftClass).toEqual([]);
    expect(game.teams.afce1.wins).toBe(0);
    expect(game.teams.afce1.losses).toBe(0);
    expect(game.teams.afce1.streak).toBe(0);
    expect(game.teams.afce1.roster[0]?.injury).toBeNull();
    expect(game.teams.afce1.roster[0]?.stats.passYds).toBe(0);
    expect(game.players[freeAgent.id]?.injury).toBeNull();
    expect(game.players[freeAgent.id]?.stats.recYds).toBe(0);
    expect(game.teams.afce1.draftPicks.every((pick) => pick.year === game.year + 1)).toBe(true);
    expect(game.schedule.length).toBeGreaterThan(0);
  });
});
