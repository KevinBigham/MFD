/**
 * MFD Contract Tools — Pure Preview API
 *
 * Per-contract preview helpers for the front-office "Contract Tools" screen.
 * Every function accepts a `Contract | null` and returns a preview struct
 * with an `eligible` flag + human-readable `reason`. No inputs are mutated.
 *
 * Complements `cap-laboratory.ts` (scenario-builder, multi-move) by giving
 * the UI cheap per-player previews with eligibility rationale suitable for
 * disabled-state tooltips.
 */

import { MIN_SALARY } from '../config/cap-math';
import { getSalaryCap } from '../config';
import { restructureContract, backloadContract, calcCapHit } from './contracts';
import { v36DeadIfCut, calcDeadMoneyFromSlices, voidYearDeadCap } from './contract-helpers';
import type { Contract, GameState } from '../types';

// ── Internal helpers ───────────────────────────────────

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function annualCapHit(contract: Contract): number {
  return round2(contract.baseSalary + contract.prorated);
}

function cloneContract(contract: Contract): Contract {
  return structuredClone(contract);
}

// ── Restructure Preview ────────────────────────────────

export interface RestructureEligibility {
  eligible: boolean;
  reason: string;
  currentHit: number;
  projectedHit: number;
  savings: number;
  addedProration: number;
  spreadYears: number;
}

const EMPTY_RESTRUCTURE: RestructureEligibility = {
  eligible: false,
  reason: 'No contract.',
  currentHit: 0,
  projectedHit: 0,
  savings: 0,
  addedProration: 0,
  spreadYears: 0,
};

/**
 * Preview what a standard restructure would do to this contract.
 * Returns eligibility + projected savings without mutating the input.
 */
export function evaluateRestructureEligibility(
  contract: Contract | null,
): RestructureEligibility {
  if (!contract) return { ...EMPTY_RESTRUCTURE };

  const currentHit = annualCapHit(contract);
  const clone = cloneContract(contract);
  const result = restructureContract({ contract: clone });

  if (!result.ok) {
    return {
      eligible: false,
      reason: result.msg,
      currentHit,
      projectedHit: currentHit,
      savings: 0,
      addedProration: 0,
      spreadYears: 0,
    };
  }

  return {
    eligible: true,
    reason: 'Restructure available.',
    currentHit,
    projectedHit: round2(result.newHit),
    savings: round2(result.savings),
    addedProration: round2(result.addedPro),
    spreadYears: result.years,
  };
}

// ── Backload Preview ───────────────────────────────────

export interface BackloadEligibility {
  eligible: boolean;
  reason: string;
  currentHit: number;
  projectedHit: number;
  savings: number;
  voidYearsAdded: number;
  totalVoidYears: number;
}

const EMPTY_BACKLOAD: BackloadEligibility = {
  eligible: false,
  reason: 'No contract.',
  currentHit: 0,
  projectedHit: 0,
  savings: 0,
  voidYearsAdded: 0,
  totalVoidYears: 0,
};

/**
 * Preview what backloading this contract with N void years would do.
 * Returns eligibility + projected savings without mutating the input.
 */
export function evaluateBackloadEligibility(
  contract: Contract | null,
  voidYears: number,
): BackloadEligibility {
  if (!contract) return { ...EMPTY_BACKLOAD };

  const currentHit = annualCapHit(contract);
  const currentVoids = contract.voidYears ?? 0;

  if (currentVoids >= 3) {
    return {
      eligible: false,
      reason: 'Void year limit reached (max 3).',
      currentHit,
      projectedHit: currentHit,
      savings: 0,
      voidYearsAdded: 0,
      totalVoidYears: currentVoids,
    };
  }

  const clone = cloneContract(contract);
  const result = backloadContract({ contract: clone }, voidYears);

  if (!result.ok) {
    return {
      eligible: false,
      reason: result.msg,
      currentHit,
      projectedHit: currentHit,
      savings: 0,
      voidYearsAdded: 0,
      totalVoidYears: currentVoids,
    };
  }

  return {
    eligible: true,
    reason: `Backload adds ${result.voidYears} void year(s).`,
    currentHit,
    projectedHit: round2(result.newHit),
    savings: round2(result.savings),
    voidYearsAdded: result.voidYears,
    totalVoidYears: currentVoids + result.voidYears,
  };
}

// ── Standard Cut Preview ───────────────────────────────

export interface CutImpact {
  eligible: boolean;
  reason: string;
  currentHit: number;
  deadCap: number;
  capSavings: number;
}

const EMPTY_CUT: CutImpact = {
  eligible: false,
  reason: 'No contract.',
  currentHit: 0,
  deadCap: 0,
  capSavings: 0,
};

