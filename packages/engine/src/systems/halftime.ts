/**
 * Halftime Adjustments — Coach-driven scheme and personnel changes at halftime.
 *
 * Based on first-half performance, coaches make adjustments:
 * - Scheme switches (go from balanced to pass_heavy if trailing)
 * - Target changes (feed the hot receiver)
 * - Defensive adjustments (blitz more if pass rush is failing)
 * - Quality based on coaching skill tree and gameplan rating
 */
import type { PrngFn } from '../rng';
import type {
  DefensiveGamePlan,
  GamePlan,
  OffensiveGamePlan,
  Team,
  TeamGameStats,
} from '../types';

// ── Types ──────────────────────────────────────────────

export interface HalftimeAdjustment {
  type: 'offensive_scheme' | 'defensive_scheme' | 'target_change' | 'tempo_change';
  description: string;
  /** Quality of the adjustment (0-10). Higher = more impactful. */
  quality: number;
}

export interface HalftimeReport {
  teamId: string;
  adjustments: HalftimeAdjustment[];
  /** Updated game plan after adjustments */
  adjustedPlan: GamePlan;
  /** Quality modifier applied to second half (based on coaching) */
  secondHalfQualityBonus: number;
  /** Broadcast commentary hook */
  commentary: string;
}

// ── Constants ──────────────────────────────────────────

const TRAILING_THRESHOLD = -7;
const BIG_TRAILING_THRESHOLD = -14;
const LEADING_THRESHOLD = 14;

// ── Adjustment Logic ───────────────────────────────────

function evaluateOffensiveAdjustment(
  currentPlan: OffensiveGamePlan,
  scoreDiff: number,
  stats: TeamGameStats,
  rng: PrngFn,
): { scheme: OffensiveGamePlan; adjustment: HalftimeAdjustment | null } {
  const passYds = stats.passingYards ?? 0;
  const rushYds = stats.rushingYards ?? 0;
  const totalYds = passYds + rushYds;
  const passRate = totalYds > 0 ? passYds / totalYds : 0.5;

  // Trailing significantly → go pass heavy
  if (scoreDiff <= BIG_TRAILING_THRESHOLD && currentPlan !== 'pass_heavy' && currentPlan !== 'spread') {
    const newScheme = rng() < 0.6 ? 'pass_heavy' : 'spread';
    return {
      scheme: newScheme,
      adjustment: {
        type: 'offensive_scheme',
        description: `Switching to ${newScheme === 'pass_heavy' ? 'pass-heavy' : 'spread'} to catch up.`,
        quality: 5 + Math.round(rng() * 3),
      },
    };
  }

  // Trailing → open it up if running heavy
  if (scoreDiff <= TRAILING_THRESHOLD && (currentPlan === 'run_heavy' || currentPlan === 'power')) {
    return {
      scheme: 'balanced',
      adjustment: {
        type: 'offensive_scheme',
        description: 'Opening up the playbook — need to balance the attack.',
        quality: 4 + Math.round(rng() * 3),
      },
    };
  }

  // Leading big → grind it out
  if (scoreDiff >= LEADING_THRESHOLD && currentPlan !== 'run_heavy' && currentPlan !== 'power') {
    const newScheme = rng() < 0.5 ? 'run_heavy' : 'power';
    return {
      scheme: newScheme,
      adjustment: {
        type: 'offensive_scheme',
        description: 'Going to the ground game to protect the lead.',
        quality: 4 + Math.round(rng() * 2),
      },
    };
  }

  // Passing game struggling → lean on the run
  if (passRate > 0.6 && passYds < 80 && currentPlan === 'pass_heavy') {
    return {
      scheme: 'balanced',
      adjustment: {
        type: 'offensive_scheme',
        description: 'Pass game isn\'t clicking — switching to a balanced attack.',
        quality: 5 + Math.round(rng() * 3),
      },
    };
  }

  // Run game dominating → keep feeding it
  if (rushYds > 100 && passRate < 0.35 && currentPlan === 'balanced') {
    return {
      scheme: 'run_heavy',
      adjustment: {
        type: 'offensive_scheme',
        description: 'The run game is rolling — let\'s keep pounding it.',
        quality: 3 + Math.round(rng() * 2),
      },
    };
  }

  return { scheme: currentPlan, adjustment: null };
}

