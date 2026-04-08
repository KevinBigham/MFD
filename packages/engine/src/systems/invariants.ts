/**
 * MFD Game State Invariant Validator
 *
 * Runtime assertions that catch corrupted state early.
 * Call validateGameState() in tests or dev mode after major state transitions.
 */

import { ROSTER_CAP } from '../config/cap-math';
import type { GameState, Player } from '../types';

// ── Types ─────────────────────────────────────────────────

export interface InvariantViolation {
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  context?: Record<string, unknown>;
}

export interface InvariantResult {
  valid: boolean;
  violations: InvariantViolation[];
}

// ── Invariant Checks ──────────────────────────────────────

function checkRosterSize(game: GameState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  for (const [teamId, team] of Object.entries(game.teams)) {
    if (team.roster.length > ROSTER_CAP) {
      violations.push({
        rule: 'roster_size',
        severity: 'high',
        message: `Team ${teamId} has ${team.roster.length} players (max ${ROSTER_CAP})`,
        context: { teamId, actual: team.roster.length, max: ROSTER_CAP },
      });
    }
  }
  return violations;
}

function checkRatingBounds(game: GameState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  for (const [playerId, player] of Object.entries(game.players)) {
    if (typeof player.ovr !== 'number' || Number.isNaN(player.ovr)) {
      violations.push({
        rule: 'rating_nan',
        severity: 'critical',
        message: `Player ${playerId} has NaN/invalid OVR: ${player.ovr}`,
        context: { playerId, ovr: player.ovr },
      });
    } else if (player.ovr < 0 || player.ovr > 99) {
      violations.push({
        rule: 'rating_bounds',
        severity: 'medium',
        message: `Player ${playerId} OVR out of bounds: ${player.ovr}`,
        context: { playerId, ovr: player.ovr },
      });
    }
  }
  return violations;
}

function checkUniquePlayerAssignment(game: GameState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const seen = new Map<string, string>(); // playerId -> teamId

  for (const [teamId, team] of Object.entries(game.teams)) {
    for (const player of team.roster) {
      const existing = seen.get(player.id);
      if (existing) {
        violations.push({
          rule: 'duplicate_player',
          severity: 'critical',
          message: `Player ${player.id} (${player.name}) on both ${existing} and ${teamId}`,
          context: { playerId: player.id, teams: [existing, teamId] },
        });
      }
      seen.set(player.id, teamId);
    }
  }
  return violations;
}

function checkStandingsConsistency(game: GameState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  for (const [teamId, team] of Object.entries(game.teams)) {
    const gp = (team.wins ?? 0) + (team.losses ?? 0) + (team.ties ?? 0);
    if (gp > 0 && game.phase === 'regular_season') {
      // Games played should never exceed the week number
      if (gp > game.week) {
        violations.push({
          rule: 'standings_integrity',
          severity: 'high',
          message: `Team ${teamId} has ${gp} games in week ${game.week}`,
          context: { teamId, wins: team.wins, losses: team.losses, ties: team.ties, week: game.week },
        });
      }
    }
  }
  return violations;
}

function checkCapSanity(game: GameState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  for (const [teamId, team] of Object.entries(game.teams)) {
    if (typeof team.capUsed !== 'number' || Number.isNaN(team.capUsed)) {
      violations.push({
        rule: 'cap_nan',
        severity: 'critical',
        message: `Team ${teamId} has NaN capUsed`,
        context: { teamId },
      });
    }
    if (typeof team.capSpace !== 'number' || Number.isNaN(team.capSpace)) {
      violations.push({
        rule: 'cap_nan',
        severity: 'critical',
        message: `Team ${teamId} has NaN capSpace`,
        context: { teamId },
      });
    }
  }
  return violations;
}

function checkPlayerTeamSync(game: GameState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  for (const [teamId, team] of Object.entries(game.teams)) {
    for (const player of team.roster) {
      const globalPlayer = game.players[player.id];
      if (!globalPlayer) {
        violations.push({
          rule: 'player_sync',
          severity: 'high',
          message: `Player ${player.id} on team ${teamId} roster but missing from game.players`,
          context: { playerId: player.id, teamId },
        });
      }
    }
  }
  return violations;
}

// ── Public API ────────────────────────────────────────────

export function validateGameState(game: GameState): InvariantResult {
  const violations = [
    ...checkRosterSize(game),
    ...checkRatingBounds(game),
    ...checkUniquePlayerAssignment(game),
    ...checkStandingsConsistency(game),
    ...checkCapSanity(game),
    ...checkPlayerTeamSync(game),
  ];

  return {
    valid: violations.length === 0,
    violations,
  };
}

export function assertGameStateValid(game: GameState): void {
  const result = validateGameState(game);
  if (!result.valid) {
    const critical = result.violations.filter((v) => v.severity === 'critical');
    if (critical.length > 0) {
      throw new Error(
        `Game state invariant violation: ${critical.map((v) => v.message).join('; ')}`,
      );
    }
  }
}
