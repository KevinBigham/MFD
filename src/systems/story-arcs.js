/**
 * MFD Story Arc System
 *
 * Player narrative states, story arc event templates,
 * and weighted event selection.
 */

import { RNG } from '../utils/rng.js';

// Narrative state constants
export var NARRATIVE_STATES = {
  BREAKOUT: 'breakout',
  ELITE: 'elite',
  SLUMP: 'slump',
  COMEBACK: 'comeback',
  DECLINE: 'decline',
  HOLDOUT: 'holdout',
  REDEMPTION: 'redemption',
  MENTOR: 'mentor',
  SWAN_SONG: 'swan_song',
};

// Story arc event templates — headlines, OVR/morale modifiers, and display colors
export var STORY_ARC_EVENTS = {
  breakout: [
    { w: 3, headline: '{name} is EMERGING as a franchise cornerstone', ovrMod: 2, moraleMod: 10, color: '#34d399' },
    { w: 2, headline: 'League taking notice of {name}\'s breakout campaign', ovrMod: 1, moraleMod: 8, color: '#34d399' },
    { w: 1, headline: '{name} \u2014 young star making noise in a big way', ovrMod: 1, moraleMod: 6, color: '#34d399' },
  ],
  elite: [
    { w: 3, headline: '{name} cementing All-Pro status \u2014 elite performance continues', ovrMod: 0, moraleMod: 6, color: '#fbbf24' },
    { w: 2, headline: 'Critics agree: {name} is the best {pos} in the league', ovrMod: 0, moraleMod: 8, color: '#fbbf24' },
    { w: 1, headline: '{name} carrying this franchise on their back', ovrMod: 0, moraleMod: 5, color: '#fbbf24' },
  ],
  slump: [
    { w: 3, headline: '{name} struggling \u2014 benching rumors surface', ovrMod: -2, moraleMod: -12, color: '#ef4444' },
    { w: 2, headline: 'What\'s wrong with {name}? Media asks questions', ovrMod: -1, moraleMod: -8, color: '#ef4444' },
    { w: 1, headline: '{name}\'s rough stretch draws attention from league observers', ovrMod: -1, moraleMod: -6, color: '#f59e0b' },
  ],
  comeback: [
    { w: 3, headline: '{name} silences doubters with dominant performance', ovrMod: 3, moraleMod: 15, color: '#60a5fa' },
    { w: 2, headline: 'Redemption arc: {name} back and better than ever', ovrMod: 2, moraleMod: 10, color: '#60a5fa' },
    { w: 1, headline: '{name} proving the critics wrong, one play at a time', ovrMod: 1, moraleMod: 8, color: '#60a5fa' },
  ],
  decline: [
    { w: 2, headline: 'Father Time catching up with {name}? Production slipping', ovrMod: -1, moraleMod: -6, color: '#94a3b8' },
    { w: 1, headline: '{name} showing his age \u2014 but the veteran still competes', ovrMod: 0, moraleMod: -4, color: '#94a3b8' },
  ],
  holdout: [
    { w: 2, headline: '{name}\'s agent: \'My client deserves top-of-market money\'', ovrMod: 0, moraleMod: -8, color: '#f59e0b' },
    { w: 1, headline: '{name} holdout entering week two \u2014 talks stalled', ovrMod: 0, moraleMod: -10, color: '#ef4444' },
  ],
  redemption: [
    { w: 3, headline: '{name} answering every critic \u2014 redemption season is real', ovrMod: 2, moraleMod: 12, color: '#a78bfa' },
    { w: 2, headline: '{name} on a mission to prove the doubters wrong', ovrMod: 1, moraleMod: 8, color: '#a78bfa' },
  ],
  mentor: [
    { w: 2, headline: 'Veteran {name} quietly developing the next generation', ovrMod: 0, moraleMod: 10, color: '#22d3ee' },
    { w: 1, headline: '{name}\'s locker room leadership drawing praise from coaching staff', ovrMod: 0, moraleMod: 8, color: '#22d3ee' },
  ],
  swan_song: [
    { w: 2, headline: 'Could this be {name}\'s final season? \'I\'m giving everything I have\'', ovrMod: 0, moraleMod: 20, color: '#fbbf24' },
    { w: 1, headline: '{name} playing with the fire of a man who has nothing left to prove', ovrMod: 0, moraleMod: 15, color: '#fbbf24' },
  ],
};

/**
 * Pick a weighted random event from an event array.
 * Events with higher `w` values are more likely to be selected.
 */
export function pickWeightedEvent(events) {
  if (!events || !events.length) return null;
  var total = events.reduce(function (s, e) { return s + (e.w || 1); }, 0);
  var r = RNG.play() * total;
  for (var i = 0; i < events.length; i++) {
    r -= (events[i].w || 1);
    if (r <= 0) return events[i];
  }
  return events[0];
}
