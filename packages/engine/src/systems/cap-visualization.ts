/**
 * MFD Cap Visualization System
 *
 * Builds salary cap breakdown data for UI rendering:
 * positional breakdown, top contract hits, and 3-year projections.
 */

import { v36CapHit, v36DeadIfCut } from './contract-helpers';
import { getSalaryCap } from '../config/cap-math';
import type { GameState, Team, Player, Position } from '../types';

// ── Types ──────────────────────────────────────────────

export interface CapBreakdown {
  pos: Position;
  cap: number;
  pct: number;
}

export interface TopHit {
  name: string;
  pos: Position;
  ovr: number;
  age: number;
  salary: number;
  years: number;
  value: 'Fair' | 'Watch' | 'Overpay';
}

export interface CapProjection {
  year: number;
  committed: number;
  expiring: number;
  space: number;
  warning: string;
}

export interface CapVisualization {
  breakdown: CapBreakdown[];
  topHits: TopHit[];
  projections: CapProjection[];
  totalUsed: number;
  capRoom: number;
  deadCap: number;
  salaryCap: number;
}

// ── Builder ────────────────────────────────────────────

export function buildCapVisualization(
  team: Team | null,
  currentYear = 2026,
  gameState?: GameState | null,
): CapVisualization | null {
  if (!team) return null;

  const cap = getSalaryCap(currentYear, gameState);
  const roster = team.roster ?? [];

  // Positional breakdown
  const posCap: Partial<Record<Position, number>> = {};
  let totalUsed = 0;

  for (const p of roster) {
    if (!p.contract) continue;
    const hit = v36CapHit(p.contract);
    posCap[p.pos] = (posCap[p.pos] ?? 0) + hit;
    totalUsed += hit;
  }

  const breakdown: CapBreakdown[] = Object.entries(posCap)
    .map(([pos, capAmt]) => ({
      pos: pos as Position,
      cap: Math.round(capAmt * 100) / 100,
      pct: totalUsed > 0 ? Math.round((capAmt / totalUsed) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.cap - a.cap);

  // Top 10 contract hits
  const withContracts = roster
    .filter((p): p is Player & { contract: NonNullable<Player['contract']> } => p.contract !== null)
    .sort((a, b) => v36CapHit(b.contract) - v36CapHit(a.contract))
    .slice(0, 10);

  const topHits: TopHit[] = withContracts.map((p) => ({
    name: p.name,
    pos: p.pos,
    ovr: p.ovr,
    age: p.age,
    salary: v36CapHit(p.contract),
    years: p.contract.years,
    value: p.ovr >= 75 ? 'Fair' as const : p.ovr >= 70 ? 'Watch' as const : 'Overpay' as const,
  }));

  // 3-year projections
  const projections: CapProjection[] = [];
  for (let yr = 1; yr <= 3; yr++) {
    let committed = 0;
    let expiring = 0;

    for (const p of roster) {
      if (!p.contract) continue;
      if (p.contract.years <= yr) {
        expiring += v36CapHit(p.contract);
      } else {
        committed += v36CapHit(p.contract);
      }
    }

    const futureCap = getSalaryCap(currentYear + yr, gameState);
    const space = futureCap - committed;
    const pct = futureCap > 0 ? committed / futureCap : 0;
    const warning = pct > 0.85 ? 'Cap cliff'
      : pct > 0.70 ? 'Tight'
      : '';

    projections.push({
      year: currentYear + yr,
      committed: Math.round(committed * 100) / 100,
      expiring: Math.round(expiring * 100) / 100,
      space: Math.round(space * 100) / 100,
      warning,
    });
  }

  const deadCap = team.deadCap ?? 0;
  const capRoom = Math.round((cap - totalUsed - deadCap) * 100) / 100;

  return {
    breakdown,
    topHits,
    projections,
    totalUsed: Math.round(totalUsed * 100) / 100,
    capRoom,
    deadCap,
    salaryCap: cap,
  };
}
