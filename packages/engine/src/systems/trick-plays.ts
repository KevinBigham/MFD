/**
 * Trick Plays — High-risk, high-reward special plays.
 *
 * Only available when the head coach has certain traits (Gambler, Creative).
 * Fumble rate 3x normal, big play rate 5x normal.
 * These generate elite broadcast moments.
 */
import type { PrngFn } from '../rng';
import type { Team } from '../types';

// ── Types ──────────────────────────────────────────────

export interface TrickPlayDef {
  id: string;
  name: string;
  /** Commentary hook for broadcast engine */
  commentary: string;
  /** Commentary on successful execution */
  successCommentary: string;
  /** Commentary on failure */
  failureCommentary: string;
  /** Base success rate (0-1) */
  successRate: number;
  /** Big play yards if successful */
  bigPlayYards: [number, number];
  /** Fumble risk multiplier vs base (3x is standard for tricks) */
  fumbleRiskMultiplier: number;
  /** Which positions are primarily involved */
  involvedPositions: readonly string[];
  /** Minimum coach gameplan rating to unlock */
  minCoachGameplan: number;
  /** Required coach trait (any of these) */
  requiredTraits: readonly string[];
}

export interface TrickPlayResult {
  play: TrickPlayDef;
  success: boolean;
  yards: number;
  fumble: boolean;
  touchdown: boolean;
  commentary: string;
}

// ── Coach Trait Compatibility ──────────────────────────

/** Traits that unlock trick plays */
const TRICK_PLAY_TRAITS = ['gambler', 'creative', 'aggressive', 'innovator'] as const;

// ── Trick Play Catalog (8 plays) ──────────────────────

export const TRICK_PLAYS: readonly TrickPlayDef[] = [
  {
    id: 'flea_flicker',
    name: 'Flea Flicker',
    commentary: 'FLEA FLICKER! {{qb}} hands off, gets it back, and LAUNCHES it deep!',
    successCommentary: 'The defense bit HARD on the run — {{target}} is WIDE OPEN downfield!',
    failureCommentary: 'The defense didn\'t bite — {{qb}} is pressured and has to throw it away!',
    successRate: 0.55,
    bigPlayYards: [25, 65],
    fumbleRiskMultiplier: 2.5,
    involvedPositions: ['QB', 'RB', 'WR'],
    minCoachGameplan: 70,
    requiredTraits: ['gambler', 'creative', 'innovator'],
  },
  {
    id: 'fake_punt',
    name: 'Fake Punt',
    commentary: 'FAKE PUNT! The punter keeps it and runs! The defense is caught off guard!',
    successCommentary: 'He\'s got the first down! What a gutsy call by the coaching staff!',
    failureCommentary: 'He\'s tackled short of the line to gain — that gamble did NOT pay off!',
    successRate: 0.45,
    bigPlayYards: [10, 35],
    fumbleRiskMultiplier: 3.0,
    involvedPositions: ['P'],
    minCoachGameplan: 65,
    requiredTraits: ['gambler', 'aggressive'],
  },
  {
    id: 'fake_fg',
    name: 'Fake Field Goal',
    commentary: 'FAKE FIELD GOAL! The holder pulls it and throws!',
    successCommentary: 'TOUCHDOWN! The defense never saw that coming! Incredible deception!',
    failureCommentary: 'The throw falls incomplete — the defense read it the whole way!',
    successRate: 0.40,
    bigPlayYards: [5, 25],
    fumbleRiskMultiplier: 2.0,
    involvedPositions: ['K', 'TE'],
    minCoachGameplan: 72,
    requiredTraits: ['gambler', 'creative'],
  },
  {
    id: 'hook_and_lateral',
    name: 'Hook and Lateral',
    commentary: 'Hook and lateral! {{target}} catches it and pitches to the trailing runner!',
    successCommentary: 'The pitch is perfect — the runner is in the open field with daylight!',
    failureCommentary: 'The lateral hits the ground! FUMBLE! That\'s a disaster!',
    successRate: 0.35,
    bigPlayYards: [20, 55],
    fumbleRiskMultiplier: 4.0,
    involvedPositions: ['QB', 'WR', 'RB'],
    minCoachGameplan: 75,
    requiredTraits: ['creative', 'innovator'],
  },
  {
    id: 'philly_special',
    name: 'Philly Special',
    commentary: 'PHILLY SPECIAL! The RB takes the direct snap, pitches to the receiver, who throws to the QB!',
    successCommentary: '{{qb}} catches it in the end zone! TOUCHDOWN! An absolute masterpiece of play design!',
    failureCommentary: 'The timing is off — the pass sails over {{qb}}\'s head! Too cute!',
    successRate: 0.38,
    bigPlayYards: [5, 15],
    fumbleRiskMultiplier: 3.0,
    involvedPositions: ['QB', 'RB', 'WR'],
    minCoachGameplan: 78,
    requiredTraits: ['creative', 'innovator'],
  },
  {
    id: 'wildcat',
    name: 'Wildcat Formation',
    commentary: 'Wildcat! The RB takes the direct snap — the QB splits out wide!',
    successCommentary: '{{rb}} reads the end and keeps it — big gain with the defense confused!',
    failureCommentary: '{{rb}} is stuffed at the line — the defense was ready for the look!',
    successRate: 0.50,
    bigPlayYards: [8, 30],
    fumbleRiskMultiplier: 2.0,
    involvedPositions: ['RB', 'OL'],
    minCoachGameplan: 60,
    requiredTraits: ['creative', 'gambler', 'aggressive', 'innovator'],
  },
  {
    id: 'double_pass',
    name: 'Double Pass',
    commentary: 'DOUBLE PASS! {{qb}} throws to the receiver — and he throws it AGAIN downfield!',
    successCommentary: 'The second throw is PERFECT! The defense is completely lost!',
    failureCommentary: 'The second throw is picked off! That\'s the risk of a double pass!',
    successRate: 0.32,
    bigPlayYards: [20, 50],
    fumbleRiskMultiplier: 3.5,
    involvedPositions: ['QB', 'WR'],
    minCoachGameplan: 76,
    requiredTraits: ['creative', 'innovator'],
  },
  {
    id: 'statue_of_liberty',
    name: 'Statue of Liberty',
    commentary: 'STATUE OF LIBERTY! {{qb}} fakes the pass — {{rb}} takes it from behind!',
    successCommentary: '{{rb}} walks into the end zone untouched! WHAT A PLAY CALL!',
    failureCommentary: 'The exchange is botched — the ball is on the ground!',
    successRate: 0.42,
    bigPlayYards: [5, 25],
    fumbleRiskMultiplier: 3.5,
    involvedPositions: ['QB', 'RB'],
    minCoachGameplan: 74,
    requiredTraits: ['creative', 'gambler'],
  },
] as const;

