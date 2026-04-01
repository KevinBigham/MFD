/**
 * MFD Player Personality System
 *
 * Five personality axes (1-10) that drive contract demands,
 * holdout risk, FA decisions, and locker room dynamics.
 */

import { RNG } from '../rng';
import type { Personality, Position } from '../types';

function cl(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function getPersonality(player: { personality?: Partial<Personality> } | null): Personality {
  const p = player?.personality ?? {};
  return {
    workEthic: cl(p.workEthic ?? 5, 1, 10),
    loyalty: cl(p.loyalty ?? 5, 1, 10),
    greed: cl(p.greed ?? 5, 1, 10),
    pressure: cl(p.pressure ?? 5, 1, 10),
    ambition: cl(p.ambition ?? 5, 1, 10),
  };
}

/** Maps a 1-10 personality value to a [-1, +1] scalar. */
export function traitScalar(v: number): number {
  return (cl(v, 1, 10) - 5.5) / 4.5;
}

export function generatePersonality(pos: Position, age: number, devTrait: string): Personality {
  const ageLoy = age >= 30 ? 2 : age >= 27 ? 1 : 0;
  const ageGrd = age >= 30 ? -2 : 0;
  const devAmb = devTrait === 'superstar' ? 3 : devTrait === 'star' ? 1 : 0;
  const devPres = devTrait === 'superstar' ? 2 : devTrait === 'star' ? 1 : 0;
  const posPres = pos === 'QB' ? 1 : 0;
  return {
    workEthic: cl(Math.round(RNG.draft() * 9) + 1, 1, 10),
    loyalty: cl(Math.round(RNG.draft() * 9) + 1 + ageLoy, 1, 10),
    greed: cl(Math.round(RNG.draft() * 9) + 1 + ageGrd, 1, 10),
    pressure: cl(Math.round(RNG.draft() * 9) + 1 + devPres + posPres, 1, 10),
    ambition: cl(Math.round(RNG.draft() * 9) + 1 + devAmb, 1, 10),
  };
}

export const PERS_LABELS: Record<keyof Personality, string> = {
  workEthic: 'Work Ethic',
  loyalty: 'Loyalty',
  greed: 'Greed',
  pressure: 'Clutch',
  ambition: 'Ambition',
};

export function getDominantTrait(player: { personality?: Partial<Personality> } | null): { key: keyof Personality; val: number } | null {
  const p = getPersonality(player);
  let best: keyof Personality | null = null;
  let bestV = 0;
  const keys: (keyof Personality)[] = ['workEthic', 'loyalty', 'greed', 'pressure', 'ambition'];
  for (const k of keys) {
    if (p[k] > bestV) {
      bestV = p[k];
      best = k;
    }
  }
  return bestV >= 8 && best ? { key: best, val: bestV } : null;
}

export interface ContractPersonalityEffects {
  pers: Personality;
  demandMultAdj: number;
  walkThreshAdj: number;
  faScoreAdj: number;
  holdoutChanceAdj: number;
}

export function getContractPersonalityEffects(
  player: { personality?: Partial<Personality> } | null,
  context?: { isContender?: boolean; roleConflict?: boolean; isFormerTeam?: boolean },
): ContractPersonalityEffects {
  const ctx = context ?? {};
  const pers = getPersonality(player);
  const greedS = traitScalar(pers.greed);
  const loyaltyS = traitScalar(pers.loyalty);
  const pressureS = traitScalar(pers.pressure);

  const effects: ContractPersonalityEffects = {
    pers,
    demandMultAdj: 0,
    walkThreshAdj: 0,
    faScoreAdj: 0,
    holdoutChanceAdj: 0,
  };

  effects.demandMultAdj += greedS * 0.22;
  effects.demandMultAdj -= Math.max(0, loyaltyS) * 0.18;
  if (ctx.isContender && pers.greed <= 4) effects.demandMultAdj -= 0.05;
  if (ctx.roleConflict && pers.ambition >= 8) effects.demandMultAdj += 0.07;

  effects.walkThreshAdj += Math.max(0, greedS) * 0.08;
  effects.walkThreshAdj -= Math.max(0, loyaltyS) * 0.08;

  effects.faScoreAdj += greedS * 8;
  if (ctx.isFormerTeam) effects.faScoreAdj += Math.max(0, loyaltyS) * 15;
  if (ctx.isContender) effects.faScoreAdj += Math.max(0, pressureS) * 8;

  effects.holdoutChanceAdj += Math.max(0, greedS) * 0.18;
  effects.holdoutChanceAdj -= Math.max(0, loyaltyS) * 0.16;

  return effects;
}
