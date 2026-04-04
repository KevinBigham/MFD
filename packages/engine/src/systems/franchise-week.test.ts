import { describe, expect, it } from 'vitest';
import { advanceFranchiseWeek, seedPlayoffBracket } from '../index';
import { makeLeagueState } from './test-helpers';

describe('franchise week simulation', () => {
  it('moves preseason into regular season without consuming week 1', () => {
    const game = makeLeagueState('preseason', 1);
    const result = advanceFranchiseWeek(game);

    expect(result.nextState.phase).toBe('regular_season');
    expect(result.nextState.week).toBe(1);
    expect(result.nextState.schedule[0]!.games[0]!.result).toBeNull();
    expect(result.nextState.weekSummaries).toHaveLength(0);
  });

  it('simulates a deterministic league week and records one game-day package for the user team', () => {
    const game = makeLeagueState('regular_season', 1);

    const first = advanceFranchiseWeek(game);
    const second = advanceFranchiseWeek(structuredClone(game));

    expect(first.nextState.schedule[0]!.games.every((entry) => entry.result !== null)).toBe(true);
    expect(first.nextState.week).toBe(2);
    expect(first.nextState.weekSummaries).toHaveLength(1);
    expect(first.nextState.gameDayState.recentPackages).toHaveLength(1);
    expect(first.nextState.gameDayState.latestPackageId).toBe(first.nextState.gameDayState.recentPackages[0]!.id);
    expect(first.nextState.powerRankings).toHaveLength(Object.keys(first.nextState.teams).length);
    expect(first.nextState.records.singleGame.passYds.length).toBeGreaterThan(0);
    expect(first.nextState.weekSummaries).toEqual(second.nextState.weekSummaries);
    expect(first.nextState.gameDayState).toEqual(second.nextState.gameDayState);
    expect(first.nextState.powerRankings).toEqual(second.nextState.powerRankings);
    expect(first.nextState.records).toEqual(second.nextState.records);
    expect(first.nextState.narrativeState.hooks.length).toBeGreaterThan(0);

    const userTeam = first.nextState.teams.afce1;
    const activePlayers = userTeam.roster.filter((player) => player.stats.passAtt > 0 || player.stats.rushAtt > 0 || player.stats.targets > 0 || player.stats.tackles > 0);
    expect(activePlayers.some((player) => (player.careerStats.gp ?? 0) >= 52)).toBe(true);
  });

  it('generates broadcast data only for the user team game', () => {
    const game = makeLeagueState('regular_season', 1);

    const result = advanceFranchiseWeek(game);

    expect(result.nextState.schedule[0]!.games[0]!.result?.broadcast).toBeDefined();
    expect(result.nextState.schedule[0]!.games[1]!.result?.broadcast).toBeUndefined();
  });

  it('adds game-day and weekly buzz posts for the user-visible week', () => {
    const game = makeLeagueState('regular_season', 1);

    const result = advanceFranchiseWeek(game);

    expect(result.nextState.socialFeed.length).toBeGreaterThan(0);
    expect(result.nextState.socialFeed.some((post) => post.trigger === 'weekly')).toBe(true);
  });

  it('interrupts week 9 with the trade deadline before any games are simulated', () => {
    const game = makeLeagueState('regular_season', 9);
    game.schedule.unshift({
      week: 9,
      games: [
        { homeTeamId: 'afce1', awayTeamId: 'afce2', result: null, flexed: false, primetime: true, broadcastNetwork: 'MFN' },
      ],
    });
    game.teams.afce1.roster[2]!.tradeBlock = true;
    game.teams.afce1.wins = 7;
    game.teams.afce1.losses = 1;
    game.teams.afce2.wins = 2;
    game.teams.afce2.losses = 6;
    game.teams.afce2.gmStrategy = 'rebuild';
    game.teams.afce1.draftPicks = [{ round: 2, pick: 14, originalTeamId: 'afce1', currentTeamId: 'afce1', year: 2026, isCompPick: false }];
    game.teams.afce2.draftPicks = [{ round: 2, pick: 10, originalTeamId: 'afce2', currentTeamId: 'afce2', year: 2026, isCompPick: false }];

    const result = advanceFranchiseWeek(game);

    expect(result.nextState.tradeDeadlineState).toBeDefined();
    expect(result.nextState.week).toBe(9);
    expect(result.nextState.schedule[0]!.games[0]!.result).toBeNull();
  });

  it('continues the week 9 simulation after the deadline has already been resolved', () => {
    const game = makeLeagueState('regular_season', 9);
    game.eventLog.push({
      id: 'deadline-resolved-9',
      type: 'trade_deadline_resolved',
      timestamp: 9,
      description: 'Deadline already resolved.',
      data: { year: game.year, week: game.week },
    });

    const result = advanceFranchiseWeek(game);

    expect(result.nextState.tradeDeadlineState).toBeUndefined();
    expect(result.nextState.week).toBe(10);
  });

  it('seeds seven playoff teams per conference using standings tiebreakers', () => {
    const game = makeLeagueState('regular_season', 19);
    const records: Record<string, [number, number, number]> = {
      afce1: [13, 4, 120],
      afce2: [10, 7, 40],
      afcn1: [12, 5, 80],
      afcn2: [10, 7, 30],
      afcs1: [11, 6, 55],
      afcs2: [8, 9, -20],
      afcw1: [11, 6, 60],
      afcw2: [10, 7, 30],
      nfce1: [14, 3, 110],
      nfce2: [9, 8, 10],
      nfcn1: [12, 5, 70],
      nfcn2: [10, 7, 25],
      nfcs1: [11, 6, 50],
      nfcs2: [8, 9, -25],
      nfcw1: [11, 6, 50],
      nfcw2: [10, 7, 25],
    };

    for (const [teamId, [wins, losses, pointDifferential]] of Object.entries(records)) {
      game.teams[teamId]!.wins = wins;
      game.teams[teamId]!.losses = losses;
      game.teams[teamId]!.seasonStats.pointDifferential = pointDifferential;
    }

    const bracket = seedPlayoffBracket(game);

    expect(bracket.afc).toHaveLength(7);
    expect(bracket.nfc).toHaveLength(7);
    expect(bracket.afc[0]!.teamId).toBe('afce1');
    expect(bracket.afc[6]!.teamId).toBe('afcw2');
    expect(bracket.nfc[3]!.teamId).toBe('nfcw1');
    expect(bracket.nfc[5]!.teamId).toBe('nfcw2');
    expect(bracket.nfc[6]!.teamId).toBe('nfce2');
  });

  it('enters offseason with a populated re-sign window after the championship', () => {
    const game = makeLeagueState('playoffs', 22);
    game.playoffBracket = {
      season: 2026,
      afc: [],
      nfc: [],
      matchups: [],
      championTeamId: 'afce1',
    };
    game.teams.afce1.roster[0]!.contract!.years = 1;
    game.teams.afce1.roster[0]!.contract!.yearlyBreakdown = [
      game.teams.afce1.roster[0]!.contract!.yearlyBreakdown[0]!,
    ];

    const result = advanceFranchiseWeek(game);

    expect(result.nextState.phase).toBe('offseason');
    expect(result.nextState.year).toBe(2027);
    expect(result.nextState.week).toBe(1);
    expect(result.nextState.offseasonState).not.toBeNull();
    expect(result.nextState.offseasonState?.expiringPlayerIds).toContain(game.teams.afce1.roster[0]!.id);
    expect(result.nextState.freeAgents).not.toContain(game.teams.afce1.roster[0]!.id);
  });

  it('interrupts preseason progression when the cba is still negotiating', () => {
    const game = makeLeagueState('preseason', 1);
    game.cbaState.status = 'negotiating';
    game.cbaState.negotiationState = {
      round: 1,
      ownersProposal: null,
      playersProposal: null,
      currentProposal: null,
      gap: 42,
      mediator: false,
      publicPressure: 24,
      ownerVotes: {},
      userVote: null,
    };

    const result = advanceFranchiseWeek(game);

    expect(result.nextState.phase).toBe('preseason');
    expect(result.nextState.week).toBe(1);
    expect(result.nextState.weekSummaries).toHaveLength(0);
  });

  it('records labor unrest during the regular season when satisfaction collapses', () => {
    const game = makeLeagueState('regular_season', 4);
    game.cbaState.status = 'expiring';
    game.laborState.grievances.push({
      playerId: game.teams.afce1.roster[0]!.id,
      type: 'salary_grievance',
      filed: game.year,
      resolved: null,
      outcome: null,
    });
    for (const player of Object.values(game.players)) {
      player.morale = 12;
    }

    const result = advanceFranchiseWeek(game);

    expect(result.nextState.laborState.activeStoppage?.type).toBe('practice_boycott');
    expect(result.nextState.socialFeed.some((post) => post.trigger === 'labor')).toBe(true);
    expect(result.nextState.leagueNews.some((item) => item.type === 'labor')).toBe(true);
  });
});
