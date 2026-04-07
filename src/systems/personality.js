/**
 * MFD Player Personality System
 *
 * Five personality axes (1-10 each) that drive contract demands,
 * holdout risk, FA decisions, and locker room dynamics.
 */

import { RNG } from '../utils/rng.js';

// Clamp value between min and max
function cl(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

export function getPersonality(player) {
  var p = (player && player.personality) || {};
  return {
    workEthic: cl(p.workEthic || 5, 1, 10),
    loyalty: cl(p.loyalty || 5, 1, 10),
    greed: cl(p.greed || 5, 1, 10),
    pressure: cl(p.pressure || 5, 1, 10),
    ambition: cl(p.ambition || 5, 1, 10),
  };
}

// Maps a 1-10 personality value to a [-1, +1] scalar
export function traitScalar(v) {
  return (cl(v, 1, 10) - 5.5) / 4.5;
}

export function generatePersonality(pos, age, devTrait) {
  var ageLoy = age >= 30 ? 2 : age >= 27 ? 1 : 0;
  var ageGrd = age >= 30 ? -2 : 0;
  var devAmb = devTrait === 'superstar' ? 3 : devTrait === 'star' ? 1 : 0;
  var devPres = devTrait === 'superstar' ? 2 : devTrait === 'star' ? 1 : 0;
  var posPres = pos === 'QB' ? 1 : 0;
  return {
    workEthic: cl(Math.round(RNG.draft() * 9) + 1, 1, 10),
    loyalty: cl(Math.round(RNG.draft() * 9) + 1 + ageLoy, 1, 10),
    greed: cl(Math.round(RNG.draft() * 9) + 1 + ageGrd, 1, 10),
    pressure: cl(Math.round(RNG.draft() * 9) + 1 + devPres + posPres, 1, 10),
    ambition: cl(Math.round(RNG.draft() * 9) + 1 + devAmb, 1, 10),
  };
}

export var PERS_ICONS = {
  workEthic: '\u{1F4AA}',
  loyalty: '\u{1F499}',
  greed: '\u{1F4B0}',
  pressure: '\u2B50',
  ambition: '\u{1F525}',
};

export var PERS_LABELS = {
  workEthic: 'Work Ethic',
  loyalty: 'Loyalty',
  greed: 'Greed',
  pressure: 'Clutch',
  ambition: 'Ambition',
};

export function getDominantTrait(player) {
  var p = getPersonality(player);
  var best = null;
  var bestV = 0;
  ['workEthic', 'loyalty', 'greed', 'pressure', 'ambition'].forEach(function (k) {
    if (p[k] > bestV) {
      bestV = p[k];
      best = k;
    }
  });
  return bestV >= 8 ? { key: best, val: bestV } : null;
}

export function getContractPersonalityEffects(player, context) {
  var ctx = context || {};
  var pers = getPersonality(player);
  var greedS = traitScalar(pers.greed);
  var loyaltyS = traitScalar(pers.loyalty);
  var pressureS = traitScalar(pers.pressure);
  var effects = {
    pers: pers,
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
