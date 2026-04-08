/**
 * MFD Contract System
 *
 * Core contract creation, cap hit calculation, restructuring,
 * and contract value assessment.
 */

import { MIN_SALARY, getMinSalary } from '../config/cap-math';
import { cl } from '../utils';
import type { BonusSlice, Contract, ContractYear, GuaranteeEntry, GuaranteeType, Position, Player } from '../types';

// ── Contract Creation ──────────────────────────────────

export function makeContract(
  salary: number,
  years: number,
  signingBonus: number,
  guaranteed: number,
  playerId = '',
  teamId = '',
): Contract {
  const pro = years > 0 ? signingBonus / years : 0;
  const breakdown: ContractYear[] = [];

  // Build bonus slices — one per year for signing bonus amortization
  const slices: BonusSlice[] = [];
  for (let i = 0; i < years; i++) {
    if (pro > 0) {
      slices.push({ sourceOp: 'signing', season: i, amount: Math.round(pro * 100) / 100 });
    }
  }

  // Build guarantee schedule
  const guaranteeSchedule: GuaranteeEntry[] = [];
  for (let i = 0; i < years; i++) {
    const isGuaranteed = i === 0 ? true : guaranteed > salary * (i + 1);
    if (isGuaranteed) {
      const gType: GuaranteeType = i <= 1 ? 'GAS' : 'RDG';
      guaranteeSchedule.push({
        year: i,
        type: gType,
        amount: salary + pro,
        vestedAt: gType === 'RDG' ? 'roster_week_1' : undefined,
      });
    }
  }

  for (let i = 0; i < years; i++) {
    const isGuaranteed = i === 0 ? true : guaranteed > salary * (i + 1);
    const gType: GuaranteeType | undefined = isGuaranteed ? (i <= 1 ? 'GAS' : 'RDG') : undefined;
    breakdown.push({
      year: i,
      baseSalary: salary,
      capHit: salary + pro,
      deadCap: pro * (years - i),
      guaranteed: isGuaranteed,
      guaranteeType: gType,
    });
  }

  return {
    playerId,
    teamId,
    years,
    totalValue: salary * years + signingBonus,
    yearlyBreakdown: breakdown,
    baseSalary: salary,
    guaranteed,
    signingBonus,
    prorated: pro,
    originalYears: years,
    voidYears: 0,
    restructured: false,
    franchiseTag: null,
    incentives: [],
    slices,
    guaranteeSchedule,
  };
}

// ── Cap Math ───────────────────────────────────────────

export function calcCapHit(c: Contract | null): number {
  if (!c) return 0;
  return c.baseSalary + c.prorated;
}

export function calcDeadMoney(c: Contract | null): number {
  if (!c) return 0;
  return c.prorated * c.years;
}

// ── Restructure ────────────────────────────────────────

export interface RestructureResult {
  ok: boolean;
  msg: string;
  savings: number;
  addedPro: number;
  years: number;
  newHit: number;
}

export function restructureContract(player: { contract: Contract | null }): RestructureResult {
  const c = player.contract;
  if (!c || c.years <= 1) {
    return { ok: false, msg: 'Cannot restructure: contract too short.', savings: 0, addedPro: 0, years: 0, newHit: 0 };
  }
  if (c.restructured) {
    return { ok: false, msg: 'Already restructured this contract.', savings: 0, addedPro: 0, years: 0, newHit: 0 };
  }

  const convertible = c.baseSalary - MIN_SALARY;
  if (convertible <= 0) {
    return { ok: false, msg: 'Base salary too low to restructure.', savings: 0, addedPro: 0, years: 0, newHit: 0 };
  }

  const spreadYears = Math.min(c.years, 5);
  const addedPro = convertible / spreadYears;
  const oldHit = calcCapHit(c);

  c.baseSalary = MIN_SALARY;
  c.prorated += addedPro;
  c.restructured = true;
  c.guaranteed += convertible;

  // Add restructure bonus slices
  if (!c.slices) c.slices = [];
  for (let i = 0; i < spreadYears; i++) {
    c.slices.push({
      sourceOp: 'restructure',
      season: i,
      amount: Math.round(addedPro * 100) / 100,
    });
  }

  const newHit = calcCapHit(c);
  const savings = oldHit - newHit;

  rebuildBreakdown(c);

  return { ok: true, msg: 'Contract restructured.', savings, addedPro, years: spreadYears, newHit };
}

