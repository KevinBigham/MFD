/**
 * MFD Snap Count Engine
 *
 * Distributes ~65 offensive and ~65 defensive snaps per game across
 * team rosters based on position, starter status, and snap management strategy.
 * Special teams snaps: ~20 per game.
 */

import { cl } from '../utils';
import type { Player, Position, Team, PlayerGameLine } from '../types';
import type { PrngFn } from '../rng';
import { isPlayerUnavailable } from './injury-system';

// ── Constants ──────────────────────────────────────────────

const OFFENSIVE_SNAPS_PER_GAME = 65;
const DEFENSIVE_SNAPS_PER_GAME = 65;
const SPECIAL_TEAMS_SNAPS_PER_GAME = 20;

const OFFENSIVE_POSITIONS: ReadonlySet<Position> = new Set(['QB', 'RB', 'WR', 'TE', 'OL', 'K']);
const DEFENSIVE_POSITIONS: ReadonlySet<Position> = new Set(['DL', 'LB', 'CB', 'S']);

const PROTECT_STARTERS_MAX_REDUCTION = 0.15;
const RIDE_STARS_MIN_INCREASE = 0.10;

const SNAP_REPORT_LEADER_COUNT = 15;
const WORKLOAD_WARNING_THRESHOLD = 0.95;
const ROTATION_OVERWORK_THRESHOLD = 0.90;
const ROTATION_OVR_GAP = 10;

// ── Types ──────────────────────────────────────────────────

export type SnapManagement = 'normal' | 'protect_starters' | 'ride_stars';

export interface SnapAllocation {
  playerId: string;
  name: string;
  pos: Position;
  offensiveSnaps: number;
  defensiveSnaps: number;
  specialTeamsSnaps: number;
  totalSnaps: number;
  snapShare: number; // 0-1, percentage of position snaps
  isStarter: boolean;
}

export interface SnapReport {
  leaders: { playerId: string; name: string; pos: Position; totalSnaps: number; snapShare: number }[];
  workloadWarnings: { playerId: string; name: string; snapShare: number; risk: string }[];
}

export interface RotationAdvice {
  playerId: string;
  name: string;
  pos: Position;
  currentShare: number;
  suggestedShare: number;
  reason: string;
}

// ── Starter snap share ranges by position ──────────────────

interface SnapRange {
  min: number;
  max: number;
}

const STARTER_SNAP_RANGES: Record<Position, SnapRange> = {
  QB:  { min: 0.95, max: 1.00 },
  RB:  { min: 0.55, max: 0.85 },
  WR:  { min: 0.60, max: 0.90 },
  TE:  { min: 0.60, max: 0.90 },
  OL:  { min: 0.85, max: 1.00 },
  DL:  { min: 0.55, max: 0.80 },
  LB:  { min: 0.70, max: 0.95 },
  CB:  { min: 0.80, max: 1.00 },
  S:   { min: 0.80, max: 1.00 },
  K:   { min: 1.00, max: 1.00 },
  P:   { min: 1.00, max: 1.00 },
};

const BACKUP_SNAP_RANGES: Record<Position, SnapRange> = {
  QB:  { min: 0.00, max: 0.05 },
  RB:  { min: 0.15, max: 0.45 },
  WR:  { min: 0.10, max: 0.40 },
  TE:  { min: 0.10, max: 0.40 },
  OL:  { min: 0.00, max: 0.15 },
  DL:  { min: 0.20, max: 0.45 },
  LB:  { min: 0.05, max: 0.30 },
  CB:  { min: 0.00, max: 0.20 },
  S:   { min: 0.00, max: 0.20 },
  K:   { min: 0.00, max: 0.00 },
  P:   { min: 0.00, max: 0.00 },
};

// ── Public Functions ───────────────────────────────────────

/**
 * Returns the snap share range for a position/starter/strategy combo.
 */
export function getSnapShareByPosition(
  pos: Position,
  isStarter: boolean,
  snapMgmt: SnapManagement,
): SnapRange {
  const base = isStarter ? STARTER_SNAP_RANGES[pos] : BACKUP_SNAP_RANGES[pos];
  let { min, max } = base;

  if (isStarter) {
    if (snapMgmt === 'protect_starters') {
      max = cl(max - PROTECT_STARTERS_MAX_REDUCTION, 0, 1);
    } else if (snapMgmt === 'ride_stars') {
      min = cl(min + RIDE_STARS_MIN_INCREASE, 0, 1);
    }
  }

  // Ensure min <= max after adjustments
  if (min > max) {
    min = max;
  }

  return { min, max };
}

