/**
 * Legacy System — MFD Meta-Progression
 *
 * Tracks Front Office XP across all dynasties.
 * Unlocks small Legacy Perks for new dynasties.
 * Stores rival GM profiles for cross-dynasty narratives.
 * All data in localStorage — no backend.
 */

var STORAGE_KEY = 'mfd.legacy';

/**
 * Achievement definitions — milestones that earn XP.
 */
export var ACHIEVEMENTS = [
  { id: 'first_win', label: 'First Victory', desc: 'Win your first game', xp: 25 },
  { id: 'playoffs', label: 'Playoff Bound', desc: 'Make the playoffs', xp: 50 },
  { id: 'title', label: 'Champion', desc: 'Win a championship', xp: 200 },
  { id: 'dynasty', label: 'Dynasty Builder', desc: 'Win 3+ titles', xp: 500 },
  { id: 'goat', label: 'GOAT Status', desc: 'Win 5+ titles', xp: 1000 },
  { id: 'hof_drafter', label: 'HoF Drafter', desc: 'Draft 3+ Hall of Famers', xp: 200 },
  { id: 'survivor', label: 'Survivor', desc: 'Coach 10+ seasons', xp: 150 },
  { id: 'cap_wizard', label: 'Cap Wizard', desc: 'Finish a season with 50M+ cap space and 10+ wins', xp: 150 },
  { id: 'underdog', label: 'Underdog', desc: 'Win a title after being fired', xp: 300 },
  { id: 'scenario_cap_hell', label: 'Escaped Cap Hell', desc: 'Win a title from Cap Hell scenario', xp: 300 },
  { id: 'scenario_toxic', label: 'Tamed the Locker Room', desc: 'Win a title from Toxic Locker Room scenario', xp: 300 },
  { id: 'scenario_last_dance', label: 'Last Dance Champion', desc: 'Win the title in Last Dance scenario', xp: 400 },
];

/**
 * Legacy Perks — small bonuses for new dynasties.
 */
export var PERKS = [
  { id: 'scouts_eye', label: "Scout's Eye", desc: '+1 scout point at start', xpRequired: 100, icon: '🔍' },
  { id: 'silver_tongue', label: 'Silver Tongue', desc: '+5 initial owner approval', xpRequired: 200, icon: '🗣️' },
  { id: 'cap_head', label: 'Cap Head', desc: '+$2M extra cap space', xpRequired: 300, icon: '💰' },
  { id: 'culture_setter', label: 'Culture Setter', desc: '+5 locker room chemistry', xpRequired: 500, icon: '🤝' },
  { id: 'legend_name', label: 'Legacy Name', desc: 'MFSN references you as legendary from day one', xpRequired: 1000, icon: '👑' },
];

/**
 * Load legacy data from localStorage.
 */
export function loadLegacy() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_e) { /* ignore */ }
  return { xp: 0, achievements: [], perks: [], rival: null, dynastyCount: 0 };
}

/**
 * Save legacy data to localStorage.
 */
export function saveLegacy(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_e) { /* ignore */ }
}

/**
 * Award an achievement if not already earned.
 * Returns { awarded, achievement, newXp } or null if already earned.
 */
export function awardAchievement(achievementId) {
  var legacy = loadLegacy();
  if (legacy.achievements.indexOf(achievementId) !== -1) return null;

  var ach = ACHIEVEMENTS.find(function (a) { return a.id === achievementId; });
  if (!ach) return null;

  legacy.achievements.push(achievementId);
  legacy.xp += ach.xp;
  saveLegacy(legacy);

  return { awarded: true, achievement: ach, newXp: legacy.xp };
}

/**
 * Get unlocked perks based on current XP.
 */
export function getUnlockedPerks() {
  var legacy = loadLegacy();
  return PERKS.filter(function (p) { return legacy.xp >= p.xpRequired; });
}

/**
 * Get all perks with unlock status.
 */
export function getAllPerks() {
  var legacy = loadLegacy();
  return PERKS.map(function (p) {
    return {
      id: p.id,
      label: p.label,
      desc: p.desc,
      icon: p.icon,
      xpRequired: p.xpRequired,
      unlocked: legacy.xp >= p.xpRequired,
      active: legacy.perks.indexOf(p.id) !== -1,
    };
  });
}

/**
 * Set active perks for the next dynasty (max 2).
 */
export function setActivePerks(perkIds) {
  var legacy = loadLegacy();
  var valid = perkIds.filter(function (id) {
    var perk = PERKS.find(function (p) { return p.id === id; });
    return perk && legacy.xp >= perk.xpRequired;
  }).slice(0, 2);
  legacy.perks = valid;
  saveLegacy(legacy);
  return valid;
}

/**
 * Save a rival GM for cross-dynasty persistence.
 */
export function saveRival(rivalData) {
  var legacy = loadLegacy();
  legacy.rival = rivalData;
  saveLegacy(legacy);
}

/**
 * Load the rival GM.
 */
export function loadRival() {
  var legacy = loadLegacy();
  return legacy.rival;
}

/**
 * Increment dynasty count.
 */
export function incrementDynastyCount() {
  var legacy = loadLegacy();
  legacy.dynastyCount = (legacy.dynastyCount || 0) + 1;
  saveLegacy(legacy);
  return legacy.dynastyCount;
}

export var LEGACY_SYSTEM = {
  load: loadLegacy,
  save: saveLegacy,
  award: awardAchievement,
  getUnlockedPerks: getUnlockedPerks,
  getAllPerks: getAllPerks,
  setActivePerks: setActivePerks,
  saveRival: saveRival,
  loadRival: loadRival,
  incrementDynastyCount: incrementDynastyCount,
  ACHIEVEMENTS: ACHIEVEMENTS,
  PERKS: PERKS,
};
