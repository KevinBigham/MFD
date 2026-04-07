/**
 * MFD Scouting System
 *
 * Starter counts, scout costs, draft blurb generation,
 * and draft pool run alerts.
 */

// Starter count minimums by position
export var STARTER_COUNTS = { QB: 1, RB: 1, WR: 3, TE: 1, OL: 5, DL: 4, LB: 3, CB: 3, S: 2, K: 1, P: 1 };

// Scout point costs for different evaluation types
var COST_MEASURABLES = 20;
var COST_INTERVIEW = 30;
var COST_FILM = 50;

export var SCOUT_COSTS86 = {
  measurables: COST_MEASURABLES,
  interview: COST_INTERVIEW,
  film: COST_FILM,
  full: COST_MEASURABLES + COST_INTERVIEW + COST_FILM,
};

// Scout point pools
export var SCOUT_POINT_BASE86 = 1000;
export var SCOUT_POINT_GYM_BONUS86 = 100;
export var SCOUT_POINT_WIN_BONUS86 = 25;

/**
 * Generate a pick blurb — short scouting summary for a draft prospect.
 * @param {Object} player — prospect with pos, ovr, pot, age
 * @param {Array} teamRoster — current team roster to check needs
 * @returns {string} e.g. "Elite talent • young upside • fills critical need"
 */
export function genPickBlurb(player, teamRoster) {
  var pos = player.pos;
  var ovr = player.ovr;
  var pot = player.pot;
  var age = player.age;
  var counts = {};
  teamRoster.forEach(function (p) { counts[p.pos] = (counts[p.pos] || 0) + 1; });
  var have = counts[pos] || 0;
  var starterNeed = (STARTER_COUNTS || {})[pos] || 1;
  var phrases = [];
  if (ovr >= 88) phrases.push('Elite talent');
  else if (ovr >= 80) phrases.push('Day 1 starter');
  else if (ovr >= 72) phrases.push('Solid contributor');
  else phrases.push('Depth piece');
  if (age <= 23) phrases.push('young upside');
  else if (age >= 30) phrases.push('veteran presence');
  if (pot - ovr >= 12) phrases.push('sky-high ceiling');
  else if (pot - ovr >= 6) phrases.push('room to grow');
  if (have < starterNeed) phrases.push('fills critical need');
  else if (have === 0) phrases.push('first at ' + pos);
  return phrases.slice(0, 3).join(' \u2022 ');
}

/**
 * Generate run alerts for the draft — warns when talent is drying up.
 * @param {Array} pool — current draft pool
 * @param {Array} prevPool — pool from previous round
 * @returns {Array<string>} up to 2 alert messages
 */
export function genRunAlerts(pool, prevPool) {
  var alerts = [];
  if (!prevPool || !pool) return alerts;
  var countPos = function (pl, pos) { return pl.filter(function (p) { return p.pos === pos && p.ovr >= 75; }).length; };
  ['QB', 'CB', 'OL', 'WR', 'DL'].forEach(function (pos) {
    var now = countPos(pool, pos);
    var before = countPos(prevPool, pos);
    if (before - now >= 3) alerts.push('\u{1F525} RUN on ' + pos + 's! Starter-quality ' + pos + 's drying up fast');
  });
  var eliteLeft = pool.filter(function (p) { return p.ovr >= 85; }).length;
  if (eliteLeft <= 5 && eliteLeft > 0) alerts.push('\u26A0\uFE0F Only ' + eliteLeft + ' elite players (85+) remaining!');
  if (eliteLeft === 0) alerts.push('\u{1F480} All elite talent is OFF the board');
  var qbsLeft = pool.filter(function (p) { return p.pos === 'QB' && p.ovr >= 72; }).length;
  if (qbsLeft <= 3 && qbsLeft > 0) alerts.push('\u{1F4E2} Only ' + qbsLeft + ' starting-caliber QBs left!');
  return alerts.slice(0, 2);
}
