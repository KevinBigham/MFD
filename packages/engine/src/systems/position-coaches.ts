/**
 * MFD Position Coaches System
 *
 * Each team has position coaches (OL, DL, DB, WR, RB/TE, LB, ST) that
 * specialize in certain development aspects. Good position coaches boost
 * development for their position group.
 */

import type { Player, Position } from '../types';
import { cl } from '../utils';

// ── Types ──────────────────────────────────────────────

export type PositionCoachRole = 'OL' | 'DL' | 'DB' | 'WR' | 'RB_TE' | 'LB' | 'ST';

export interface PositionCoach {
  id: string;
  name: string;
  role: PositionCoachRole;
  specialty: string;
  quality: number; // 1-10
  yearsWithTeam: number;
}

export interface PositionCoachStaff {
  coaches: PositionCoach[];
}

export interface PositionCoachBonus {
  devMultiplier: number; // 0.9-1.3
  ratingBoosts: Record<string, number>;
  narrative: string;
}

// ── Position → Coach Role Mapping ─────────────────────

const POS_TO_COACH_ROLE: Record<Position, PositionCoachRole> = {
  QB: 'OL',     // QB coach duties often under OC; OL coach handles pass pro
  RB: 'RB_TE',
  WR: 'WR',
  TE: 'RB_TE',
  OL: 'OL',
  DL: 'DL',
  LB: 'LB',
  CB: 'DB',
  S: 'DB',
  K: 'ST',
  P: 'ST',
};

// ── Specialties per Coach Role ────────────────────────

const SPECIALTIES: Record<PositionCoachRole, string[]> = {
  OL: ['pass_blocking', 'run_blocking', 'technique', 'footwork'],
  DL: ['pass_rush', 'run_defense', 'hand_technique', 'motor'],
  DB: ['coverage_technique', 'ball_skills', 'press_coverage', 'tackling'],
  WR: ['route_running', 'hands', 'separation', 'blocking'],
  RB_TE: ['ball_security', 'pass_catching', 'blocking', 'vision'],
  LB: ['blitz_technique', 'coverage_drops', 'tackling', 'pursuit'],
  ST: ['kicking_accuracy', 'leg_strength', 'punt_coverage', 'consistency'],
};

// ── Specialty → Rating Boosts ─────────────────────────

const SPECIALTY_RATING_BOOSTS: Record<string, string[]> = {
  pass_blocking: ['passBlock', 'passBlockFinesse', 'anchorStrength'],
  run_blocking: ['runBlock', 'impactBlocking', 'pullBlock'],
  technique: ['handTechnique', 'footwork', 'assignmentIQ'],
  footwork: ['footwork', 'agility', 'changeOfDirection'],
  pass_rush: ['passRush', 'finesseMoves', 'powerMoves'],
  run_defense: ['runStop', 'blockShedding', 'strength'],
  hand_technique: ['handTechnique', 'blockShedding', 'powerMoves'],
  motor: ['pursuit', 'acceleration', 'toughness'],
  coverage_technique: ['manCoverage', 'zoneCoverage', 'coverage'],
  ball_skills: ['ballSkills', 'awareness', 'catching'],
  press_coverage: ['pressAbility', 'strength', 'agility'],
  tackling: ['tackling', 'hitPower', 'pursuit'],
  route_running: ['routeRunning', 'shortRoute', 'deepRoute'],
  hands: ['catching', 'catchInTraffic', 'spectacularCatch'],
  separation: ['separation', 'release', 'agility'],
  blocking: ['blocking', 'runBlocking', 'impactBlocking'],
  ball_security: ['ballCarrierVision', 'breakTackle', 'elusiveness'],
  pass_catching: ['catching', 'routeRunning', 'ballCarrierVision'],
  vision: ['ballCarrierVision', 'awareness', 'fieldVision'],
  blitz_technique: ['passRush', 'acceleration', 'blockShedding'],
  coverage_drops: ['coverage', 'zoneCoverage', 'awareness'],
  pursuit: ['pursuit', 'speed', 'acceleration'],
  kicking_accuracy: ['accuracy', 'awareness'],
  leg_strength: ['arm', 'strength'],
  punt_coverage: ['speed', 'tackling'],
  consistency: ['awareness', 'toughness'],
};

// ── Name Pool ─────────────────────────────────────────

const FIRST_NAMES = [
  'Mike', 'Steve', 'Rick', 'Tony', 'Dave', 'Bill', 'Chris', 'Dan',
  'Ron', 'Joe', 'Pat', 'Tim', 'Jim', 'Mark', 'Paul', 'Greg',
  'Scott', 'Kevin', 'Jeff', 'Brian', 'Keith', 'Ray', 'Phil', 'Tom',
];
const LAST_NAMES = [
  'Turner', 'Grant', 'Hayes', 'Foster', 'Crawford', 'Powers', 'Wallace',
  'Brooks', 'Dixon', 'Manning', 'Palmer', 'Hart', 'Garrett', 'Simmons',
  'Knox', 'Blair', 'Dorsey', 'Kemp', 'Miles', 'Stone', 'Quinn', 'Webb',
];

// ── Coach Generation ──────────────────────────────────

