import { describe, expect, it } from 'vitest';
import { createEmptyRecordBook, updateCareerRecords, updateSeasonRecords, updateSingleGameRecords } from './records';
import { makeLeagueState } from './test-helpers';

describe('records system', () => {
  it('captures single-game records from a box score and keeps top entries sorted', () => {
    const game = makeLeagueState('regular_season', 1);
    game.records = createEmptyRecordBook();

    const passer = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    passer.stats.passYds = 0;

    updateSingleGameRecords(game, {
      year: 2026,
      week: 1,
      teamId: 'afce1',
      teamName: 'AFCE1 Club',
      entries: [
        { playerId: passer.id, playerName: passer.name, stat: 'passYds', value: 487, category: 'singleGame' },
      ],
    });

    expect(game.records.singleGame.passYds[0]?.value).toBe(487);
    expect(game.records.singleGame.passYds[0]?.playerId).toBe(passer.id);
  });

  it('updates season and career record books from persisted stats', () => {
    const game = makeLeagueState('offseason');
    game.records = createEmptyRecordBook();

    const receiver = game.teams.afce1.roster.find((player) => player.pos === 'WR')!;
    receiver.stats.recYds = 1642;
    receiver.stats.recTD = 14;
    receiver.careerStats.recYds = 8120;
    receiver.careerStats.gp = 118;

    game.teams.afce1.wins = 13;

    updateSeasonRecords(game, 2026);
    updateCareerRecords(game, 2026);

    expect(game.records.singleSeason.recYds[0]?.playerId).toBe(receiver.id);
    expect(game.records.career.recYds[0]?.playerId).toBe(receiver.id);
    expect(game.records.franchise.wins[0]?.teamId).toBe('afce1');
  });
});
