import { describe, expect, it } from 'vitest';
import type { GameResult, Player, TeamGameStats } from '../types';
import { makeLeagueState, makePlayer } from '../systems/test-helpers';
import { seedComebackPlayerThreads, closeComebackPlayerThread } from './archetypes/comeback-player';
import { seedHotSeatCoachThreads, closeHotSeatCoachThread } from './archetypes/hot-seat-coach';
import { seedQbControversyThreads, closeQbControversyThread } from './archetypes/qb-controversy';
import { seedRecordsChaseThreads, closeRecordsChaseThread } from './archetypes/records-chase';
import { seedRookieOfYearThreads, closeRookieOfYearThread } from './archetypes/rookie-of-year-chase';
import type { StorylineThread } from './types';

function makeCoach(id: string, tenure: number) {
  return {
    id,
    firstName: id,
    lastName: 'Coach',
    role: 'HC' as const,
    archetype: 'ceo',
    traits: [],
    skillTree: {},
    xp: 0,
    reputation: 65,
    tenure,
  };
}

function teamStats(): TeamGameStats {
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
    quarterScores: [7, 7, 7, 7],
    playerLines: [],
  };
}

function addQuarterbackGame(
  game: ReturnType<typeof makeLeagueState>,
  weekNumber: number,
  teamId: string,
  quarterback: Player,
  line: Partial<NonNullable<TeamGameStats['playerLines']>[number]>,
): void {
  let week = game.schedule.find((entry) => entry.week === weekNumber);
  if (!week) {
    week = { week: weekNumber, games: [] };
    game.schedule.push(week);
  }
  const opponentId = teamId === 'afce1' ? 'afce2' : 'afce1';
  const result: GameResult = {
    id: `${weekNumber}-${teamId}-${opponentId}`,
    homeTeamId: teamId,
    awayTeamId: opponentId,
    homeScore: 17,
    awayScore: 20,
    week: weekNumber,
    year: game.year,
    overtime: false,
    mvpPlayerId: null,
    stats: {
      [teamId]: {
        ...teamStats(),
        playerLines: [{
          playerId: quarterback.id,
          name: quarterback.name,
          pos: 'QB',
          passAtt: 32,
          passComp: 15,
          passYds: 160,
          passTD: 1,
          passINT: 2,
          ...line,
        }],
      },
      [opponentId]: teamStats(),
    },
    playerMatchupEvents: [],
  };
  week.games.push({
    homeTeamId: teamId,
    awayTeamId: opponentId,
    result,
    flexed: false,
    primetime: false,
    broadcastNetwork: null,
  });
}

function buildThread(overrides: Partial<StorylineThread>): StorylineThread {
  return {
    id: 'thread-1',
    key: 'thread-key',
    archetype: 'hot-seat-coach',
    title: 'Thread',
    summary: 'Summary',
    teamIds: ['afce1'],
    playerIds: [],
    startWeek: 6,
    startYear: 2026,
    weeksActive: 1,
    status: 'active',
    beats: [{ label: 'reported pressure', summary: 'Summary', weekNumber: 6, year: 2026 }],
    heat: 60,
    nextBeatHint: 'Next beat.',
    beatIndex: 0,
    updatedWeek: 6,
    updatedYear: 2026,
    closeReason: null,
    metadata: {},
    ...overrides,
  };
}

