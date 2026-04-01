/**
 * MFD Scheme Fit System
 *
 * Calculates how well players fit into team schemes based on
 * rating profiles, personality, and coordinator specialties.
 */

import { getPersonality, traitScalar } from './personality';
import { OFF_SCHEMES, DEF_SCHEMES } from '../config/schemes';
import { cl } from '../utils';
import type { Player, Team, Position, CoordinatorSpecialty } from '../types';

// ── Scheme Fit Profiles ────────────────────────────────

interface SchemeProfile {
  key: readonly string[];
  wt: readonly number[];
}

type SchemeProfiles = Partial<Record<Position, SchemeProfile>>;

export const SCHEME_FIT: Record<string, SchemeProfiles> = {
  spread: {
    QB: { key: ['accuracy', 'speed', 'awareness'], wt: [40, 30, 20] },
    RB: { key: ['speed', 'catching', 'elusiveness'], wt: [35, 35, 20] },
    WR: { key: ['routeRunning', 'speed', 'catching'], wt: [35, 30, 25] },
    TE: { key: ['catching', 'routeRunning', 'speed'], wt: [35, 30, 25] },
    OL: { key: ['passBlock', 'awareness', 'footwork'], wt: [40, 30, 20] },
  },
  west_coast: {
    QB: { key: ['accuracy', 'awareness', 'decisionSpeed'], wt: [35, 35, 20] },
    RB: { key: ['catching', 'awareness', 'speed'], wt: [35, 30, 25] },
    WR: { key: ['routeRunning', 'catching', 'awareness'], wt: [35, 30, 25] },
    TE: { key: ['catching', 'routeRunning', 'runBlock'], wt: [30, 30, 30] },
    OL: { key: ['passBlock', 'awareness', 'runBlock'], wt: [35, 30, 25] },
  },
  power_run: {
    QB: { key: ['strength', 'awareness', 'accuracy'], wt: [25, 35, 30] },
    RB: { key: ['power', 'toughness', 'strength'], wt: [40, 30, 20] },
    WR: { key: ['runBlock', 'toughness', 'catching'], wt: [35, 30, 25] },
    TE: { key: ['runBlock', 'strength', 'toughness'], wt: [40, 30, 20] },
    OL: { key: ['runBlock', 'strength', 'power'], wt: [40, 30, 20] },
  },
  air_raid: {
    QB: { key: ['accuracy', 'arm', 'decisionSpeed'], wt: [35, 35, 20] },
    RB: { key: ['catching', 'speed', 'elusiveness'], wt: [35, 30, 25] },
    WR: { key: ['speed', 'routeRunning', 'catching'], wt: [35, 30, 25] },
    TE: { key: ['catching', 'speed', 'routeRunning'], wt: [35, 30, 25] },
    OL: { key: ['passBlock', 'footwork', 'awareness'], wt: [45, 30, 15] },
  },
  balanced: {
    QB: { key: ['awareness', 'accuracy', 'decisionSpeed'], wt: [35, 30, 25] },
    RB: { key: ['speed', 'power', 'awareness'], wt: [30, 30, 30] },
    WR: { key: ['routeRunning', 'catching', 'speed'], wt: [30, 30, 30] },
    TE: { key: ['catching', 'runBlock', 'routeRunning'], wt: [30, 30, 30] },
    OL: { key: ['runBlock', 'passBlock', 'awareness'], wt: [30, 30, 30] },
  },
  '3-4': {
    DL: { key: ['strength', 'runStop', 'power'], wt: [40, 30, 20] },
    LB: { key: ['speed', 'coverage', 'tackle'], wt: [30, 30, 30] },
    CB: { key: ['manCoverage', 'speed', 'ballSkills'], wt: [35, 30, 25] },
    S:  { key: ['coverage', 'tackle', 'awareness'], wt: [30, 30, 30] },
  },
  '4-3': {
    DL: { key: ['passRush', 'speed', 'power'], wt: [35, 30, 25] },
    LB: { key: ['tackle', 'awareness', 'speed'], wt: [35, 30, 25] },
    CB: { key: ['manCoverage', 'speed', 'ballSkills'], wt: [35, 30, 25] },
    S:  { key: ['coverage', 'awareness', 'tackle'], wt: [35, 30, 25] },
  },
  cover_2: {
    DL: { key: ['passRush', 'speed', 'runStop'], wt: [35, 30, 25] },
    LB: { key: ['coverage', 'awareness', 'speed'], wt: [35, 30, 25] },
    CB: { key: ['zoneCoverage', 'awareness', 'speed'], wt: [40, 30, 20] },
    S:  { key: ['zoneCoverage', 'awareness', 'tackle'], wt: [40, 30, 20] },
  },
  cover_3: {
    DL: { key: ['passRush', 'power', 'speed'], wt: [35, 30, 25] },
    LB: { key: ['coverage', 'tackle', 'awareness'], wt: [30, 30, 30] },
    CB: { key: ['zoneCoverage', 'speed', 'ballSkills'], wt: [35, 30, 25] },
    S:  { key: ['zoneCoverage', 'awareness', 'range'], wt: [40, 30, 20] },
  },
  man_press: {
    DL: { key: ['passRush', 'speed', 'finesseMoves'], wt: [40, 30, 20] },
    LB: { key: ['coverage', 'speed', 'awareness'], wt: [35, 30, 25] },
    CB: { key: ['manCoverage', 'pressAbility', 'speed'], wt: [40, 30, 20] },
    S:  { key: ['manCoverage', 'speed', 'tackle'], wt: [35, 30, 25] },
  },
};