function evaluateDefensiveAdjustment(
  currentPlan: DefensiveGamePlan,
  scoreDiff: number,
  opponentStats: TeamGameStats,
  rng: PrngFn,
): { scheme: DefensiveGamePlan; adjustment: HalftimeAdjustment | null } {
  const oppPassYds = opponentStats.passingYards ?? 0;
  const oppRushYds = opponentStats.rushingYards ?? 0;
  const oppTotalYds = oppPassYds + oppRushYds;
  const oppPassRate = oppTotalYds > 0 ? oppPassYds / oppTotalYds : 0.5;

  // Opponent passing all over us → go to coverage
  if (oppPassYds > 150 && currentPlan !== 'coverage') {
    return {
      scheme: 'coverage',
      adjustment: {
        type: 'defensive_scheme',
        description: 'Getting torched through the air — dropping into more coverage.',
        quality: 5 + Math.round(rng() * 3),
      },
    };
  }

  // Opponent running all over us → contain
  if (oppRushYds > 100 && oppPassRate < 0.4 && currentPlan !== 'contain') {
    return {
      scheme: 'contain',
      adjustment: {
        type: 'defensive_scheme',
        description: 'They\'re gashing us on the ground — tightening up the run fits.',
        quality: 5 + Math.round(rng() * 3),
      },
    };
  }

  // Need a stop badly → get aggressive
  if (scoreDiff <= BIG_TRAILING_THRESHOLD && currentPlan === 'base') {
    return {
      scheme: rng() < 0.5 ? 'blitz_heavy' : 'aggressive',
      adjustment: {
        type: 'defensive_scheme',
        description: 'We need turnovers — dialing up the pressure!',
        quality: 4 + Math.round(rng() * 4),
      },
    };
  }

  // Protecting a lead → play safe
  if (scoreDiff >= LEADING_THRESHOLD && (currentPlan === 'blitz_heavy' || currentPlan === 'aggressive')) {
    return {
      scheme: 'coverage',
      adjustment: {
        type: 'defensive_scheme',
        description: 'Protecting the lead — backing off the blitz and playing zone.',
        quality: 4 + Math.round(rng() * 2),
      },
    };
  }

  return { scheme: currentPlan, adjustment: null };
}

// ── Main Function ──────────────────────────────────────

/**
 * Generate halftime adjustments for a team based on first-half performance.
 */
export function generateHalftimeAdjustments(
  rng: PrngFn,
  team: Team,
  gamePlan: GamePlan,
  scoreDiff: number,
  stats: TeamGameStats,
  opponentStats: TeamGameStats,
): HalftimeReport {
  const adjustments: HalftimeAdjustment[] = [];

  // Coach quality determines adjustment effectiveness
  const coachRating = team.staff?.hc?.ratings?.gameplan ?? 65;
  const adjustmentQualityBase = (coachRating - 50) * 0.08; // 0-4 range

  // Offensive adjustment
  const offResult = evaluateOffensiveAdjustment(
    gamePlan.offensiveScheme,
    scoreDiff,
    stats,
    rng,
  );
  if (offResult.adjustment) {
    adjustments.push(offResult.adjustment);
  }

  // Defensive adjustment
  const defResult = evaluateDefensiveAdjustment(
    gamePlan.defensiveScheme,
    scoreDiff,
    opponentStats,
    rng,
  );
  if (defResult.adjustment) {
    adjustments.push(defResult.adjustment);
  }

  // Calculate second-half quality bonus
  const adjustmentCount = adjustments.length;
  const avgQuality = adjustmentCount > 0
    ? adjustments.reduce((sum, a) => sum + a.quality, 0) / adjustmentCount
    : 0;
  const secondHalfQualityBonus = Math.round((adjustmentQualityBase + avgQuality * 0.3) * 10) / 10;

  // Build adjusted plan
  const adjustedPlan: GamePlan = {
    ...gamePlan,
    offensiveScheme: offResult.scheme,
    defensiveScheme: defResult.scheme,
    gamePlanBonus: gamePlan.gamePlanBonus + secondHalfQualityBonus,
  };

  // Commentary
  let commentary: string;
  if (adjustmentCount === 0) {
    commentary = 'The coaching staff is sticking with the game plan — no adjustments at half.';
  } else if (adjustmentCount === 1) {
    commentary = `The coaching staff made a key adjustment at halftime: ${adjustments[0]!.description}`;
  } else {
    commentary = `Major halftime adjustments from the coaching staff! ${adjustments.map((a) => a.description).join(' ')}`;
  }

  return {
    teamId: team.id,
    adjustments,
    adjustedPlan,
    secondHalfQualityBonus,
    commentary,
  };
}

/**
 * Determine if halftime adjustments should be made (some coaches don't adjust).
 */
export function shouldMakeAdjustments(
  team: Team,
  scoreDiff: number,
): boolean {
  const coachRating = team.staff?.hc?.ratings?.gameplan ?? 65;

  // Better coaches are more likely to adjust
  const baseChance = 0.4 + (coachRating - 60) * 0.01;

  // Close games or trailing → more likely
  if (Math.abs(scoreDiff) <= 7) return true;
  if (scoreDiff < 0) return true;

  return baseChance > 0.5;
}