export function generatePositionCoach(
  role: PositionCoachRole,
  level: number,
  rng: () => number,
): PositionCoach {
  const firstName = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]!;
  const lastName = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]!;
  const specs = SPECIALTIES[role];
  const specialty = specs[Math.floor(rng() * specs.length)]!;
  const quality = cl(Math.round(level + (rng() * 4 - 2)), 1, 10);

  return {
    id: `pc-${role}-${firstName[0]}${lastName}`.toLowerCase(),
    name: `${firstName} ${lastName}`,
    role,
    specialty,
    quality,
    yearsWithTeam: 0,
  };
}

const ALL_ROLES: PositionCoachRole[] = ['OL', 'DL', 'DB', 'WR', 'RB_TE', 'LB', 'ST'];

export function initializePositionCoaches(baseLevel: number, rng: () => number): PositionCoachStaff {
  const coaches = ALL_ROLES.map((role) => generatePositionCoach(role, baseLevel, rng));
  return { coaches };
}

// ── Coach Bonus Calculation ───────────────────────────

export function getPositionCoachBonus(
  staff: PositionCoachStaff | null | undefined,
  player: Player,
): PositionCoachBonus {
  if (!staff?.coaches?.length) {
    return { devMultiplier: 1, ratingBoosts: {}, narrative: '' };
  }

  const coachRole = POS_TO_COACH_ROLE[player.pos];
  const coach = staff.coaches.find((c) => c.role === coachRole);

  if (!coach) {
    return { devMultiplier: 1, ratingBoosts: {}, narrative: '' };
  }

  // Quality 1-10 → multiplier 0.9-1.3
  const devMultiplier = cl(0.85 + coach.quality * 0.05, 0.9, 1.3);

  // Specialty rating boosts (quality-scaled)
  const boostedRatings = SPECIALTY_RATING_BOOSTS[coach.specialty] ?? [];
  const ratingBoosts: Record<string, number> = {};
  const boostAmount = cl(Math.round((coach.quality - 5) * 0.3), -1, 2);

  for (const rating of boostedRatings) {
    if (player.ratings[rating] !== undefined) {
      ratingBoosts[rating] = boostAmount;
    }
  }

  // Tenure bonus (years with team add small consistency)
  const tenureBonus = Math.min(coach.yearsWithTeam, 3) * 0.02;
  const finalMultiplier = cl(devMultiplier + tenureBonus, 0.9, 1.35);

  const narrative = coach.quality >= 8
    ? `${coach.name} is an elite ${coach.role} coach — ${player.name} benefits from top-tier instruction.`
    : coach.quality >= 5
      ? `${coach.name} provides solid ${coach.role} coaching for ${player.name}.`
      : `${coach.name}'s limited coaching ability is slowing ${player.name}'s development.`;

  return { devMultiplier: finalMultiplier, ratingBoosts, narrative };
}

// ── Coach Fit Evaluation ──────────────────────────────

export function evaluatePositionCoachFit(coach: PositionCoach, player: Player): number {
  const boostedRatings = SPECIALTY_RATING_BOOSTS[coach.specialty] ?? [];
  const archetypeKeys = new Set(
    Object.keys(player.ratings).filter((k) => (player.ratings[k] ?? 0) > 70),
  );

  let matchCount = 0;
  for (const rating of boostedRatings) {
    if (archetypeKeys.has(rating)) matchCount++;
  }

  const baseScore = (coach.quality / 10) * 60;
  const matchScore = boostedRatings.length > 0
    ? (matchCount / boostedRatings.length) * 40
    : 20;

  return cl(Math.round(baseScore + matchScore), 0, 100);
}

// ── Upgrade Position Coach ────────────────────────────

export function upgradePositionCoach(
  staff: PositionCoachStaff,
  role: PositionCoachRole,
  rng: () => number,
): PositionCoachStaff {
  const existingCoach = staff.coaches.find((c) => c.role === role);
  const currentQuality = existingCoach?.quality ?? 3;
  const newLevel = cl(currentQuality + 2, 1, 10);
  const newCoach = generatePositionCoach(role, newLevel, rng);

  return {
    coaches: staff.coaches.map((c) => (c.role === role ? newCoach : c)),
  };
}

// ── Staff Report ──────────────────────────────────────

export function generateCoachingStaffReport(staff: PositionCoachStaff | null | undefined): string[] {
  if (!staff?.coaches?.length) return ['No position coaches on staff.'];

  const report: string[] = [];
  const elite = staff.coaches.filter((c) => c.quality >= 8);
  const weak = staff.coaches.filter((c) => c.quality <= 3);

  if (elite.length > 0) {
    report.push(`Strengths: ${elite.map((c) => `${c.role} (${c.name}, ${c.specialty})`).join(', ')}`);
  }
  if (weak.length > 0) {
    report.push(`Weaknesses: ${weak.map((c) => `${c.role} (${c.name})`).join(', ')}`);
  }

  const avgQuality = staff.coaches.reduce((s, c) => s + c.quality, 0) / staff.coaches.length;
  if (avgQuality >= 7) report.push('Overall coaching staff is elite.');
  else if (avgQuality >= 5) report.push('Coaching staff is solid across the board.');
  else report.push('Coaching staff needs improvement.');

  return report;
}

// ── Advance Season ────────────────────────────────────

export function advancePositionCoachSeason(staff: PositionCoachStaff): PositionCoachStaff {
  return {
    coaches: staff.coaches.map((c) => ({
      ...c,
      yearsWithTeam: c.yearsWithTeam + 1,
    })),
  };
}