// ── Logic ──────────────────────────────────────────────

/** Check if a team's head coach can call trick plays */
export function canCallTrickPlays(team: Team): boolean {
  const hc = team.staff?.hc;
  if (!hc) return false;

  const gameplanRating = hc.ratings?.gameplan ?? 60;
  if (gameplanRating < 60) return false;

  const coachTraits = hc.traits ?? [];
  return coachTraits.some((t: string) => TRICK_PLAY_TRAITS.includes(t as typeof TRICK_PLAY_TRAITS[number]));
}

/** Get available trick plays for a team based on coach traits and rating */
export function getAvailableTrickPlays(team: Team): TrickPlayDef[] {
  const hc = team.staff?.hc;
  if (!hc) return [];

  const gameplanRating = hc.ratings?.gameplan ?? 60;
  const coachTraits = hc.traits ?? [];

  return TRICK_PLAYS.filter((play) => {
    if (gameplanRating < play.minCoachGameplan) return false;
    return play.requiredTraits.some((rt) => coachTraits.includes(rt));
  });
}

/** Execute a trick play and determine the outcome */
export function executeTrickPlay(
  rng: PrngFn,
  play: TrickPlayDef,
  coachGameplanRating: number,
  qbName?: string,
  targetName?: string,
  rbName?: string,
): TrickPlayResult {
  // Coach rating bonus: higher rating = better success rate
  const ratingBonus = (coachGameplanRating - 70) * 0.003;
  const adjustedSuccessRate = Math.max(0.15, Math.min(0.75, play.successRate + ratingBonus));

  const roll = rng();
  const success = roll < adjustedSuccessRate;

  // Fumble check (only on failure, proportional to risk)
  const baseFumbleChance = 0.065;
  const fumbleChance = baseFumbleChance * play.fumbleRiskMultiplier;
  const fumble = !success && rng() < fumbleChance;

  // Yards
  let yards = 0;
  let touchdown = false;
  if (success) {
    const [minYds, maxYds] = play.bigPlayYards;
    yards = minYds + Math.round(rng() * (maxYds - minYds));
    touchdown = yards >= 20 && rng() < 0.35;
    if (touchdown) {
      yards = Math.max(yards, 20);
    }
  } else if (!fumble) {
    yards = Math.round(rng() * 3); // minimal gain on failed trick
  }

  // Build commentary
  let commentary = success ? play.successCommentary : play.failureCommentary;
  if (fumble) {
    commentary = play.failureCommentary.replace(/!$/, '') + ' — FUMBLE!';
  }
  commentary = commentary
    .replace(/\{\{qb\}\}/g, qbName ?? 'the quarterback')
    .replace(/\{\{target\}\}/g, targetName ?? 'the receiver')
    .replace(/\{\{rb\}\}/g, rbName ?? 'the running back')
    .replace(/\{\{player\}\}/g, qbName ?? 'the player');

  return {
    play,
    success,
    yards,
    fumble,
    touchdown,
    commentary,
  };
}

/** Decide whether to call a trick play this drive (AI logic) */
export function shouldCallTrickPlay(
  rng: PrngFn,
  quarter: number,
  scoreDiff: number,
  isPlayoff: boolean,
): boolean {
  // Base chance: 3% per drive
  let chance = 0.03;

  // Trailing significantly → more likely to take risks
  if (scoreDiff <= -14) chance += 0.04;
  else if (scoreDiff <= -7) chance += 0.02;

  // Q4 and trailing → desperate
  if (quarter === 4 && scoreDiff <= -10) chance += 0.03;

  // Playoffs → slightly less likely (risk-averse)
  if (isPlayoff) chance -= 0.01;

  // Never too high
  chance = Math.max(0.01, Math.min(0.12, chance));

  return rng() < chance;
}
