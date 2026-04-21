import type { StaffMember } from '../types';

interface CurvePoint {
  age: number;
  chance: number;
}

const RETIREMENT_CURVE: readonly CurvePoint[] = [
  { age: 40, chance: 0 },
  { age: 55, chance: 0.02 },
  { age: 58, chance: 0.05 },
  { age: 62, chance: 0.15 },
  { age: 66, chance: 0.3 },
  { age: 70, chance: 0.55 },
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function interpolate(age: number, left: CurvePoint, right: CurvePoint): number {
  if (right.age === left.age) return right.chance;
  const pct = (age - left.age) / (right.age - left.age);
  return left.chance + (right.chance - left.chance) * pct;
}

function baseChanceForAge(age: number): number {
  if (age <= RETIREMENT_CURVE[0]!.age) return RETIREMENT_CURVE[0]!.chance;
  if (age >= RETIREMENT_CURVE[RETIREMENT_CURVE.length - 1]!.age) {
    return RETIREMENT_CURVE[RETIREMENT_CURVE.length - 1]!.chance;
  }

  for (let index = 1; index < RETIREMENT_CURVE.length; index += 1) {
    const left = RETIREMENT_CURVE[index - 1]!;
    const right = RETIREMENT_CURVE[index]!;
    if (age <= right.age) {
      return interpolate(age, left, right);
    }
  }

  return RETIREMENT_CURVE[RETIREMENT_CURVE.length - 1]!.chance;
}

function archetypeModifier(archetype: string | undefined): number {
  const normalized = archetype?.trim().toLowerCase() ?? 'balanced';
  if (normalized === 'players_coach' || normalized === 'motivator') return -0.05;
  if (normalized === 'strategist') return 0.05;
  return 0;
}

export function coachRetirementChance(
  coach: StaffMember,
  _yearsAsHC: number,
  recentLosingSeasons: number,
): number {
  const age = coach.age ?? 50;
  let chance = baseChanceForAge(age);
  chance += archetypeModifier(coach.archetype);

  if (recentLosingSeasons >= 2) {
    chance += 0.08;
  }

  return clamp(Number(chance.toFixed(3)), 0, 0.85);
}
