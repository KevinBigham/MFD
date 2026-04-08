/**
 * Playbook System — 40+ offensive/defensive plays with situational ratings.
 *
 * Each play has a name, type, yardage range, risk profile, situational boosts,
 * scheme affinity, and a commentary hook for broadcast integration.
 */
import type { PrngFn } from '../rng';
import type { DefensiveGamePlan, OffensiveGamePlan } from '../types';

// ── Play Types ─────────────────────────────────────────

export type PlayCategory = 'run' | 'pass';
export type Situation = 'normal' | 'short_yardage' | 'red_zone' | 'two_minute' | 'goal_line' | 'third_long';

export interface PlayDef {
  id: string;
  name: string;
  category: PlayCategory;
  /** Commentary hook — used by broadcast engine */
  commentary: string;
  /** Base yards range [min, max] */
  yardsRange: [number, number];
  /** Big play probability (0-1) — chance of a breakaway */
  bigPlayChance: number;
  /** Fumble risk modifier vs base (1.0 = normal) */
  fumbleRisk: number;
  /** Situations where this play gets a quality boost */
  situationBoosts: Partial<Record<Situation, number>>;
  /** Schemes that favor this play (quality bonus when matched) */
  schemeAffinity: readonly string[];
  /** Offensive game plans that favor this play */
  planAffinity: readonly OffensiveGamePlan[];
}

export interface DefensivePlayDef {
  id: string;
  name: string;
  commentary: string;
  /** Coverage bonus vs pass (0-10) */
  coverageBonus: number;
  /** Run stop bonus vs run (0-10) */
  runStopBonus: number;
  /** Pressure bonus (sack chance modifier) */
  pressureBonus: number;
  /** Risk of giving up big play (0-1 modifier) */
  bigPlayRisk: number;
  /** Situations this play excels in */
  situationBoosts: Partial<Record<Situation, number>>;
  /** Defensive plans that favor this play */
  planAffinity: readonly DefensiveGamePlan[];
}

// ── Offensive Plays (24) ───────────────────────────────

