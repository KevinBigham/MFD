import { describe, expect, it } from 'vitest';
import type { Team } from '../types';
import { finalizeDeadline } from '../index';
import { advanceFranchiseWeek } from './franchise-week';
import { makeLeagueState, makePlayer } from './test-helpers';

function setCoach(team: Team, id: string, tenure: number): void {
  team.coachingStaff.hc = {
    id,
    firstName: id,
    lastName: 'Coach',
    role: 'HC',
    archetype: 'ceo',
    traits: [],
    skillTree: {},
    xp: 0,
    reputation: 65,
    tenure,
  };
}

function setRosterOvr(team: Team, ovr: number): void {
  for (const player of team.roster) {
    player.ovr = ovr;
    player.pot = ovr + 4;
  }
}

function onlyGame(game: ReturnType<typeof makeLeagueState>, weekNumber: number, homeTeamId: string, awayTeamId: string): void {
  game.schedule = [{
    week: weekNumber,
    games: [{
      homeTeamId,
      awayTeamId,
      result: null,
      flexed: false,
      primetime: false,
      broadcastNetwork: null,
    }],
  }];
}

describe('franchise week media-cycle integration', () => {
  it('adds a weekly digest and ranking snapshot after a regular-season tick', () => {
    const game = makeLeagueState('regular_season', 1);
    const result = advanceFranchiseWeek(game);

    expect(result.nextState.mediaCycle.weeklyDigests).toHaveLength(1);
    expect(result.nextState.mediaCycle.powerRankingHistory).toHaveLength(1);
    expect(result.nextState.powerRankings.length).toBeGreaterThan(0);
  });

  it('stores the played week number on the digest and snapshot', () => {
    const game = makeLeagueState('regular_season', 4);
    const result = advanceFranchiseWeek(game);

    expect(result.nextState.mediaCycle.weeklyDigests[0]?.weekNumber).toBe(4);
    expect(result.nextState.mediaCycle.powerRankingHistory[0]?.weekNumber).toBe(4);
  });

  it('accumulates digests across multiple simulated weeks', () => {
    let state = makeLeagueState('regular_season', 1);
    state = advanceFranchiseWeek(state).nextState;
    state = advanceFranchiseWeek(state).nextState;
    state = advanceFranchiseWeek(state).nextState;

    expect(state.mediaCycle.weeklyDigests).toHaveLength(3);
    expect(state.mediaCycle.powerRankingHistory).toHaveLength(3);
  });

  it('grows power ranking history monotonically', () => {
    let state = makeLeagueState('regular_season', 1);
    for (let index = 0; index < 4; index += 1) {
      state = advanceFranchiseWeek(state).nextState;
    }

    expect(state.mediaCycle.powerRankingHistory.map((snapshot) => snapshot.weekNumber)).toEqual([1, 2, 3, 4]);
  });

  it('does not create digests during the preseason setup tick', () => {
    const game = makeLeagueState('preseason', 1);
    const result = advanceFranchiseWeek(game);

    expect(result.nextState.mediaCycle.weeklyDigests).toEqual([]);
    expect(result.nextState.mediaCycle.powerRankingHistory).toEqual([]);
  });

  it('seeds hot-seat coach storylines under the right regular-season conditions', () => {
    const game = makeLeagueState('regular_season', 8);
    onlyGame(game, 8, 'afce1', 'afce2');
    setCoach(game.teams.afce1!, 'hot-seat', 4);
    game.teams.afce1!.streak = -3;
    setRosterOvr(game.teams.afce1!, 55);
    setRosterOvr(game.teams.afce2!, 95);

    const result = advanceFranchiseWeek(game);

    expect(result.nextState.storylineThreads.some((thread) => thread.archetype === 'hot-seat-coach')).toBe(true);
  });

  it('seeds rookie-of-year chase storylines from season production', () => {
    const game = makeLeagueState('regular_season', 8);
    onlyGame(game, 8, 'afce1', 'afce2');
    const rookie = makePlayer('roy', 'afce1', 'WR', 80);
    rookie.yearsExp = 0;
    rookie.draftYear = game.year;
    rookie.stats.recYds = 980;
    rookie.stats.recTD = 9;
    game.teams.afce1!.roster.push(rookie);
    game.players[rookie.id] = rookie;

    const result = advanceFranchiseWeek(game);

    expect(result.nextState.storylineThreads.some((thread) => thread.archetype === 'rookie-of-year-chase')).toBe(true);
  });

  it('seeds record-chase storylines from active record pace data', () => {
    const game = makeLeagueState('regular_season', 8);
    onlyGame(game, 8, 'afce1', 'afce2');
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

    const result = advanceFranchiseWeek(game);

    expect(result.nextState.storylineThreads.some((thread) => thread.archetype === 'records-chase')).toBe(true);
  });

  it('seeds threads after advancing existing ones, leaving new seeds at beat zero', () => {
    const game = makeLeagueState('regular_season', 8);
    onlyGame(game, 8, 'afce1', 'afce2');
    const rookie = makePlayer('roy', 'afce1', 'WR', 80);
    rookie.yearsExp = 0;
    rookie.draftYear = game.year;
    rookie.stats.recYds = 980;
    rookie.stats.recTD = 9;
    game.teams.afce1!.roster.push(rookie);
    game.players[rookie.id] = rookie;
    game.storylineThreads = [{
      id: 'existing',
      key: 'existing',
      archetype: 'hot-seat-coach',
      title: 'Existing',
      summary: 'Existing',
      teamIds: ['afce1'],
      playerIds: [],
      startWeek: 7,
      startYear: game.year,
      weeksActive: 1,
      status: 'active',
      beats: [{ label: 'reported pressure', summary: 'Existing', weekNumber: 7, year: game.year }],
      heat: 60,
      nextBeatHint: 'Next beat: GM meeting.',
      beatIndex: 0,
      updatedWeek: 7,
      updatedYear: game.year,
      closeReason: null,
      metadata: { coachId: 'hot-seat', coachName: 'Hot Seat Coach' },
    }];
    setCoach(game.teams.afce1!, 'hot-seat', 4);
    game.teams.afce1!.streak = -3;

    const result = advanceFranchiseWeek(game);
    const rookieThread = result.nextState.storylineThreads.find((thread) => thread.archetype === 'rookie-of-year-chase')!;

    expect(rookieThread.beatIndex).toBe(0);
    expect(rookieThread.beats).toHaveLength(1);
  });

  it('accumulates a full regular-season archive without timing out', { timeout: 15_000 }, () => {
    let state = makeLeagueState('preseason', 1);
    state = advanceFranchiseWeek(state).nextState;
    let guard = 0;

    while (state.phase === 'regular_season' && guard < 64) {
      if (state.tradeDeadlineState) {
        const resolved = finalizeDeadline(state, state.tradeDeadlineState);
        resolved.eventLog.push({
          id: `deadline-resolved-${resolved.year}-${resolved.week}`,
          type: 'trade_deadline_resolved',
          timestamp: guard,
          description: 'Deadline auto-resolved for media-cycle integration coverage.',
          data: { year: resolved.year, week: resolved.week },
        });
        state = advanceFranchiseWeek(resolved).nextState;
      } else {
        state = advanceFranchiseWeek(state).nextState;
      }
      guard += 1;
    }

    expect(guard).toBeLessThan(64);
    expect(state.mediaCycle.weeklyDigests).toHaveLength(18);
    expect(state.mediaCycle.powerRankingHistory).toHaveLength(18);
  });
});
