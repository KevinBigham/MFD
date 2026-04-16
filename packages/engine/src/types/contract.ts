/**
 * Contract-related types.
 *
 * Contract mechanics, guarantees, bonuses, and franchise tags.
 */

// ── Contracts ───────────────────────────────────────────

export type GuaranteeType = 'GAS' | 'RDG' | 'VT';

export interface BonusSlice {
  sourceOp: 'signing' | 'restructure' | 'backload' | 'extension';
  season: number;
  amount: number;
}

export interface GuaranteeEntry {
  year: number;
  type: GuaranteeType;
  amount: number;
  vestedAt?: string;
}

export interface RookieSlot {
  tier: number;
  salary: number;
  years: number;
  signingBonus: number;
  guaranteed: number;
  optionYear: boolean;
}

export interface Contract {
  playerId: string;
  teamId: string;
  years: number;
  totalValue: number;
  yearlyBreakdown: ContractYear[];
  baseSalary: number;
  guaranteed: number;
  signingBonus: number;
  prorated: number;
  originalYears: number;
  voidYears: number;
  restructured: boolean;
  franchiseTag: FranchiseTagType | null;
  incentives: Incentive[];
  slices?: BonusSlice[];
  guaranteeSchedule?: GuaranteeEntry[];
}

export interface ContractYear {
  year: number;
  baseSalary: number;
  capHit: number;
  deadCap: number;
  guaranteed: boolean;
  guaranteeType?: GuaranteeType;
}

export type FranchiseTagType = 'exclusive' | 'non-exclusive' | 'transition';

export interface Incentive {
  type: string;
  threshold: number;
  bonus: number;
  achieved: boolean;
}