export const OFFENSIVE_PLAYS: readonly PlayDef[] = [
  // ── Running Plays ──
  {
    id: 'inside_zone',
    name: 'Inside Zone',
    category: 'run',
    commentary: '{{player}} hits the A-gap on the inside zone —',
    yardsRange: [2, 8],
    bigPlayChance: 0.04,
    fumbleRisk: 0.9,
    situationBoosts: { short_yardage: 4, goal_line: 3 },
    schemeAffinity: ['smashmouth', 'pro_style'],
    planAffinity: ['run_heavy', 'power', 'balanced'],
  },
  {
    id: 'outside_zone',
    name: 'Outside Zone',
    category: 'run',
    commentary: '{{player}} stretches it outside on the zone read —',
    yardsRange: [0, 12],
    bigPlayChance: 0.07,
    fumbleRisk: 1.0,
    situationBoosts: { normal: 2 },
    schemeAffinity: ['spread', 'pistol'],
    planAffinity: ['balanced', 'run_heavy'],
  },
  {
    id: 'power_run',
    name: 'Power Run',
    category: 'run',
    commentary: '{{player}} follows the pulling guard on the power —',
    yardsRange: [3, 7],
    bigPlayChance: 0.02,
    fumbleRisk: 0.8,
    situationBoosts: { short_yardage: 6, goal_line: 5, red_zone: 3 },
    schemeAffinity: ['smashmouth', 'heavy_jumbo'],
    planAffinity: ['power', 'run_heavy'],
  },
  {
    id: 'draw',
    name: 'Draw Play',
    category: 'run',
    commentary: '{{player}} takes the delayed draw and finds a lane —',
    yardsRange: [1, 10],
    bigPlayChance: 0.06,
    fumbleRisk: 1.0,
    situationBoosts: { third_long: 3, two_minute: 2 },
    schemeAffinity: ['pro_style', 'west_coast'],
    planAffinity: ['balanced', 'pass_heavy'],
  },
  {
    id: 'counter',
    name: 'Counter',
    category: 'run',
    commentary: '{{player}} sells the fake and cuts back on the counter —',
    yardsRange: [0, 14],
    bigPlayChance: 0.08,
    fumbleRisk: 1.1,
    situationBoosts: { normal: 3 },
    schemeAffinity: ['smashmouth', 'pistol'],
    planAffinity: ['run_heavy', 'balanced'],
  },
  {
    id: 'sweep',
    name: 'Toss Sweep',
    category: 'run',
    commentary: '{{player}} takes the toss and turns the corner on the sweep —',
    yardsRange: [-2, 15],
    bigPlayChance: 0.09,
    fumbleRisk: 1.2,
    situationBoosts: {},
    schemeAffinity: ['spread', 'pistol'],
    planAffinity: ['balanced', 'run_heavy'],
  },
  {
    id: 'qb_sneak',
    name: 'QB Sneak',
    category: 'run',
    commentary: '{{player}} goes right up the middle on the sneak —',
    yardsRange: [0, 3],
    bigPlayChance: 0.0,
    fumbleRisk: 0.6,
    situationBoosts: { short_yardage: 8, goal_line: 7 },
    schemeAffinity: [],
    planAffinity: ['power', 'run_heavy', 'balanced'],
  },
  {
    id: 'option_run',
    name: 'Read Option',
    category: 'run',
    commentary: '{{player}} reads the end and keeps it on the option —',
    yardsRange: [0, 12],
    bigPlayChance: 0.06,
    fumbleRisk: 1.3,
    situationBoosts: { normal: 2 },
    schemeAffinity: ['spread', 'pistol'],
    planAffinity: ['balanced'],
  },
  {
    id: 'goal_line_dive',
    name: 'Goal Line Dive',
    category: 'run',
    commentary: '{{player}} dives over the pile at the goal line —',
    yardsRange: [0, 2],
    bigPlayChance: 0.0,
    fumbleRisk: 0.7,
    situationBoosts: { goal_line: 10, short_yardage: 5 },
    schemeAffinity: ['smashmouth', 'heavy_jumbo'],
    planAffinity: ['power', 'run_heavy'],
  },
  {
    id: 'jet_sweep',
    name: 'Jet Sweep',
    category: 'run',
    commentary: '{{player}} takes the jet motion sweep and gets to the edge —',
    yardsRange: [-3, 18],
    bigPlayChance: 0.10,
    fumbleRisk: 1.3,
    situationBoosts: {},
    schemeAffinity: ['spread'],
    planAffinity: ['spread', 'balanced'],
  },

  // ── Passing Plays ──
  {
    id: 'slant',
    name: 'Quick Slant',
    category: 'pass',
    commentary: '{{player}} fires the quick slant to {{target}} —',
    yardsRange: [4, 12],
    bigPlayChance: 0.04,
    fumbleRisk: 0.9,
    situationBoosts: { third_long: -2, two_minute: 3 },
    schemeAffinity: ['west_coast', 'spread'],
    planAffinity: ['pass_heavy', 'spread', 'balanced'],
  },
  {
    id: 'out_route',
    name: 'Out Route',
    category: 'pass',
    commentary: '{{player}} throws to the sideline on the out route to {{target}} —',
    yardsRange: [5, 14],
    bigPlayChance: 0.03,
    fumbleRisk: 0.9,
    situationBoosts: { two_minute: 4 },
    schemeAffinity: ['west_coast', 'pro_style'],
    planAffinity: ['pass_heavy', 'balanced'],
  },
  {
    id: 'deep_post',
    name: 'Deep Post',
    category: 'pass',
    commentary: '{{player}} launches it deep on the post to {{target}} —',
    yardsRange: [0, 45],
    bigPlayChance: 0.18,
    fumbleRisk: 1.0,
    situationBoosts: { third_long: 4, normal: 2 },
    schemeAffinity: ['air_coryell', 'spread'],
    planAffinity: ['pass_heavy', 'spread'],
  },
  {
    id: 'corner_route',
    name: 'Corner Route',
    category: 'pass',
    commentary: '{{player}} goes to the back shoulder on the corner to {{target}} —',
    yardsRange: [0, 35],
    bigPlayChance: 0.14,
    fumbleRisk: 1.0,
    situationBoosts: { red_zone: 5 },
    schemeAffinity: ['air_coryell', 'pro_style'],
    planAffinity: ['pass_heavy'],
  },
  {
    id: 'screen_pass',
    name: 'Screen Pass',
    category: 'pass',
    commentary: '{{player}} dumps it off on the screen to {{target}} —',
    yardsRange: [-3, 20],
    bigPlayChance: 0.08,
    fumbleRisk: 1.0,
    situationBoosts: { third_long: 2, two_minute: 1 },
    schemeAffinity: ['west_coast', 'spread'],
    planAffinity: ['balanced', 'pass_heavy'],
  },
  {
    id: 'play_action',
    name: 'Play Action',
    category: 'pass',
    commentary: 'PLAY ACTION! {{player}} fakes the handoff and fires to {{target}} —',
    yardsRange: [5, 30],
    bigPlayChance: 0.12,
    fumbleRisk: 1.1,
    situationBoosts: { normal: 4, red_zone: 3 },
    schemeAffinity: ['pro_style', 'smashmouth', 'pistol'],
    planAffinity: ['balanced', 'power'],
  },
  {
    id: 'crossing_route',
    name: 'Crossing Route',
    category: 'pass',
    commentary: '{{player}} hits {{target}} on the crosser over the middle —',
    yardsRange: [6, 20],
    bigPlayChance: 0.06,
    fumbleRisk: 1.0,
    situationBoosts: { third_long: 3 },
    schemeAffinity: ['spread', 'west_coast'],
    planAffinity: ['pass_heavy', 'spread'],
  },
  {
    id: 'seam_route',
    name: 'Seam Route',
    category: 'pass',
    commentary: '{{player}} finds {{target}} splitting the safeties on the seam —',
    yardsRange: [8, 35],
    bigPlayChance: 0.10,
    fumbleRisk: 1.0,
    situationBoosts: { normal: 2, red_zone: 3 },
    schemeAffinity: ['pro_style', 'air_coryell'],
    planAffinity: ['pass_heavy', 'balanced'],
  },
  {
    id: 'quick_out',
    name: 'Quick Out',
    category: 'pass',
    commentary: '{{player}} snaps it off to {{target}} on the quick out —',
    yardsRange: [3, 9],
    bigPlayChance: 0.02,
    fumbleRisk: 0.8,
    situationBoosts: { two_minute: 5, short_yardage: 2 },
    schemeAffinity: ['west_coast'],
    planAffinity: ['balanced', 'pass_heavy'],
  },
  {
    id: 'fade',
    name: 'Fade',
    category: 'pass',
    commentary: '{{player}} lofts the fade to {{target}} in the end zone —',
    yardsRange: [0, 30],
    bigPlayChance: 0.12,
    fumbleRisk: 0.8,
    situationBoosts: { red_zone: 6, goal_line: 5 },
    schemeAffinity: ['air_coryell', 'pro_style'],
    planAffinity: ['pass_heavy'],
  },
  {
    id: 'wheel_route',
    name: 'Wheel Route',
    category: 'pass',
    commentary: '{{player}} drops it in the bucket on the wheel route to {{target}} —',
    yardsRange: [5, 40],
    bigPlayChance: 0.14,
    fumbleRisk: 1.0,
    situationBoosts: { normal: 2 },
    schemeAffinity: ['spread', 'pistol'],
    planAffinity: ['pass_heavy', 'spread'],
  },
  {
    id: 'te_drag',
    name: 'TE Drag',
    category: 'pass',
    commentary: '{{player}} finds the tight end on the drag route —',
    yardsRange: [4, 14],
    bigPlayChance: 0.03,
    fumbleRisk: 0.8,
    situationBoosts: { short_yardage: 3, red_zone: 2 },
    schemeAffinity: ['pro_style', 'west_coast'],
    planAffinity: ['balanced'],
  },
  {
    id: 'dagger',
    name: 'Dagger Concept',
    category: 'pass',
    commentary: '{{player}} attacks the middle of the field on the dagger to {{target}} —',
    yardsRange: [8, 25],
    bigPlayChance: 0.08,
    fumbleRisk: 1.0,
    situationBoosts: { third_long: 4, normal: 2 },
    schemeAffinity: ['air_coryell', 'spread'],
    planAffinity: ['pass_heavy', 'spread'],
  },
  {
    id: 'rollout',
    name: 'Rollout Pass',
    category: 'pass',
    commentary: '{{player}} rolls out and finds {{target}} on the move —',
    yardsRange: [3, 18],
    bigPlayChance: 0.06,
    fumbleRisk: 1.1,
    situationBoosts: { two_minute: 3, red_zone: 2 },
    schemeAffinity: ['pistol', 'west_coast'],
    planAffinity: ['balanced', 'pass_heavy'],
  },
] as const;

