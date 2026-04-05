/**
 * MFD Coordinator Chemistry System
 *
 * HC-OC-DC pairing bonuses based on archetype synergy and scheme compatibility.
 * Cached on Team.staffChemistry, recalculated on staff changes.
 */

import type { TeamStaff, StaffMember } from '../types';
import { cl } from '../utils';

// ── Types ──────────────────────────────────────────────

export interface StaffChemistry {
  hcOcSynergy: number;
  hcDcSynergy: number;
  ocDcBalance: number;
  overall: number;
  narrative: string;
}

export interface ChemistryBonus {
  offenseMod: number;
  defenseMod: number;
  moraleMod: number;
  devBoost: number;
}

export interface FitScore {
  score: number;
  strengths: string[];
  concerns: string[];
  recommendation: 'excellent' | 'good' | 'neutral' | 'poor';
}

// ── Synergy Matrices ───────────────────────────────────

// HC archetype → OC specialty → synergy bonus (-10 to +20)
const HC_OC_MATRIX: Record<string, Record<string, number>> = {
  Strategist: {
    run_guru: 10, pass_arch: 15, rz_spec: 10, tempo: 5, play_action: 12,
  },
  Motivator: {
    run_guru: 8, pass_arch: 5, rz_spec: 8, tempo: 12, play_action: 10,
  },
  Disciplinarian: {
    run_guru: 15, pass_arch: 0, rz_spec: 5, tempo: -10, play_action: 8,
  },
};

// HC archetype → DC specialty → synergy bonus (-10 to +20)
const HC_DC_MATRIX: Record<string, Record<string, number>> = {
  Strategist: {
    blitz_des: 5, cov_spec: 15, run_stop: 10, turnover: 8, situational: 18,
  },
  Motivator: {
    blitz_des: 12, cov_spec: 5, run_stop: 8, turnover: 10, situational: 8,
  },
  Disciplinarian: {
    blitz_des: 8, cov_spec: 10, run_stop: 18, turnover: 5, situational: 12,
  },
};

// Aggressive vs conservative balance scoring
const AGGRESSIVE_SPECS = new Set(['blitz_des', 'turnover', 'tempo', 'pass_arch']);
const CONSERVATIVE_SPECS = new Set(['run_stop', 'cov_spec', 'run_guru', 'play_action', 'situational', 'rz_spec']);

// ── Narrative Templates ────────────────────────────────

function getChemistryNarrative(overall: number): string {
  if (overall >= 85) return 'Staff is in perfect sync — scheme alignment and mutual trust at the highest level.';
  if (overall >= 70) return 'Strong coaching cohesion. The staff operates as a well-oiled machine.';
  if (overall >= 55) return 'Coaching staff has solid working chemistry with room to grow.';
  if (overall >= 40) return 'Mixed signals from the coaching staff — some philosophical disagreements.';
  return 'Coaching friction is visible. Scheme clashes are hurting the product on the field.';
}

// ── Staff Chemistry ────────────────────────────────────

export function calculateStaffChemistry(staff: TeamStaff | null): StaffChemistry {
  if (!staff?.hc) {
    return { hcOcSynergy: 50, hcDcSynergy: 50, ocDcBalance: 50, overall: 50, narrative: getChemistryNarrative(50) };
  }

  const hc = staff.hc;
  const oc = staff.oc;
  const dc = staff.dc;

  // HC-OC synergy
  let hcOcSynergy = 50;
  if (oc?.specialty75) {
    const archetypeMatrix = HC_OC_MATRIX[hc.archetype];
    const bonus = archetypeMatrix?.[oc.specialty75.id] ?? 0;
    hcOcSynergy = cl(50 + bonus * 2, 0, 100);
  }

  // HC-DC synergy
  let hcDcSynergy = 50;
  if (dc?.specialty75) {
    const archetypeMatrix = HC_DC_MATRIX[hc.archetype];
    const bonus = archetypeMatrix?.[dc.specialty75.id] ?? 0;
    hcDcSynergy = cl(50 + bonus * 2, 0, 100);
  }

  // OC-DC balance (complementary styles rewarded)
  let ocDcBalance = 50;
  if (oc?.specialty75 && dc?.specialty75) {
    const ocAggressive = AGGRESSIVE_SPECS.has(oc.specialty75.id);
    const dcAggressive = AGGRESSIVE_SPECS.has(dc.specialty75.id);
    const ocConservative = CONSERVATIVE_SPECS.has(oc.specialty75.id);
    const dcConservative = CONSERVATIVE_SPECS.has(dc.specialty75.id);

    if ((ocAggressive && dcConservative) || (ocConservative && dcAggressive)) {
      ocDcBalance = 75; // Complementary — rewarded
    } else if (ocAggressive && dcAggressive) {
      ocDcBalance = 40; // Both aggressive — volatile
    } else if (ocConservative && dcConservative) {
      ocDcBalance = 55; // Both conservative — safe but limited
    }
  }

  // Overall: HC relationships weighted more heavily (40% each HC pair, 20% OC-DC)
  const overall = Math.round(hcOcSynergy * 0.4 + hcDcSynergy * 0.4 + ocDcBalance * 0.2);

  return {
    hcOcSynergy,
    hcDcSynergy,
    ocDcBalance,
    overall,
    narrative: getChemistryNarrative(overall),
  };
}

