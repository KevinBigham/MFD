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

// ── Decision Forecast ─────────────────────────────────

export type ContractDecisionAction =
  | 'hold'
  | 'restructure'
  | 'backload'
  | 'standard_cut'
  | 'post_june_1_cut';

export type ContractDecisionSeverity = 'low' | 'medium' | 'high';

export interface ContractDecisionForecastOptions {
  currentCapSpace?: number;
  voidYears?: number;
  game?: GameState | null;
}

export interface ContractDecisionForecast {
  recommendedAction: ContractDecisionAction;
  actionLabel: string;
  severity: ContractDecisionSeverity;
  reversible: boolean;
  capSpaceDelta: number;
  currentYearDeadCapDelta: number;
  futureDeadCapDelta: number;
  immediateImpact: string;
  thisSeasonImpact: string;
  futureImpact: string;
  risk: string;
  ownerReaction: string;
  playerReaction: string;
  mediaReaction: string;
  uncertainty: string;
  warnings: string[];
}

const ACTION_LABELS: Record<ContractDecisionAction, string> = {
  hold: 'Hold',
  restructure: 'Restructure',
  backload: 'Backload',
  standard_cut: 'Standard cut',
  post_june_1_cut: 'Post-June 1 cut',
};

function actionSeverity(
  action: ContractDecisionAction,
  capSpaceDelta: number,
  futureDeadCapDelta: number,
  currentCapSpace?: number,
): ContractDecisionSeverity {
  if (action === 'standard_cut' || action === 'post_june_1_cut') return 'high';
  if (action === 'backload' || futureDeadCapDelta >= 8) return 'medium';
  if ((currentCapSpace ?? 99) < 5 && capSpaceDelta < 4) return 'medium';
  return 'low';
}

function chooseForecastAction(
  restructure: RestructureEligibility,
  backload: BackloadEligibility,
  standardCut: CutImpact,
  postJune1: PostJune1Impact,
  currentCapSpace?: number,
): ContractDecisionAction {
  const urgent = (currentCapSpace ?? 99) < 8;

  if (restructure.eligible && restructure.savings >= 2) {
    return 'restructure';
  }

  if (backload.eligible && backload.savings >= (urgent ? 2 : 4)) {
    return 'backload';
  }

  if (
    postJune1.eligible
    && postJune1.capSavings >= (urgent ? 4 : 8)
    && postJune1.currentYearDead < standardCut.deadCap
  ) {
    return 'post_june_1_cut';
  }

  if (
    standardCut.eligible
    && standardCut.capSavings >= (urgent ? 4 : 8)
    && standardCut.deadCap <= standardCut.currentHit * 0.7
  ) {
    return 'standard_cut';
  }

  return 'hold';
}

/**
 * Build a one-screen forecast for the safest financial action on a contract.
 * This is cap-only guidance: roster quality, depth, and team identity should
 * still be checked before committing cut or trade-like moves.
 */
