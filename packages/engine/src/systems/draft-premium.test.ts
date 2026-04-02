import { describe, expect, it } from 'vitest';
import { advanceDraft, ensureDraftClass } from './draft';
import { makeLeagueState } from './test-helpers';
import type { DraftProspect, GameState, OffseasonState, Team } from '../types';

function makeOffseasonState(teamIds: string[], year: number): OffseasonState {
  return {
    round: 1,
    expiringPlayerIds: [],
    reSignDecisions: {},
    freeAgencyBids: {},
    scoutingState: {},
    tradeOffers: [],
    draftOrder: teamIds.map((teamId, index) => ({
      id: `${teamId}-${year}-1-${index + 1}-${teamId}`,
      teamId,
      round: 1,
      pick: index + 1,
      overall: index + 1,
      originalTeamId: teamId,
    })),
    currentDraftPickIndex: 0,
    completedDraftPickIds: [],
  };
}

function makeProspect(id: string, pos: DraftProspect['pos'], trueGrade: number): DraftProspect {
  return {
    id,
    firstName: 'Test',
    lastName: id,
    pos,
    college: 'Test U',
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
  };
}

function weakenPosition(team: Team, pos: DraftProspect['pos'], ovr: number) {
  team.roster
    .filter((player) => player.pos === pos)
    .forEach((player) => {
      player.ovr = ovr;
    });
}

describe('draft position premium', () => {
  it('lets a close-grade quarterback jump the board', () => {
    const game = makeLeagueState('draft');
    const teamIds = Object.keys(game.teams).slice(0, 1);
    teamIds.forEach((teamId) => {
      game.teams[teamId].isUser = false;
      weakenPosition(game.teams[teamId], 'QB', 70);
      weakenPosition(game.teams[teamId], 'WR', 70);
      game.teams[teamId].draftPicks = [{
        round: 1,
        pick: 1,
        originalTeamId: teamId,
        currentTeamId: teamId,
        year: game.year,
        isCompPick: false,
      }];
    });

    game.draftClass = [
      makeProspect('wr-1', 'WR', 84),
      makeProspect('qb-1', 'QB', 83),
      makeProspect('cb-1', 'CB', 82),
    ];
    game.offseasonState = makeOffseasonState(teamIds, game.year);

    advanceDraft(game);

    expect(game.teams[teamIds[0]]!.roster.some((player) => player.id === 'qb-1')).toBe(true);
  });

  it('puts quarterbacks in the top five picks often enough across generated classes', () => {
    let yearsWithTopFiveQb = 0;

    for (let year = 2026; year < 2036; year++) {
      const game = makeLeagueState('draft');
      game.year = year;
      const teamIds = Object.keys(game.teams).slice(0, 5);
      teamIds.forEach((teamId, index) => {
        const team = game.teams[teamId];
        team.isUser = false;
        weakenPosition(team, 'QB', 63 + index);
        team.draftPicks = [{
          round: 1,
          pick: index + 1,
          originalTeamId: teamId,
          currentTeamId: teamId,
          year,
          isCompPick: false,
        }];
      });

      game.offseasonState = makeOffseasonState(teamIds, year);
      ensureDraftClass(game);
      advanceDraft(game);

      const draftedTopFive = teamIds.flatMap((teamId) =>
        game.teams[teamId].roster.filter((player) => player.draftYear === year),
      );

      if (draftedTopFive.some((player) => player.pos === 'QB')) {
        yearsWithTopFiveQb += 1;
      }
    }

    expect(yearsWithTopFiveQb).toBeGreaterThanOrEqual(6);
  });
});
