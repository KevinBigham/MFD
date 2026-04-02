import { describe, expect, it } from 'vitest';
import { makeLeagueState } from './test-helpers';
import { archiveSeasonHistory, recordPlayerRetirement, syncPlayerArchiveEntry } from './history';

describe('history system', () => {
  it('tracks player archive stints and peak OVR across seasons', () => {
    const game = makeLeagueState();
    const player = game.teams.afce1.roster[0]!;

    syncPlayerArchiveEntry(game, player, game.year);
    expect(game.playerArchive).toHaveLength(1);
    expect(game.playerArchive[0]).toMatchObject({
      playerId: player.id,
      peakOvr: player.ovr,
      peakYear: game.year,
      retirementYear: null,
    });
    expect(game.playerArchive[0]!.teamHistory).toEqual([
      { teamId: 'afce1', firstYear: game.year, lastYear: game.year },
    ]);

    game.year += 1;
    player.ovr += 4;
    syncPlayerArchiveEntry(game, player, game.year);
    expect(game.playerArchive[0]!.peakOvr).toBe(player.ovr);
    expect(game.playerArchive[0]!.peakYear).toBe(game.year);
    expect(game.playerArchive[0]!.teamHistory).toEqual([
      { teamId: 'afce1', firstYear: 2026, lastYear: 2027 },
    ]);

    game.year += 1;
    player.teamId = 'afce2';
    syncPlayerArchiveEntry(game, player, game.year);
    expect(game.playerArchive[0]!.teamHistory).toEqual([
      { teamId: 'afce1', firstYear: 2026, lastYear: 2027 },
      { teamId: 'afce2', firstYear: 2028, lastYear: 2028 },
    ]);
  });

  it('marks retired players in the archive without losing team history', () => {
    const game = makeLeagueState();
    const player = game.teams.afce1.roster[0]!;

    syncPlayerArchiveEntry(game, player, game.year);
    game.year += 1;
    recordPlayerRetirement(game, player, game.year);

    expect(game.playerArchive[0]!.retirementYear).toBe(2027);
    expect(game.playerArchive[0]!.lastYear).toBe(2027);
    expect(game.playerArchive[0]!.teamHistory).toEqual([
      { teamId: 'afce1', firstYear: 2026, lastYear: 2027 },
    ]);
  });

  it('archives one season row per team with final record and major events', () => {
    const game = makeLeagueState();
    game.year = 2029;
    game.teams.afce1.wins = 13;
    game.teams.afce1.losses = 4;
    game.teams.afce1.seasonStats.pointDifferential = 96;
    game.teams.afce2.wins = 6;
    game.teams.afce2.losses = 11;
    game.teams.afce2.seasonStats.pointDifferential = -54;
    game.playoffBracket = {
      season: 2029,
      afc: [],
      nfc: [],
      matchups: [],
      championTeamId: 'afce1',
    };
    game.eventLog.push({
      id: 'pivot-1',
      type: 'gm_strategy_shift',
      timestamp: game.year * 1000,
      description: 'Front office pivots to contend.',
      data: { teamId: 'afce1' },
    });
    game.eventLog.push({
      id: 'retire-1',
      type: 'player_retired',
      timestamp: game.year * 1000 + 1,
      description: 'Veteran captain retires.',
      data: { teamId: 'afce1' },
    });

    archiveSeasonHistory(game);

    const championSeason = game.franchiseHistory.find((entry) => entry.teamId === 'afce1' && entry.year === 2029);
    expect(championSeason).toMatchObject({
      record: '13-4',
      pointDifferential: 96,
      playoffFinish: 'champion',
    });
    expect(championSeason?.majorEvents).toEqual([
      'Won the championship.',
      'Front office pivots to contend.',
      'Veteran captain retires.',
    ]);

    const missedSeason = game.franchiseHistory.find((entry) => entry.teamId === 'afce2' && entry.year === 2029);
    expect(missedSeason).toMatchObject({
      record: '6-11',
      playoffFinish: 'missed_playoffs',
    });
  });
});
