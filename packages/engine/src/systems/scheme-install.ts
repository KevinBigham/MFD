import { calcPlayerIdentityFit } from './scheme-fit';
import type { GameState, SchemeInstallLane, SchemeInstallState, Team, TeamIdentityRoom, TeamIdentitySnapshot } from '../types';

const ROOM_GROUPS: Array<{ group: string; positions: Team['roster'][number]['pos'][] }> = [
  { group: 'QB Room', positions: ['QB'] },
  { group: 'Skill Room', positions: ['RB', 'WR', 'TE'] },
  { group: 'Offensive Line', positions: ['OL'] },
  { group: 'Front Seven', positions: ['DL', 'LB'] },
  { group: 'Secondary', positions: ['CB', 'S'] },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function continuityFromStaff(team: Team, nextOffense: string, nextDefense: string): number {
  let continuity = 64;
  if (team.staff.hc) continuity += 8;
  if (team.staff.oc) continuity += 6;
  if (team.staff.dc) continuity += 6;
  if (team.staff.oc?.schemeLean?.offense === nextOffense) continuity += 10;
  if (team.staff.dc?.schemeLean?.defense === nextDefense) continuity += 10;
  if (team.staff.hc?.schemeLean?.offense === nextOffense) continuity += 4;
  if (team.staff.hc?.schemeLean?.defense === nextDefense) continuity += 4;
  return clamp(continuity, 20, 95);
}

function snapshotRoom(
  team: Team,
  group: string,
  positions: Team['roster'][number]['pos'][],
  offenseScheme: string,
  defenseScheme: string,
): TeamIdentityRoom {
  const players = team.roster.filter((player) => positions.includes(player.pos));
  if (players.length === 0) {
    return {
      group,
      fitScore: 0,
      topPlayerId: null,
      topPlayerName: 'No room',
    };
  }
  const scored = players.map((player) => ({
    player,
    fit: calcPlayerIdentityFit(player, team, offenseScheme, defenseScheme).score,
  }));
  const top = [...scored].sort((left, right) => right.fit - left.fit || left.player.id.localeCompare(right.player.id))[0]!;
  return {
    group,
    fitScore: Math.round(average(scored.map((entry) => entry.fit))),
    topPlayerId: top.player.id,
    topPlayerName: top.player.name,
  };
}

export function snapshotTeamIdentity(team: Team, offenseScheme = team.schemeOff ?? team.offScheme ?? 'balanced', defenseScheme = team.schemeDef ?? team.defScheme ?? '4-3'): TeamIdentitySnapshot {
  const rooms = ROOM_GROUPS.map((room) => snapshotRoom(team, room.group, room.positions, offenseScheme, defenseScheme));
  const overallFit = Math.round(average(rooms.map((room) => room.fitScore)));
  return {
    teamId: team.id,
    offenseScheme,
    defenseScheme,
    overallFit,
    continuity: continuityFromStaff(team, offenseScheme, defenseScheme),
    rooms,
  };
}

function buildLane(current: string, next: string, snapshotFit: number, staffAlignment: number): SchemeInstallLane {
  const transitionPenalty = current === next ? 0 : clamp(Math.round(8 + Math.max(0, 80 - snapshotFit) / 4 - staffAlignment / 3), 2, 25);
  const continuityBonus = current === next ? 8 : clamp(Math.round(staffAlignment / 2), 0, 10);
  const installProgress = current === next
    ? 100
    : clamp(Math.round(40 + snapshotFit / 5 + staffAlignment - transitionPenalty), 10, 95);
  return {
    from: current,
    to: next,
    installProgress,
    continuityBonus,
    transitionPenalty,
  };
}

export function projectSchemeTransition(team: Team, nextOffense: string, nextDefense: string): SchemeInstallState {
  const currentOffense = team.schemeOff ?? team.offScheme ?? 'balanced';
  const currentDefense = team.schemeDef ?? team.defScheme ?? '4-3';
  const snapshot = snapshotTeamIdentity(team, nextOffense, nextDefense);
  const offenseAlignment = (team.staff.oc?.schemeLean?.offense === nextOffense ? 12 : 0)
    + (team.staff.hc?.schemeLean?.offense === nextOffense ? 5 : 0);
  const defenseAlignment = (team.staff.dc?.schemeLean?.defense === nextDefense ? 12 : 0)
    + (team.staff.hc?.schemeLean?.defense === nextDefense ? 5 : 0);
  const offense = buildLane(currentOffense, nextOffense, snapshot.overallFit, offenseAlignment);
  const defense = buildLane(currentDefense, nextDefense, snapshot.overallFit, defenseAlignment);
  const overallContinuity = clamp(
    Math.round(snapshot.continuity - (offense.transitionPenalty + defense.transitionPenalty) / 2 + offense.continuityBonus + defense.continuityBonus),
    0,
    100,
  );

  return {
    teamId: team.id,
    overallContinuity,
    offense,
    defense,
    snapshot,
  };
}

export function applySchemeChange(game: GameState, teamId: string, nextOffense: string, nextDefense: string): SchemeInstallState {
  const team = game.teams[teamId];
  if (!team) {
    throw new Error(`Cannot change scheme for missing team ${teamId}.`);
  }
  team.schemeOff = nextOffense;
  team.offScheme = nextOffense;
  team.schemeDef = nextDefense;
  team.defScheme = nextDefense;
  if (game.teamNeedsCache?.[teamId]) {
    delete game.teamNeedsCache[teamId];
  }
  return projectSchemeTransition(team, nextOffense, nextDefense);
}