// ── Defensive Plays (16) ───────────────────────────────

export const DEFENSIVE_PLAYS: readonly DefensivePlayDef[] = [
  {
    id: 'cover_2',
    name: 'Cover 2',
    commentary: 'Defense drops into Cover 2 — two deep safeties splitting the field.',
    coverageBonus: 5,
    runStopBonus: 3,
    pressureBonus: 0,
    bigPlayRisk: 0.02,
    situationBoosts: { normal: 3 },
    planAffinity: ['coverage', 'base'],
  },
  {
    id: 'cover_3',
    name: 'Cover 3',
    commentary: 'Three-deep zone — the defense is protecting against the deep ball.',
    coverageBonus: 6,
    runStopBonus: 4,
    pressureBonus: -1,
    bigPlayRisk: 0.01,
    situationBoosts: { normal: 2 },
    planAffinity: ['coverage', 'base'],
  },
  {
    id: 'cover_1_man',
    name: 'Cover 1 Man',
    commentary: 'Man coverage across the board — the defense is daring the QB.',
    coverageBonus: 4,
    runStopBonus: 2,
    pressureBonus: 2,
    bigPlayRisk: 0.06,
    situationBoosts: { short_yardage: 3, red_zone: 4 },
    planAffinity: ['aggressive', 'blitz_heavy'],
  },
  {
    id: 'cover_0_blitz',
    name: 'Cover 0 Blitz',
    commentary: 'ALL OUT BLITZ! No safety help — the defense is sending the house!',
    coverageBonus: -2,
    runStopBonus: 1,
    pressureBonus: 8,
    bigPlayRisk: 0.15,
    situationBoosts: { third_long: 6, short_yardage: 3 },
    planAffinity: ['blitz_heavy', 'aggressive'],
  },
  {
    id: 'zone_blitz',
    name: 'Zone Blitz',
    commentary: 'Zone blitz — dropping a lineman into coverage and sending a backer.',
    coverageBonus: 3,
    runStopBonus: 2,
    pressureBonus: 4,
    bigPlayRisk: 0.05,
    situationBoosts: { third_long: 4, normal: 2 },
    planAffinity: ['blitz_heavy', 'base'],
  },
  {
    id: 'contain',
    name: 'Contain Rush',
    commentary: 'Defense playing disciplined contain — not letting the QB escape.',
    coverageBonus: 3,
    runStopBonus: 5,
    pressureBonus: 1,
    bigPlayRisk: 0.02,
    situationBoosts: { normal: 2 },
    planAffinity: ['contain', 'base'],
  },
  {
    id: 'pinch_dline',
    name: 'Pinch D-Line',
    commentary: 'Defense pinches the line inside — they\'re loading up to stop the run.',
    coverageBonus: -1,
    runStopBonus: 7,
    pressureBonus: 2,
    bigPlayRisk: 0.04,
    situationBoosts: { short_yardage: 6, goal_line: 5 },
    planAffinity: ['contain', 'base'],
  },
  {
    id: 'stunt',
    name: 'Defensive Stunt',
    commentary: 'Stunting the defensive line — the tackles are crossing to create confusion.',
    coverageBonus: 1,
    runStopBonus: 3,
    pressureBonus: 5,
    bigPlayRisk: 0.06,
    situationBoosts: { third_long: 3 },
    planAffinity: ['aggressive', 'blitz_heavy'],
  },
  {
    id: 'tampa_2',
    name: 'Tampa 2',
    commentary: 'Tampa 2 look — the middle linebacker drops deep to cut the field in thirds.',
    coverageBonus: 6,
    runStopBonus: 3,
    pressureBonus: -1,
    bigPlayRisk: 0.01,
    situationBoosts: { normal: 3, two_minute: 3 },
    planAffinity: ['coverage', 'base'],
  },
  {
    id: 'press_man',
    name: 'Press Man Coverage',
    commentary: 'Corners pressing at the line — physical coverage from the jump.',
    coverageBonus: 5,
    runStopBonus: 1,
    pressureBonus: 1,
    bigPlayRisk: 0.08,
    situationBoosts: { red_zone: 4, short_yardage: 2 },
    planAffinity: ['aggressive', 'blitz_heavy'],
  },
  {
    id: 'spy',
    name: 'QB Spy',
    commentary: 'A linebacker has QB spy duty — shadowing the quarterback.',
    coverageBonus: 2,
    runStopBonus: 4,
    pressureBonus: 0,
    bigPlayRisk: 0.03,
    situationBoosts: { normal: 2 },
    planAffinity: ['contain', 'base'],
  },
  {
    id: 'overload_blitz',
    name: 'Overload Blitz',
    commentary: 'Overload blitz to the weak side — they\'re bringing five!',
    coverageBonus: -1,
    runStopBonus: 2,
    pressureBonus: 6,
    bigPlayRisk: 0.10,
    situationBoosts: { third_long: 5 },
    planAffinity: ['blitz_heavy', 'aggressive'],
  },
  {
    id: 'quarters',
    name: 'Quarters Coverage',
    commentary: 'Quarters coverage — four defensive backs each take a deep quarter.',
    coverageBonus: 7,
    runStopBonus: 1,
    pressureBonus: -2,
    bigPlayRisk: 0.01,
    situationBoosts: { two_minute: 5 },
    planAffinity: ['coverage'],
  },
  {
    id: 'robber',
    name: 'Robber Coverage',
    commentary: 'Safety is playing robber — reading the QB\'s eyes and jumping routes.',
    coverageBonus: 5,
    runStopBonus: 2,
    pressureBonus: 0,
    bigPlayRisk: 0.04,
    situationBoosts: { red_zone: 4, normal: 2 },
    planAffinity: ['coverage', 'aggressive'],
  },
  {
    id: 'engage_eight',
    name: 'Engage Eight',
    commentary: 'ENGAGE EIGHT! Every defender is rushing the passer!',
    coverageBonus: -5,
    runStopBonus: 0,
    pressureBonus: 10,
    bigPlayRisk: 0.22,
    situationBoosts: { third_long: 8 },
    planAffinity: ['blitz_heavy'],
  },
  {
    id: 'prevent',
    name: 'Prevent Defense',
    commentary: 'Prevent defense — giving up the underneath, protecting the deep ball.',
    coverageBonus: 8,
    runStopBonus: -3,
    pressureBonus: -3,
    bigPlayRisk: 0.0,
    situationBoosts: { two_minute: 6 },
    planAffinity: ['coverage'],
  },
] as const;

