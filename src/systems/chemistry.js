/**
 * MFD Chemistry & System Fit
 *
 * Functions that calculate team chemistry bonuses/penalties
 * and system fit modifiers used in game simulation.
 */

import { rng } from '../utils/rng.js';
import { getPersonality, traitScalar } from './personality.js';

// Clamp helper
function cl(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

/**
 * Calculate chemistry modifier for a team.
 * Returns a point modifier applied to game simulation.
 * @param {Object} team — team with roster array
 * @returns {number} -2 to +3 point modifier
 */
export function chemistryMod(team) {
  if (!team.roster || team.roster.length === 0) return 0;
  var avg2 =
    team.roster.reduce(function (s, p) {
      return s + (p.chemistry || 60);
    }, 0) / team.roster.length;
  return avg2 >= 80 ? 3 : avg2 >= 70 ? 1.5 : avg2 >= 55 ? 0 : avg2 >= 40 ? -1 : -2;
}

/**
 * Calculate system fit modifier for a team.
 * Returns a modifier applied to interception reduction.
 * @param {Object} team — team with roster array
 * @returns {number} -0.01 to +0.02
 */
export function systemFitMod(team) {
  if (!team.roster || team.roster.length === 0) return 0;
  var avgFit =
    team.roster.reduce(function (s, p) {
      return s + (p.systemFit || 30);
    }, 0) / team.roster.length;
  return avgFit >= 75 ? 0.02 : avgFit >= 55 ? 0.01 : avgFit >= 35 ? 0 : -0.01;
}

/**
 * Weekly system fit growth for all roster players.
 * Affected by coach strategy rating, work ethic, ambition, holdout status.
 */
export function updateSystemFit(team) {
  if (!team.roster) return;
  team.roster.forEach(function (p) {
    var growth = rng(1, 3);
    var pers = getPersonality(p);
    if (team.staff && team.staff.hc && team.staff.hc.ratings.strategy >= 75)
      growth += 1;
    growth += Math.round(cl(traitScalar(pers.workEthic) * 2, -1, 2));
    if (p.isStarter && pers.ambition >= 8) growth += 1;
    if (p.holdout75 && pers.greed >= 8) growth -= 2;
    growth = cl(growth, 0, 6);
    p.systemFit = cl((p.systemFit || 30) + growth, 0, 100);
  });
}

/**
 * Reset system fit on scheme change. Players lose a % of their
 * system knowledge, modified by personality traits.
 * @param {Object} team
 * @param {number} [pct=0.4] — fraction of fit lost (40% default)
 */
export function resetSystemFit(team, pct) {
  pct = pct || 0.4;
  if (!team.roster) return;
  team.roster.forEach(function (p) {
    var pers = getPersonality(p);
    var keepAdj = 0;
    if (pers.workEthic >= 8) keepAdj += 0.06;
    if (pers.loyalty >= 8) keepAdj += 0.04;
    if (p.holdout75 && pers.greed >= 8) keepAdj -= 0.08;
    var keepRate = cl(1 - pct + keepAdj, 0.2, 0.95);
    p.systemFit = Math.round((p.systemFit || 30) * keepRate);
  });
}
