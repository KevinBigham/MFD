import { describe, expect, it } from 'vitest';
import type { ConditionalPick, DraftPick, GameState } from '../types';
import { makeLeagueState, makePlayer } from './test-helpers';
import { resolveConditions } from './conditional-picks';

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
});