export function buildContractDecisionForecast(
  contract: Contract | null,
  startYear: number,
  options: ContractDecisionForecastOptions = {},
): ContractDecisionForecast {
  const voidYears = Math.max(1, Math.min(3, Math.floor(options.voidYears ?? 1)));
  const restructure = evaluateRestructureEligibility(contract);
  const backload = evaluateBackloadEligibility(contract, voidYears);
  const standardCut = evaluateStandardCutImpact(contract);
  const postJune1 = evaluatePostJune1CutImpact(contract);
  const projection = projectContractCap(contract, startYear, 3, options.game);

  if (!contract) {
    return {
      recommendedAction: 'hold',
      actionLabel: ACTION_LABELS.hold,
      severity: 'low',
      reversible: true,
      capSpaceDelta: 0,
      currentYearDeadCapDelta: 0,
      futureDeadCapDelta: 0,
      immediateImpact: 'No active contract is available for a cap move.',
      thisSeasonImpact: 'The current cap sheet is unchanged.',
      futureImpact: 'No future charge changes are projected.',
      risk: 'Load a contracted player before committing a contract action.',
      ownerReaction: 'Ownership sees no financial change.',
      playerReaction: 'Player camp receives no new signal.',
      mediaReaction: 'No cap story is created.',
      uncertainty: 'None until a player contract is selected.',
      warnings: ['No contract selected.'],
    };
  }

  const recommendedAction = chooseForecastAction(
    restructure,
    backload,
    standardCut,
    postJune1,
    options.currentCapSpace,
  );

  const capSpaceDelta = recommendedAction === 'restructure'
    ? restructure.savings
    : recommendedAction === 'backload'
      ? backload.savings
      : recommendedAction === 'standard_cut'
        ? standardCut.capSavings
        : recommendedAction === 'post_june_1_cut'
          ? postJune1.capSavings
          : 0;

  const currentYearDeadCapDelta = recommendedAction === 'standard_cut'
    ? standardCut.deadCap
    : recommendedAction === 'post_june_1_cut'
      ? postJune1.currentYearDead
      : 0;

  const futureDeadCapDelta = recommendedAction === 'post_june_1_cut'
    ? postJune1.nextYearDead
    : recommendedAction === 'backload'
      ? Math.max(0, (backload.totalVoidYears - (contract.voidYears ?? 0)) * round2(contract.prorated))
      : 0;

  const warnings: string[] = [];
  if (recommendedAction === 'hold') warnings.push('No clear cap-only move beats holding the contract.');
  if (backload.totalVoidYears >= 3) warnings.push('Void-year flexibility will be exhausted.');
  if (standardCut.deadCap > standardCut.currentHit) warnings.push('Standard cut costs cap space because dead money exceeds the current hit.');
  if (futureDeadCapDelta >= 8) warnings.push('Future dead money pressure is material.');
  if ((options.currentCapSpace ?? 99) < 0 && capSpaceDelta <= 0) warnings.push('Team remains over the cap after this forecast.');

  const severity = actionSeverity(recommendedAction, capSpaceDelta, futureDeadCapDelta, options.currentCapSpace);
  const reversible = recommendedAction === 'hold';
  const nextYear = projection[1];
  const nextYearNote = nextYear && !nextYear.expired
    ? `Next-year contract charge remains $${nextYear.contractHit}M before any future move.`
    : 'The contract is not projected as an active next-year charge.';

  if (recommendedAction === 'restructure') {
    return {
      recommendedAction,
      actionLabel: ACTION_LABELS[recommendedAction],
      severity,
      reversible,
      capSpaceDelta: round2(capSpaceDelta),
      currentYearDeadCapDelta,
      futureDeadCapDelta,
      immediateImpact: `Creates $${round2(capSpaceDelta)}M of current-year cap space by converting salary into bonus proration.`,
      thisSeasonImpact: 'Keeps the player on the roster while improving short-term flexibility.',
      futureImpact: `${nextYearNote} More bonus proration is now attached to the deal.`,
      risk: 'The move is hard to unwind and makes a future separation more expensive.',
      ownerReaction: 'Ownership sees a cleaner current cap sheet without losing a starter.',
      playerReaction: 'Player camp usually welcomes guaranteed money moving forward.',
      mediaReaction: 'Media frames it as win-now accounting unless the team keeps pushing charges.',
      uncertainty: 'Future risk depends on health, age curve, and whether the player remains worth the added proration.',
      warnings,
    };
  }

  if (recommendedAction === 'backload') {
    return {
      recommendedAction,
      actionLabel: ACTION_LABELS[recommendedAction],
      severity,
      reversible,
      capSpaceDelta: round2(capSpaceDelta),
      currentYearDeadCapDelta,
      futureDeadCapDelta: round2(futureDeadCapDelta),
      immediateImpact: `Creates $${round2(capSpaceDelta)}M of current-year cap space by pushing charge into void-year accounting.`,
      thisSeasonImpact: 'Improves short-term cap space, but the roster still carries the same player-performance risk.',
      futureImpact: `${nextYearNote} Void-year charges reduce future optionality.`,
      risk: 'Backloading is a future-flexibility tradeoff, not true savings.',
      ownerReaction: 'Ownership likes the cap space now and questions the future bill later.',
      playerReaction: 'Player camp sees more guaranteed structure and less cut flexibility for the club.',
      mediaReaction: 'Media treats repeated void-year use as pressure on the next team-building window.',
      uncertainty: 'The risk depends on whether the player outperforms the pushed charges.',
      warnings,
    };
  }

  if (recommendedAction === 'standard_cut') {
    return {
      recommendedAction,
      actionLabel: ACTION_LABELS[recommendedAction],
      severity,
      reversible,
      capSpaceDelta: round2(capSpaceDelta),
      currentYearDeadCapDelta: round2(currentYearDeadCapDelta),
      futureDeadCapDelta,
      immediateImpact: `Frees $${round2(capSpaceDelta)}M now and adds $${round2(currentYearDeadCapDelta)}M of current-year dead money.`,
      thisSeasonImpact: 'Creates cap space immediately, but roster depth and locker-room morale take the hit when the replacement job is unassigned.',
      futureImpact: 'Future cap is cleaner than a post-June split, assuming no replacement overpay follows.',
      risk: 'Preview Depth Chart before cutting; a correct cap cut still leaves a needed backup or rotation role uncovered.',
      ownerReaction: 'Ownership sees decisive cost control.',
      playerReaction: 'Player camp reacts negatively because the separation is immediate.',
      mediaReaction: 'Media will compare the savings to the lost on-field value.',
      uncertainty: 'Replacement cost and waiver-market depth decide whether the savings survive contact with the season.',
      warnings,
    };
  }

  if (recommendedAction === 'post_june_1_cut') {
    return {
      recommendedAction,
      actionLabel: ACTION_LABELS[recommendedAction],
      severity,
      reversible,
      capSpaceDelta: round2(capSpaceDelta),
      currentYearDeadCapDelta: round2(currentYearDeadCapDelta),
      futureDeadCapDelta: round2(futureDeadCapDelta),
      immediateImpact: `Frees $${round2(capSpaceDelta)}M now while charging only $${round2(currentYearDeadCapDelta)}M dead cap this year.`,
      thisSeasonImpact: 'Maximizes current cap space, but roster depth still changes immediately.',
      futureImpact: `Pushes $${round2(futureDeadCapDelta)}M of dead money into next year.`,
      risk: 'This is useful for an urgent cap crunch, but it borrows flexibility from the next offseason.',
      ownerReaction: 'Ownership sees urgent cap relief with a visible future bill.',
      playerReaction: 'Player camp still treats it as a release.',
      mediaReaction: 'Media will note the deferred charge if the next offseason gets tight.',
      uncertainty: 'The future bill is fixed; the uncertain part is replacement cost and player decline.',
      warnings,
    };
  }

  return {
    recommendedAction,
    actionLabel: ACTION_LABELS[recommendedAction],
    severity,
    reversible,
    capSpaceDelta: 0,
    currentYearDeadCapDelta: 0,
    futureDeadCapDelta: 0,
    immediateImpact: 'Holding keeps the live ledger unchanged.',
    thisSeasonImpact: 'The player remains in place and cap space does not improve from this contract.',
    futureImpact: `${nextYearNote} Re-evaluate after performance, injuries, or cap needs change.`,
    risk: 'Waiting keeps the contract unchanged, but future restructure or cut options shrink after contract years advance or replacement prices rise.',
    ownerReaction: 'Ownership sees patience instead of forced accounting.',
    playerReaction: 'Player camp receives a stability signal.',
    mediaReaction: 'Media has little to chase unless the cap sheet is already strained.',
    uncertainty: 'The value of holding depends on production, durability, and future cap pressure.',
    warnings,
  };
}

// ── Exports for Min Salary (UI convenience) ────────────

export const CONTRACT_TOOLS_MIN_SALARY = MIN_SALARY;
