/**
 * MFD Player Traits System
 *
 * 26 unique traits with effects, milestones, and assignment logic.
 * Traits affect morale, media, development, clutch, and injury.
 */

import { RNG } from '../utils/rng.js';

// 26 traits + none — each with name, icon, description, and spawn pct
export var TRAITS = {
  loyal: { name: 'Loyal', icon: '\u{1F6E1}\uFE0F', desc: 'Signs for less. Stable morale.', pct: 9 },
  mercenary: { name: 'Mercenary', icon: '\u{1F4B0}', desc: 'Wants 20% more. Chases money.', pct: 7 },
  captain: { name: 'Captain', icon: '\u00A9\uFE0F', desc: 'Boosts teammate morale.', pct: 6 },
  cancer: { name: 'Cancer', icon: '\u2622\uFE0F', desc: 'Lowers team morale. Locker room risk.', pct: 4 },
  clutch: { name: 'Clutch', icon: '\u2744\uFE0F', desc: 'Plays up in big moments.', pct: 7 },
  glass: { name: 'Glass', icon: '\u{1F691}', desc: 'Injury prone. Cheaper to sign.', pct: 6 },
  workhorse: { name: 'Workhorse', icon: '\u{1F40E}', desc: 'Extra development. Iron man.', pct: 5 },
  gym_rat: { name: 'Gym Rat', icon: '\u{1F400}', desc: 'Develops even without snaps. Camp star.', pct: 5 },
  mentor: { name: 'Mentor', icon: '\u{1F4DA}', desc: 'Boosts rookie dev in position group.', pct: 4 },
  hothead: { name: 'Hot Head', icon: '\u{1F336}\uFE0F', desc: 'Penalties, fights, but plays with fire.', pct: 4 },
  showtime: { name: 'Showtime', icon: '\u{1F3AD}', desc: 'Plays up on big stage. Primetime performer. Media magnet.', pct: 5 },
  film_junkie: { name: 'Film Junkie', icon: '\u{1F4FD}\uFE0F', desc: 'Studies tape obsessively. Faster development from game reps.', pct: 4 },
  vocal_leader: { name: 'Vocal Leader', icon: '\u{1F4E2}', desc: 'Steadies the ship in losses. Raises floor of team morale.', pct: 4 },
  holdout: { name: 'Holdout Risk', icon: '\u270A', desc: 'Demands top-market money. May refuse to play if underpaid.', pct: 4 },
  party_animal: { name: 'Party Animal', icon: '\u{1F389}', desc: 'Off-field incidents risk. Suspension chance. Fans love him though.', pct: 4 },
  ego: { name: 'Big Ego', icon: '\u{1F451}', desc: 'Demands targets/touches. Morale tanks if not featured.', pct: 4 },
  // v95: 8 NEW TRAITS — synthesized from Gemini + Mistral + DeepSeek AI research
  hometown_hero: { name: 'Hometown Hero', icon: '\u{1F3E1}', desc: 'Beloved locally. Owner loves him. Accepts discount to stay.', pct: 3 },
  late_bloomer: { name: 'Late Bloomer', icon: '\u{1F331}', desc: 'Slow start, massive late-career development spike.', pct: 3 },
  ironman: { name: 'Ironman', icon: '\u{1F6E1}\uFE0F', desc: 'Plays through pain. Virtually indestructible. Never misses games.', pct: 3 },
  chip: { name: 'Chip on Shoulder', icon: '\u{1F624}', desc: 'Overlooked and driven. Proves doubters wrong through sheer will.', pct: 3 },
  media_darling: { name: 'Media Darling', icon: '\u{1F3A4}', desc: 'Press favorite. Revenue boost but occasional distraction.', pct: 3 },
  streaky: { name: 'Streaky', icon: '\u{1F3A2}', desc: 'Brilliant highs, brutal lows. Rides momentum swings hard.', pct: 3 },
  stat_padder: { name: 'Stat Padder', icon: '\u{1F4CA}', desc: 'Chases personal numbers over winning. Folds in crunch time.', pct: 3 },
  comeback_kid: { name: 'Comeback Kid', icon: '\u{1F504}', desc: 'Thrives in deficit situations. Elevates entire team trailing.', pct: 3 },
  none: { name: '', icon: '', desc: '', pct: 10 },
};