// ── Backload (Void Years) ──────────────────────────────

export interface BackloadResult {
  ok: boolean;
  msg: string;
  savings: number;
  voidYears: number;
  newHit: number;
}

export function backloadContract(
  player: { contract: Contract | null },
  voidYears: number,
): BackloadResult {
  const c = player.contract;
  if (!c || c.years <= 1) {
    return { ok: false, msg: 'Cannot backload: contract too short.', savings: 0, voidYears: 0, newHit: 0 };
  }

  const maxVoid = 3;
  const actualVoid = cl(voidYears, 1, maxVoid);
  const convertible = c.baseSalary * 0.4;
  if (convertible <= 0) {
    return { ok: false, msg: 'Base salary too low to backload.', savings: 0, voidYears: 0, newHit: 0 };
  }

  const spreadYears = c.years + actualVoid;
  const addedPro = convertible / spreadYears;
  const oldHit = calcCapHit(c);

  c.baseSalary -= convertible;
  c.prorated += addedPro;
  c.voidYears += actualVoid;
  c.guaranteed += convertible;

  // Add backload bonus slices (including void years)
  if (!c.slices) c.slices = [];
  for (let i = 0; i < spreadYears; i++) {
    c.slices.push({
      sourceOp: 'backload',
      season: i,
      amount: Math.round(addedPro * 100) / 100,
    });
  }

  const newHit = calcCapHit(c);

  rebuildBreakdown(c);

  return { ok: true, msg: `Backloaded with ${actualVoid} void year(s).`, savings: oldHit - newHit, voidYears: actualVoid, newHit };
}

// ── Extend & Restructure ──────────────────────────────

export function extendAndRestructure(
  player: { contract: Contract | null },
  addYears: number,
): RestructureResult {
  const c = player.contract;
  if (!c) {
    return { ok: false, msg: 'No contract to extend.', savings: 0, addedPro: 0, years: 0, newHit: 0 };
  }

  const actualAdd = cl(addYears, 1, 3);
  const raise = c.baseSalary * 0.10;

  c.years += actualAdd;
  c.originalYears += actualAdd;
  c.baseSalary += raise;
  c.totalValue += (c.baseSalary * actualAdd);
  c.restructured = false;

  rebuildBreakdown(c);

  return restructureContract(player);
}

// ── Contract Valuation ─────────────────────────────────

export const CONTRACT_VALUE_TABLE: Record<Position, { elite: number; starter: number; backup: number }> = {
  QB: { elite: 18, starter: 10, backup: 4 },
  RB: { elite: 7, starter: 4, backup: 1.5 },
  WR: { elite: 12, starter: 7, backup: 2.5 },
  TE: { elite: 8, starter: 5, backup: 2 },
  OL: { elite: 10, starter: 6, backup: 2.5 },
  DL: { elite: 12, starter: 7, backup: 3 },
  LB: { elite: 10, starter: 6, backup: 2.5 },
  CB: { elite: 11, starter: 6, backup: 2 },
  S:  { elite: 8, starter: 5, backup: 2 },
  K:  { elite: 3, starter: 2, backup: 0.8 },
  P:  { elite: 2.5, starter: 1.5, backup: 0.7 },
};