/**
 * Preview the cap impact of cutting this player under standard rules
 * (all dead money accelerates into the current season). Pure.
 */
export function evaluateStandardCutImpact(contract: Contract | null): CutImpact {
  if (!contract) return { ...EMPTY_CUT };

  const currentHit = annualCapHit(contract);
  const deadCap = round2(v36DeadIfCut(contract));
  const capSavings = round2(currentHit - deadCap);

  return {
    eligible: true,
    reason: capSavings >= 0 ? 'Cut frees cap space.' : 'Cut costs cap space (dead cap > current hit).',
    currentHit,
    deadCap,
    capSavings,
  };
}

// ── Post-June 1 Cut Preview ────────────────────────────

export interface PostJune1Impact {
  eligible: boolean;
  reason: string;
  currentHit: number;
  deadCap: number;
  capSavings: number;
  currentYearDead: number;
  nextYearDead: number;
}

const EMPTY_POST_JUNE_1: PostJune1Impact = {
  eligible: false,
  reason: 'No contract.',
  currentHit: 0,
  deadCap: 0,
  capSavings: 0,
  currentYearDead: 0,
  nextYearDead: 0,
};

/**
 * Preview the cap impact of cutting this player as a post-June-1 designation.
 * Current-year dead = this season's proration only; remaining proration
 * accelerates into the following league year. Pure — does NOT mutate team state.
 */
export function evaluatePostJune1CutImpact(contract: Contract | null): PostJune1Impact {
  if (!contract) return { ...EMPTY_POST_JUNE_1 };

  const currentHit = annualCapHit(contract);
  const currentYearDead = round2(contract.prorated);
  const remainingProration = round2(Math.max(0, contract.prorated * Math.max(0, contract.years - 1)));
  const voidTail = round2(voidYearDeadCap(contract));
  const nextYearDead = round2(remainingProration + voidTail);
  const deadCap = round2(currentYearDead + nextYearDead);
  const capSavings = round2(Math.max(0, currentHit - currentYearDead));

  return {
    eligible: true,
    reason: 'Post-June 1 defers accelerated prorated bonus into next league year.',
    currentHit,
    deadCap,
    capSavings,
    currentYearDead,
    nextYearDead,
  };
}

// ── Multi-Year Contract Cap Projection ─────────────────

export interface ContractCapProjectionYear {
  year: number;
  salaryCap: number;
  contractHit: number;
  deadIfCut: number;
  capSavingsIfCut: number;
  expired: boolean;
}

/**
 * Project per-season cap hit + dead-if-cut for this contract over the
 * next `seasons` years starting at `startYear`. If the contract expires
 * mid-window, later entries return zeros with `expired: true`.
 * Pure — does not mutate the contract.
 */
export function projectContractCap(
  contract: Contract | null,
  startYear: number,
  seasons: number,
  game?: GameState | null,
): ContractCapProjectionYear[] {
  const clampedSeasons = Math.max(0, Math.floor(seasons));
  if (!contract) {
    return Array.from({ length: clampedSeasons }, (_, offset) => ({
      year: startYear + offset,
      salaryCap: getSalaryCap(startYear + offset, game ?? null),
      contractHit: 0,
      deadIfCut: 0,
      capSavingsIfCut: 0,
      expired: true,
    }));
  }

  return Array.from({ length: clampedSeasons }, (_, offset) => {
    const year = startYear + offset;
    const salaryCap = getSalaryCap(year, game ?? null);
    const expired = offset >= contract.years;
    const yearsLeft = Math.max(0, contract.years - offset);

    if (expired) {
      return {
        year,
        salaryCap,
        contractHit: 0,
        deadIfCut: 0,
        capSavingsIfCut: 0,
        expired: true,
      };
    }

    const contractHit = round2(contract.baseSalary + contract.prorated);
    const remainingProration = round2(contract.prorated * yearsLeft);
    const voidTail = round2(voidYearDeadCap(contract));
    const sliceDead = round2(calcDeadMoneyFromSlices(contract));
    // deadIfCut: use slice-aware calculation when available, otherwise prorated remaining
    const deadIfCut = round2(
      Math.max(
        remainingProration + voidTail,
        contract.slices?.length ? sliceDead + voidTail : 0,
      ),
    );
    const capSavingsIfCut = round2(contractHit - deadIfCut);

    return {
      year,
      salaryCap,
      contractHit,
      deadIfCut,
      capSavingsIfCut,
      expired: false,
    };
  });
}

// ── Exports for Min Salary (UI convenience) ────────────

export const CONTRACT_TOOLS_MIN_SALARY = MIN_SALARY;
