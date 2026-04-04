import { describe, expect, it } from 'vitest';
import {
  acceptTradeOffer,
  advanceScenarioSeason,
  gradeScenarioCompletion,
  initializeOffseasonState,
  startScenario,
  checkScenarioProgress,
  getAvailableScenarios,
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
