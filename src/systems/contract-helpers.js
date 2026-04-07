/**
 * MFD Contract Helper Functions
 *
 * Cap hit variants, dead cap calculations, void years,
 * trade impact analysis, and dead cap charge splitting.
 */

import { calcCapHit, calcDeadMoney, makeContract } from './contracts.js';

/**
 * Void year dead cap — accelerated bonus remaining on void years.
 */
export function voidYearDeadCap(c) {
  if (!c || !c.voidYears || c.voidYears <= 0) return 0;
  return Math.round(c.prorated * (c.voidYears || 0) * 10) / 10;
}

/**
 * Cap hit for a contract, with optional year offset.
 */
export function v36_capHit(c, yrOff) {
  if (!c) return 0;
  yrOff = yrOff || 0;
  if (c.baseSalary === undefined) return c.salary || 0;
  if (yrOff >= (c.years || 1)) return 0;
  return Math.round((c.baseSalary + (c.prorated || 0)) * 10) / 10;
}

/**
 * Cash paid for a contract year.
 */
export function v36_cashPaid(c, yrOff, isSigning) {
  if (!c) return 0;
  yrOff = yrOff || 0;
  if (c.baseSalary === undefined) return c.salary || 0;
  if (yrOff >= (c.years || 1)) return 0;
  var b = c.baseSalary;
  if (isSigning) b += (c.signingBonus || 0);
  return Math.round(b * 10) / 10;
}

/**
 * Dead cap if player is cut — includes void year acceleration.
 */
export function v36_deadIfCut(c) {
  return calcDeadMoney(c) + voidYearDeadCap(c);
}

/**
 * Dead cap if player is traded — prorated bonus * remaining years + void year dead cap.
 */
export function v36_deadIfTraded(c) {
  if (!c || !c.prorated) return 0;
  return Math.round((c.prorated * (c.years || 1) + voidYearDeadCap(c)) * 10) / 10;
}

/**
 * Cap savings from trading a player.
 */
export function v36_tradeSavings(c) {
  return Math.round((v36_capHit(c) - v36_deadIfTraded(c)) * 10) / 10;
}

/**
 * Split dead cap charge for post-trade-deadline trades (50/50 this year / next year).
 */
export function splitDeadCapCharge(deadAmt, phase, week) {
  var dead = Math.max(0, deadAmt || 0);
  var postDeadline = (phase === 'regular' && (week || 0) > 10);
  if (!postDeadline || dead <= 0) return { now: Math.round(dead * 10) / 10, next: 0, postDeadline: false };
  var now = Math.round(dead * 0.5 * 10) / 10;
  var next = Math.round((dead - now) * 10) / 10;
  return { now: now, next: next, postDeadline: true };
}

/**
 * Apply a dead cap charge split to a team's books.
 */
export function applyDeadCapCharge(team, year, split) {
  if (!team || !split) return;
  if (!team.deadCapByYear) team.deadCapByYear = {};
  var yNow = String(year || 2026);
  if (split.now > 0) {
    team.deadCap = Math.round(((team.deadCap || 0) + split.now) * 10) / 10;
    team.deadCapByYear[yNow] = Math.round(((team.deadCapByYear[yNow] || 0) + split.now) * 10) / 10;
  }
  if (split.next > 0) {
    var yNext = String((year || 2026) + 1);
    team.deadCapByYear[yNext] = Math.round(((team.deadCapByYear[yNext] || 0) + split.next) * 10) / 10;
  }
}

/**
 * Calculate trade impact — dead money, new contract, and cap savings.
 */
export function calcTradeImpact(player) {
  var c = player.contract;
  if (!c) return { deadMoney: 0, newContract: null, capSavings: 0 };
  var dead = v36_deadIfTraded(c);
  var nc = makeContract(c.baseSalary, c.years, 0, 0);
  nc.years = c.years;
  return { deadMoney: dead, newContract: nc, capSavings: Math.round((v36_capHit(c) - dead) * 10) / 10 };
}

/**
 * Add void years to a player's contract to spread bonus over more years.
 * Maximum 3 void years. Returns savings info or error.
 */
export function addVoidYears(p, numVoid) {
  var c = p.contract;
  if (!c || c.baseSalary === undefined) return { ok: false, msg: 'Contract not v35-shaped.' };
  if ((c.voidYears || 0) >= 3) return { ok: false, msg: 'Max 3 void years already added.' };
  if (c.years <= 1) return { ok: false, msg: 'Cannot add void years to expiring contract.' };
  numVoid = Math.min(numVoid || 1, 3 - (c.voidYears || 0));
  var oldHit = calcCapHit(c);
  var totalBonus = c.prorated * (c.years || 1); // total remaining bonus
  var newSpread = c.years + numVoid;
  var newPro = Math.round(totalBonus / newSpread * 10) / 10;
  c.prorated = newPro;
  c.voidYears = (c.voidYears || 0) + numVoid;
  c.salary = calcCapHit(c);
  var newHit = calcCapHit(c);
  var savings = Math.round((oldHit - newHit) * 10) / 10;
  return {
    ok: true, savings: savings, voidYears: c.voidYears, newHit: newHit,
    msg: 'Added ' + numVoid + ' void year' + (numVoid > 1 ? 's' : '') + ': saved $' + savings + 'M/yr. ' + c.voidYears + ' total void years. WARNING: $' + Math.round(totalBonus * 10) / 10 + 'M dead cap when contract expires!',
  };
}