export const AGE_VALUE_CURVE: Record<Position, readonly number[]> = {
  QB: [0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 0.98, 0.95, 0.9, 0.85, 0.78, 0.7, 0.6, 0.5, 0.4, 0.3],
  RB: [0.8, 0.9, 1.0, 1.0, 0.95, 0.88, 0.78, 0.65, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1, 0.1, 0.1, 0.1],
  WR: [0.7, 0.8, 0.9, 0.95, 1.0, 1.0, 0.95, 0.88, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1],
  TE: [0.65, 0.75, 0.85, 0.9, 0.95, 1.0, 1.0, 0.95, 0.88, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.15, 0.1],
  OL: [0.6, 0.7, 0.8, 0.88, 0.95, 1.0, 1.0, 0.98, 0.95, 0.9, 0.85, 0.78, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2],
  DL: [0.65, 0.75, 0.85, 0.92, 0.98, 1.0, 1.0, 0.95, 0.9, 0.82, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25, 0.2, 0.15],
  LB: [0.7, 0.8, 0.9, 0.95, 1.0, 1.0, 0.95, 0.88, 0.8, 0.72, 0.62, 0.52, 0.42, 0.32, 0.25, 0.2, 0.15, 0.1],
  CB: [0.75, 0.85, 0.95, 1.0, 1.0, 0.95, 0.88, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1, 0.1],
  S:  [0.7, 0.8, 0.9, 0.95, 1.0, 1.0, 0.95, 0.9, 0.82, 0.72, 0.62, 0.52, 0.42, 0.32, 0.25, 0.2, 0.15, 0.1],
  K:  [0.6, 0.7, 0.8, 0.9, 0.95, 1.0, 1.0, 1.0, 0.98, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3],
  P:  [0.6, 0.7, 0.8, 0.9, 0.95, 1.0, 1.0, 1.0, 0.98, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3],
};

export interface ContractScore {
  score: number;
  grade: string;
  surplus: number;
  annualCapPct: number;
  fairValue: number;
}

export function calcContractScore(
  ovr: number, pos: Position, age: number,
  years: number, totalValue: number, capTotal: number,
): ContractScore {
  const table = CONTRACT_VALUE_TABLE[pos] ?? CONTRACT_VALUE_TABLE.WR;
  const tier = ovr >= 85 ? 'elite' : ovr >= 72 ? 'starter' : 'backup';
  const baseVal = table[tier];

  const ageIdx = cl(age - 21, 0, 17);
  const curve = AGE_VALUE_CURVE[pos] ?? AGE_VALUE_CURVE.WR;
  const ageMult = curve[ageIdx] ?? 0.5;

  const fairValue = baseVal * ageMult * years;
  const annualCapPct = capTotal > 0 ? (totalValue / years / capTotal) * 100 : 0;
  const surplus = fairValue - totalValue;

  const raw = cl(50 + surplus * 5, 0, 100);
  const score = Math.round(raw);
  const grade = score >= 95 ? 'A+' : score >= 88 ? 'A' : score >= 80 ? 'B+'
    : score >= 72 ? 'B' : score >= 64 ? 'C+' : score >= 55 ? 'C'
    : score >= 45 ? 'D' : 'F';

  return { score, grade, surplus: Math.round(surplus * 10) / 10, annualCapPct: Math.round(annualCapPct * 10) / 10, fairValue: Math.round(fairValue * 10) / 10 };
}

// ── Dead Cap Calculator ────────────────────────────────

export interface DeadCapResult {
  deadCapHit: number;
  capSavings: number;
  netCapImpact: number;
}

export function calcDeadCap(
  totalGuaranteed: number,
  yearsRemaining: number,
  yearsCut: number,
): DeadCapResult {
  const remaining = Math.max(0, yearsRemaining - yearsCut);
  const deadCapHit = remaining > 0 ? totalGuaranteed / yearsRemaining * remaining : totalGuaranteed;
  const capSavings = totalGuaranteed - deadCapHit;
  return {
    deadCapHit: Math.round(deadCapHit * 100) / 100,
    capSavings: Math.round(capSavings * 100) / 100,
    netCapImpact: Math.round((deadCapHit - capSavings) * 100) / 100,
  };
}

// ── Helpers ────────────────────────────────────────────

function rebuildBreakdown(c: Contract): void {
  c.yearlyBreakdown = [];
  for (let i = 0; i < c.years; i++) {
    const isGuaranteed = c.guaranteed > c.baseSalary * (i + 1);
    const gType: GuaranteeType | undefined = isGuaranteed ? (i <= 1 ? 'GAS' : 'RDG') : undefined;
    c.yearlyBreakdown.push({
      year: i,
      baseSalary: c.baseSalary,
      capHit: c.baseSalary + c.prorated,
      deadCap: c.prorated * (c.years - i),
      guaranteed: isGuaranteed,
      guaranteeType: gType,
    });
  }
}