describe('storyline archetypes', () => {
  it('seeds hot-seat coach threads only for year-three coaches on losing skids', () => {
    const game = makeLeagueState('regular_season', 8);
    game.teams.afce1!.coachingStaff.hc = makeCoach('hot-seat', 3);
    game.teams.afce1!.streak = -3;
    game.teams.afce2!.coachingStaff.hc = makeCoach('safe', 2);
    game.teams.afce2!.streak = -4;

    const seeds = seedHotSeatCoachThreads(game, 8);
    expect(seeds).toHaveLength(1);
    expect(seeds[0]?.key).toContain('afce1');
  });

  it('closes hot-seat threads when an extension narrative lands', () => {
    const game = makeLeagueState('regular_season', 9);
    game.teams.afce1!.coachingStaff.hc = makeCoach('hot-seat', 4);
    game.teams.afce1!.wins = 6;
    game.teams.afce1!.losses = 3;
    game.teams.afce1!.streak = 2;

    const closed = closeHotSeatCoachThread(buildThread({
      metadata: { coachId: 'hot-seat', coachName: 'Hot Seat Coach' },
    }), game);

    expect(closed.status).toBe('closed');
    expect(closed.closeReason).toContain('extension');
  });

  it('seeds quarterback controversy threads when the starter slumps and the backup has more ceiling', () => {
    const game = makeLeagueState('regular_season', 8);
    const team = game.teams.afce1!;
    const starter = team.roster.find((player) => player.pos === 'QB')!;
    starter.isStarter = true;
    starter.pot = 82;
    const backup = makePlayer('afce1-backup', 'afce1', 'QB', 74, false);
    backup.pot = 92;
    backup.devTrait = 'superstar';
    team.roster.push(backup);
    game.players[backup.id] = backup;
    addQuarterbackGame(game, 5, team.id, starter, { passAtt: 34, passComp: 15, passYds: 155, passTD: 1, passINT: 2 });
    addQuarterbackGame(game, 6, team.id, starter, { passAtt: 31, passComp: 13, passYds: 148, passTD: 0, passINT: 2 });
    addQuarterbackGame(game, 7, team.id, starter, { passAtt: 29, passComp: 12, passYds: 133, passTD: 1, passINT: 3 });

    const seeds = seedQbControversyThreads(game, 8);
    expect(seeds).toHaveLength(1);
    expect(seeds[0]?.playerIds).toContain(backup.id);
  });

  it('closes quarterback controversy threads when the starter answers with a 100+ rating game', () => {
    const game = makeLeagueState('regular_season', 9);
    const team = game.teams.afce1!;
    const starter = team.roster.find((player) => player.pos === 'QB')!;
    const backup = makePlayer('afce1-backup', 'afce1', 'QB', 74, false);
    team.roster.push(backup);
    game.players[backup.id] = backup;
    addQuarterbackGame(game, 9, team.id, starter, { passAtt: 28, passComp: 24, passYds: 320, passTD: 3, passINT: 0 });

    const closed = closeQbControversyThread(buildThread({
      archetype: 'qb-controversy',
      playerIds: [starter.id, backup.id],
      metadata: {
        starterId: starter.id,
        starterName: starter.name,
        backupId: backup.id,
        backupName: backup.name,
        backupStartedWeeks: 0,
      },
    }), game);

    expect(closed.status).toBe('closed');
    expect(closed.closeReason).toContain('100+ passer-rating');
  });

  it('seeds rookie-of-year threads once a rookie clears the week-six threshold', () => {
    const game = makeLeagueState('regular_season', 8);
    const rookie = makePlayer('roy', 'afce1', 'WR', 80);
    const mentor = game.teams.afce1!.roster.find((player) => player.id !== rookie.id)!;
    rookie.yearsExp = 0;
    rookie.draftYear = game.year;
    rookie.stats.recYds = 920;
    rookie.stats.recTD = 8;
    game.teams.afce1!.roster.push(rookie);
    game.teams.afce1!.mentoringPairs = [{
      mentorId: mentor.id,
      mentorName: mentor.name,
      menteeId: rookie.id,
      menteeName: rookie.name,
      teamId: 'afce1',
      positionGroup: 'WR',
      year: game.year,
      bonus: 3,
    }];
    game.players[rookie.id] = rookie;
    const expectedRookieName = `${rookie.firstName} ${rookie.lastName}`;
    delete (rookie as Partial<Player>).name;

    const seeds = seedRookieOfYearThreads(game, 8);
    expect(seeds.map((seed) => seed.playerIds[0])).toContain('roy');
    const rookieSeed = seeds.find((seed) => seed.playerIds[0] === 'roy');
    expect(rookieSeed?.title).toContain(expectedRookieName);
    expect(rookieSeed?.summary).toContain(mentor.name);
    expect(rookieSeed?.metadata).toMatchObject({
      playerName: expectedRookieName,
      mentorId: mentor.id,
      mentorName: mentor.name,
      mentorBonus: 3,
    });
  });

  it('treats a normalized loaded-save rookie without live stats as scoreless', () => {
    const game = makeLeagueState('regular_season', 8);
    const rookie = makePlayer('loaded-rookie', 'afce1', 'WR', 80);
    rookie.yearsExp = 0;
    rookie.draftYear = game.year;
    delete (rookie as Partial<Player>).stats;
    game.players[rookie.id] = rookie;

    expect(seedRookieOfYearThreads(game, 8)).not.toContainEqual(
      expect.objectContaining({ playerIds: [rookie.id] }),
    );
  });

  it('closes rookie-of-year threads at season end', () => {
    const game = makeLeagueState('playoffs', 19);
    const closed = closeRookieOfYearThread(buildThread({
      archetype: 'rookie-of-year-chase',
      playerIds: ['roy'],
      metadata: { playerName: 'Roy Rookie' },
    }), game);

    expect(closed.status).toBe('closed');
    expect(closed.closeReason).toContain('regular season');
  });

  it('seeds record-chase threads from active pace projections', () => {
    const game = makeLeagueState('regular_season', 8);
    game.activeRecordChases = [{
      playerId: 'afce1-qb',
      playerName: 'Record Watch',
      teamId: 'afce1',
      stat: 'passYds',
      currentValue: 3200,
      recordValue: 4800,
      recordHolder: 'Old Record',
      pace: 400,
      category: 'franchise',
      weeksRemaining: 9,
      projected: 5200,
    }];

    const seeds = seedRecordsChaseThreads(game, 8);
    expect(seeds).toHaveLength(1);
  });

  it('closes record-chase threads when the record is broken', () => {
    const game = makeLeagueState('regular_season', 9);
    game.recentBrokenRecords = [{
      playerId: 'afce1-qb',
      playerName: 'Record Watch',
      teamId: 'afce1',
      stat: 'passYds',
      newValue: 5001,
      previousValue: 4800,
      previousHolder: 'Old Record',
      category: 'singleSeason',
      year: game.year,
      week: 9,
      narrative: 'Record broken',
    }];

    const closed = closeRecordsChaseThread(buildThread({
      archetype: 'records-chase',
      playerIds: ['afce1-qb'],
      metadata: { playerName: 'Record Watch', stat: 'passYds', category: 'franchise' },
    }), game);

    expect(closed.status).toBe('closed');
    expect(closed.closeReason).toContain('broke');
  });

  it('seeds comeback-player threads for recovered veterans with missed-time signals', () => {
    const game = makeLeagueState('regular_season', 8);
    const player = game.teams.afce1!.roster.find((entry) => entry.pos === 'RB')!;
    player.careerStats.previousSeasonOvr = 74;
    player.careerStats.seasonStartOvr = 79;
    player.careerStats.seasons = 5;
    player.careerStats.gp = 38;
    player.ovr = 81;

    const seeds = seedComebackPlayerThreads(game, 8);
    expect(seeds.map((seed) => seed.playerIds[0])).toContain(player.id);
  });

  it('closes comeback-player threads once the regular season ends', () => {
    const game = makeLeagueState('playoffs', 19);
    const closed = closeComebackPlayerThread(buildThread({
      archetype: 'comeback-player',
      playerIds: ['afce1-rb'],
      metadata: { playerName: 'Comeback Back' },
    }), game);

    expect(closed.status).toBe('closed');
    expect(closed.closeReason).toContain('regular season');
  });
});