/**
 * Allocates game snaps across a team's roster.
 */
export function allocateGameSnaps(
  team: Team,
  snapMgmt: SnapManagement,
  playerLines: PlayerGameLine[],
  rng: PrngFn,
): SnapAllocation[] {
  const playerLineIds = new Set(playerLines.map(pl => pl.playerId));
  const available = team.roster.filter(p => !isPlayerUnavailable(p));

  if (available.length === 0) return [];

  const allocations: SnapAllocation[] = [];

  // Group players by position
  const byPos = new Map<Position, Player[]>();
  for (const p of available) {
    const group = byPos.get(p.pos) ?? [];
    group.push(p);
    byPos.set(p.pos, group);
  }

  // Distribute offensive snaps
  distributeSnaps(
    byPos,
    OFFENSIVE_POSITIONS,
    OFFENSIVE_SNAPS_PER_GAME,
    snapMgmt,
    playerLineIds,
    rng,
    allocations,
    'offense',
  );

  // Distribute defensive snaps
  distributeSnaps(
    byPos,
    DEFENSIVE_POSITIONS,
    DEFENSIVE_SNAPS_PER_GAME,
    snapMgmt,
    playerLineIds,
    rng,
    allocations,
    'defense',
  );

  // Distribute special teams snaps across non-QB, non-K skill players
  distributeSpecialTeams(available, SPECIAL_TEAMS_SNAPS_PER_GAME, rng, allocations);

  return allocations;
}

/**
 * Applies snap counts from allocations to player careerStats.
 */
export function applySnapCounts(team: Team, allocations: SnapAllocation[]): void {
  const allocMap = new Map<string, SnapAllocation>();
  for (const a of allocations) {
    allocMap.set(a.playerId, a);
  }

  for (const player of team.roster) {
    const alloc = allocMap.get(player.id);
    if (alloc) {
      player.careerStats.snaps += alloc.totalSnaps;
    }
  }
}

/**
 * Returns a snap report with leaders and workload warnings.
 */
export function getSnapReport(team: Team): SnapReport {
  const sorted = [...team.roster].sort((a, b) => b.careerStats.snaps - a.careerStats.snaps);
  const maxSnaps = sorted.length > 0 ? sorted[0]!.careerStats.snaps : 1;

  const leaders = sorted.slice(0, SNAP_REPORT_LEADER_COUNT).map(p => ({
    playerId: p.id,
    name: p.name,
    pos: p.pos,
    totalSnaps: p.careerStats.snaps,
    snapShare: maxSnaps > 0 ? p.careerStats.snaps / maxSnaps : 0,
  }));

  const workloadWarnings = sorted
    .filter(p => {
      const share = maxSnaps > 0 ? p.careerStats.snaps / maxSnaps : 0;
      return share > WORKLOAD_WARNING_THRESHOLD;
    })
    .map(p => ({
      playerId: p.id,
      name: p.name,
      snapShare: maxSnaps > 0 ? p.careerStats.snaps / maxSnaps : 0,
      risk: `${p.name} has an elevated workload (${Math.round((p.careerStats.snaps / maxSnaps) * 100)}% of max). Consider rotation.`,
    }));

  return { leaders, workloadWarnings };
}

/**
 * Suggests rotation adjustments for overworked starters with capable backups.
 */
export function getRotationAdvice(team: Team): RotationAdvice[] {
  const advice: RotationAdvice[] = [];
  const maxSnaps = Math.max(...team.roster.map(p => p.careerStats.snaps), 1);

  // Group by position
  const byPos = new Map<Position, Player[]>();
  for (const p of team.roster) {
    const group = byPos.get(p.pos) ?? [];
    group.push(p);
    byPos.set(p.pos, group);
  }

  for (const [pos, players] of byPos) {
    const starters = players.filter(p => p.isStarter);
    const backups = players.filter(p => !p.isStarter);

    for (const starter of starters) {
      const currentShare = maxSnaps > 0 ? starter.careerStats.snaps / maxSnaps : 0;
      if (currentShare <= ROTATION_OVERWORK_THRESHOLD) continue;

      // Look for a capable backup
      const capableBackup = backups.find(b => starter.ovr - b.ovr <= ROTATION_OVR_GAP);
      if (!capableBackup) continue;

      const suggestedShare = cl(currentShare - 0.10, 0, 1);
      advice.push({
        playerId: starter.id,
        name: starter.name,
        pos: pos,
        currentShare,
        suggestedShare,
        reason: `${starter.name} is overworked at ${Math.round(currentShare * 100)}% snap share. ${capableBackup.name} (${capableBackup.ovr} OVR) can absorb more snaps.`,
      });
    }
  }

  return advice;
}

