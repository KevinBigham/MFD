import { describe, it, expect } from 'vitest';
import { validateGameState, assertGameStateValid } from './invariants';
import { makeLeagueState, makePlayer } from './test-helpers';

describe('invariants', () => {
  it('clean game state passes all checks', () => {
    const game = makeLeagueState();
    const result = validateGameState(game);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('detects NaN OVR rating', () => {
    const game = makeLeagueState();
    const playerId = Object.keys(game.players)[0]!;
    game.players[playerId]!.ovr = NaN;
    const result = validateGameState(game);
    expect(result.valid).toBe(false);
    const nanViolation = result.violations.find((v) => v.rule === 'rating_nan');
    expect(nanViolation).toBeDefined();
    expect(nanViolation!.severity).toBe('critical');
  });

  it('detects OVR out of bounds', () => {
    const game = makeLeagueState();
    const playerId = Object.keys(game.players)[0]!;
    game.players[playerId]!.ovr = 150;
    const result = validateGameState(game);
    const violation = result.violations.find((v) => v.rule === 'rating_bounds');
    expect(violation).toBeDefined();
  });

  it('detects duplicate player on multiple rosters', () => {
    const game = makeLeagueState();
    const teamIds = Object.keys(game.teams);
    const teamA = game.teams[teamIds[0]!]!;
    const teamB = game.teams[teamIds[1]!]!;
    // Put the same player on both rosters
    const dupePlayer = { ...teamA.roster[0]! };
    teamB.roster.push(dupePlayer);
    const result = validateGameState(game);
    const violation = result.violations.find((v) => v.rule === 'duplicate_player');
    expect(violation).toBeDefined();
    expect(violation!.severity).toBe('critical');
  });

  it('detects NaN cap values', () => {
    const game = makeLeagueState();
    const teamId = Object.keys(game.teams)[0]!;
    game.teams[teamId]!.capUsed = NaN;
    const result = validateGameState(game);
    const violation = result.violations.find((v) => v.rule === 'cap_nan');
    expect(violation).toBeDefined();
    expect(violation!.severity).toBe('critical');
  });

  it('detects player on roster but missing from game.players', () => {
    const game = makeLeagueState();
    const teamId = Object.keys(game.teams)[0]!;
    const team = game.teams[teamId]!;
    const ghostPlayer = makePlayer('ghost-player', teamId, 'QB', 80);
    team.roster.push(ghostPlayer);
    // Don't add to game.players — this is the bug
    const result = validateGameState(game);
    const violation = result.violations.find((v) => v.rule === 'player_sync');
    expect(violation).toBeDefined();
  });

  it('assertGameStateValid throws on critical violations', () => {
    const game = makeLeagueState();
    const playerId = Object.keys(game.players)[0]!;
    game.players[playerId]!.ovr = NaN;
    expect(() => assertGameStateValid(game)).toThrow('invariant violation');
  });

  it('assertGameStateValid does not throw on clean state', () => {
    const game = makeLeagueState();
    expect(() => assertGameStateValid(game)).not.toThrow();
  });
});
