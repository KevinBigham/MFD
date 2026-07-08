import { describe, expect, it } from 'vitest';
import type { GameResult, TeamGameStats } from '../types';
import {
  MILESTONE_THRESHOLDS,
  checkMilestones,
  checkRecordChases,
  detectBrokenRecords,
  generateMilestoneNarrative,
  generateRecordNarrative,
  getActiveMilestoneChases,
  getCareerLeaders,
  getLeagueLeaders,
  getRecordHolders,
  getSeasonPaceProjection,
} from '../index';
import { createEmptyRecordBook } from './records';
import { makeLeagueState } from './test-helpers';

function makeTeamStats(playerLines: TeamGameStats['playerLines'] = []): TeamGameStats {
  return {
    totalYards: 350,
    passingYards: 240,
    rushingYards: 110,
    turnovers: 1,
    sacks: 2,
    pressuresAllowed: 3,
    thirdDownConversions: 6,
    thirdDownAttempts: 12,
    timeOfPossession: 30,
    passAttempts: 32,
    passCompletions: 21,
    passTDs: 2,
    interceptions: 1,
    rushAttempts: 24,
    rushTDs: 1,
    fumbles: 0,
    penalties: 4,
    penaltyYards: 35,
    fgMade: 1,
    fgAttempted: 1,
    punts: 3,
    drives: 10,
    yacYards: 55,
    redZoneTrips: 3,
    redZoneScores: 2,
    quarterScores: [7, 10, 7, 7],
    playerLines,
  };
}

function makeResult(game: ReturnType<typeof makeLeagueState>, passYds: number): GameResult {
  const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
  return {
    id: `result-${passYds}`,
    homeTeamId: 'afce1',
    awayTeamId: 'afce2',
    homeScore: 31,
    awayScore: 17,
    week: game.week,
    year: game.year,
    overtime: false,
    mvpPlayerId: qb.id,
    stats: {
      afce1: makeTeamStats([
        { playerId: qb.id, name: qb.name, pos: 'QB', passAtt: 35, passComp: 25, passYds, passTD: 4, passINT: 0 },
      ]),
      afce2: makeTeamStats(),
    },
    weather: 'clear',
    matchupHighlight: null,
  };
}

function emptySchedule(weeks: number) {
  return Array.from({ length: weeks }, (_, index) => ({ week: index + 1, games: [] }));
}

