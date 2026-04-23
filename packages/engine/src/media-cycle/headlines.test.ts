import { describe, expect, it } from 'vitest';
import type { GameResult, PlayerGameLine, Team, TeamGameStats } from '../types';
import { makeLeagueState, makePlayer } from '../systems/test-helpers';
import { generateHeadlines } from './headlines';

function setRosterOvr(team: Team, ovr: number): void {
  for (const player of team.roster) {
    player.ovr = ovr;
    player.pot = ovr + 4;
  }
}

function teamStats(playerLines: PlayerGameLine[] = [], quarterScores: [number, number, number, number] = [0, 0, 0, 0]): TeamGameStats {
  return {
    totalYards: 0,
    passingYards: 0,
    rushingYards: 0,
    turnovers: 0,
    sacks: 0,
    pressuresAllowed: 0,
    thirdDownConversions: 0,
    thirdDownAttempts: 0,
    timeOfPossession: 30,
    passAttempts: 0,
    passCompletions: 0,
    passTDs: 0,
    interceptions: 0,
    rushAttempts: 0,
    rushTDs: 0,
    fumbles: 0,
    penalties: 0,
    penaltyYards: 0,
    fgMade: 0,
    fgAttempted: 0,
    punts: 0,
    drives: 0,
    yacYards: 0,
    redZoneTrips: 0,
    redZoneScores: 0,
    quarterScores,
    playerLines,
  };
}

function resultFor(
  game: ReturnType<typeof makeLeagueState>,
  {
    id = 'headline-game',
    homeTeamId = 'afce1',
    awayTeamId = 'afce2',
    homeScore = 24,
    awayScore = 17,
    homeQuarterScores = [7, 7, 3, 7] as [number, number, number, number],
    awayQuarterScores = [3, 7, 7, 0] as [number, number, number, number],
    homeLines = [] as PlayerGameLine[],
    awayLines = [] as PlayerGameLine[],
  } = {},
): GameResult {
  return {
    id,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    week: 8,
    year: game.year,
    overtime: false,
    mvpPlayerId: null,
    stats: {
      [homeTeamId]: teamStats(homeLines, homeQuarterScores),
      [awayTeamId]: teamStats(awayLines, awayQuarterScores),
    },
    playerMatchupEvents: [],
  };
}

