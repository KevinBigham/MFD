/**
 * MFD Coaching System
 *
 * Archetypes, archetype boosts, traits, trait pools, and clique types.
 * This defines the coaching identity layer used in staff management,
 * player development, and game-day simulation.
 */

// Available archetypes per coaching role
export var ARCHETYPES = {
  HC: ['Strategist', 'Motivator', 'Disciplinarian'],
  OC: ['QB Guru', 'Run Coordinator', 'Air Attack'],
  DC: ['Blitz Master', 'DB Whisperer', 'Run Stuffer'],
};

// Rating boosts applied to players when coached by each archetype
export var ARCH_BOOST = {
  'QB Guru': { arm: 3, accuracy: 3 },
  'Run Coordinator': { runBlock: 3, power: 3 },
  'Air Attack': { routeRunning: 3, catching: 3 },
  'Blitz Master': { passRush: 3 },
  'DB Whisperer': { coverage: 3, ballSkills: 2 },
  'Run Stuffer': { runStop: 3, tackle: 2 },
  'Strategist': { awareness: 2 },
  'Motivator': { speed: 1, toughness: 1 },
  'Disciplinarian': { toughness: 2, awareness: 1 },
};

// Coach trait definitions with effects on simulation
export var COACH_TRAITS = {
  AGGRESSIVE_4TH: {
    label: 'Aggressive 4th', icon: '\u{1F3B2}',
    desc: 'Goes for it on 4th down more often',
    effects: { stallReduction: 0.03, bigPlayBoost: 0.02 },
  },
  REDZONE_SCRIPT: {
    label: 'Red Zone Script', icon: '\u{1F3AF}',
    desc: 'Deadly inside the 20',
    effects: { rzTdBoost: 4 },
  },
  PASS_PRO_TECH: {
    label: 'Pass Pro Tech', icon: '\u{1F6E1}\uFE0F',
    desc: 'O-line plays above their rating',
    effects: { pocketBoost: 0.04 },
  },
  BLITZ_PACKAGES: {
    label: 'Blitz Packages', icon: '\u26A1',
    desc: 'Creative pressure schemes',
    effects: { pressureBoost: 0.05, bigPlayAllowed: 0.02 },
  },
  BALL_HAWKS: {
    label: 'Ball Hawks', icon: '\u{1F985}',
    desc: 'Secondary creates turnovers',
    effects: { intBoost: 0.015 },
  },
  DISCIPLINE: {
    label: 'Discipline', icon: '\u{1F4CF}',
    desc: 'Fewer mistakes, stable morale',
    effects: { stallReduction: 0.02, moraleStability: 0.08, intReduction: 0.01 },
  },
  DEV_FACTORY: {
    label: 'Dev Factory', icon: '\u{1F52C}',
    desc: 'Young players develop faster',
    effects: { devRate: 0.12 },
  },
  QB_WHISPERER: {
    label: 'QB Whisperer', icon: '\u{1F9E0}',
    desc: 'QBs play above their level',
    effects: { qbBoost: 3 },
  },
  FILM_JUNKIE: {
    label: 'Film Junkie', icon: '\u{1F3AC}',
    desc: 'Better preparation = fewer surprises',
    effects: { stallReduction: 0.02, counterBoost: 1 },
  },
  PLAYER_COACH: {
    label: "Player's Coach", icon: '\u{1F91D}',
    desc: 'Players love playing for this guy',
    effects: { moraleBoost: 5, devRate: 0.06 },
  },
};

// Which traits each archetype can learn
export var ARCH_TRAIT_POOLS = {
  'Strategist': ['FILM_JUNKIE', 'AGGRESSIVE_4TH', 'REDZONE_SCRIPT', 'DISCIPLINE'],
  'Motivator': ['PLAYER_COACH', 'DEV_FACTORY', 'DISCIPLINE'],
  'Disciplinarian': ['DISCIPLINE', 'FILM_JUNKIE', 'PASS_PRO_TECH'],
  'QB Guru': ['QB_WHISPERER', 'PASS_PRO_TECH', 'REDZONE_SCRIPT'],
  'Run Coordinator': ['AGGRESSIVE_4TH', 'PASS_PRO_TECH', 'FILM_JUNKIE'],
  'Air Attack': ['REDZONE_SCRIPT', 'AGGRESSIVE_4TH', 'QB_WHISPERER'],
  'Blitz Master': ['BLITZ_PACKAGES', 'AGGRESSIVE_4TH', 'BALL_HAWKS'],
  'DB Whisperer': ['BALL_HAWKS', 'DISCIPLINE', 'FILM_JUNKIE'],
  'Run Stuffer': ['DISCIPLINE', 'BLITZ_PACKAGES', 'FILM_JUNKIE'],
};

// Locker room clique types
export var CLIQUE_TYPES = [
  { id: 0, label: 'Vets', icon: '\u{1F396}\uFE0F', desc: 'Experienced players who set the culture' },
  { id: 1, label: 'Young Core', icon: '\u{1F331}', desc: 'Hungry rookies and sophomores building chemistry' },
  { id: 2, label: 'Stars', icon: '\u2B50', desc: 'Top talent who expect to be the focal point' },
];