// ── Fit Tiers ──────────────────────────────────────────

export type FitTier = 'ELITE' | 'STRONG' | 'SOLID' | 'FRINGE' | 'POOR';

export function fitTierFromScore(score: number): FitTier {
  if (score >= 85) return 'ELITE';
  if (score >= 72) return 'STRONG';
  if (score >= 58) return 'SOLID';
  if (score >= 45) return 'FRINGE';
  return 'POOR';
}

// ── Core Scheme Fit Calculation ────────────────────────

export interface SchemeFitResult {
  score: number;
  grade: string;
  label: string;
  boost: number;
}

export function calcSchemeFit(player: Player, schemeId: string): SchemeFitResult {
  if (!player || !schemeId) return { score: 50, grade: 'C', label: 'Average', boost: 0 };

  const profiles = SCHEME_FIT[schemeId];
  const profile = profiles?.[player.pos];

  if (!profile) {
    const b = player.ovr ?? 50;
    return {
      score: b,
      grade: b >= 85 ? 'A' : b >= 75 ? 'B' : b >= 65 ? 'C' : 'D',
      label: 'Neutral',
      boost: 0,
    };
  }

  let weightedSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < profile.key.length; i++) {
    const ratingKey = profile.key[i]!;
    const v = player.ratings?.[ratingKey] ?? 50;
    const w = profile.wt[i] ?? 10;
    weightedSum += v * w;
    totalWeight += w;
  }

  const s = cl(totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50, 1, 99);

  const grade = s >= 92 ? 'A+' : s >= 85 ? 'A' : s >= 78 ? 'B+' : s >= 72 ? 'B'
    : s >= 65 ? 'C+' : s >= 58 ? 'C' : s >= 50 ? 'D' : 'F';
  const boost = s >= 92 ? 4 : s >= 85 ? 3 : s >= 78 ? 1 : s >= 65 ? 0 : s >= 50 ? -1 : -3;
  const label = s >= 85 ? 'Perfect Fit' : s >= 72 ? 'Good Fit' : s >= 58 ? 'Ok Fit' : 'Poor Fit';

  return { score: s, grade, label, boost };
}

// ── Player Side Detection ──────────────────────────────

export type PlayerSide = 'off' | 'def' | 'other';

const OFF_POS: Set<Position> = new Set(['QB', 'RB', 'WR', 'TE', 'OL']);
const DEF_POS: Set<Position> = new Set(['DL', 'LB', 'CB', 'S']);

export function getPlayerSide(pos: Position): PlayerSide {
  if (OFF_POS.has(pos)) return 'off';
  if (DEF_POS.has(pos)) return 'def';
  return 'other';
}

// ── Coordinator Specialty Adjustment ───────────────────

export function getSpecialtyBonus(team: Team, side: PlayerSide): CoordinatorSpecialty | null {
  if (!team.staff) return null;
  if (side === 'off') return team.staff.oc?.specialty75 ?? null;
  if (side === 'def') return team.staff.dc?.specialty75 ?? null;
  return null;
}

export function calcSpecialtyFitAdj(team: Team, player: Player, side: PlayerSide): number {
  const spec = getSpecialtyBonus(team, side);
  if (!spec?.id) return 0;

  const pos = player.pos;
  let adj = 0;

  if (side === 'off') {
    if (spec.id === 'run_guru') {
      if (pos === 'RB') adj += 6;
      else if (pos === 'OL' || pos === 'TE') adj += 4;
      else if (pos === 'QB') adj += 1;
    } else if (spec.id === 'pass_arch') {
      if (pos === 'QB') adj += 6;
      else if (pos === 'WR' || pos === 'TE') adj += 4;
    } else if (spec.id === 'rz_spec') {
      if (pos === 'TE' || pos === 'RB') adj += 4;
    } else if (spec.id === 'tempo') {
      if (pos === 'QB') adj += 3;
    }
  } else if (side === 'def') {
    if (spec.id === 'blitz_des') {
      if (pos === 'LB') adj += 6;
      else if (pos === 'DL') adj += 4;
    } else if (spec.id === 'cov_spec') {
      if (pos === 'CB' || pos === 'S') adj += 5;
    } else if (spec.id === 'run_stop') {
      if (pos === 'DL') adj += 6;
      else if (pos === 'LB') adj += 4;
    } else if (spec.id === 'turnover') {
      if (pos === 'CB' || pos === 'S') adj += 4;
      else if (pos === 'LB') adj += 2;
    }
  }

  return cl(adj, -8, 8);
}

