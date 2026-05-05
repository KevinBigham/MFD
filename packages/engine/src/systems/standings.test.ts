import { describe, expect, it } from 'vitest';
import {
  buildPlayoffPicture,
  getClinchedStatus,
  getDivisionStandings,
  getStatLeaders,
} from './standings';
import { makeLeagueState } from './test-helpers';

describe('standings helpers', () => {
  it('sorts division standings using win pct then point differential', () => {
    const game = makeLeagueState('regular_season', 10);
    game.teams.afce1.wins = 8;
    game.teams.afce1.losses = 1;
    game.teams.afce1.seasonStats.pointsFor = 260;
    game.teams.afce1.seasonStats.pointsAgainst = 180;
    game.teams.afce1.seasonStats.pointDifferential = 80;
    game.teams.afce2.wins = 8;
    game.teams.afce2.losses = 1;
    game.teams.afce2.seasonStats.pointsFor = 220;
    game.teams.afce2.seasonStats.pointsAgainst = 190;
    game.teams.afce2.seasonStats.pointDifferential = 30;

    const division = getDivisionStandings(game, 'AFC', 'East');

    expect(division[0]?.teamId).toBe('afce1');
    expect(division[1]?.teamId).toBe('afce2');
  });

  it('builds seven playoff seeds per conference', () => {
    const game = makeLeagueState('regular_season', 18);
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

    for (const [teamId, [wins, losses, diff]] of Object.entries(records)) {
      game.teams[teamId]!.wins = wins;
      game.teams[teamId]!.losses = losses;
      game.teams[teamId]!.seasonStats.pointDifferential = diff;
    }

    const picture = buildPlayoffPicture(game);

    expect(picture.afc).toHaveLength(7);
    expect(picture.nfc).toHaveLength(7);
    expect(picture.afc[0]?.teamId).toBe('afce1');
    expect(picture.nfc[0]?.teamId).toBe('nfce1');
  });

  it('marks clinched and eliminated teams under the simplified tiebreak model', () => {
    const game = makeLeagueState('regular_season', 18);
    game.teams.afce1.wins = 17;
    game.teams.afce1.losses = 0;
    game.teams.afce2.wins = 2;
    game.teams.afce2.losses = 15;
    game.teams.afcn1.wins = 12;
    game.teams.afcn1.losses = 5;
    game.teams.afcn2.wins = 11;
    game.teams.afcn2.losses = 6;
    game.teams.afcs1.wins = 10;
    game.teams.afcs1.losses = 7;
    game.teams.afcs2.wins = 9;
    game.teams.afcs2.losses = 8;
    game.teams.afcw1.wins = 8;
    game.teams.afcw1.losses = 9;
    game.teams.afcw2.wins = 7;
    game.teams.afcw2.losses = 10;

    expect(getClinchedStatus(game, 'afce1')).toBe('X');
    expect(getClinchedStatus(game, 'afce2')).toBe('E');
  });

  it('produces stat leaders from player season totals', () => {
    const game = makeLeagueState('regular_season', 10);
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    const rb = game.teams.afce1.roster.find((player) => player.pos === 'RB')!;
    const wr = game.teams.afce1.roster.find((player) => player.pos === 'WR')!;
    const dl = game.teams.afce1.roster.find((player) => player.pos === 'DL')!;
    const cb = game.teams.afce1.roster.find((player) => player.pos === 'CB')!;
    qb.stats.passYds = 3100;
    rb.stats.rushYds = 1200;
    wr.stats.recYds = 1450;
    dl.stats.sacks = 11;
    cb.stats.defINT = 5;

    const leaders = getStatLeaders(game);

    expect(leaders.passYds[0]?.playerId).toBe(qb.id);
    expect(leaders.passYds[0]?.teamName).toBe('AFCE1 Club');
    expect(leaders.rushYds[0]?.playerId).toBe(rb.id);
    expect(leaders.recYds[0]?.playerId).toBe(wr.id);
    expect(leaders.sacks[0]?.playerId).toBe(dl.id);
    expect(leaders.defINT[0]?.playerId).toBe(cb.id);
  });

  it('returns empty stat leader buckets when no players have positive totals', () => {
    const game = makeLeagueState('regular_season', 10);

    const leaders = getStatLeaders(game);

    expect(leaders.passYds).toEqual([]);
    expect(leaders.rushYds).toEqual([]);
    expect(leaders.recYds).toEqual([]);
    expect(leaders.sacks).toEqual([]);
    expect(leaders.defINT).toEqual([]);
  });

  it('treats players with missing season stats as zero for leader boards', () => {
    const game = makeLeagueState('regular_season', 10);
    const player = game.teams.afce1.roster[0] as { stats?: unknown };
    delete player.stats;

    const leaders = getStatLeaders(game);

    expect(leaders.passYds).toEqual([]);
    expect(leaders.rushYds).toEqual([]);
    expect(leaders.recYds).toEqual([]);
    expect(leaders.sacks).toEqual([]);
    expect(leaders.defINT).toEqual([]);
  });

  it('treats players with stale team ids as free agents in leader boards', () => {
    const game = makeLeagueState('regular_season', 10);
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    qb.stats.passYds = 4200;
    qb.teamId = 'ghost-team';

    const leaders = getStatLeaders(game);

    expect(leaders.passYds[0]).toMatchObject({
      playerId: qb.id,
      teamId: 'ghost-team',
      teamName: 'Free Agent',
      value: 4200,
    });
  });
});
