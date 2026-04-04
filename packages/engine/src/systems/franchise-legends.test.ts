import { describe, expect, it } from 'vitest';
import {
  calculateLegacyScore,
  generateAllDecadeTeam,
  generateLegendHighlights,
  getDecadeNarrative,
  getFranchiseLegends,
  shouldGenerateAllDecadeTeam,
} from './franchise-legends';
import { createEmptyRecordBook } from './records';
import { makeLeagueState } from './test-helpers';

function buildLegendsGame() {
  const game = makeLeagueState('offseason', 1);
  const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
  game.year = 2034;
  game.allDecadeTeams = [];
  game.franchiseHistory = [
    { year: 2030, teamId: userTeam.id, wins: 13, losses: 4, ties: 0, record: '13-4', pointDifferential: 110, playoffFinish: 'champion', majorEvents: [], awardsWon: [], recordsBroken: [], fanbase: 70, prestige: 68, attendance: 84, stadiumName: 'Chicago Stadium' },
    { year: 2031, teamId: userTeam.id, wins: 11, losses: 6, ties: 0, record: '11-6', pointDifferential: 72, playoffFinish: 'divisional_exit', majorEvents: [], awardsWon: [], recordsBroken: [], fanbase: 72, prestige: 70, attendance: 86, stadiumName: 'Chicago Stadium' },
    { year: 2032, teamId: userTeam.id, wins: 14, losses: 3, ties: 0, record: '14-3', pointDifferential: 125, playoffFinish: 'champion', majorEvents: [], awardsWon: [], recordsBroken: [], fanbase: 78, prestige: 76, attendance: 91, stadiumName: 'Nexus Dome' },
    { year: 2033, teamId: userTeam.id, wins: 9, losses: 8, ties: 0, record: '9-8', pointDifferential: 12, playoffFinish: 'wild_card_exit', majorEvents: [], awardsWon: [], recordsBroken: [], fanbase: 75, prestige: 74, attendance: 88, stadiumName: 'Nexus Dome' },
    { year: 2034, teamId: userTeam.id, wins: 10, losses: 7, ties: 0, record: '10-7', pointDifferential: 25, playoffFinish: 'missed_playoffs', majorEvents: [], awardsWon: [], recordsBroken: [], fanbase: 74, prestige: 73, attendance: 86, stadiumName: 'Nexus Dome' },
  ];
  game.records = createEmptyRecordBook();
  game.records.career.passYds = [{
    category: 'career',
    stat: 'passYds',
    value: 52340,
    teamId: userTeam.id,
    teamName: `${userTeam.city} ${userTeam.name}`,
    year: 2034,
    playerId: 'legend-qb',
    playerName: 'Legend Quarterback',
  }];
  game.playerArchive = [];
  game.hallOfFame = [{
    playerId: 'legend-qb',
    name: 'Legend Quarterback',
    position: 'QB',
    inductionYear: 2038,
    peakOvr: 96,
    careerYears: 14,
    score: 97,
    awards: { mvps: 2, allPros: 4, proBowls: 7, championships: 2 },
    highlights: ['2x MVP'],
    teams: [userTeam.id],
  }];
  game.awardsHistory = [
    {
      year: 2030,
      ceremony: { headline: 'Awards', intro: 'Intro', blurbs: [] },
      awards: [{
        awardId: 'mvp',
        label: 'League MVP',
        winnerId: 'legend-qb',
        winnerName: 'Legend Quarterback',
        winnerTeamId: userTeam.id,
        winnerTeam: `${userTeam.city} ${userTeam.name}`,
        winnerPosition: 'QB',
        winnerStats: { passYds: 5100 },
        score: 98,
        runnersUp: [],
        narrative: 'Dominant season',
      }],
    },
  ];
  game.playerSeasonHistory = {};

  const playerDefs = [
    ['legend-qb', 'Legend Quarterback', 'QB', 96, 2030, 2034],
    ['legend-rb', 'Legend Runner', 'RB', 91, 2030, 2034],
    ['legend-wr1', 'Legend Wideout I', 'WR', 92, 2030, 2034],
    ['legend-wr2', 'Legend Wideout II', 'WR', 90, 2030, 2034],
    ['legend-wr3', 'Legend Wideout III', 'WR', 89, 2030, 2034],
    ['legend-te', 'Legend Tight End', 'TE', 88, 2030, 2034],
    ['legend-ol1', 'Legend Tackle I', 'OL', 88, 2030, 2034],
    ['legend-ol2', 'Legend Guard I', 'OL', 87, 2030, 2034],
    ['legend-ol3', 'Legend Center', 'OL', 86, 2030, 2034],
    ['legend-ol4', 'Legend Guard II', 'OL', 85, 2030, 2034],
    ['legend-ol5', 'Legend Tackle II', 'OL', 84, 2030, 2034],
    ['legend-dl1', 'Legend Edge I', 'DL', 90, 2030, 2034],
    ['legend-dl2', 'Legend Edge II', 'DL', 89, 2030, 2034],
    ['legend-dl3', 'Legend Tackle I', 'DL', 88, 2030, 2034],
    ['legend-dl4', 'Legend Tackle II', 'DL', 87, 2030, 2034],
    ['legend-lb1', 'Legend Linebacker I', 'LB', 89, 2030, 2034],
    ['legend-lb2', 'Legend Linebacker II', 'LB', 88, 2030, 2034],
    ['legend-lb3', 'Legend Linebacker III', 'LB', 87, 2030, 2034],
    ['legend-cb1', 'Legend Corner I', 'CB', 90, 2030, 2034],
    ['legend-cb2', 'Legend Corner II', 'CB', 88, 2030, 2034],
    ['legend-s1', 'Legend Safety I', 'S', 89, 2030, 2034],
    ['legend-s2', 'Legend Safety II', 'S', 87, 2030, 2034],
    ['legend-k', 'Legend Kicker', 'K', 83, 2030, 2034],
    ['legend-p', 'Legend Punter', 'P', 82, 2030, 2034],
    ['honorable-qb', 'Honorable Quarterback', 'QB', 86, 2030, 2034],
    ['honorable-rb', 'Honorable Runner', 'RB', 84, 2030, 2034],
    ['honorable-wr', 'Honorable Wideout', 'WR', 84, 2030, 2034],
    ['honorable-te', 'Honorable Tight End', 'TE', 82, 2030, 2034],
    ['honorable-ol', 'Honorable Lineman', 'OL', 82, 2030, 2034],
    ['honorable-dl', 'Honorable Rusher', 'DL', 83, 2030, 2034],
    ['honorable-lb', 'Honorable Backer', 'LB', 82, 2030, 2034],
    ['honorable-cb', 'Honorable Corner', 'CB', 82, 2030, 2034],
    ['honorable-s', 'Honorable Safety', 'S', 82, 2030, 2034],
    ['out-of-era', 'Out of Era Star', 'QB', 99, 2020, 2024],
  ] as const;

  game.playerArchive = playerDefs.map(([playerId, name, pos, peakOvr, firstYear, lastYear]) => ({
    playerId,
    firstName: name.split(' ')[0]!,
    lastName: name.split(' ').slice(1).join(' '),
    name,
    positions: [pos],
    peakOvr,
    peakYear: lastYear,
    firstYear,
    lastYear,
    retirementYear: lastYear,
    teamHistory: [{ teamId: userTeam.id, firstYear, lastYear }],
    careerStats: { seasons: lastYear - firstYear + 1, gp: 85, snaps: 4000, passYds: playerId === 'legend-qb' ? 52340 : 0 },
  }));

  return { game, userTeam };
}

