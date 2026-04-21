/**
 * MFD Development Insights System
 *
 * Tracks and reports on player development trajectories.
 * Shows rating changes, archetype alignment, coach impact, and projections.
 */

import type { GameState, Player, Team } from '../types';
import { cl } from '../utils';
import { getArchetypeAlignment, getArchetypeDevelopmentReport } from './archetype-progression';
import { getPositionCoachBonus } from './position-coaches';

// ── Types ──────────────────────────────────────────────

export interface DevelopmentSnapshot {
  year: number;
  ovr: number;
  ratingDeltas: Record<string, number>;
  archetypeAlignment: number;
}

export interface DevelopmentReport {
  playerId: string;
  playerName: string;
  pos: string;
  age: number;
  ovr: number;
  archetypeAlignment: number;
  archetypeLabel: string;
  topGrowthRatings: { rating: string; delta: number }[];
  coachImpact: string;
  evolutionRisk: 'none' | 'possible' | 'likely';
  projectedOvr: number;
}

export interface DevelopmentProjection {
  year: number;
  projectedOvr: number;
  confidence: number; // 0-100 — lower for further years
}

export interface BreakoutCandidate {
  playerId: string;
  playerName: string;
  pos: string;
  age: number;
  ovr: number;
  ovrDelta: number;
  reason: string;
}

export interface DevComparison {
  player1: { id: string; name: string; snapshots: DevelopmentSnapshot[] };
  player2: { id: string; name: string; snapshots: DevelopmentSnapshot[] };
}

// ── Development Report ────────────────────────────────

export function generateDevelopmentReport(
  player: Player,
  team: Team | null,
): DevelopmentReport {
  const archReport = getArchetypeDevelopmentReport(player);
  const coachBonus = getPositionCoachBonus(team?.positionCoaches, player);

  // Get rating deltas from most recent snapshot
  const snapshots = player.devSnapshots;
  const latest = snapshots?.[snapshots.length - 1];
  const topGrowthRatings = latest
    ? Object.entries(latest.ratingDeltas)
        .filter(([, d]) => d > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([rating, delta]) => ({ rating, delta: Math.round(delta * 10) / 10 }))
    : [];

  // Simple projection: current OVR + expected delta based on age phase
  const previousOvr = player.careerStats?.previousSeasonOvr ?? player.ovr;
  const recentDelta = player.ovr - previousOvr;
  const projectedOvr = cl(Math.round(player.ovr + recentDelta * 0.7), 40, 99);

  return {
    playerId: player.id,
    playerName: player.name,
    pos: player.pos,
    age: player.age,
    ovr: player.ovr,
    archetypeAlignment: archReport.alignment,
    archetypeLabel: archReport.archetypeLabel,
    topGrowthRatings,
    coachImpact: coachBonus.narrative,
    evolutionRisk: archReport.evolutionRisk,
    projectedOvr,
  };
}

// ── Development Projections ───────────────────────────

export function projectDevelopmentCurve(
  player: Player,
  team: Team | null,
  years: number,
): DevelopmentProjection[] {
  const previousOvr = player.careerStats?.previousSeasonOvr ?? player.ovr;
  const recentDelta = player.ovr - previousOvr;

  const projections: DevelopmentProjection[] = [];
  let currentOvr = player.ovr;
  let currentAge = player.age;

  for (let y = 1; y <= Math.min(years, 5); y++) {
    currentAge += 1;

    // Decay the projection based on age
    let projectedDelta = recentDelta;
    if (currentAge >= 30) projectedDelta -= 1;
    if (currentAge >= 33) projectedDelta -= 1.5;
    if (currentAge >= 36) projectedDelta -= 2;

    currentOvr = cl(Math.round(currentOvr + projectedDelta * 0.6), 40, 99);

    projections.push({
      year: y,
      projectedOvr: currentOvr,
      confidence: cl(100 - y * 20, 10, 90),
    });
  }

  return projections;
}

// ── Breakout Candidates ───────────────────────────────

export function identifyBreakoutCandidates(
  game: GameState,
  teamId: string,
): BreakoutCandidate[] {
  const team = game.teams[teamId];
  if (!team) return [];

  const candidates: BreakoutCandidate[] = [];

  for (const player of team.roster) {
    // Only young players (under 27)
    if (player.age > 27) continue;

    const previousOvr = player.careerStats?.previousSeasonOvr ?? player.ovr;
    const ovrDelta = player.ovr - previousOvr;

    // Breakout = gained 3+ OVR in a season
    if (ovrDelta < 3) continue;

    let reason = '';
    if (ovrDelta >= 6) reason = `Massive ${ovrDelta}-point OVR surge — elite development trajectory.`;
    else if (ovrDelta >= 4) reason = `Strong ${ovrDelta}-point improvement — emerging as a key contributor.`;
    else reason = `Solid ${ovrDelta}-point growth — trending upward.`;

    candidates.push({
      playerId: player.id,
      playerName: player.name,
      pos: player.pos,
      age: player.age,
      ovr: player.ovr,
      ovrDelta,
      reason,
    });
  }

  return candidates
    .sort((a, b) => b.ovrDelta - a.ovrDelta)
    .slice(0, 5);
}

// ── Development History ───────────────────────────────

export function getDevelopmentHistory(player: Player): DevelopmentSnapshot[] {
  return player.devSnapshots ?? [];
}

// ── Development Comparison ────────────────────────────

export function compareDevPaths(
  player1: Player,
  player2: Player,
): DevComparison {
  return {
    player1: {
      id: player1.id,
      name: player1.name,
      snapshots: getDevelopmentHistory(player1),
    },
    player2: {
      id: player2.id,
      name: player2.name,
      snapshots: getDevelopmentHistory(player2),
    },
  };
}

// ── Snapshot Creation (called during progression) ─────

export function createDevelopmentSnapshot(
  player: Player,
  year: number,
  previousRatings: Record<string, number>,
): DevelopmentSnapshot {
  const ratingDeltas: Record<string, number> = {};

  for (const [key, value] of Object.entries(player.ratings)) {
    const prev = previousRatings[key] ?? value;
    const delta = value - prev;
    if (Math.abs(delta) > 0.01) {
      ratingDeltas[key] = Math.round(delta * 10) / 10;
    }
  }

  return {
    year,
    ovr: player.ovr,
    ratingDeltas,
    archetypeAlignment: getArchetypeAlignment(player),
  };
}
