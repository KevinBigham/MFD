/**
 * MFD Scheme Fit System
 *
 * Calculates how well players fit their team's offensive/defensive scheme,
 * including specialty coordinator bonuses and personality adjustments.
 */

import { getPersonality, traitScalar } from './personality.js';
import { OFF_SCHEMES, DEF_SCHEMES } from '../config/schemes.js';

// Clamp helper
function cl(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

// Scheme fit rating profiles — keyed by scheme ID, then position
export var SCHEME_FIT = {
  spread: {
    QB: { key: ['accuracy', 'speed', 'awareness'], wt: [40, 30, 20] },
    RB: { key: ['speed', 'catching', 'elusiveness'], wt: [35, 35, 20] },
    WR: { key: ['routeRunning', 'speed', 'catching'], wt: [35, 30, 25] },
    TE: { key: ['catching', 'routeRunning', 'speed'], wt: [40, 30, 20] },
    OL: { key: ['passBlock', 'awareness'], wt: [60, 30] },
  },
  west_coast: {
    QB: { key: ['accuracy', 'awareness', 'arm'], wt: [45, 30, 15] },
    RB: { key: ['catching', 'elusiveness', 'speed'], wt: [40, 30, 20] },
    WR: { key: ['catching', 'routeRunning', 'awareness'], wt: [35, 35, 20] },
    TE: { key: ['catching', 'blocking', 'routeRunning'], wt: [35, 35, 20] },
    OL: { key: ['passBlock', 'runBlock', 'awareness'], wt: [35, 30, 25] },
  },
  smashmouth: {
    QB: { key: ['awareness', 'toughness', 'arm'], wt: [40, 30, 20] },
    RB: { key: ['power', 'speed', 'elusiveness'], wt: [45, 25, 20] },
    WR: { key: ['catching', 'awareness', 'speed'], wt: [35, 30, 25] },
    TE: { key: ['blocking', 'toughness', 'catching'], wt: [45, 30, 15] },
    OL: { key: ['runBlock', 'strength', 'toughness'], wt: [45, 30, 15] },
  },
  pro_style: {
    QB: { key: ['arm', 'awareness', 'accuracy'], wt: [40, 30, 20] },
    RB: { key: ['power', 'catching', 'awareness'], wt: [35, 30, 25] },
    WR: { key: ['catching', 'routeRunning', 'awareness'], wt: [35, 30, 25] },
    TE: { key: ['blocking', 'catching', 'awareness'], wt: [35, 35, 20] },
    OL: { key: ['passBlock', 'runBlock', 'awareness'], wt: [40, 30, 20] },
  },
  air_coryell: {
    QB: { key: ['arm', 'deepAccuracy', 'awareness'], wt: [45, 35, 10] },
    RB: { key: ['speed', 'catching', 'awareness'], wt: [40, 30, 20] },
    WR: { key: ['deepRoute', 'speed', 'separation'], wt: [45, 35, 10] },
    TE: { key: ['deepRoute', 'catching', 'speed'], wt: [40, 35, 15] },
    OL: { key: ['passBlock', 'awareness', 'strength'], wt: [45, 30, 15] },
  },
  balanced: {
    QB: { key: ['accuracy', 'awareness', 'arm'], wt: [30, 30, 30] },
    RB: { key: ['speed', 'power', 'catching'], wt: [30, 30, 30] },
    WR: { key: ['catching', 'routeRunning', 'speed'], wt: [30, 30, 30] },
    TE: { key: ['catching', 'blocking', 'routeRunning'], wt: [30, 30, 30] },
    OL: { key: ['passBlock', 'runBlock', 'strength'], wt: [30, 30, 30] },
  },
  pistol: {
    QB: { key: ['speed', 'awareness', 'accuracy'], wt: [35, 35, 20] },
    RB: { key: ['catching', 'speed', 'elusiveness'], wt: [40, 35, 15] },
    WR: { key: ['speed', 'separation', 'routeRunning'], wt: [35, 30, 25] },
    TE: { key: ['catching', 'speed', 'awareness'], wt: [35, 30, 25] },
    OL: { key: ['passBlock', 'awareness', 'speed'], wt: [40, 30, 20] },
  },
  heavy_jumbo: {
    QB: { key: ['awareness', 'toughness', 'arm'], wt: [35, 30, 25] },
    RB: { key: ['power', 'breakTackle', 'truckPower'], wt: [45, 30, 15] },
    WR: { key: ['catching', 'toughness', 'blocking'], wt: [35, 30, 25] },
    TE: { key: ['blocking', 'impactBlocking', 'toughness'], wt: [50, 30, 10] },
    OL: { key: ['runBlock', 'strength', 'impactBlocking'], wt: [50, 30, 10] },
  },
  '4-3': {
    DL: { key: ['passRush', 'speed', 'strength'], wt: [40, 30, 20] },
    LB: { key: ['tackle', 'coverage', 'speed'], wt: [35, 30, 25] },
    CB: { key: ['coverage', 'speed', 'ballSkills'], wt: [35, 30, 25] },
    S: { key: ['coverage', 'speed', 'tackling'], wt: [35, 30, 25] },
  },
  '3-4': {
    DL: { key: ['runStop', 'strength', 'toughness'], wt: [40, 35, 15] },
    LB: { key: ['passRush', 'speed', 'tackle'], wt: [35, 30, 25] },
    CB: { key: ['coverage', 'awareness', 'ballSkills'], wt: [35, 30, 25] },
    S: { key: ['tackling', 'coverage', 'awareness'], wt: [35, 30, 25] },
  },
  multiple_d: {
    DL: { key: ['passRush', 'runStop', 'speed'], wt: [35, 35, 20] },
    LB: { key: ['coverage', 'speed', 'awareness'], wt: [40, 30, 20] },
    CB: { key: ['manCoverage', 'coverage', 'speed'], wt: [40, 30, 20] },
    S: { key: ['coverage', 'awareness', 'rangeAbility'], wt: [40, 30, 20] },
  },
  nickel: {
    DL: { key: ['passRush', 'speed', 'strength'], wt: [40, 30, 20] },
    LB: { key: ['coverage', 'speed', 'awareness'], wt: [40, 30, 20] },
    CB: { key: ['coverage', 'ballSkills', 'speed'], wt: [40, 30, 20] },
    S: { key: ['coverage', 'ballSkills', 'awareness'], wt: [40, 30, 20] },
  },
  bear_46: {
    DL: { key: ['passRush', 'runStop', 'strength'], wt: [40, 35, 15] },
    LB: { key: ['tackle', 'runStop', 'passRush'], wt: [45, 35, 10] },
    CB: { key: ['manCoverage', 'press', 'toughness'], wt: [50, 30, 10] },
    S: { key: ['tackling', 'runSupport', 'awareness'], wt: [45, 35, 10] },
  },
};

/**
 * Calculate how well a player fits a specific scheme.
 */
export function calcSchemeFit(player, schemeId) {
  if (!player || !schemeId) return { score: 50, grade: 'C', label: 'Average', boost: 0 };
  var profile = SCHEME_FIT[schemeId] && SCHEME_FIT[schemeId][player.pos];
  if (!profile) {
    var b = player.ovr || 50;
    return { score: b, grade: b >= 85 ? 'A' : b >= 75 ? 'B' : b >= 65 ? 'C' : 'D', label: 'Neutral', boost: 0 };
  }
  var sum = 0, tw = 0;
  for (var i = 0; i < profile.key.length; i++) {
    var v = player.ratings ? (player.ratings[profile.key[i]] || 50) : 50;
    var w = profile.wt[i] || 10;
    sum += v * w;
    tw += w;
  }
  var s = tw > 0 ? Math.round(sum / tw) : 50;
  s = cl(s, 1, 99);
  var grade = s >= 92 ? 'A+' : s >= 85 ? 'A' : s >= 78 ? 'B+' : s >= 72 ? 'B' : s >= 65 ? 'C+' : s >= 58 ? 'C' : s >= 50 ? 'D' : 'F';
  var boost = s >= 92 ? 4 : s >= 85 ? 3 : s >= 78 ? 1 : s >= 65 ? 0 : s >= 50 ? -1 : -3;
  var label = s >= 85 ? 'Perfect Fit' : s >= 72 ? 'Good Fit' : s >= 58 ? 'Ok Fit' : 'Poor Fit';
  return { score: s, grade: grade, label: label, boost: boost };
}

/**
 * Convert fit score to tier label.
 */
export function fitTierFromScore(score) {
  return score >= 90 ? 'ELITE' : score >= 80 ? 'STRONG' : score >= 68 ? 'SOLID' : score >= 56 ? 'FRINGE' : 'POOR';
}

/**
 * Determine if a position is offensive, defensive, or other (K/P).
 */
export function getPlayerSide(pos) {
  if (['QB', 'RB', 'WR', 'TE', 'OL'].indexOf(pos) >= 0) return 'off';
  if (['DL', 'LB', 'CB', 'S'].indexOf(pos) >= 0) return 'def';
  return 'other';
}

/**
 * Get coordinator specialty bonus from team staff.
 */
export function getSpecialtyBonus(team, side) {
  if (!team || !team.staff) return null;
  var coord = side === 'off' ? team.staff.oc : team.staff.dc;
  if (!coord || !coord.specialty75) return null;
  return coord.specialty75;
}

/**
 * Specialty coordinator fit adjustment based on position and coordinator specialty.
 */
export function calcSpecialtyFitAdj(team, player, side) {
  if (!team || !player || (side !== 'off' && side !== 'def')) return 0;
  var spec = getSpecialtyBonus(team, side);
  if (!spec || !spec.id) return 0;
  var pos = player.pos, adj = 0;
  if (side === 'off') {
    if (spec.id === 'run_guru') {
      if (pos === 'RB') adj += 6;
      else if (pos === 'OL' || pos === 'TE') adj += 4;
      else if (pos === 'QB') adj += 1;
    } else if (spec.id === 'pass_arch') {
      if (pos === 'QB') adj += 6;
      else if (pos === 'WR' || pos === 'TE') adj += 4;
      else if (pos === 'OL') adj += 2;
    } else if (spec.id === 'rz_spec') {
      if (['QB', 'RB', 'WR', 'TE'].indexOf(pos) >= 0) adj += 3;
      else if (pos === 'OL') adj += 1;
    } else if (spec.id === 'tempo') {
      adj += (player.ratings && (player.ratings.stamina || 50) >= 70) ? 3 : 1;
    } else if (spec.id === 'play_action') {
      if (pos === 'QB') adj += 4;
      else if (pos === 'RB' || pos === 'WR' || pos === 'TE') adj += 3;
      else if (pos === 'OL') adj += 1;
    }
  } else if (side === 'def') {
    if (spec.id === 'blitz_des') {
      if (pos === 'DL' || pos === 'LB') adj += 5;
      else if (pos === 'CB' || pos === 'S') adj += 1;
    } else if (spec.id === 'cov_spec') {
      if (pos === 'CB' || pos === 'S') adj += 5;
      else if (pos === 'LB') adj += 2;
    } else if (spec.id === 'run_stop') {
      if (pos === 'DL' || pos === 'LB') adj += 5;
      else if (pos === 'S') adj += 1;
    } else if (spec.id === 'turnover') {
      if (pos === 'CB' || pos === 'S') adj += 4;
      else if (pos === 'LB' || pos === 'DL') adj += 2;
    } else if (spec.id === 'situational') {
      if (pos === 'LB' || pos === 'S' || pos === 'CB') adj += 3;
      else if (pos === 'DL') adj += 2;
    }
  }
  return cl(adj, -8, 8);
}

/**
 * Personality-based fit adjustment.
 */
export function calcPersonalityFitAdj(player, team) {
  if (!player) return 0;
  var pers = getPersonality(player);
  var workS = traitScalar(pers.workEthic);
  var loyalS = traitScalar(pers.loyalty);
  var greedS = traitScalar(pers.greed);
  var ambS = traitScalar(pers.ambition);
  var adj = workS * 4 + ambS * 2 - Math.max(0, greedS) * 2;
  if (team && player.formerTeam && player.formerTeam === team.id) adj += Math.max(0, loyalS) * 2.5;
  else adj += loyalS * 1.2;
  if (player.holdout75 && pers.greed >= 7) adj -= 3;
  return cl(Math.round(adj), -8, 8);
}

/**
 * Comprehensive player identity fit — combines scheme fit, specialty, personality, and system fit.
 */
export function calcPlayerIdentityFit(player, team, offScheme, defScheme) {
  if (!player) return { score: 50, letter: 'C', tier: 'SOLID', baseScore: 50, specialtyAdj: 0, personalityAdj: 0, systemAdj: 0, totalAdj: 0, side: 'other', schemeId: '', schemeLabel: 'Neutral', specialtyId: '', specialtyLabel: '' };
  var side = getPlayerSide(player.pos);
  var schemeId = side === 'off' ? (offScheme || (team && team.schemeOff) || 'balanced') : side === 'def' ? (defScheme || (team && team.schemeDef) || '4-3') : '';
  var base = side === 'other' ? (player.ovr || 50) : calcSchemeFit(player, schemeId).score;
  var specialtyAdj = calcSpecialtyFitAdj(team, player, side);
  var personalityAdj = calcPersonalityFitAdj(player, team);
  var systemAdj = (player.systemFit === undefined || player.systemFit === null) ? 0 : Math.round((player.systemFit - 50) / 10);
  systemAdj = cl(systemAdj, -6, 6);
  var totalAdj = cl(specialtyAdj + personalityAdj + systemAdj, -12, 12);
  var score = cl(base + totalAdj, 20, 99);
  var letter = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 65 ? 'C' : score >= 50 ? 'D' : 'F';
  var spec = (side === 'off' || side === 'def') ? (getSpecialtyBonus(team, side) || {}) : {};
  var scDef = OFF_SCHEMES.concat(DEF_SCHEMES).find(function (s) { return s.id === schemeId; }) || {};
  return {
    score: score, letter: letter, tier: fitTierFromScore(score),
    baseScore: base, specialtyAdj: specialtyAdj, personalityAdj: personalityAdj, systemAdj: systemAdj, totalAdj: totalAdj,
    side: side, schemeId: schemeId, schemeLabel: scDef.name || schemeId || 'Neutral', specialtyId: spec.id || '', specialtyLabel: spec.label || '',
  };
}

/**
 * Calculate aggregate team fit scores.
 */
export function calcTeamFit(team) {
  if (!team || !team.roster) return { off: 0, def: 0, total: 0, fits: { A: 0, B: 0, C: 0, D: 0, F: 0 } };
  var oS = 0, oC = 0, dS = 0, dC = 0, fits = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  team.roster.forEach(function (p) {
    var side = getPlayerSide(p.pos);
    var isOff = side === 'off';
    var isDef = side === 'def';
    if (!isOff && !isDef) return;
    var fit = calcPlayerIdentityFit(p, team);
    if (isOff) { oS += fit.score; oC++; } else { dS += fit.score; dC++; }
    var gl = fit.letter.charAt(0);
    if (fits.hasOwnProperty(gl)) fits[gl]++;
    else if (gl === 'F') fits.F++;
  });
  return {
    off: oC ? Math.round(oS / oC) : 0,
    def: dC ? Math.round(dS / dC) : 0,
    total: (oC + dC) ? Math.round((oS + dS) / (oC + dC)) : 0,
    fits: fits,
  };
}

/**
 * Get a single player's fit score against a team.
 */
export function getTeamPlayerFitScore86(team, player) {
  return calcPlayerIdentityFit(player, team).score;
}

/**
 * Get scheme mismatch warnings for starters below fit threshold.
 */
export function getSchemeMismatchWarnings(team) {
  var w = [];
  if (!team || !team.roster) return w;
  team.roster.forEach(function (p) {
    if (!p.isStarter) return;
    if (getPlayerSide(p.pos) === 'other') return;
    var fit = calcPlayerIdentityFit(p, team);
    if (fit.score < 65) w.push({ player: p, grade: fit.letter, score: fit.score, scheme: fit.schemeId });
  });
  return w.sort(function (a, b) { return a.score - b.score; });
}

// Fit group definitions for UI display
export var FIT_GROUP_DEFS = [
  { id: 'qb', label: 'QB', side: 'off', pos: ['QB'] },
  { id: 'rb', label: 'RB', side: 'off', pos: ['RB'] },
  { id: 'wrte', label: 'WR/TE', side: 'off', pos: ['WR', 'TE'] },
  { id: 'ol', label: 'OL', side: 'off', pos: ['OL'] },
  { id: 'dl', label: 'DL', side: 'def', pos: ['DL'] },
  { id: 'lb', label: 'LB', side: 'def', pos: ['LB'] },
  { id: 'db', label: 'DB', side: 'def', pos: ['CB', 'S'] },
];