// ── Play Selection Logic ───────────────────────────────

/** Determine the current situation based on game state */
export function determineSituation(
  quarter: number,
  scoreDiff: number,
  isRedZone: boolean,
  yardsToGo: number,
  timeRemaining: number,
): Situation {
  if (isRedZone && yardsToGo <= 2) return 'goal_line';
  if (isRedZone) return 'red_zone';
  if (yardsToGo <= 2) return 'short_yardage';
  if (yardsToGo >= 8) return 'third_long';
  if (quarter >= 4 && timeRemaining < 120 && Math.abs(scoreDiff) <= 8) return 'two_minute';
  return 'normal';
}

/** Score a play for the current situation, scheme, and game plan */
export function scorePlay(
  play: PlayDef,
  situation: Situation,
  offSchemeId: string,
  offPlan: OffensiveGamePlan,
): number {
  let score = 50; // base score

  // Situation boost
  score += play.situationBoosts[situation] ?? 0;

  // Scheme affinity
  if (play.schemeAffinity.includes(offSchemeId)) {
    score += 5;
  }

  // Plan affinity
  if (play.planAffinity.includes(offPlan)) {
    score += 4;
  }

  // Category alignment with plan
  if (play.category === 'run' && (offPlan === 'run_heavy' || offPlan === 'power')) {
    score += 3;
  }
  if (play.category === 'pass' && (offPlan === 'pass_heavy' || offPlan === 'spread')) {
    score += 3;
  }

  return score;
}

