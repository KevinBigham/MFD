/**
 * MFD Contract Incentives System
 *
 * Performance-based contract bonuses that trigger based on
 * season stats and team achievements.
 */

import type { Position, Player, PlayerSeasonStats } from '../types';

// ── Incentive Definitions ──────────────────────────────

export interface IncentiveDef {
  id: string;
  label: string;
  threshold: number;
  bonus: number;
  positions: readonly Position[];
}

export const INCENTIVE_DEFS: readonly IncentiveDef[] = [
  { id: 'pass_yds', label: 'Pass Yards', threshold: 3500, bonus: 2.0, positions: ['QB'] },
  { id: 'rush_yds', label: 'Rush Yards', threshold: 800, bonus: 1.5, positions: ['RB'] },
  { id: 'rec_yds', label: 'Rec Yards', threshold: 700, bonus: 1.5, positions: ['WR', 'TE'] },
  { id: 'sacks', label: 'Sacks', threshold: 8, bonus: 1.5, positions: ['DL', 'LB'] },
  { id: 'ints', label: 'Interceptions', threshold: 4, bonus: 1.0, positions: ['CB', 'S'] },
  { id: 'pro_bowl', label: 'Pro Bowl', threshold: 1, bonus: 2.5, positions: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S'] },
  { id: 'playoffs', label: 'Make Playoffs', threshold: 1, bonus: 1.0, positions: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'] },
] as const;

// ── Stat Field Mapping ─────────────────────────────────

const STAT_FIELD_MAP: Record<string, keyof PlayerSeasonStats> = {
  pass_yds: 'passYds',
  rush_yds: 'rushYds',
  rec_yds: 'recYds',
  sacks: 'sacks',
  ints: 'defINT',
};

// ── Incentive Check ────────────────────────────────────

export interface IncentiveHit {
  id: string;
  label: string;
  bonus: number;
  threshold: number;
  actual: number;
}

export interface IncentiveCheckResult {
  hit: IncentiveHit[];
  miss: IncentiveHit[];
  totalBonus: number;
}

export function checkIncentives(
  player: Player,
  teamRecord: { madePlayoffs: boolean; proBowl?: boolean },
): IncentiveCheckResult {
  const result: IncentiveCheckResult = { hit: [], miss: [], totalBonus: 0 };
  const incentives = player.contract?.incentives ?? [];

  if (incentives.length === 0) return result;

  const stats = player.stats ?? {} as PlayerSeasonStats;

  for (const inc of incentives) {
    const def = INCENTIVE_DEFS.find((d) => d.id === inc.type);
    if (!def) continue;

    let actual = 0;
    let met = false;

    if (inc.type === 'playoffs') {
      actual = teamRecord.madePlayoffs ? 1 : 0;
      met = teamRecord.madePlayoffs;
    } else if (inc.type === 'pro_bowl') {
      actual = teamRecord.proBowl ? 1 : 0;
      met = !!teamRecord.proBowl;
    } else {
      const field = STAT_FIELD_MAP[inc.type];
      actual = field ? (stats[field] ?? 0) : 0;
      met = actual >= inc.threshold;
    }

    const entry: IncentiveHit = {
      id: inc.type,
      label: def.label,
      bonus: inc.bonus,
      threshold: inc.threshold,
      actual,
    };

    if (met) {
      result.hit.push(entry);
      result.totalBonus += inc.bonus;
    } else {
      result.miss.push(entry);
    }
  }

  return result;
}

// ── Available Incentives for Position ──────────────────

export function getAvailableIncentives(pos: Position): IncentiveDef[] {
  return INCENTIVE_DEFS.filter((d) => d.positions.includes(pos));
}