describe('franchise legends', () => {
  it('generates an all-decade team with 22 starters and 11 honorable mentions', () => {
    const { game, userTeam } = buildLegendsGame();

    const team = generateAllDecadeTeam(game, userTeam.id);

    expect(team.roster).toHaveLength(33);
  });

  it('requires players to have played for the team during the decade', () => {
    const { game, userTeam } = buildLegendsGame();

    const team = generateAllDecadeTeam(game, userTeam.id);

    expect(team.roster.some((entry) => entry.playerId === 'out-of-era')).toBe(false);
  });

  it('ranks hall of fame players above comparable non-hof players', () => {
    const { game, userTeam } = buildLegendsGame();
    const hall = game.playerArchive.find((entry) => entry.playerId === 'legend-qb')!;
    const nonHall = game.playerArchive.find((entry) => entry.playerId === 'legend-rb')!;

    const hallScore = calculateLegacyScore(hall, userTeam.id, game.awardsHistory, game.hallOfFame, game.records);
    const nonHallScore = calculateLegacyScore(nonHall, userTeam.id, game.awardsHistory, game.hallOfFame, game.records);

    expect(hallScore).toBeGreaterThan(nonHallScore);
  });

  it('generates narrative text that references actual championship years', () => {
    const { game, userTeam } = buildLegendsGame();
    const team = generateAllDecadeTeam(game, userTeam.id);

    const narrative = getDecadeNarrative(team, game.franchiseHistory.filter((entry) => entry.teamId === userTeam.id));

    expect(narrative).toContain('2030');
    expect(narrative).toContain('2032');
  });

  it('builds legend highlights from awards and records', () => {
    const { game, userTeam } = buildLegendsGame();
    const legend = getFranchiseLegends(game, userTeam.id, 1)[0]!;

    const highlights = generateLegendHighlights(legend, game.records);

    expect(highlights.some((entry) => entry.includes('MVP'))).toBe(true);
    expect(highlights.some((entry) => entry.includes('52,340'))).toBe(true);
  });

  it('detects decade generation only once per decade boundary', () => {
    const { game, userTeam } = buildLegendsGame();
    game.year = 2030;
    game.allDecadeTeams = [{ id: 'existing', decade: '2020-2029', startYear: 2020, endYear: 2029, teamId: userTeam.id, roster: [], headline: 'Done' }];

    expect(shouldGenerateAllDecadeTeam(game)).toBe(false);
    game.allDecadeTeams = [];
    expect(shouldGenerateAllDecadeTeam(game)).toBe(true);
  });
});
