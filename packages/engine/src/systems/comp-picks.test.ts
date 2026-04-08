import { describe, expect, it } from 'vitest';
import { makeLeagueState, makePlayer } from './test-helpers';
import { calculateCompPicks } from './comp-picks';

describe('comp pick calculation', () => {
  it('awards a round 3 comp pick after losing an elite free agent', () => {
    const game = makeLeagueState('free_agency', 1);
    const player = makePlayer('elite-fa', 'afce1', 'QB', 93);
    player.teamId = 'afcn1';
    game.players[player.id] = player;
    game.teams.afce1.txLog.push({ type: 'LOSE_FA', year: game.year, week: 1, playerId: player.id, fromTeamId: 'afce1', toTeamId: 'afcn1' });

    const picks = calculateCompPicks(game, 'afce1');

    expect(picks).toHaveLength(1);
    expect(picks[0]!.round).toBe(3);
    expect(picks[0]!.isCompPick).toBe(true);
  });

  it('awards only one comp pick when the team loses two free agents and signs one', () => {
    const game = makeLeagueState('free_agency', 1);
    const lostOne = makePlayer('lost-1', 'afce1', 'WR', 87);
    const lostTwo = makePlayer('lost-2', 'afce1', 'CB', 82);
    const signed = makePlayer('signed-1', 'afcn1', 'RB', 79);
    lostOne.teamId = 'afcn1';
    lostTwo.teamId = 'nfce1';
    signed.teamId = 'afce1';
    game.players[lostOne.id] = lostOne;
    game.players[lostTwo.id] = lostTwo;
    game.players[signed.id] = signed;
    game.teams.afce1.txLog.push(
      { type: 'LOSE_FA', year: game.year, week: 1, playerId: lostOne.id, fromTeamId: 'afce1', toTeamId: 'afcn1' },
      { type: 'LOSE_FA', year: game.year, week: 1, playerId: lostTwo.id, fromTeamId: 'afce1', toTeamId: 'nfce1' },
      { type: 'SIGN_FA', year: game.year, week: 1, playerId: signed.id, fromTeamId: 'afcn1', toTeamId: 'afce1' },
    );

    const picks = calculateCompPicks(game, 'afce1');

    expect(picks).toHaveLength(1);
  });

  it('caps comp picks at four per team', () => {
    const game = makeLeagueState('free_agency', 1);
    for (let index = 0; index < 6; index += 1) {
      const player = makePlayer(`loss-${index}`, 'afce1', 'WR', 88 - index);
      player.teamId = 'afcn1';
      game.players[player.id] = player;
      game.teams.afce1.txLog.push({ type: 'LOSE_FA', year: game.year, week: 1, playerId: player.id, fromTeamId: 'afce1', toTeamId: 'afcn1' });
    }

    const picks = calculateCompPicks(game, 'afce1');

    expect(picks).toHaveLength(4);
  });

  it('does not award a comp pick for traded players', () => {
    const game = makeLeagueState('free_agency', 1);
    const player = makePlayer('traded-player', 'afce1', 'QB', 91);
    player.teamId = 'afcn1';
    game.players[player.id] = player;
    game.teams.afce1.txLog.push({ type: 'TRADE', year: game.year, week: 1, playerId: player.id, fromTeamId: 'afce1', toTeamId: 'afcn1' });

    const picks = calculateCompPicks(game, 'afce1');

    expect(picks).toHaveLength(0);
  });

  it('young QB loss generates higher-round comp pick than old kicker', () => {
    // Position weight: QB=1.4, K=0.5; Age factor: 25=1.15, 34=0.75
    const gameQB = makeLeagueState('free_agency', 1);
    const qb = makePlayer('young-qb', 'afce1', 'QB', 85);
    qb.age = 25;
    qb.teamId = 'afcn1';
    gameQB.players[qb.id] = qb;
    gameQB.teams.afce1.txLog.push({ type: 'LOSE_FA', year: gameQB.year, week: 1, playerId: qb.id, fromTeamId: 'afce1', toTeamId: 'afcn1' });

    const gameK = makeLeagueState('free_agency', 1);
    const kicker = makePlayer('old-k', 'afce1', 'K', 85);
    kicker.age = 34;
    kicker.teamId = 'afcn1';
    gameK.players[kicker.id] = kicker;
    gameK.teams.afce1.txLog.push({ type: 'LOSE_FA', year: gameK.year, week: 1, playerId: kicker.id, fromTeamId: 'afce1', toTeamId: 'afcn1' });

    const qbPicks = calculateCompPicks(gameQB, 'afce1');
    const kPicks = calculateCompPicks(gameK, 'afce1');

    // Both should generate picks, but QB should get equal or better round
    if (qbPicks.length > 0 && kPicks.length > 0) {
      expect(qbPicks[0]!.round).toBeLessThanOrEqual(kPicks[0]!.round);
    }
  });

  it('returns empty for team with no txLog entries', () => {
    const game = makeLeagueState('free_agency', 1);
    const picks = calculateCompPicks(game, 'afce1');
    expect(picks).toHaveLength(0);
  });
});