// ── Internal Helpers ───────────────────────────────────────

function distributeSnaps(
  byPos: Map<Position, Player[]>,
  positionSet: ReadonlySet<Position>,
  totalSnaps: number,
  snapMgmt: SnapManagement,
  playerLineIds: Set<string>,
  rng: PrngFn,
  allocations: SnapAllocation[],
  side: 'offense' | 'defense',
): void {
  // Collect all players for this side
  const sidePlayers: Player[] = [];
  for (const [pos, players] of byPos) {
    if (positionSet.has(pos)) {
      sidePlayers.push(...players);
    }
  }

  if (sidePlayers.length === 0) return;

  // Calculate raw snap shares
  const rawShares: { player: Player; share: number }[] = [];
  let totalRaw = 0;

  for (const player of sidePlayers) {
    const range = getSnapShareByPosition(player.pos, player.isStarter, snapMgmt);
    // Pick a value within the range using rng
    let share = range.min + (range.max - range.min) * rng();

    // Boost players who appeared in playerLines (had stats)
    if (playerLineIds.has(player.id)) {
      share = cl(share * 1.1, range.min, 1);
    }

    rawShares.push({ player, share });
    totalRaw += share;
  }

  // Normalize and assign snaps
  for (const entry of rawShares) {
    const normalizedShare = totalRaw > 0 ? entry.share / totalRaw : 0;
    const snaps = Math.round(normalizedShare * totalSnaps);

    // Find or create allocation for this player
    let alloc = allocations.find(a => a.playerId === entry.player.id);
    if (!alloc) {
      alloc = {
        playerId: entry.player.id,
        name: entry.player.name,
        pos: entry.player.pos,
        offensiveSnaps: 0,
        defensiveSnaps: 0,
        specialTeamsSnaps: 0,
        totalSnaps: 0,
        snapShare: entry.share,
        isStarter: entry.player.isStarter,
      };
      allocations.push(alloc);
    }

    if (side === 'offense') {
      alloc.offensiveSnaps = snaps;
    } else {
      alloc.defensiveSnaps = snaps;
    }
    alloc.totalSnaps = alloc.offensiveSnaps + alloc.defensiveSnaps + alloc.specialTeamsSnaps;
  }
}

function distributeSpecialTeams(
  available: Player[],
  totalSnaps: number,
  rng: PrngFn,
  allocations: SnapAllocation[],
): void {
  // Special teams candidates: non-starters and non-QB skill players, plus K and P
  const candidates = available.filter(p => {
    if (p.pos === 'K' || p.pos === 'P') return true;
    if (p.pos === 'QB') return false;
    return !p.isStarter;
  });

  if (candidates.length === 0) return;

  // Give K/P a fixed share, distribute rest among backups
  let remaining = totalSnaps;
  for (const c of candidates) {
    let alloc = allocations.find(a => a.playerId === c.id);
    if (!alloc) {
      alloc = {
        playerId: c.id,
        name: c.name,
        pos: c.pos,
        offensiveSnaps: 0,
        defensiveSnaps: 0,
        specialTeamsSnaps: 0,
        totalSnaps: 0,
        snapShare: 0,
        isStarter: c.isStarter,
      };
      allocations.push(alloc);
    }

    let stSnaps: number;
    if (c.pos === 'K' || c.pos === 'P') {
      stSnaps = Math.min(remaining, Math.round(totalSnaps * 0.25));
    } else {
      // Distribute remaining among backups with some variance
      const perPlayer = remaining / Math.max(candidates.length, 1);
      stSnaps = Math.round(perPlayer * (0.5 + rng() * 0.5));
    }

    stSnaps = cl(stSnaps, 0, remaining);
    alloc.specialTeamsSnaps = stSnaps;
    alloc.totalSnaps = alloc.offensiveSnaps + alloc.defensiveSnaps + alloc.specialTeamsSnaps;
    remaining -= stSnaps;

    if (remaining <= 0) break;
  }
}