describe('record tracker', () => {
  it('finds active record chases above eighty percent pace and sorts by closeness', () => {
    const game = makeLeagueState('regular_season', 9);
    game.records = createEmptyRecordBook();

    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    const wr = game.teams.afce1.roster.find((player) => player.pos === 'WR')!;
    qb.stats.gamesPlayed = 8;
    qb.stats.passYds = 3200;
    wr.stats.gamesPlayed = 8;
    wr.stats.recYds = 900;

    game.records.singleSeason.passYds = [{
      category: 'singleSeason',
      stat: 'passYds',
      value: 5000,
      teamId: 'afce2',
      teamName: 'AFCE2 Club',
      year: 2024,
      playerId: 'legacy-qb',
      playerName: 'Legacy QB',
    }];
    game.records.singleSeason.recYds = [{
      category: 'singleSeason',
      stat: 'recYds',
      value: 1500,
      teamId: 'afce2',
      teamName: 'AFCE2 Club',
      year: 2024,
      playerId: 'legacy-wr',
      playerName: 'Legacy WR',
    }];

    const chases = checkRecordChases(game);

    expect(chases).toHaveLength(2);
    expect(chases[0]?.playerId).toBe(qb.id);
    expect(chases[0]?.projected).toBeGreaterThan(chases[0]!.recordValue);
    expect(chases[1]?.stat).toBe('recYds');
  });

  it('projects record chases over the generated regular-season schedule length', () => {
    const game = makeLeagueState('regular_season', 17);
    game.records = createEmptyRecordBook();
    game.schedule = emptySchedule(19);

    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    qb.stats.gamesPlayed = 17;
    qb.stats.passYds = 3400;
    game.records.singleSeason.passYds = [{
      category: 'singleSeason',
      stat: 'passYds',
      value: 3700,
      teamId: 'afce2',
      teamName: 'AFCE2 Club',
      year: 2024,
      playerId: 'legacy-qb',
      playerName: 'Legacy QB',
    }];

    const chases = checkRecordChases(game);

    expect(chases[0]).toMatchObject({
      playerId: qb.id,
      stat: 'passYds',
      projected: 3800,
      weeksRemaining: 2,
    });
  });

  it('detects and stores a broken single-game record', () => {
    const game = makeLeagueState('regular_season', 4);
    game.records = createEmptyRecordBook();
    game.records.singleGame.passYds = [{
      category: 'singleGame',
      stat: 'passYds',
      value: 420,
      teamId: 'afce2',
      teamName: 'AFCE2 Club',
      year: 2022,
      week: 7,
      playerId: 'old-qb',
      playerName: 'Old QB',
    }];

    const broken = detectBrokenRecords(game, [makeResult(game, 451)]);

    expect(broken.some((record) => record.category === 'singleGame' && record.stat === 'passYds')).toBe(true);
    expect(game.records.singleGame.passYds[0]?.value).toBe(451);
  });

  it('detects a single-season record only once for the same player and year', () => {
    const game = makeLeagueState('regular_season', 12);
    game.records = createEmptyRecordBook();
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    qb.stats.passYds = 4100;
    qb.stats.gamesPlayed = 12;
    game.records.singleSeason.passYds = [{
      category: 'singleSeason',
      stat: 'passYds',
      value: 4000,
      teamId: 'afce2',
      teamName: 'AFCE2 Club',
      year: 2021,
      playerId: 'legacy-qb',
      playerName: 'Legacy QB',
    }];

    const first = detectBrokenRecords(game, [makeResult(game, 300)]);
    qb.stats.passYds = 4300;
    const second = detectBrokenRecords(game, [makeResult(game, 310)]);

    expect(first.some((record) => record.category === 'singleSeason')).toBe(true);
    expect(second.some((record) => record.category === 'singleSeason')).toBe(false);
    expect(game.records.singleSeason.passYds[0]?.value).toBe(4300);
  });

  it('treats players missing season stats as zero in record checks', () => {
    const game = makeLeagueState('regular_season', 4);
    game.records = createEmptyRecordBook();
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB') as { stats?: unknown };
    delete qb.stats;

    expect(() => detectBrokenRecords(game, [makeResult(game, 451)])).not.toThrow();
    expect(() => checkRecordChases(game)).not.toThrow();
    expect(getLeagueLeaders(game, 'passYds')).toEqual([]);
  });

  it('checks milestones once and stores durable milestone flags', () => {
    const game = makeLeagueState('regular_season', 7);
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    qb.careerStats.passYds = 20_500;
    qb.careerStats.passTD = 205;

    const first = checkMilestones(game);
    const second = checkMilestones(game);

    expect(first.map((entry) => entry.milestoneLabel)).toEqual(['10,000', '20,000', '100', '200']);
    expect(second).toHaveLength(0);
    expect(qb.traitMilestones[`historian:milestone:passYds:${MILESTONE_THRESHOLDS.passYds[1]}`]).toBe(true);
  });

  it('returns active milestone chases near the next threshold', () => {
    const game = makeLeagueState('regular_season', 10);
    const edge = game.teams.afce1.roster.find((player) => player.pos === 'DL')!;
    edge.careerStats.sacks = 96;

    const chases = getActiveMilestoneChases(game);

    expect(chases.some((chase) => chase.playerId === edge.id && chase.milestoneValue === 100)).toBe(true);
  });

  it('limits record holders to the requested count', () => {
    const game = makeLeagueState();
    game.records.singleSeason.passYds = [
      {
        category: 'singleSeason',
        stat: 'passYds',
        value: 5000,
        teamId: 'a',
        teamName: 'A',
        year: 2020,
        playerId: 'a',
        playerName: 'A QB',
      },
      {
        category: 'singleSeason',
        stat: 'passYds',
        value: 4800,
        teamId: 'b',
        teamName: 'B',
        year: 2021,
        playerId: 'b',
        playerName: 'B QB',
      },
    ];

    const holders = getRecordHolders(game.records, 'singleSeason', 'passYds', 1);

    expect(holders).toHaveLength(1);
    expect(holders[0]?.playerName).toBe('A QB');
  });

  it('builds current-season league leaders with position filters', () => {
    const game = makeLeagueState();
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    const otherQb = game.teams.afce2.roster.find((player) => player.pos === 'QB')!;
    qb.stats.passYds = 2800;
    qb.stats.gamesPlayed = 8;
    otherQb.stats.passYds = 2400;
    otherQb.stats.gamesPlayed = 8;

    const leaders = getLeagueLeaders(game, 'passYds', 'QB', 2);

    expect(leaders.map((entry) => entry.playerId)).toEqual([qb.id, otherQb.id]);
    expect(leaders[0]?.rank).toBe(1);
  });

  it('includes archived retired players in career leaders', () => {
    const game = makeLeagueState();
    const active = game.teams.afce1.roster.find((player) => player.pos === 'WR')!;
    active.careerStats.recYds = 8200;
    game.playerArchive.push({
      playerId: 'retired-star',
      firstName: 'Retired',
      lastName: 'Star',
      name: 'Retired Star',
      positions: ['WR'],
      jerseyNumber: 88,
      peakOvr: 95,
      peakYear: 2020,
      firstYear: 2015,
      lastYear: 2024,
      retirementYear: 2024,
      teamHistory: [{ teamId: 'afce2', firstYear: 2015, lastYear: 2024 }],
      careerStats: { seasons: 10, gp: 160, recYds: 9200 },
    });

    const leaders = getCareerLeaders(game, 'recYds', 2);

    expect(leaders[0]?.playerName).toBe('Retired Star');
    expect(leaders[0]?.isActive).toBe(false);
    expect(leaders[1]?.playerId).toBe(active.id);
  });

  it('projects season pace from current production', () => {
    const game = makeLeagueState();
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    qb.stats.passYds = 2400;

    const projection = getSeasonPaceProjection(qb, 'passYds', 8, 17);

    expect(projection.projected).toBe(5100);
    expect(projection.gamesRemaining).toBe(9);
  });

  it('generates deterministic narrative templates with the key details', () => {
    const recordText = generateRecordNarrative({
      playerId: 'p1',
      playerName: 'Dex Hale',
      teamId: 'afce1',
      stat: 'passYds',
      newValue: 5102,
      previousValue: 5000,
      previousHolder: 'Legacy QB',
      category: 'singleSeason',
      year: 2026,
      week: 18,
      narrative: '',
    });
    const milestoneText = generateMilestoneNarrative({
      playerId: 'p2',
      playerName: 'Mason Reed',
      stat: 'sacks',
      value: 101,
      milestoneLabel: '100',
      narrative: '',
      year: 2026,
      week: 12,
    });

    expect(recordText).toContain('Dex Hale');
    expect(recordText).toContain('5102');
    expect(milestoneText).toContain('Mason Reed');
    expect(milestoneText).toContain('100');
  });
});
