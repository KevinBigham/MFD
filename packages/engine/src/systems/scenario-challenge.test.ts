import { describe, expect, it } from 'vitest';
import {
  acceptTradeOffer,
  advanceScenarioSeason,
  gradeScenarioCompletion,
  initializeOffseasonState,
  startScenario,
  checkScenarioProgress,
  getAvailableScenarios,
  getScenarioConstraintCoverage,
  getScenarioConstraints,
  mulberry32,
  submitFreeAgentBid,
} from '../index';
import type { GameState, TradeOffer } from '../types';
import { makeLeagueState } from './test-helpers';

function makeScenarioGame(): GameState {
  const game = makeLeagueState('regular_season', 1);
  for (const team of Object.values(game.teams)) {
    team.draftPicks = [
      { round: 1, pick: 10, originalTeamId: team.id, currentTeamId: team.id, year: game.year, isCompPick: false },
      { round: 2, pick: 12, originalTeamId: team.id, currentTeamId: team.id, year: game.year, isCompPick: false },
      { round: 3, pick: 15, originalTeamId: team.id, currentTeamId: team.id, year: game.year, isCompPick: false },
    ];
  }
  return game;
}

describe('scenario challenges', () => {
  it('starts each shipped scenario with a valid game state', () => {
    const base = makeScenarioGame();

    for (const scenario of getAvailableScenarios()) {
      const started = startScenario(scenario.id, base, mulberry32(7));
      const userTeam = Object.values(started.teams).find((team) => team.isUser)!;

      expect(started.scenarioState?.activeScenario?.id).toBe(scenario.id);
      expect(userTeam.roster.length).toBeGreaterThan(0);
      expect(userTeam.roster.every((player) => player.teamId === userTeam.id)).toBe(true);
    }
  });

  it('tracks wins and playoff objectives correctly', () => {
    const started = startScenario('rebuild', makeScenarioGame(), mulberry32(9));
    const userTeam = Object.values(started.teams).find((team) => team.isUser)!;

    userTeam.wins = 10;
    userTeam.losses = 7;
    started.playoffBracket = {
      season: started.year,
      afc: [{ seed: 1, teamId: userTeam.id, teamName: userTeam.name, conference: userTeam.conference, division: userTeam.division, divisionWinner: true, wins: userTeam.wins, losses: userTeam.losses, ties: 0, pointDifferential: 80 }],
      nfc: [],
      matchups: [],
      championTeamId: null,
    };

    const progress = checkScenarioProgress(started);

    expect(progress.activeScenario?.objectives.every((objective) => objective.completed)).toBe(true);
  });

  it('blocks trades and free agency under The Savant constraints', () => {
    const started = startScenario('the_savant', makeScenarioGame(), mulberry32(11));
    const userTeam = Object.values(started.teams).find((team) => team.isUser)!;
    started.offseasonState = initializeOffseasonState(started);
    const offer: TradeOffer = {
      id: 'offer-1',
      fromTeamId: 'afce2',
      toTeamId: userTeam.id,
      direction: 'inbound',
      summary: 'Blocked deal',
      status: 'pending',
      send: [{
        type: 'player',
        teamId: userTeam.id,
        playerId: userTeam.roster[0]!.id,
        pickId: null,
        description: userTeam.roster[0]!.name,
      }],
      receive: [{
        type: 'player',
        teamId: 'afce2',
        playerId: started.teams.afce2.roster[0]!.id,
        pickId: null,
        description: started.teams.afce2.roster[0]!.name,
      }],
    };
    started.offseasonState.tradeOffers = [offer];
    started.freeAgents = [started.teams.afce2.roster[1]!.id];
    started.players[started.freeAgents[0]!]!.teamId = null;
    started.players[started.freeAgents[0]!]!.contract = null;

    const tradeAttempt = acceptTradeOffer(started, 'offer-1');
    const faAttempt = submitFreeAgentBid(started, started.freeAgents[0]!, {
      years: 3,
      salary: 12,
      signingBonus: 6,
      guaranteed: 18,
    });

    expect(tradeAttempt.nextState.teams[userTeam.id]!.roster.some((player) => player.id === started.teams.afce2.roster[0]!.id)).toBe(false);
    expect(faAttempt.nextState.offseasonState?.freeAgencyBids[started.freeAgents[0]!] ?? []).toHaveLength(0);
    expect(getScenarioConstraints(started)?.blockTrades).toBe(true);
  });

  it('describes the scenario constraint coverage that is actually enforced today', () => {
    const savant = getAvailableScenarios().find((scenario) => scenario.id === 'the_savant')!;
    const coverage = getScenarioConstraintCoverage(savant.constraints);

    expect(coverage.hasRestrictions).toBe(true);
    expect(coverage.items.map((item) => item.id)).toEqual(['trade_market', 'offseason_free_agency']);
    expect(coverage.items[0]).toMatchObject({
      label: 'Trade Actions',
      status: 'enforced',
      enforcedPaths: ['Generated trade-market offers', 'Accepted Trade Center market offers', 'Direct proposals and counters', 'Accepted Trade Deadline user offers', 'Draft war-room trades'],
      allowedPlanningPaths: ['Team-needs reports', 'Trade-block scouting', 'Depth chart and cap planning', 'Draft board review without trade accepts'],
      uncoveredPaths: [],
    });
    expect(coverage.items[1]).toMatchObject({
      label: 'Offseason Free Agency',
      status: 'enforced',
      enforcedPaths: ['Submit free-agent bids', 'Sign street free agents', 'Waiver claims', 'Practice-squad acquisitions'],
      allowedPlanningPaths: ['FA target-board refresh and watchlist', 'Team-needs reports', 'Waiver and practice-squad review without acquisition', 'Internal development planning'],
      uncoveredPaths: [],
    });
  });

  it('keeps every shipped scenario constraint represented by enforced coverage rows', () => {
    const constraintCoverageIds = {
      blockTrades: 'trade_market',
      blockFreeAgency: 'offseason_free_agency',
      blockDraft: 'draft',
    } as const;
    const constraintKeys = Object.keys(constraintCoverageIds) as Array<keyof typeof constraintCoverageIds>;

    for (const scenario of getAvailableScenarios()) {
      const enabledConstraints = constraintKeys.filter((key) => scenario.constraints?.[key]);
      const coverage = getScenarioConstraintCoverage(scenario.constraints);

      expect(coverage.hasRestrictions).toBe(enabledConstraints.length > 0);
      expect(coverage.items.map((item) => item.id)).toEqual(
        enabledConstraints.map((key) => constraintCoverageIds[key]),
      );
      for (const item of coverage.items) {
        expect(item.status).toBe('enforced');
        expect(item.enforcedPaths.length).toBeGreaterThan(0);
        expect(item.uncoveredPaths).toEqual([]);
      }
    }
  });

  it('marks user draft-pick constraints as enforced when a real draft gate exists', () => {
    const coverage = getScenarioConstraintCoverage({ blockDraft: true });

    expect(coverage.items).toEqual([{
      id: 'draft',
      label: 'User Draft Picks',
      status: 'enforced',
      summary: 'User draft-pick submissions are blocked today.',
      enforcedPaths: ['User draft picks'],
      allowedPlanningPaths: ['Scouting reports', 'Draft board rankings', 'War-room review without Make Pick', 'Team-needs planning'],
      uncoveredPaths: [],
    }]);
  });

  it('awards an S rank for completing every objective quickly', () => {
    const started = startScenario('dynasty_or_bust', makeScenarioGame(), mulberry32(13));
    started.playoffBracket = {
      season: started.year,
      afc: [],
      nfc: [],
      matchups: [],
      championTeamId: Object.values(started.teams).find((team) => team.isUser)!.id,
    };

    const progress = checkScenarioProgress(started);
    const graded = gradeScenarioCompletion(progress);

    expect(graded.grade).toBe('S');
    expect(graded.score).toBeGreaterThanOrEqual(95);
  });

  it('returns an F rank when no objectives are completed', () => {
    const started = startScenario('rebuild', makeScenarioGame(), mulberry32(15));
    const progress = checkScenarioProgress(started);
    const graded = gradeScenarioCompletion(progress);

    expect(graded.grade).toBe('F');
  });

  it('starts the same scenario deterministically with the same seed', () => {
    const left = startScenario('cap_hell', makeScenarioGame(), mulberry32(17));
    const right = startScenario('cap_hell', makeScenarioGame(), mulberry32(17));

    expect(left.teams.afce1.roster.map((player) => ({ id: player.id, ovr: player.ovr, age: player.age }))).toEqual(
      right.teams.afce1.roster.map((player) => ({ id: player.id, ovr: player.ovr, age: player.age })),
    );
    expect(left.teams.afce1.capSpace).toBe(right.teams.afce1.capSpace);
  });

  it('advances and completes the scenario state at season end', () => {
    const started = startScenario('dynasty_or_bust', makeScenarioGame(), mulberry32(19));
    started.playoffBracket = {
      season: started.year,
      afc: [],
      nfc: [],
      matchups: [],
      championTeamId: Object.values(started.teams).find((team) => team.isUser)!.id,
    };
    checkScenarioProgress(started);

    const result = advanceScenarioSeason(started);

    expect(result.gameOver).toBe(true);
    expect(started.scenarioState?.activeScenario).toBeUndefined();
    expect(started.scenarioState?.completedScenarios.length).toBeGreaterThan(0);
  });
});
