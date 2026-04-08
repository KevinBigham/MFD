/**
 * MFD Contract Helpers
 *
 * Cap hit variants, dead cap splitting, trade impact analysis,
 * and void year management.
 */

import { calcCapHit, calcDeadMoney, makeContract } from './contracts';
import { cl } from '../utils';
import type { BonusSlice, Contract, Player, Team, DeadCapByYear, SeasonPhase } from '../types';

// ── Void Year Dead Cap ─────────────────────────────────

export function voidYearDeadCap(c: Contract | null): number {
  if (!c || !c.voidYears) return 0;
  return c.prorated * c.voidYears;
}

// ── Slice-Aware Dead Money ─────────────────────────────

export function calcDeadMoneyFromSlices(c: Contract | null): number {
  if (!c) return 0;
  if (!c.slices?.length) return calcDeadMoney(c);
  return Math.round(c.slices.reduce((sum, s) => sum + s.amount, 0) * 100) / 100;
}

export interface DeadMoneyExplanation {
  source: 'signing' | 'restructure' | 'backload' | 'extension';
  season: number;
  amount: number;
}

export function explainDeadMoney(c: Contract | null): DeadMoneyExplanation[] {
  if (!c?.slices?.length) {
    if (!c || c.prorated <= 0) return [];
    // Synthetic explanation for old contracts without slices
    const entries: DeadMoneyExplanation[] = [];
    for (let i = 0; i < c.years; i++) {
      entries.push({ source: 'signing', season: i, amount: Math.round(c.prorated * 100) / 100 });
    }
    return entries;
  }
  return c.slices.map((s) => ({
    source: s.sourceOp,
    season: s.season,
    amount: s.amount,
  }));
}

// ── V36 Cap Hit Variants ───────────────────────────────

export function v36CapHit(c: Contract | null, _yrOff = 0): number {
  if (!c) return 0;
  return c.baseSalary + c.prorated;
}

export function v36CashPaid(c: Contract | null, yrOff = 0, isSigning = false): number {
  if (!c) return 0;
  const base = c.baseSalary;
  return isSigning ? base + c.signingBonus : base;
}

export function v36DeadIfCut(c: Contract | null): number {
  if (!c) return 0;
  return calcDeadMoneyFromSlices(c) + voidYearDeadCap(c);
}

export function v36DeadIfTraded(c: Contract | null): number {
  if (!c) return 0;
  if (c.slices?.length) {
    return calcDeadMoneyFromSlices(c) + voidYearDeadCap(c);
  }
  return c.prorated * c.years + voidYearDeadCap(c);
}

export function v36TradeSavings(c: Contract | null): number {
  if (!c) return 0;
  return v36CapHit(c) - v36DeadIfTraded(c);
}

// ── Dead Cap Splitting ─────────────────────────────────

export interface DeadCapSplit {
  now: number;
  next: number;
  postDeadline: boolean;
}

export function splitDeadCapCharge(
  deadAmt: number,
  phase: SeasonPhase,
  week: number,
): DeadCapSplit {
  if (phase === 'regular_season' && week > 10) {
    const half = Math.round((deadAmt / 2) * 100) / 100;
    return { now: half, next: deadAmt - half, postDeadline: true };
  }
  return { now: deadAmt, next: 0, postDeadline: false };
}

export function applyDeadCapCharge(
  team: Team,
  year: number,
  split: DeadCapSplit,
): void {
  team.deadCap += split.now;
  if (!team.deadCapByYear) team.deadCapByYear = {};
  team.deadCapByYear[year] = (team.deadCapByYear[year] ?? 0) + split.now;
  if (split.next > 0) {
    team.deadCapByYear[year + 1] = (team.deadCapByYear[year + 1] ?? 0) + split.next;
  }
}

// ── Trade Impact ───────────────────────────────────────

export interface TradeImpact {
  deadMoney: number;
  newContract: Contract;
  capSavings: number;
}

export function calcTradeImpact(player: { contract: Contract | null }): TradeImpact {
  const c = player.contract;
  const deadMoney = v36DeadIfTraded(c);
  const capHit = v36CapHit(c);
  return {
    deadMoney,
    newContract: makeContract(c?.baseSalary ?? 1, c?.years ?? 1, 0, 0),
    capSavings: capHit - deadMoney,
  };
}

// ── Void Year Extension ────────────────────────────────

export interface VoidYearResult {
  ok: boolean;
  savings: number;
  voidYears: number;
  newHit: number;
  msg: string;
}

export function addVoidYears(
  player: { contract: Contract | null },
  numVoid: number,
): VoidYearResult {
  const c = player.contract;
  if (!c) return { ok: false, savings: 0, voidYears: 0, newHit: 0, msg: 'No contract.' };

  const maxTotal = 3;
  const maxAdd = 3;
  const current = c.voidYears ?? 0;
  const toAdd = cl(numVoid, 1, Math.min(maxAdd, maxTotal - current));

  if (toAdd <= 0) {
    return { ok: false, savings: 0, voidYears: current, newHit: v36CapHit(c), msg: 'Max void years reached.' };
  }

  const oldHit = v36CapHit(c);
  const totalBonus = c.signingBonus;
  const newSpread = c.years + current + toAdd;
  c.prorated = totalBonus / newSpread;
  c.voidYears = current + toAdd;
  const newHit = v36CapHit(c);

  return {
    ok: true,
    savings: oldHit - newHit,
    voidYears: c.voidYears,
    newHit,
    msg: `Added ${toAdd} void year(s).`,
  };
}

// ── Restructure Cascade ────────────────────────────────

export interface CascadeResult {
  totalSaved: number;
  playersRestructured: string[];
}

export function restructureCascade(
  team: Team,
  targetSavings: number,
): CascadeResult {
  let saved = 0;
  const restructured: string[] = [];

  const eligible = team.roster
    .filter((p) => p.contract && p.contract.years > 1 && !p.contract.restructured && p.contract.baseSalary > 2)
    .sort((a, b) => (b.contract?.baseSalary ?? 0) - (a.contract?.baseSalary ?? 0));

  for (const p of eligible) {
    if (saved >= targetSavings) break;
    const c = p.contract!;
    const convertible = c.baseSalary - 0.5;
    const spreadYears = Math.min(c.years, 5);
    const addedPro = convertible / spreadYears;
    const oldHit = v36CapHit(c);

    c.baseSalary = 0.5;
    c.prorated += addedPro;
    c.restructured = true;
    c.guaranteed += convertible;

    saved += oldHit - v36CapHit(c);
    restructured.push(p.name);
  }

  return { totalSaved: Math.round(saved * 100) / 100, playersRestructured: restructured };
}