describe('media-cycle headlines', () => {
  it('creates upset headlines for underdog wins', () => {
    const game = makeLeagueState('regular_season', 8);
    setRosterOvr(game.teams.afce1!, 60);
    setRosterOvr(game.teams.afce2!, 92);

    const headlines = generateHeadlines(game, 8, [resultFor(game, { homeScore: 27, awayScore: 20 })]);

    expect(headlines.some((headline) => headline.category === 'UPSET')).toBe(true);
  });

  it('creates blowout headlines for 21-point margins', () => {
    const game = makeLeagueState('regular_season', 8);
    const headlines = generateHeadlines(game, 8, [resultFor(game, { homeScore: 38, awayScore: 10 })]);

    expect(headlines.some((headline) => headline.category === 'BLOWOUT')).toBe(true);
  });

  it('creates comeback headlines when the winner trailed by ten entering the fourth', () => {
    const game = makeLeagueState('regular_season', 8);
    const headlines = generateHeadlines(game, 8, [resultFor(game, {
      homeScore: 28,
      awayScore: 21,
      homeQuarterScores: [0, 0, 7, 21],
      awayQuarterScores: [7, 7, 7, 0],
    })]);

    expect(headlines.some((headline) => headline.category === 'COMEBACK')).toBe(true);
  });

  it('creates rivalry win headlines when a declared rival is beaten', () => {
    const game = makeLeagueState('regular_season', 8);
    game.leagueRivalries.push({
      id: 'afce1::afce2',
      teamA: 'afce1',
      teamB: 'afce2',
      intensity: 72,
      isDivision: true,
      history: [],
      lastMetYear: game.year,
      lastMetWeek: 7,
    });

    const headlines = generateHeadlines(game, 8, [resultFor(game)]);
    expect(headlines.some((headline) => headline.category === 'RIVALRY_WIN')).toBe(true);
  });

  it('creates passing explosion headlines at 400 yards', () => {
    const game = makeLeagueState('regular_season', 8);
    const qb = game.teams.afce1!.roster.find((player) => player.pos === 'QB')!;

    const headlines = generateHeadlines(game, 8, [resultFor(game, {
      homeLines: [{ playerId: qb.id, name: qb.name, pos: 'QB', passAtt: 42, passComp: 30, passYds: 412, passTD: 4 }],
    })]);

    expect(headlines.some((headline) => headline.category === 'INDIVIDUAL_PERFORMANCE')).toBe(true);
  });

  it('creates rushing explosion headlines at 150 yards', () => {
    const game = makeLeagueState('regular_season', 8);
    const rb = game.teams.afce1!.roster.find((player) => player.pos === 'RB')!;

    const headlines = generateHeadlines(game, 8, [resultFor(game, {
      homeLines: [{ playerId: rb.id, name: rb.name, pos: 'RB', rushAtt: 24, rushYds: 168, rushTD: 2 }],
    })]);

    expect(headlines.some((headline) => headline.summary.includes('168 rush yards'))).toBe(true);
  });

  it('creates receiving explosion headlines at 200 yards', () => {
    const game = makeLeagueState('regular_season', 8);
    const wr = game.teams.afce1!.roster.find((player) => player.pos === 'WR')!;

    const headlines = generateHeadlines(game, 8, [resultFor(game, {
      homeLines: [{ playerId: wr.id, name: wr.name, pos: 'WR', rec: 11, recYds: 201, recTD: 2 }],
    })]);

    expect(headlines.some((headline) => headline.summary.includes('201 receiving yards'))).toBe(true);
  });

  it('creates touchdown headlines at three total touchdowns', () => {
    const game = makeLeagueState('regular_season', 8);
    const rb = game.teams.afce1!.roster.find((player) => player.pos === 'RB')!;

    const headlines = generateHeadlines(game, 8, [resultFor(game, {
      homeLines: [{ playerId: rb.id, name: rb.name, pos: 'RB', rushAtt: 18, rushYds: 92, rushTD: 3 }],
    })]);

    expect(headlines.some((headline) => headline.summary.includes('3 total touchdowns'))).toBe(true);
  });

  it('creates milestone headlines from broken records', () => {
    const game = makeLeagueState('regular_season', 8);
    game.recentBrokenRecords = [{
      playerId: 'afce1-qb',
      playerName: 'Record Setter',
      teamId: 'afce1',
      stat: 'passYds',
      newValue: 452,
      previousValue: 449,
      previousHolder: 'Old Record',
      category: 'singleGame',
      year: game.year,
      week: 8,
      narrative: 'Record narrative',
    }];

    const headlines = generateHeadlines(game, 8, []);
    expect(headlines[0]?.category).toBe('MILESTONE');
  });

  it('creates milestone headlines from recent milestones', () => {
    const game = makeLeagueState('regular_season', 8);
    game.recentMilestones = [{
      playerId: 'afce1-qb',
      playerName: 'Milestone Player',
      stat: 'passYds',
      value: 10000,
      milestoneLabel: '10,000 career yards',
      narrative: 'Milestone narrative',
      year: game.year,
      week: 8,
    }];

    const headlines = generateHeadlines(game, 8, []);
    expect(headlines[0]?.title).toContain('10,000 career yards');
  });

  it('creates rookie breakout headlines for qualified rookies', () => {
    const game = makeLeagueState('regular_season', 8);
    const rookie = makePlayer('rookie-wr', 'afce1', 'WR', 79);
    rookie.name = 'Rookie Star';
    rookie.yearsExp = 0;
    rookie.draftYear = game.year;
    game.teams.afce1!.roster.push(rookie);
    game.players[rookie.id] = rookie;

    const headlines = generateHeadlines(game, 8, [resultFor(game, {
      homeLines: [{ playerId: rookie.id, name: rookie.name, pos: 'WR', rec: 8, recYds: 164, recTD: 2 }],
    })]);

    expect(headlines.some((headline) => headline.category === 'ROOKIE_BREAKOUT')).toBe(true);
  });

  it('does not create rookie breakout headlines below threshold', () => {
    const game = makeLeagueState('regular_season', 8);
    const rookie = makePlayer('rookie-rb', 'afce1', 'RB', 76);
    rookie.yearsExp = 0;
    rookie.draftYear = game.year;
    game.teams.afce1!.roster.push(rookie);
    game.players[rookie.id] = rookie;

    const headlines = generateHeadlines(game, 8, [resultFor(game, {
      homeLines: [{ playerId: rookie.id, name: rookie.name, pos: 'RB', rushAtt: 9, rushYds: 41, rushTD: 0 }],
    })]);

    expect(headlines.some((headline) => headline.category === 'ROOKIE_BREAKOUT')).toBe(false);
  });

  it('sorts categories by stable narrative priority', () => {
    const game = makeLeagueState('regular_season', 8);
    game.recentMilestones = [{
      playerId: 'afce1-qb',
      playerName: 'Milestone Player',
      stat: 'passYds',
      value: 10000,
      milestoneLabel: '10,000 career yards',
      narrative: 'Milestone narrative',
      year: game.year,
      week: 8,
    }];
    setRosterOvr(game.teams.afce1!, 60);
    setRosterOvr(game.teams.afce2!, 92);

    const headlines = generateHeadlines(game, 8, [resultFor(game, {
      homeScore: 38,
      awayScore: 10,
      homeQuarterScores: [0, 0, 7, 31],
      awayQuarterScores: [7, 7, 7, 0],
    })]);

    expect(headlines.map((headline) => headline.category).slice(0, 4)).toEqual([
      'MILESTONE',
      'COMEBACK',
      'UPSET',
      'BLOWOUT',
    ]);
  });
});
