/**
 * MFD Premium — Supporter Features
 *
 * 99% of the game is free forever. Premium features are purely
 * ease-of-life extras that make the game more comfortable.
 * No paywalls on core gameplay. Ever.
 *
 * Unlock flow:
 *   1. Player clicks the Ko-fi button → opens Ko-fi in new tab
 *   2. After donating, player clicks "I Supported!" in the game
 *   3. Features unlock instantly via localStorage (honor system)
 *
 * Why honor system? Zero backend, zero friction. The people who
 * love MFD enough to donate are exactly the people we trust.
 */

var STORAGE_PREFIX = 'mfd_premium_';
var SUPPORTER_KEY = 'mfd_supporter';
var KO_FI_URL = 'https://ko-fi.com/mrfootballdynasty';

export var PREMIUM_FEATURES = Object.freeze({
  godMode: {
    id: 'godMode',
    label: 'God Mode',
    icon: '◆',
    desc: 'See true OVR ratings, hidden potential, AI hand, scouting confidence overlays.',
    detail: 'Reveals the hidden numbers behind every player and AI decision. The ultimate transparency tool.',
  },
  extraScouting: {
    id: 'extraScouting',
    label: '+20 Scout Points',
    icon: '◉',
    desc: 'Start each draft cycle with 20 bonus scouting points.',
    detail: 'More intel, more confidence. Dominate the pre-draft process.',
  },
  quickSim: {
    id: 'quickSim',
    label: 'Quick-Sim Mode',
    icon: '▶▶',
    desc: 'Skip play-by-play animations. Instant game results.',
    detail: 'For dynasty veterans who want to fly through seasons at full speed.',
  },
  extraSaves: {
    id: 'extraSaves',
    label: '5 Extra Save Slots',
    icon: '◈',
    desc: 'Run up to 8 parallel dynasties instead of 3.',
    detail: 'Never choose between your rebuild and your contender window again.',
  },
  advancedAnalytics: {
    id: 'advancedAnalytics',
    label: 'Advanced Analytics',
    icon: '◇',
    desc: 'Unlock the deep dynasty stats dashboard — efficiency ratings, trend lines, comparative era analysis.',
    detail: 'The analytics suite that turns good GMs into great ones.',
  },
});

export var PREMIUM = {
  /**
   * Check if a specific feature is unlocked.
   */
  isUnlocked: function (featureId) {
    try {
      return localStorage.getItem(STORAGE_PREFIX + featureId) === 'true';
    } catch (_e) {
      return false;
    }
  },

  /**
   * Check if user has ever clicked "I Supported!" (overall supporter flag).
   */
  isSupporter: function () {
    try {
      return localStorage.getItem(SUPPORTER_KEY) === 'true';
    } catch (_e) {
      return false;
    }
  },

  /**
   * Unlock a specific feature.
   */
  unlock: function (featureId) {
    try {
      localStorage.setItem(STORAGE_PREFIX + featureId, 'true');
      return true;
    } catch (_e) {
      return false;
    }
  },

  /**
   * Unlock all features (called when user clicks "I Supported!").
   */
  unlockAll: function () {
    try {
      localStorage.setItem(SUPPORTER_KEY, 'true');
      Object.keys(PREMIUM_FEATURES).forEach(function (id) {
        localStorage.setItem(STORAGE_PREFIX + id, 'true');
      });
      return true;
    } catch (_e) {
      return false;
    }
  },

  /**
   * Reset all premium flags (for testing / user request).
   */
  reset: function () {
    try {
      localStorage.removeItem(SUPPORTER_KEY);
      Object.keys(PREMIUM_FEATURES).forEach(function (id) {
        localStorage.removeItem(STORAGE_PREFIX + id);
      });
      return true;
    } catch (_e) {
      return false;
    }
  },

  /**
   * Get the Ko-fi support URL.
   */
  getKoFiUrl: function () {
    return KO_FI_URL;
  },

  /**
   * Get a snapshot of all feature unlock states.
   */
  getStatus: function () {
    var status = { supporter: PREMIUM.isSupporter(), features: {} };
    Object.keys(PREMIUM_FEATURES).forEach(function (id) {
      status.features[id] = PREMIUM.isUnlocked(id);
    });
    return status;
  },

  /**
   * Get extra scouting points bonus (0 if not unlocked).
   */
  getScoutingBonus: function () {
    return PREMIUM.isUnlocked('extraScouting') ? 20 : 0;
  },

  /**
   * Get save slot count (3 base + 5 if unlocked).
   */
  getSaveSlotCount: function () {
    return PREMIUM.isUnlocked('extraSaves') ? 8 : 3;
  },
};
