import { describe, it, expect } from 'vitest';
import { applyRuleChange, initLeagueRules } from './league-rules';
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

  it('detects roster players whose global team id points somewhere else', () => {
    const game = makeLeagueState();
    const [teamId, otherTeamId] = Object.keys(game.teams);
    const team = game.teams[teamId!]!;
    const player = team.roster[0]!;
    game.players[player.id] = { ...player, teamId: otherTeamId! };

    const result = validateGameState(game);

    const violation = result.violations.find((v) =>
      v.rule === 'player_team_sync' &&
      v.context?.playerId === player.id &&
      v.context?.rosterTeamId === teamId
    );
    expect(violation).toMatchObject({
      severity: 'high',
      context: { globalTeamId: otherTeamId },
    });
  });

  it('detects global players with team ids but no matching team pool', () => {
    const game = makeLeagueState();
    const teamId = Object.keys(game.teams)[0]!;
    const stalePlayer = makePlayer('stale-team-player', teamId, 'WR', 70, false);
    game.players[stalePlayer.id] = stalePlayer;

    const result = validateGameState(game);

    const violation = result.violations.find((v) =>
      v.rule === 'player_pool_sync' &&
      v.context?.playerId === stalePlayer.id
    );
    expect(violation).toMatchObject({
      severity: 'high',
      context: { globalTeamId: teamId, rosterTeamId: null, practiceTeamId: null },
    });
  });

  it('detects free-agent and waiver players that still belong to a team pool', () => {
    const game = makeLeagueState();
    const teamId = Object.keys(game.teams)[0]!;
    const team = game.teams[teamId]!;
    const rosterPlayer = team.roster[0]!;
    const waiverPlayer = makePlayer('bad-waiver-pool-player', teamId, 'CB', 69, false);
    game.players[waiverPlayer.id] = waiverPlayer;

    game.freeAgents.push(rosterPlayer.id);
    game.waiverWire.push({
      playerId: waiverPlayer.id,
      releasedByTeamId: teamId,
      createdYear: game.year,
      createdWeek: game.week,
      expiresYear: game.year,
      expiresWeek: game.week + 1,
    });

    const result = validateGameState(game);

    expect(result.violations.some((v) =>
      v.rule === 'player_pool_sync' &&
      v.context?.playerId === rosterPlayer.id &&
      v.message.includes('team pool and an external acquisition pool')
    )).toBe(true);
    expect(result.violations.some((v) =>
      v.rule === 'player_pool_sync' &&
      v.context?.playerId === waiverPlayer.id &&
      v.message.includes('Waiver-wire player')
    )).toBe(true);
  });

  it('allows elevated practice-squad players to also appear on the active roster', () => {
    const game = makeLeagueState();
    const teamId = Object.keys(game.teams)[0]!;
    const team = game.teams[teamId]!;
    const player = makePlayer('elevated-practice-player', teamId, 'WR', 67, false);
    game.players[player.id] = player;
    team.practiceSquad.push({ playerId: player.id, elevationsUsed: 1, maxElevations: 3, isElevated: true, elevatedWeek: game.week });
    team.roster.push(player);

    const result = validateGameState(game);

    expect(result.violations.filter((v) => v.context?.playerId === player.id)).toEqual([]);
  });

  it('detects non-elevated practice-squad players that also appear on the active roster', () => {
    const game = makeLeagueState();
    const teamId = Object.keys(game.teams)[0]!;
    const team = game.teams[teamId]!;
    const player = makePlayer('non-elevated-practice-player', teamId, 'WR', 67, false);
    game.players[player.id] = player;
    team.practiceSquad.push({ playerId: player.id, elevationsUsed: 0, maxElevations: 3 });
    team.roster.push(player);

    const result = validateGameState(game);

    const violation = result.violations.find((v) =>
      v.rule === 'player_pool_sync' &&
      v.context?.playerId === player.id &&
      v.message.includes('without a matching elevation')
    );
    expect(violation).toMatchObject({
      severity: 'high',
      context: { rosterTeamId: teamId, practiceTeamId: teamId, isElevated: false },
    });
  });

  it('uses the active roster limit rule for roster-size violations', () => {
    const game = makeLeagueState();
    game.leagueRules = applyRuleChange(initLeagueRules(game.year), {
      key: 'roster_limit',
      newValue: 50,
      source: 'commissioner_vote',
      proposedBy: 'commissioner',
      effectiveYear: game.year,
      rationale: 'Trim active roster size.',
    });
    const teamId = Object.keys(game.teams)[0]!;
    const team = game.teams[teamId]!;
    team.roster = Array.from({ length: 51 }, (_, index) => makePlayer(`rule-limit-${index}`, teamId, 'WR', 65, false));
    for (const player of team.roster) {
      game.players[player.id] = player;
    }

    const result = validateGameState(game);

    const violation = result.violations.find((entry) => entry.rule === 'roster_size');
    expect(violation).toMatchObject({
      severity: 'high',
      context: { teamId, actual: 51, max: 50 },
    });
    expect(violation?.message).toContain('max 50');
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