// ── Chemistry Bonus ────────────────────────────────────

export function getChemistryBonus(chemistry: StaffChemistry | null | undefined): ChemistryBonus {
  if (!chemistry) return { offenseMod: 0, defenseMod: 0, moraleMod: 0, devBoost: 0 };

  const { overall, hcOcSynergy, hcDcSynergy } = chemistry;

  let offenseMod = 0;
  let defenseMod = 0;
  let moraleMod = 0;
  let devBoost = 0;

  if (overall >= 80) {
    offenseMod = 2; defenseMod = 2; moraleMod = 2; devBoost = 1;
  } else if (overall >= 60) {
    offenseMod = 1; defenseMod = 1; moraleMod = 1; devBoost = 0;
  } else if (overall < 40) {
    offenseMod = -1; defenseMod = -1; moraleMod = -1; devBoost = 0;
  }

  // Extra offense mod for very high HC-OC synergy
  if (hcOcSynergy >= 85) offenseMod = cl(offenseMod + 1, -2, 3);
  // Extra defense mod for very high HC-DC synergy
  if (hcDcSynergy >= 85) defenseMod = cl(defenseMod + 1, -2, 3);

  return { offenseMod, defenseMod, moraleMod, devBoost };
}

// ── Coordinator Fit Evaluation ─────────────────────────

export function evaluateCoordinatorFit(
  candidate: StaffMember | null,
  existingStaff: TeamStaff | null,
  role: 'OC' | 'DC',
): FitScore {
  if (!candidate || !existingStaff?.hc) {
    return { score: 50, strengths: [], concerns: [], recommendation: 'neutral' };
  }

  const strengths: string[] = [];
  const concerns: string[] = [];

  // Calculate hypothetical chemistry
  const hypotheticalStaff: TeamStaff = {
    hc: existingStaff.hc,
    oc: role === 'OC' ? candidate : existingStaff.oc,
    dc: role === 'DC' ? candidate : existingStaff.dc,
  };

  const chemistry = calculateStaffChemistry(hypotheticalStaff);
  const synergy = role === 'OC' ? chemistry.hcOcSynergy : chemistry.hcDcSynergy;

  // Score from synergy (0-100 base)
  let score = synergy;

  // Archetype alignment check
  const matrix = role === 'OC' ? HC_OC_MATRIX : HC_DC_MATRIX;
  const specId = candidate.specialty75?.id;
  const archetypeBonus = specId ? (matrix[existingStaff.hc.archetype]?.[specId] ?? 0) : 0;

  if (archetypeBonus >= 12) strengths.push(`Strong scheme alignment with ${existingStaff.hc.archetype} HC`);
  else if (archetypeBonus >= 5) strengths.push(`Compatible coaching philosophy`);
  else if (archetypeBonus < 0) concerns.push(`Scheme clash with ${existingStaff.hc.archetype} HC`);

  // OC-DC balance check (if counterpart exists)
  const counterpart = role === 'OC' ? existingStaff.dc : existingStaff.oc;
  if (counterpart?.specialty75 && candidate.specialty75) {
    const candidateAggressive = AGGRESSIVE_SPECS.has(candidate.specialty75.id);
    const counterpartAggressive = AGGRESSIVE_SPECS.has(counterpart.specialty75.id);
    if (candidateAggressive !== counterpartAggressive) {
      strengths.push('Complementary style with existing coordinator');
      score = cl(score + 10, 0, 100);
    } else if (candidateAggressive && counterpartAggressive) {
      concerns.push('Both coordinators are aggressive — may create volatility');
      score = cl(score - 5, 0, 100);
    }
  }

  // Experience factor — use level as proxy for experience
  const exp = candidate.level ?? 5;
  if (exp >= 8) strengths.push('Veteran coordinator experience');
  if (exp <= 2) concerns.push('Limited coordinator experience');

  // Recommendation
  let recommendation: FitScore['recommendation'] = 'neutral';
  if (score >= 75) recommendation = 'excellent';
  else if (score >= 55) recommendation = 'good';
  else if (score < 35) recommendation = 'poor';

  return { score, strengths, concerns, recommendation };
}
