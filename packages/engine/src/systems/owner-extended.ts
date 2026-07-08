/**
 * MFD Owner Extended System
 *
 * Patience tracking, confidence arc (4-stage system),
 * and consequence generation for owner ultimatums.
 */

import { RNG } from '../rng';
import { cl } from '../utils';
import type { OwnerArchetypeId, Team, SeasonContext } from '../types';

// ── Patience System ────────────────────────────────────

const DRAIN_RATES: Record<OwnerArchetypeId, number> = {
  win_now: 6,
  patient_builder: 2,
  profit_first: 4,
  fan_favorite: 4,
  legacy_builder: 3,
};

const GAIN_RATES: Record<OwnerArchetypeId, number> = {
  win_now: 12,
  patient_builder: 6,
  profit_first: 8,
  fan_favorite: 10,
  legacy_builder: 8,
};

export interface PatienceTick {
  patience: number;
  delta: number;
}

export function tickPatience(
  patience: number,
  archetype: OwnerArchetypeId,
  result: 'win' | 'loss',
  context: { isPlayoff?: boolean; streak?: number; playoffAppearance?: boolean; week?: number; winPct?: number; firstSeason?: boolean },
): PatienceTick {
  const drain = DRAIN_RATES[archetype] ?? 4;
  const gain = GAIN_RATES[archetype] ?? 8;

  let delta = result === 'win'
    ? gain
    : -(context.firstSeason ? Math.round(drain / 2) : drain);

  if (context.isPlayoff) {
    delta = result === 'win' ? Math.round(delta * 1.5) : Math.round(delta * 2);
  }

  if (context.playoffAppearance) {
    delta += 15;
  }

  const streak = context.streak ?? 0;
  if (streak >= 3) delta += 4;
  if (streak <= -3) delta -= 3;

  if (context.week === 9 && (context.winPct ?? 0) >= 0.5) {
    delta += 5;
  }

  const newPatience = cl(patience + delta, 0, 100);
  return { patience: newPatience, delta: newPatience - patience };
}

export function getPatienceStatus(patience: number): { label: string; color: string } {
  if (patience >= 75) return { label: 'Very Patient', color: 'green' };
  if (patience >= 50) return { label: 'Stable', color: 'slate' };
  if (patience >= 30) return { label: 'Running Thin', color: 'amber' };
  return { label: 'On Edge', color: 'red' };
}

// ── Confidence Arc (4-Stage System) ────────────────────

export type ConfidenceStage = 'PATIENT' | 'RESTLESS' | 'DEMANDING' | 'ULTIMATUM';

export interface ConfidenceArc {
  score: number;
  stage: ConfidenceStage;
  severity: number;
  nextTarget: number;
}

export function calcConfidenceArc(patience: number, mood: number): ConfidenceArc {
  const p = cl(patience ?? 50, 0, 100);
  const m = cl(mood ?? 70, 0, 100);
  const score = Math.round(p * 0.65 + m * 0.35);
  const normalized = cl(score, 0, 100);

  let stage: ConfidenceStage;
  let severity: number;
  let nextTarget: number;

  if (normalized >= 70) {
    stage = 'PATIENT';
    severity = 0;
    nextTarget = 70;
  } else if (normalized >= 50) {
    stage = 'RESTLESS';
    severity = 1;
    nextTarget = 70;
  } else if (normalized >= 30) {
    stage = 'DEMANDING';
    severity = 2;
    nextTarget = 50;
  } else {
    stage = 'ULTIMATUM';
    severity = 3;
    nextTarget = 30;
  }

  return { score: normalized, stage, severity, nextTarget };
}

// ── Owner Consequences ─────────────────────────────────

export interface Ultimatum {
  id: string;
  label: string;
  desc: string;
}

const ULTIMATUM_POOL: readonly Ultimatum[] = [
  { id: 'trade_worst', label: 'Trade Worst Contract', desc: 'Owner demands you trade the worst contract on the roster.' },
  { id: 'fire_coord', label: 'Fire a Coordinator', desc: 'Owner demands a coaching change at the coordinator level.' },
  { id: 'cut_payroll', label: 'Cut Payroll', desc: 'Owner demands you reduce total cap usage by 10%.' },
] as const;

export function generateUltimatums(count = 2): Ultimatum[] {
  const pool = [...ULTIMATUM_POOL];
  const result: Ultimatum[] = [];
  const limit = Math.min(Math.max(0, count), pool.length);

  for (let i = 0; i < limit; i++) {
    const idx = Math.floor(RNG.ai() * pool.length);
    const item = pool.splice(idx, 1)[0];
    if (item) result.push({ ...item });
  }

  return result;
}

export interface FuriousPenalty {
  id: string;
  label: string;
  effect: Record<string, number>;
}

export const FURIOUS_PENALTIES: readonly FuriousPenalty[] = [
  { id: 'fa_tax', label: 'FA Tax', effect: { faCostMult: 1.15 } },
  { id: 'trade_penalty', label: 'Trade Penalty', effect: { tradeTrustPenalty: -5 } },
  { id: 'budget_cut', label: 'Budget Cut', effect: { scoutBudgetMult: 0.75 } },
] as const;

// ── Hot Seat Check ─────────────────────────────────────

export interface HotSeatStatus {
  onHotSeat: boolean;
  reason: string;
  severity: number;
}

export function checkHotSeat(ownerMood: number, patience: number): HotSeatStatus {
  if (ownerMood < 25 && patience < 30) {
    return { onHotSeat: true, reason: 'Owner furious and out of patience.', severity: 3 };
  }
  if (ownerMood < 35 || patience < 40) {
    return { onHotSeat: true, reason: ownerMood < 35 ? 'Owner mood critically low.' : 'Owner patience running out.', severity: 2 };
  }
  return { onHotSeat: false, reason: '', severity: 0 };
}
