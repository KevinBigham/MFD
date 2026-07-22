import { describe, expect, it } from 'vitest';
import { runCoachingCarousel, scoreCarouselCandidate, type StaffMember } from '../index';
import { makeLeagueState } from './test-helpers';

function makeCoach(id: string, name: string, gameplan: number): StaffMember {
  return {
    id,
    name,
    role: 'HC',
    archetype: 'balanced',
    traits: [],
    ratings: {
      gameplan,
      development: gameplan - 5,
      motivation: gameplan - 8,
      strategy: gameplan - 3,
    },
    level: 4,
    age: 54,
  };
}

describe('coaching carousel', () => {
  it('uses durable franchise risk tolerance when grading a staff candidate', () => {
    const game = makeLeagueState('offseason', 1);
    const team = game.teams.afce2!;
    const candidate = makeCoach('candidate', 'Plan Candidate', 90);
    candidate.ratings.development = 50;
    game.franchisePlans = {
      [team.id]: {
        teamId: team.id,
        windowYears: [2027, 2029],
        ownerMandate: 'contend',
        capPosture: 'balanced',
        priorityPositions: ['QB'],
        protectedAssets: [],
        expendableAssets: [],
        draftCapitalStrategy: 'balanced',
        riskTolerance: 80,
        changeTriggers: [],
        publicNarrative: 'Aggressive window.',
        planHistory: [],
        lastUpdatedYear: 2027,
      },
    };
    const aggressive = scoreCarouselCandidate(game, team, candidate);
    game.franchisePlans[team.id]!.riskTolerance = 20;

    expect(aggressive).toBeGreaterThan(scoreCarouselCandidate(game, team, candidate));
  });

  it('fires struggling AI head coaches, hires replacements, and leaves the user coach untouched', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;

    game.teams.afce1!.staff.hc = makeCoach('user-hc', 'User Coach', 84);
    game.teams.afce1!.isUser = true;

    game.teams.afce2!.staff.hc = makeCoach('old-hc', 'Old Coach', 61);
    game.teams.afce2!.wins = 4;
    game.teams.afce2!.losses = 13;
    game.teams.afce2!.ownerPatience80 = 18;
    game.franchiseHistory.push(
      { year: 2024, teamId: 'afce2', wins: 5, losses: 12, ties: 0, record: '5-12', pointDifferential: -95, playoffFinish: 'missed', majorEvents: [], awardsWon: [], recordsBroken: [] },
      { year: 2025, teamId: 'afce2', wins: 4, losses: 13, ties: 0, record: '4-13', pointDifferential: -101, playoffFinish: 'missed', majorEvents: [], awardsWon: [], recordsBroken: [] },
      { year: 2026, teamId: 'afce2', wins: 4, losses: 13, ties: 0, record: '4-13', pointDifferential: -88, playoffFinish: 'missed', majorEvents: [], awardsWon: [], recordsBroken: [] },
    );

    const result = runCoachingCarousel(game, 2026);

    expect(game.teams.afce2!.staff.hc?.id).not.toBe('old-hc');
    expect(game.teams.afce2!.staff.hc?.ratings.gameplan).toBeGreaterThanOrEqual(50);
    expect(game.teams.afce2!.staff.hc?.ratings.gameplan).toBeLessThanOrEqual(95);
    expect(game.teams.afce2!.coachingStaff.hc?.id).toBe(game.teams.afce2!.staff.hc?.id);
    expect(game.teams.afce2!.coachingStaff.hc?.role).toBe('HC');
    expect(game.teams.afce2!.coachingStaff.hc?.reputation).toBeGreaterThanOrEqual(30);
    expect(game.teams.afce1!.staff.hc?.id).toBe('user-hc');
    expect(result.events.some((event) => event.type === 'coach_fired')).toBe(true);
    expect(result.events.some((event) => event.type === 'coach_hired')).toBe(true);
  });

  it('records coach career history for fired and hired coaches', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2027;
    game.teams.afce2!.staff.hc = makeCoach('old-hc', 'Old Coach', 61);
    game.teams.afce2!.wins = 3;
    game.teams.afce2!.losses = 14;
    game.teams.afce2!.ownerPatience80 = 10;

    runCoachingCarousel(game, 2026);

    expect(game.coachingHistory.some((entry) => entry.coachId === 'old-hc')).toBe(true);
    expect(game.coachingHistory.some((entry) => entry.teams.some((team) => team.teamId === 'afce2'))).toBe(true);
  });
});
