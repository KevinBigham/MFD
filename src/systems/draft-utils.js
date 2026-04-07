/**
 * MFD Draft Utilities
 *
 * Pick creation, conditional pick logic, draft/auction contracts,
 * and pick value calculations.
 */

import { RNG, U, pick } from '../utils/rng.js';
import { makeContract } from './contracts.js';
import { CAP_MATH } from '../config/cap-math.js';

/**
 * Create a draft pick object.
 */
export function makePick(round, origId, ownerId, year) {
  return {
    pid: U(),
    round: round,
    original: origId,
    owner: ownerId,
    year: year || 2026,
    originalOwner: origId,
    currentOwner: ownerId,
  };
}

/**
 * Display text for conditional pick protections.
 */
export function pickConditionText972(cond) {
  if (!cond) return '';
  if (cond.type === 'playoff') return '\u2192Rd' + cond.upgradeRound + ' if playoffs';
  if (cond.type === 'record') return '\u2192Rd' + cond.upgradeRound + ' if 10+ wins';
  if (cond.type === 'top10pick') return '\u2192Rd' + cond.upgradeRound + ' if top-10 pick';
  return 'Conditional';
}

/**
 * Maybe attach a condition to a pick (rounds 2-5 only, 35% chance).
 * Returns null if no condition applied.
 */
export function maybeBuildPickCondition972(pk) {
  if (!pk || pk.condition) return null;
  if ((pk.round || 0) < 2 || (pk.round || 0) > 5) return null;
  if (RNG.ai() >= 0.35) return null;
  var up = Math.max(1, (pk.round || 3) - 1);
  var down = Math.min(7, (pk.round || 3) + 1);
  return { type: pick(['playoff', 'record', 'top10pick']), upgradeRound: up, downgradeRound: down };
}

/**
 * Simple round-based pick value lookup (used by trade logic).
 */
export function pickValue(round) {
  return [0, 200, 120, 70, 35, 15, 8, 5][round] || 3;
}

/**
 * Draft contract — OVR + round -> realistic salary/years for inaugural snake draft.
 */
export function draftContract(ovr, round) {
  var market;
  if (ovr >= 90) market = (ovr - 90) * 2.0 + 16;
  else if (ovr >= 85) market = (ovr - 85) * 1.4 + 9;
  else if (ovr >= 78) market = (ovr - 78) * 0.9 + 3.5;
  else if (ovr >= 68) market = (ovr - 68) * 0.28 + 1.0;
  else market = Math.max(0.795, (ovr - 50) * 0.04 + 0.5);
  var rMod = round <= 1 ? 1.0 : round <= 3 ? 0.90 : round <= 7 ? 0.78 : round <= 15 ? 0.65 : round <= 30 ? 0.52 : 0.40;
  var sal = Math.round(Math.min(Math.max(market * rMod, CAP_MATH.MIN_SAL.ROOKIE), 22.0) * 10) / 10;
  var yrs = round <= 2 ? 4 : round <= 6 ? 3 : round <= 15 ? 2 : 1;
  var bonus = round <= 5 ? Math.round(sal * 0.25 * yrs * 10) / 10 : 0;
  return makeContract(sal, yrs, bonus, Math.round(sal * Math.min(yrs, 2) * 10) / 10);
}

/**
 * Auction contract — bid + OVR -> realistic salary so cap fills properly (~$180-250M for 53 players).
 */
export function aucContract(ovr, bid, budget) {
  budget = budget || 1000;
  var market;
  if (ovr >= 90) market = (ovr - 90) * 1.8 + 16;
  else if (ovr >= 85) market = (ovr - 85) * 1.2 + 10;
  else if (ovr >= 78) market = (ovr - 78) * 0.75 + 4.5;
  else if (ovr >= 68) market = (ovr - 68) * 0.30 + 1.5;
  else market = Math.max(0.8, (ovr - 50) * 0.04 + 0.5);
  var ratio = Math.min(bid / budget, 1.0);
  var bidMod = 0.6 + ratio * 1.2; // 0.6x at $1, 1.8x at $1000
  var sal = Math.round(Math.min(Math.max(market * bidMod, CAP_MATH.MIN_SAL.ROOKIE), 26.0) * 10) / 10;
  var yrs = bid >= 100 ? 4 : bid >= 50 ? 3 : bid >= 20 ? 2 : 1;
  var bonus = bid >= 50 ? Math.round(sal * 0.25 * yrs * 10) / 10 : 0;
  return makeContract(sal, yrs, bonus, Math.round(sal * Math.min(yrs, 2) * 10) / 10);
}