// ── Personality Fit Adjustment ─────────────────────────

export function calcPersonalityFitAdj(player: Player, _team: Team): number {
  const pers = getPersonality(player);
  let adj = 0;
  adj += Math.round(traitScalar(pers.workEthic) * 3);
  adj += Math.round(traitScalar(pers.loyalty) * 2);
  if (pers.ambition >= 8) adj -= 1;
  return cl(adj, -5, 5);
}

// ── Comprehensive Player Identity Fit ──────────────────

export interface PlayerIdentityFit {
  score: number;
  letter: string;
  tier: FitTier;
  baseScore: number;
  specialtyAdj: number;
  personalityAdj: number;
  systemAdj: number;
  totalAdj: number;
  side: PlayerSide;
  schemeId: string;
  schemeLabel: string;
  specialtyId: string;
  specialtyLabel: string;
}

export function calcPlayerIdentityFit(
  player: Player,
  team: Team,
  offScheme?: string,
  defScheme?: string,
): PlayerIdentityFit {
  const side = getPlayerSide(player.pos);
  const schemeId = side === 'off'
    ? (offScheme ?? team.schemeOff ?? 'balanced')
    : side === 'def'
      ? (defScheme ?? team.schemeDef ?? '4-3')
      : '';

  const base = side === 'other' ? player.ovr : calcSchemeFit(player, schemeId).score;
  const specialtyAdj = calcSpecialtyFitAdj(team, player, side);
  const personalityAdj = calcPersonalityFitAdj(player, team);

  const rawSystemAdj = player.systemFit != null ? Math.round((player.systemFit - 50) / 10) : 0;
  const systemAdj = cl(rawSystemAdj, -6, 6);
  const totalAdj = cl(specialtyAdj + personalityAdj + systemAdj, -12, 12);
  const score = cl(base + totalAdj, 20, 99);
  const letter = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 65 ? 'C' : score >= 50 ? 'D' : 'F';

  const spec = (side === 'off' || side === 'def') ? getSpecialtyBonus(team, side) : null;
  const allSchemes = [...OFF_SCHEMES, ...DEF_SCHEMES];
  const schemeDef = allSchemes.find((s) => s.id === schemeId);

  return {
    score, letter, tier: fitTierFromScore(score),
    baseScore: base, specialtyAdj, personalityAdj, systemAdj, totalAdj,
    side, schemeId, schemeLabel: schemeDef?.name ?? schemeId ?? 'Neutral',
    specialtyId: spec?.id ?? '', specialtyLabel: spec?.label ?? '',
  };
}

// ── Team Fit Summary ───────────────────────────────────

export interface TeamFitSummary {
  avgFit: number;
  bestFit: { name: string; score: number } | null;
  worstFit: { name: string; score: number } | null;
  mismatchCount: number;
}

export function calcTeamFit(team: Team): TeamFitSummary {
  if (team.roster.length === 0) {
    return { avgFit: 50, bestFit: null, worstFit: null, mismatchCount: 0 };
  }

  let total = 0;
  let best = { name: '', score: 0 };
  let worst = { name: '', score: 100 };
  let mismatches = 0;

  for (const p of team.roster) {
    const fit = calcPlayerIdentityFit(p, team);
    total += fit.score;
    if (fit.score > best.score) best = { name: p.name, score: fit.score };
    if (fit.score < worst.score) worst = { name: p.name, score: fit.score };
    if (fit.score < 58 && p.isStarter) mismatches++;
  }

  return {
    avgFit: Math.round(total / team.roster.length),
    bestFit: best.name ? best : null,
    worstFit: worst.name ? worst : null,
    mismatchCount: mismatches,
  };
}

// ── Scheme Mismatch Warnings ───────────────────────────

export interface SchemeMismatch {
  name: string;
  pos: Position;
  fitScore: number;
  fitGrade: string;
}

export function getSchemeMismatchWarnings(team: Team): SchemeMismatch[] {
  const warnings: SchemeMismatch[] = [];

  for (const p of team.roster) {
    if (!p.isStarter) continue;
    const fit = calcPlayerIdentityFit(p, team);
    if (fit.score < 58) {
      warnings.push({ name: p.name, pos: p.pos, fitScore: fit.score, fitGrade: fit.letter });
    }
  }

  return warnings.sort((a, b) => a.fitScore - b.fitScore);
}
