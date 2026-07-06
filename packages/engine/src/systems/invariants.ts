/**
 * MFD Game State Invariant Validator
 *
 * Runtime assertions that catch corrupted state early.
 * Call validateGameState() in tests or dev mode after major state transitions.
 */

import type { GameState } from '../types';
import { getRosterLimit } from './league-rules';

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
  const rosterLimit = getRosterLimit(game);
  for (const [teamId, team] of Object.entries(game.teams)) {
    if (team.roster.length > rosterLimit) {
      violations.push({
        rule: 'roster_size',
        severity: 'high',
        message: `Team ${teamId} has ${team.roster.length} players (max ${rosterLimit})`,
        context: { teamId, actual: team.roster.length, max: rosterLimit },
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
      } else if (globalPlayer.teamId !== teamId) {
        violations.push({
          rule: 'player_team_sync',
          severity: 'high',
          message: `Player ${player.id} on team ${teamId} roster has game.players teamId ${String(globalPlayer.teamId)}`,
          context: { playerId: player.id, rosterTeamId: teamId, globalTeamId: globalPlayer.teamId },
        });
      }
      if (player.teamId !== teamId) {
        violations.push({
          rule: 'player_team_sync',
          severity: 'high',
          message: `Player ${player.id} roster row on team ${teamId} has teamId ${String(player.teamId)}`,
          context: { playerId: player.id, rosterTeamId: teamId, rowTeamId: player.teamId },
        });
      }
    }
  }
  return violations;
}

function checkPlayerPoolSync(game: GameState): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const rosterTeamByPlayerId = new Map<string, string>();
  const practiceTeamByPlayerId = new Map<string, { teamId: string; isElevated: boolean }>();
  const freeAgentIds = new Set<string>();
  const waiverIds = new Set<string>();

  const pushPoolViolation = (
    playerId: string,
    message: string,
    context: Record<string, unknown>,
    severity: InvariantViolation['severity'] = 'high',
  ) => {
    violations.push({
      rule: 'player_pool_sync',
      severity,
      message,
      context: { playerId, ...context },
    });
  };

  for (const [teamId, team] of Object.entries(game.teams)) {
    for (const player of team.roster) {
      rosterTeamByPlayerId.set(player.id, teamId);
    }

    for (const entry of team.practiceSquad ?? []) {
      const existing = practiceTeamByPlayerId.get(entry.playerId);
      if (existing && existing.teamId !== teamId) {
        pushPoolViolation(
          entry.playerId,
          `Player ${entry.playerId} is on practice squads for both ${existing.teamId} and ${teamId}`,
          { teams: [existing.teamId, teamId] },
          'critical',
        );
      }
      practiceTeamByPlayerId.set(entry.playerId, {
        teamId,
        isElevated: Boolean(entry.isElevated),
      });

      const globalPlayer = game.players[entry.playerId];
      if (!globalPlayer) {
        pushPoolViolation(
          entry.playerId,
          `Practice squad player ${entry.playerId} on team ${teamId} is missing from game.players`,
          { teamId, pool: 'practice_squad' },
        );
      } else if (globalPlayer.teamId !== teamId) {
        pushPoolViolation(
          entry.playerId,
          `Practice squad player ${entry.playerId} on team ${teamId} has game.players teamId ${String(globalPlayer.teamId)}`,
          { teamId, globalTeamId: globalPlayer.teamId, pool: 'practice_squad' },
        );
      }
    }
  }

  for (const playerId of game.freeAgents ?? []) {
    if (freeAgentIds.has(playerId)) {
      pushPoolViolation(playerId, `Player ${playerId} appears more than once in freeAgents`, { pool: 'free_agent' }, 'medium');
    }
    freeAgentIds.add(playerId);

    const globalPlayer = game.players[playerId];
    if (!globalPlayer) {
      pushPoolViolation(playerId, `Free agent player ${playerId} is missing from game.players`, { pool: 'free_agent' });
    } else if (globalPlayer.teamId !== null) {
      pushPoolViolation(
        playerId,
        `Free agent player ${playerId} has game.players teamId ${String(globalPlayer.teamId)}`,
        { globalTeamId: globalPlayer.teamId, pool: 'free_agent' },
      );
    }
  }

  for (const entry of game.waiverWire ?? []) {
    waiverIds.add(entry.playerId);
    const globalPlayer = game.players[entry.playerId];
    if (!globalPlayer) {
      pushPoolViolation(entry.playerId, `Waiver-wire player ${entry.playerId} is missing from game.players`, { pool: 'waiver_wire' });
    } else if (globalPlayer.teamId !== null) {
      pushPoolViolation(
        entry.playerId,
        `Waiver-wire player ${entry.playerId} has game.players teamId ${String(globalPlayer.teamId)}`,
        { globalTeamId: globalPlayer.teamId, pool: 'waiver_wire' },
      );
    }
  }

  for (const [playerId, player] of Object.entries(game.players)) {
    const rosterTeamId = rosterTeamByPlayerId.get(playerId) ?? null;
    const practiceEntry = practiceTeamByPlayerId.get(playerId) ?? null;
    const inFreeAgency = freeAgentIds.has(playerId);
    const onWaivers = waiverIds.has(playerId);

    if (player.teamId && player.teamId !== rosterTeamId && player.teamId !== practiceEntry?.teamId) {
      pushPoolViolation(
        playerId,
        `Player ${playerId} has teamId ${player.teamId} but is not on that team's roster or practice squad`,
        { globalTeamId: player.teamId, rosterTeamId, practiceTeamId: practiceEntry?.teamId ?? null },
      );
    }

    if (rosterTeamId && practiceEntry && (rosterTeamId !== practiceEntry.teamId || !practiceEntry.isElevated)) {
      pushPoolViolation(
        playerId,
        `Player ${playerId} is on an active roster and practice squad without a matching elevation`,
        { rosterTeamId, practiceTeamId: practiceEntry.teamId, isElevated: practiceEntry.isElevated },
      );
    }

    const liveTeamPool = rosterTeamId ?? practiceEntry?.teamId ?? null;
    if (liveTeamPool && (inFreeAgency || onWaivers)) {
      pushPoolViolation(
        playerId,
        `Player ${playerId} is in a team pool and an external acquisition pool`,
        { teamId: liveTeamPool, inFreeAgency, onWaivers },
      );
    }

    if (inFreeAgency && onWaivers) {
      pushPoolViolation(playerId, `Player ${playerId} is both a free agent and on waivers`, { inFreeAgency, onWaivers });
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
    ...checkPlayerPoolSync(game),
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