// Trait effect modifiers — morale, media, dev, clutch, injury
export var TRAIT_FX = {
  captain: { morale: 3, media: 0, dev: 0, clutch: 2, injury: 0 },
  cancer: { morale: -3, media: 2, dev: -1, clutch: -1, injury: 0 },
  clutch: { morale: 0, media: 1, dev: 0, clutch: 5, injury: 0 },
  glass: { morale: -1, media: 0, dev: 0, clutch: 0, injury: 4 },
  workhorse: { morale: 0, media: 0, dev: 1, clutch: 0, injury: -2 },
  gym_rat: { morale: 0, media: 0, dev: 2, clutch: 0, injury: 0 },
  mentor: { morale: 1, media: 0, dev: 3, clutch: 0, injury: 0 },
  hothead: { morale: -2, media: 2, dev: -1, clutch: -1, injury: 0 },
  loyal: { morale: 2, media: 0, dev: 0, clutch: 1, injury: 0 },
  mercenary: { morale: -1, media: 1, dev: 0, clutch: 0, injury: 0 },
  showtime: { morale: 1, media: 3, dev: 0, clutch: 3, injury: 0 },
  film_junkie: { morale: 0, media: 0, dev: 3, clutch: 1, injury: 0 },
  vocal_leader: { morale: 4, media: 1, dev: 0, clutch: 1, injury: 0 },
  holdout: { morale: -2, media: 2, dev: 0, clutch: 0, injury: 0 },
  party_animal: { morale: -1, media: 3, dev: -1, clutch: 0, injury: 1 },
  ego: { morale: -2, media: 2, dev: 0, clutch: 1, injury: 0 },
  // v95: New trait FX
  hometown_hero: { morale: 2, media: 3, dev: 1, clutch: 1, injury: 0 },
  late_bloomer: { morale: 0, media: -1, dev: 4, clutch: 1, injury: -1 },
  ironman: { morale: 2, media: 1, dev: 0, clutch: 1, injury: -4 },
  chip: { morale: -1, media: -1, dev: 3, clutch: 2, injury: 0 },
  media_darling: { morale: 1, media: 5, dev: -1, clutch: -1, injury: 0 },
  streaky: { morale: -1, media: 1, dev: 0, clutch: -3, injury: 0 },
  stat_padder: { morale: -2, media: 1, dev: 1, clutch: -3, injury: -1 },
  comeback_kid: { morale: 2, media: 2, dev: 1, clutch: 4, injury: 0 },
};

// v95.9: TRAIT MILESTONE SYSTEM — career achievements that power-up trait effects
export var TRAIT_MILESTONES95 = {
  clutch: { milestones: [
    { key: 'clutch_1', label: 'CLUTCH MOMENT', stat: 'seasons', thresh: 3, reward: '+0.25 clutch swing', powerLevel: 1 },
    { key: 'clutch_2', label: 'MR. CLUTCH', stat: 'seasons', thresh: 7, reward: '+0.5 clutch swing', powerLevel: 2 },
  ] },
  workhorse: { milestones: [
    { key: 'workhorse_1', label: 'IRON ROUTINE', stat: 'snaps', thresh: 1500, reward: '+10% injury skip', powerLevel: 1 },
    { key: 'workhorse_2', label: 'WORKHORSE LEGEND', stat: 'snaps', thresh: 4000, reward: '+20% injury skip', powerLevel: 2 },
  ] },
  gym_rat: { milestones: [
    { key: 'gym_rat_1', label: 'STUDENT OF THE GAME', stat: 'seasons', thresh: 2, reward: '+0.1 dev mult', powerLevel: 1 },
    { key: 'gym_rat_2', label: 'FILM ROOM LEGEND', stat: 'seasons', thresh: 5, reward: '+0.2 dev mult', powerLevel: 2 },
  ] },
  captain: { milestones: [
    { key: 'captain_1', label: 'NATURAL LEADER', stat: 'seasons', thresh: 3, reward: '+1 morale bonus', powerLevel: 1 },
    { key: 'captain_2', label: 'FRANCHISE CAPTAIN', stat: 'seasons', thresh: 6, reward: '+2 morale bonus', powerLevel: 2 },
  ] },
  ironman: { milestones: [
    { key: 'ironman_1', label: 'NEVER MISSES', stat: 'gp', thresh: 80, reward: 'iron streak \u2014 injury skip rises', powerLevel: 1 },
    { key: 'ironman_2', label: 'INDESTRUCTIBLE', stat: 'gp', thresh: 160, reward: 'peak ironman \u2014 skip rate maxed', powerLevel: 2 },
  ] },
  showtime: { milestones: [
    { key: 'showtime_1', label: 'FAN FAVORITE', stat: 'seasons', thresh: 3, reward: '+0.1 fanbase/win', powerLevel: 1 },
    { key: 'showtime_2', label: 'FRANCHISE ICON', stat: 'seasons', thresh: 6, reward: 'elite media draw', powerLevel: 2 },
  ] },
  comeback_kid: { milestones: [
    { key: 'comeback_kid_1', label: 'NEVER SAY DIE', stat: 'seasons', thresh: 3, reward: '+1 comeback clutch', powerLevel: 1 },
    { key: 'comeback_kid_2', label: 'CLUTCH LEGEND', stat: 'seasons', thresh: 6, reward: '+2 comeback clutch', powerLevel: 2 },
  ] },
  vocal_leader: { milestones: [
    { key: 'vocal_leader_1', label: 'LOCKER ROOM VOICE', stat: 'seasons', thresh: 3, reward: 'morale floor rises to 48', powerLevel: 1 },
    { key: 'vocal_leader_2', label: 'LOCKER ROOM LEGEND', stat: 'seasons', thresh: 6, reward: 'morale floor rises to 52', powerLevel: 2 },
  ] },
  film_junkie: { milestones: [
    { key: 'film_junkie_1', label: 'SCHEME STUDENT', stat: 'seasons', thresh: 2, reward: 'scout discount +60%', powerLevel: 1 },
    { key: 'film_junkie_2', label: 'DEFENSIVE GENIUS', stat: 'seasons', thresh: 5, reward: 'scout discount +70%', powerLevel: 2 },
  ] },
  late_bloomer: { milestones: [
    { key: 'late_bloomer_1', label: 'FINALLY ARRIVED', stat: 'seasons', thresh: 4, reward: '+0.2 surge mult', powerLevel: 1 },
    { key: 'late_bloomer_2', label: 'LATE-CAREER PEAK', stat: 'seasons', thresh: 8, reward: '+0.4 surge mult', powerLevel: 2 },
  ] },
};

