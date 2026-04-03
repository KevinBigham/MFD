import { describe, expect, it } from 'vitest';
import { makeLeagueState, makePlayer } from './test-helpers';
import {
  buildPlayerProfile,
  getPlayerComparables,
  getPlayerProjection,
  getPlayerValue,
} from './player-profile';

describe('player profile system', () => {
  it('builds a profile with contract, history, awards, and personality detail', () => {
    const game = makeLeagueState('regular_season', 12);
    const team = game.teams.afce1!;
    const player = team.roster.find((entry) => entry.pos === 'QB')!;

    game.playerSeasonHistory[player.id] = [
      {
        playerId: player.id,
        season: 2024,
        age: 24,
        ovr: 78,
        teamId: team.id,
        gamesPlayed: 17,
        gamesStarted: 17,
        keyStats: { passYds: 3810, passTD: 28, passINT: 11 },
      },
      {
        playerId: player.id,
        season: 2025,
        age: 25,
        ovr: 82,
        teamId: team.id,
        gamesPlayed: 17,
        gamesStarted: 17,
        keyStats: { passYds: 4099, passTD: 31, passINT: 9 },
      },
    ];
    game.awardsHistory.push({
      year: 2025,
      awards: [{
        awardId: 'mvp',
        label: 'MVP',
        winnerId: player.id,
        winnerName: player.name,
        winnerTeamId: team.id,
        runnersUp: [],
      }],
      allPros: [],
    });
    team.mentoringPairs.push({
      mentorId: player.id,
      mentorName: player.name,
      menteeId: team.roster.find((entry) => entry.pos === 'WR')!.id,
      menteeName: team.roster.find((entry) => entry.pos === 'WR')!.name,
      teamId: team.id,
      positionGroup: 'QB',
      year: 2025,
      bonus: 2,
    });
    player.injury = {
      id: 'injury-1',
      type: 'hamstring',
      severity: 'out',
      severityTier: 'severe',
      gamesOut: 4,
      gamesRecovered: 0,
      reinjuryRisk: 0.2,
      affectedRatings: ['speed'],
      ratingPenalty: 2,
      onIR: false,
    };

    const profile = buildPlayerProfile(player, game);

    expect(profile.player.id).toBe(player.id);
    expect(profile.contractDetails.yearByYear).toHaveLength(player.contract!.yearlyBreakdown.length);
    expect(profile.developmentArc.map((entry) => entry.ovr)).toEqual([78, 82, player.ovr]);
    expect(profile.awardsWon).toContain('2025 MVP');
    expect(profile.mentorHistory[0]).toMatchObject({ mentorName: player.name, bonus: 2 });
    expect(profile.personalityReport.traits).toEqual(expect.arrayContaining(player.traits));
  });

  it('sums contract year-by-year totals and guarantees correctly', () => {
    const game = makeLeagueState();
    const player = game.teams.afce1!.roster.find((entry) => entry.pos === 'QB')!;

    const profile = buildPlayerProfile(player, game);
    const totalCap = profile.contractDetails.yearByYear.reduce((sum, year) => sum + year.capHit, 0);

    expect(profile.contractDetails.totalValue).toBe(player.contract!.totalValue);
    expect(profile.contractDetails.guaranteedRemaining).toBe(player.contract!.guaranteed);
    expect(totalCap).toBeGreaterThan(0);
  });

  it('returns comparables from the same position and similar age band', () => {
    const game = makeLeagueState();
    const player = game.teams.afce1!.roster.find((entry) => entry.pos === 'WR')!;
    const comps = getPlayerComparables(player, Object.values(game.players));

    expect(comps.length).toBeGreaterThanOrEqual(3);
    expect(comps.every((entry) => entry.pos === player.pos)).toBe(true);
  });

  it('projects peak and retirement windows within a plausible range', () => {
    const game = makeLeagueState();
    const player = game.teams.afce1!.roster.find((entry) => entry.pos === 'RB')!;
    player.age = 24;
    player.ovr = 79;
    player.pot = 86;

    const projection = getPlayerProjection(player);

    expect(projection.nextYearOvr).toBeGreaterThanOrEqual(player.ovr);
    expect(projection.peakOvr).toBeGreaterThanOrEqual(projection.nextYearOvr);
    expect(projection.peakAge).toBeGreaterThanOrEqual(player.age);
    expect(projection.retirementAge).toBeGreaterThan(projection.peakAge);
  });

  it('produces positive surplus for young players on team-friendly deals', () => {
    const game = makeLeagueState();
    const player = game.teams.afce1!.roster.find((entry) => entry.pos === 'CB')!;
    player.age = 23;
    player.ovr = 84;
    player.contract!.baseSalary = 4;
    player.contract!.prorated = 1;

    const value = getPlayerValue(player, game);

    expect(value.tradeValue).toBeGreaterThan(0);
    expect(value.marketValue).toBeGreaterThan(0);
    expect(value.surplus).toBeGreaterThan(0);
  });

  it('uses synthesized history for legacy players without archived season snapshots', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    const player = team.roster.find((entry) => entry.pos === 'TE')!;

    game.playerArchive.push({
      playerId: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      name: player.name,
      positions: [player.pos],
      peakOvr: player.ovr + 2,
      peakYear: 2024,
      firstYear: 2022,
      lastYear: 2025,
      retirementYear: null,
      teamHistory: [{ teamId: team.id, firstYear: 2022, lastYear: 2025 }],
      careerStats: { seasons: 4, gp: 68, recYds: 2780, recTD: 24, previousSeasonOvr: 76, seasonStartOvr: 80 },
    });

    const profile = buildPlayerProfile(player, game);

    expect(profile.legacyHistoryPartial).toBe(true);
    expect(profile.developmentArc.length).toBeGreaterThan(0);
    expect(profile.careerStats.length).toBeGreaterThan(0);
  });
});
