/**
 * MFD Trade AI — Value Calculations
 *
 * Player trade value, team needs analysis, and GM strategy modifiers.
 * Used by the trade proposal engine and AI decision-making.
 */

import { v36_capHit, v36_deadIfTraded } from './contract-helpers.js';
import { hasTrait95 } from './traits.js';
import { calcPlayerIdentityFit } from './scheme-fit.js';

/**
 * Calculate a player's trade value considering OVR, potential, age,
 * salary, traits, positional value, needs, and scheme fit.
 */
export function getTradeValue(p, needs, teamCtx) {
  if (!p) return 0;
  var v = (p.ovr * 3) + (p.pot * 2);
  if (p.age > 29) v -= (p.age - 29) * 15;
  if (p.age > 33) v -= (p.age - 33) * 20;
  v -= Math.max(0, v36_capHit(p.contract) - 8) * 5;
  var deadIfTraded = v36_deadIfTraded(p.contract);
  if (deadIfTraded > 15) v -= Math.round(deadIfTraded * 2);
  if (hasTrait95(p, 'cancer')) v = Math.round(v * 0.7);
  if (hasTrait95(p, 'glass')) v = Math.round(v * 0.85);
  if (hasTrait95(p, 'captain')) v = Math.round(v * 1.15);
  if (hasTrait95(p, 'clutch')) v = Math.round(v * 1.1);
  if (p.pos === 'QB') v *= 1.4;
  else if (['OL', 'DL', 'CB'].indexOf(p.pos) >= 0) v *= 1.1;
  else if (p.pos === 'K' || p.pos === 'P') v *= 0.2;
  if (needs && needs[p.pos] > 0) v *= 1.25;
  if (teamCtx) {
    var fitT86 = calcPlayerIdentityFit(p, teamCtx);
    v += (fitT86.score - 70) * 3;
    if (fitT86.score <= 55) v -= 25;
  }
  return Math.max(0, Math.round(v));
}

/**
 * Determine roster needs by comparing current counts to minimums.
 */
export function getTeamNeeds(t) {
  var mins = { QB: 2, OL: 7, DL: 5, LB: 4, CB: 4, WR: 4, S: 2, RB: 2, TE: 2, K: 1 };
  var n = {};
  Object.entries(mins).forEach(function (e) {
    var c = t.roster.filter(function (x) { return x.pos === e[0]; }).length;
    if (c < e[1]) n[e[0]] = e[1] - c;
  });
  return n;
}

/**
 * GM trade threshold modifiers by strategy posture.
 */
export function getGMTradeThresholdMod(strategy) {
  if (strategy === 'rebuild') return { sellMod: 0.85, buyMod: 1.15 };
  if (strategy === 'contend') return { sellMod: 1.15, buyMod: 0.88 };
  return { sellMod: 1.0, buyMod: 1.0 };
}

/**
 * GM free agency bias by strategy — multiplier on FA interest.
 */
export function getGMFABias(strategy, player) {
  if (strategy === 'rebuild') {
    if (player.age >= 30) return 0.5;
    if (player.age >= 28 && player.contract && player.contract.salary > 8) return 0.6;
    if (player.age <= 25 && player.pot >= player.ovr + 5) return 1.4;
    return 0.9;
  }
  if (strategy === 'contend') {
    if (player.ovr >= 82) return 1.3;
    if (player.ovr >= 75 && player.age <= 30) return 1.15;
    if (player.age <= 23 && player.ovr < 70) return 0.7;
    return 1.0;
  }
  return 1.0;
}

/**
 * GM draft bias by strategy — bonus points added to draft board score.
 */
export function getGMDraftBias(strategy, player) {
  if (strategy === 'rebuild') {
    var potGap = player.pot - player.ovr;
    var youthBonus = player.age <= 22 ? 12 : player.age <= 24 ? 6 : 0;
    var devBonus2 = player.devTrait === 'superstar' ? 20 : player.devTrait === 'star' ? 12 : 0;
    return youthBonus + devBonus2 + (potGap > 10 ? 15 : potGap > 5 ? 8 : 0);
  }
  if (strategy === 'contend') {
    var ovrBonus = player.ovr >= 78 ? 18 : player.ovr >= 72 ? 10 : 0;
    var agePenalty = player.age >= 26 ? -8 : 0;
    return ovrBonus + agePenalty;
  }
  return 0;
}
