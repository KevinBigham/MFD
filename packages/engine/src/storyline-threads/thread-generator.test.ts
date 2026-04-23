import { describe, expect, it } from 'vitest';
import { makeLeagueState, makePlayer } from '../systems/test-helpers';
import { seedThreadsForWeek } from './thread-generator';

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
    reputation: 60,
    tenure,
  };
}

describe('storyline thread generation', () => {
  it('seeds hot-seat threads into the top-level state list', () => {
    const game = makeLeagueState('regular_season', 8);
    game.teams.afce1!.coachingStaff.hc = makeCoach('hot-seat', 3);
    game.teams.afce1!.streak = -3;

    const threads = seedThreadsForWeek(game, 8);
    expect(threads.some((thread) => thread.archetype === 'hot-seat-coach')).toBe(true);
  });

  it('seeds rookie-of-year threads after week six', () => {
    const game = makeLeagueState('regular_season', 8);
    const rookie = makePlayer('roy', 'afce1', 'WR', 80);
    rookie.yearsExp = 0;
    rookie.draftYear = game.year;
    rookie.stats.recYds = 900;
    rookie.stats.recTD = 9;
    game.teams.afce1!.roster.push(rookie);
    game.players[rookie.id] = rookie;

    const threads = seedThreadsForWeek(game, 8);
    expect(threads.some((thread) => thread.archetype === 'rookie-of-year-chase')).toBe(true);
  });

  it('seeds record-chase threads from active chases', () => {
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

    const threads = seedThreadsForWeek(game, 8);
    expect(threads.some((thread) => thread.archetype === 'records-chase')).toBe(true);
  });

  it('seeds comeback-player threads for eligible veterans', () => {
    const game = makeLeagueState('regular_season', 8);
    const player = game.teams.afce1!.roster.find((entry) => entry.pos === 'RB')!;
    player.careerStats.previousSeasonOvr = 72;
    player.careerStats.seasonStartOvr = 78;
    player.careerStats.seasons = 4;
    player.careerStats.gp = 30;
    player.ovr = 80;

    const threads = seedThreadsForWeek(game, 8);
    expect(threads.some((thread) => thread.archetype === 'comeback-player')).toBe(true);
  });

  it('dedupes threads by stable key', () => {
    const game = makeLeagueState('regular_season', 8);
    game.teams.afce1!.coachingStaff.hc = makeCoach('hot-seat', 3);
    game.teams.afce1!.streak = -3;
    const first = seedThreadsForWeek(game, 8);
    game.storylineThreads = first;

    const second = seedThreadsForWeek(game, 8);
    expect(second).toHaveLength(first.length);
  });

  it('stamps required presentation fields for the web track', () => {
    const game = makeLeagueState('regular_season', 8);
    game.teams.afce1!.coachingStaff.hc = makeCoach('hot-seat', 3);
    game.teams.afce1!.streak = -3;

    const thread = seedThreadsForWeek(game, 8)[0]!;
    expect(thread.heat).toBeGreaterThan(0);
    expect(thread.nextBeatHint).not.toBeNull();
  });

  it('keeps seed order deterministic across repeated calls', () => {
    const game = makeLeagueState('regular_season', 8);
    game.teams.afce1!.coachingStaff.hc = makeCoach('hot-seat', 3);
    game.teams.afce1!.streak = -3;
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

    expect(seedThreadsForWeek(game, 8)).toEqual(seedThreadsForWeek(game, 8));
  });
});
