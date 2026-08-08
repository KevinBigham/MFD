import { describe, expect, it } from 'vitest';
import type { ConditionalPick, DraftPick, GameState } from '../types';
import { makeLeagueState, makePlayer } from './test-helpers';
import { resolveConditions, conditionalPickExpectedValue } from './conditional-picks';

function makeConditionalPick(overrides: Partial<ConditionalPick> = {}): ConditionalPick {
  const basePick: DraftPick = {
    round: 4,
    pick: 12,
    originalTeamId: 'afce1',
    currentTeamId: 'afcn1',
    year: 2027,
    isCompPick: false,
  };

  return {
    id: overrides.id ?? 'conditional-1',
    fromTeamId: overrides.fromTeamId ?? 'afce1',
    toTeamId: overrides.toTeamId ?? 'afcn1',
    playerId: overrides.playerId ?? 'tracked-player',
    basePick: overrides.basePick ?? basePick,
    condition: overrides.condition ?? {
      type: 'starts',
      playerId: 'tracked-player',
      threshold: 12,
      upgradeRound: 3,
    },
    resolvedPick: overrides.resolvedPick ?? null,
    resolved: overrides.resolved ?? false,
    description: overrides.description ?? '2027 4th becomes a 3rd if tracked-player starts 12 games',
  };
}

function addTrackedPlayer(game: GameState, starts: number): void {
  const player = makePlayer('tracked-player', 'afcn1', 'QB', 82);
  player.stats.starts = starts;
  player.stats.gamesPlayed = starts;
  game.players[player.id] = player;
  game.teams.afcn1.roster.push(player);
}

describe('conditional picks', () => {
  it('upgrades the pick round when the condition is met', () => {
    const game = makeLeagueState('offseason', 1);
    addTrackedPlayer(game, 13);
    game.conditionalPicks = [makeConditionalPick()];

    resolveConditions(game);

    expect(game.conditionalPicks[0]!.resolved).toBe(true);
    expect(game.conditionalPicks[0]!.resolvedPick?.round).toBe(3);
  });

  it('keeps the original pick when the condition is not met', () => {
    const game = makeLeagueState('offseason', 1);
    addTrackedPlayer(game, 10);
    game.conditionalPicks = [makeConditionalPick()];

    resolveConditions(game);

    expect(game.conditionalPicks[0]!.resolved).toBe(true);
    expect(game.conditionalPicks[0]!.resolvedPick?.round).toBe(4);
  });

  it('resolves multiple conditional picks independently', () => {
    const game = makeLeagueState('offseason', 1);
    addTrackedPlayer(game, 13);
    const secondPlayer = makePlayer('second-player', 'nfce1', 'RB', 79);
    secondPlayer.stats.gamesPlayed = 5;
    game.players[secondPlayer.id] = secondPlayer;
    game.teams.nfce1.roster.push(secondPlayer);
    game.conditionalPicks = [
      makeConditionalPick(),
      makeConditionalPick({
        id: 'conditional-2',
        playerId: secondPlayer.id,
        fromTeamId: 'nfce1',
        toTeamId: 'nfcw1',
        condition: { type: 'games_played', playerId: secondPlayer.id, threshold: 8, upgradeRound: 5 },
      }),
    ];

    resolveConditions(game);

    expect(game.conditionalPicks[0]!.resolvedPick?.round).toBe(3);
    expect(game.conditionalPicks[1]!.resolvedPick?.round).toBe(4);
  });

  it('marks all resolved picks as resolved', () => {
    const game = makeLeagueState('offseason', 1);
    addTrackedPlayer(game, 12);
    game.conditionalPicks = [makeConditionalPick()];

    resolveConditions(game);

    expect(game.conditionalPicks.every((pick) => pick.resolved)).toBe(true);
  });

  it('computes probability-weighted expected values matching exact economic curve', () => {
    const basePick: DraftPick = { round: 5, pick: 1, originalTeamId: 't1', currentTeamId: 't1', year: 2027, isCompPick: false };
    const condPick = makeConditionalPick({
      basePick,
      condition: { type: 'games_played', playerId: 'tracked-player', threshold: 10, upgradeRound: 2 },
    });

    const game = makeLeagueState('offseason', 1);

    // Test 100% resolved met boundary => expected value === 580 (Round 2 pick #1)
    const metPick = makeConditionalPick({
      basePick,
      condition: { type: 'starts', playerId: 'tracked-player', threshold: 10, upgradeRound: 2 },
      resolved: true,
      resolvedPick: { ...basePick, round: 2 },
    });
    const metVal = conditionalPickExpectedValue(metPick, game);
    expect(metVal).toBe(580);

    // Test 0% resolved unmet boundary => expected value === 60 (Round 5 pick #1)
    const unmetPick = makeConditionalPick({
      basePick,
      condition: { type: 'starts', playerId: 'tracked-player', threshold: 10, upgradeRound: 2 },
      resolved: true,
      resolvedPick: { ...basePick, round: 5 },
    });
    const unmetVal = conditionalPickExpectedValue(unmetPick, game);
    expect(unmetVal).toBe(60);

    // Monotonicity assertion: expected value must increase monotonically with player progress
    let prevVal = 0;
    for (let starts = 0; starts <= 10; starts++) {
      addTrackedPlayer(game, starts);
      const val = conditionalPickExpectedValue(condPick, game);
      expect(val).toBeGreaterThanOrEqual(prevVal);
      prevVal = val;
    }
  });

  it('maintains strict CPU vs User symmetry for conditional pick valuation', () => {
    const game = makeLeagueState('offseason', 1);
    addTrackedPlayer(game, 5);
    const condPick = makeConditionalPick();

    game.teams.afcn1.isUser = true;
    const userVal = conditionalPickExpectedValue(condPick, game);

    game.teams.afcn1.isUser = false;
    const cpuVal = conditionalPickExpectedValue(condPick, game);

    expect(userVal).toBe(cpuVal);
  });
});