/** Score a defensive play for the current situation and plan */
export function scoreDefensivePlay(
  play: DefensivePlayDef,
  situation: Situation,
  defPlan: DefensiveGamePlan,
): number {
  let score = 50;

  score += play.situationBoosts[situation] ?? 0;

  if (play.planAffinity.includes(defPlan)) {
    score += 5;
  }

  return score;
}

/** Select an offensive play using weighted random selection */
export function selectOffensivePlay(
  rng: PrngFn,
  situation: Situation,
  offSchemeId: string,
  offPlan: OffensiveGamePlan,
): PlayDef {
  const scored = OFFENSIVE_PLAYS.map((play) => ({
    play,
    score: scorePlay(play, situation, offSchemeId, offPlan),
  }));

  // Weighted random: higher scores = more likely
  const totalWeight = scored.reduce((sum, entry) => sum + Math.max(1, entry.score), 0);
  let roll = rng() * totalWeight;

  for (const entry of scored) {
    roll -= Math.max(1, entry.score);
    if (roll <= 0) return entry.play;
  }

  return scored[scored.length - 1]!.play;
}

/** Select a defensive play using weighted random selection */
export function selectDefensivePlay(
  rng: PrngFn,
  situation: Situation,
  defPlan: DefensiveGamePlan,
): DefensivePlayDef {
  const scored = DEFENSIVE_PLAYS.map((play) => ({
    play,
    score: scoreDefensivePlay(play, situation, defPlan),
  }));

  const totalWeight = scored.reduce((sum, entry) => sum + Math.max(1, entry.score), 0);
  let roll = rng() * totalWeight;

  for (const entry of scored) {
    roll -= Math.max(1, entry.score);
    if (roll <= 0) return entry.play;
  }

  return scored[scored.length - 1]!.play;
}