/**
 * Get normalized trait array for a player.
 * Handles both old (single .trait) and new (.traits95 array) formats.
 */
export function getPlayerTraits95(p) {
  if (!p) return [];
  var raw = (Array.isArray(p.traits95) && p.traits95.length > 0) ? p.traits95 : [p.trait || 'none'];
  var out = [];
  (raw || []).forEach(function (tk) {
    if (typeof tk !== 'string' || tk === 'none' || !TRAITS[tk] || out.indexOf(tk) >= 0) return;
    out.push(tk);
  });
  return out;
}

/**
 * Check if a player has a specific trait.
 */
export function hasTrait95(p, traitId) {
  if (!traitId) return false;
  return getPlayerTraits95(p).indexOf(traitId) >= 0;
}

/**
 * Assign a single trait using weighted random selection.
 */
export function assignTrait() {
  var r = RNG.draft() * 100;
  var cum = 0;
  var keys = Object.keys(TRAITS);
  for (var i = 0; i < keys.length; i++) {
    cum += TRAITS[keys[i]].pct;
    if (r < cum) return keys[i];
  }
  return 'none';
}

/**
 * Assign up to 3 unique traits — primary + optional secondary + rare tertiary.
 * 45% chance of 2nd trait, 15% chance of 3rd.
 */
export function assignTraits() {
  var primary = assignTrait();
  var traits = [primary];
  // 45% chance of a second trait (different from primary)
  if (RNG.draft() < 0.45) {
    var attempts = 0;
    var second;
    do {
      second = assignTrait();
      attempts++;
    } while ((second === primary || second === 'none') && attempts < 8);
    if (second && second !== 'none' && second !== primary) traits.push(second);
  }
  // 15% chance of a third trait (different from both)
  if (traits.length >= 2 && RNG.draft() < 0.15) {
    var attempts2 = 0;
    var third;
    do {
      third = assignTrait();
      attempts2++;
    } while ((traits.indexOf(third) >= 0 || third === 'none') && attempts2 < 8);
    if (third && third !== 'none' && traits.indexOf(third) < 0) traits.push(third);
  }
  return traits;
}

/**
 * Check trait milestones after career stat update.
 * Returns array of newly-hit milestone keys.
 */
export function checkTraitMilestones95(p) {
  if (!p || !p.careerStats) return [];
  var tks = getPlayerTraits95(p);
  if (!tks.length) return [];
  // v95.9 polish: initialize both tracking dicts at entry (safe on old saves)
  if (!p.traitMilestones95) p.traitMilestones95 = {};
  if (!p.traitPowerLevel95) p.traitPowerLevel95 = {};
  var newHits = [];
  tks.forEach(function (tk) {
    var mDef = TRAIT_MILESTONES95[tk];
    if (!mDef || !mDef.milestones) return;
    mDef.milestones.forEach(function (m) {
      if (p.traitMilestones95[m.key]) return; // already achieved
      var val = p.careerStats[m.stat] || 0;
      if (val >= m.thresh) {
        p.traitMilestones95[m.key] = true;
        var cur = p.traitPowerLevel95[tk] || 0;
        p.traitPowerLevel95[tk] = Math.max(cur, m.powerLevel);
        newHits.push({ traitKey: tk, milestoneKey: m.key, label: m.label, reward: m.reward, powerLevel: m.powerLevel });
      }
    });
  });
  return newHits;
}
