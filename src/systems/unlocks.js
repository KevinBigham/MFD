/**
 * MFD Unlock System
 *
 * Progressive tab/feature unlocking based on game milestones.
 * Tracks frontOffice, scouting, warRoom, ledger, and legacy unlocks.
 */

export var UNLOCK_DEFS = [
  { id: "frontOffice", label: "Front Office Tools", trigger: "week3", tabs: ["capLab", "freeAgents"],
    toast: "\u{1F513} Front Office unlocked: Free Agency + Cap Lab.",
    inbox: "Ownership approved new FO tools. Cap Lab is live." },
  { id: "scouting", label: "Scouting Department", trigger: "season1", tabs: ["scouting", "combine"],
    toast: "\u{1F513} Scouting Department unlocked: Combine + Draft Intel.",
    inbox: "Your scouting staff is fully operational." },
  { id: "warRoom", label: "War Room", trigger: "madePlayoffs", tabs: ["warRoom"],
    toast: "\u{1F513} War Room unlocked: Draft Day trades + Deadline.",
    inbox: "After reaching the playoffs, the owner opened the War Room." },
  { id: "ledger", label: "The Ledger", trigger: "season3", tabs: ["ledger"],
    toast: "\u{1F513} The Ledger unlocked: the game audits itself now.",
    inbox: "Three seasons of data means the analytics team can work." },
  { id: "legacy", label: "Legacy", trigger: "wonTitleOrSeason5", tabs: ["hallOfFame", "records", "achievements"],
    toast: "\u{1F513} Legacy unlocked: Hall of Fame + Records.",
    inbox: "Your legacy is taking shape. The Hall of Fame opens." }
];

export var DEFAULT_UNLOCKS = { frontOffice: false, scouting: false, warRoom: false, ledger: false, legacy: false };

export function checkUnlocks(unlocks, season, teams, myId, godMode) {
  if (godMode) return { frontOffice: true, scouting: true, warRoom: true, ledger: true, legacy: true };
  var u = {};
  var src = unlocks || {};
  for (var k in DEFAULT_UNLOCKS) { u[k] = src[k] || DEFAULT_UNLOCKS[k]; }
  var my = teams.find(function (t) { return t.id === myId; });
  if (!u.frontOffice && season.week >= 3) u.frontOffice = true;
  if (!u.scouting && season.year > 2026) u.scouting = true;
  if (!u.warRoom && my && (my.madePlayoffs || (season.phase === "playoffs"))) u.warRoom = true;
  if (!u.ledger && season.year >= 2029) u.ledger = true;
  if (!u.legacy && (season.year >= 2031 || (my && my.titles && my.titles > 0))) u.legacy = true;
  return u;
}

export function isTabUnlocked(tabId, unlocks, godMode) {
  if (godMode) return true;
  var alwaysOpen = ["home", "roster", "depthChart", "schedule", "standings", "trade", "draft", "settings", "ownerReport"];
  if (alwaysOpen.indexOf(tabId) >= 0) return true;
  for (var i = 0; i < UNLOCK_DEFS.length; i++) {
    if (UNLOCK_DEFS[i].tabs.indexOf(tabId) >= 0) return unlocks[UNLOCK_DEFS[i].id] === true;
  }
  return true;
}