/** Calculate quality modifier from offensive play vs defensive play matchup */
export function playMatchupQuality(
  offPlay: PlayDef,
  defPlay: DefensivePlayDef,
): number {
  let quality = 0;

  // Pass vs coverage
  if (offPlay.category === 'pass') {
    quality -= defPlay.coverageBonus * 0.5;
    quality -= defPlay.pressureBonus * 0.3;
    // Big play risk from aggressive defense
    quality += defPlay.bigPlayRisk * 15;
  }

  // Run vs run stop
  if (offPlay.category === 'run') {
    quality -= defPlay.runStopBonus * 0.6;
    // Blitz-heavy defense is vulnerable to runs
    quality += defPlay.pressureBonus * 0.2;
  }

  return quality;
}

/** Get all plays for a given category */
export function getPlaysByCategory(category: PlayCategory): readonly PlayDef[] {
  return OFFENSIVE_PLAYS.filter((p) => p.category === category);
}

/** Get a play by ID */
export function getPlayById(id: string): PlayDef | undefined {
  return OFFENSIVE_PLAYS.find((p) => p.id === id);
}

/** Get a defensive play by ID */
export function getDefensivePlayById(id: string): DefensivePlayDef | undefined {
  return DEFENSIVE_PLAYS.find((p) => p.id === id);
}

/** Format play commentary with player names */
export function formatPlayCommentary(
  play: PlayDef | DefensivePlayDef,
  playerName?: string,
  targetName?: string,
): string {
  let text = play.commentary;
  if (playerName) text = text.replace('{{player}}', playerName);
  if (targetName) text = text.replace('{{target}}', targetName);
  return text;
}
