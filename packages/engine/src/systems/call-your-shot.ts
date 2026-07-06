/**
 * Call Your Shot — Declare team identity on high-stakes weeks.
 *
 * On rivalry, division clinch, or playoff weeks, the player can "Call Their Shot"
 * by declaring an identity. Success grants big morale/chemistry/dev bonuses.
 * Failure brings media scrutiny and morale penalties.
 */
import {
  getCallYourShotReactions,
  type CallYourShotReactionContent,
  type CallYourShotReactionOutcome,
} from '../content-loader';
import { RNG, type PrngFn } from '../rng';
import type { GameResult, GameState } from '../types';
import { cl } from '../utils';

// ── Types ──────────────────────────────────────────────

export type ShotDeclaration =
  | 'run_dominant'
  | 'air_attack'
  | 'defensive_shutout'
  | 'total_domination'
  | 'underdog_special';

export interface CallYourShotResult {
  declaration: ShotDeclaration;
  success: boolean;
  outcome: CallYourShotReactionOutcome;
  magnitude: number;
  reaction: CallYourShotReactionContent;
  fanConfidenceDelta: number;
  moraleDelta: number;
  chemistryDelta: number;
  devBonusMultiplier: number;
  headline: string;
  narrative: string;
}

interface OutcomeEvaluation {
  outcome: CallYourShotReactionOutcome;
  success: boolean;
  magnitude: number;
}

interface DeclarationDef {
  id: ShotDeclaration;
  label: string;
  description: string;
  evaluate: (result: GameResult, teamId: string) => OutcomeEvaluation;
  successHeadline: string;
  failureHeadline: string;
}

function getTeamScore(result: GameResult, teamId: string): number {
  return result.homeTeamId === teamId ? result.homeScore : result.awayScore;
}

function getOpponentScore(result: GameResult, teamId: string): number {
  return result.homeTeamId === teamId ? result.awayScore : result.homeScore;
}

function evaluatePositiveThreshold(value: number, target: number, partialFloor: number): OutcomeEvaluation {
  if (value >= target) {
    return {
      outcome: 'hit',
      success: true,
      magnitude: cl((value - target) / Math.max(target * 0.5, 1), 0, 1),
    };
  }

  if (value >= partialFloor) {
    return {
      outcome: 'partial',
      success: false,
      magnitude: cl(value / Math.max(target, 1), 0, 1),
    };
  }

  return {
    outcome: 'miss',
    success: false,
    magnitude: cl((target - value) / Math.max(target, 1), 0, 1),
  };
}

function evaluateNegativeThreshold(value: number, target: number, partialCeiling: number): OutcomeEvaluation {
  if (value <= target) {
    return {
      outcome: 'hit',
      success: true,
      magnitude: cl((target - value) / Math.max(target, 1), 0, 1),
    };
  }

  if (value <= partialCeiling) {
    return {
      outcome: 'partial',
      success: false,
      magnitude: cl((partialCeiling - value) / Math.max(partialCeiling - target, 1), 0, 1),
    };
  }

  return {
    outcome: 'miss',
    success: false,
    magnitude: cl((value - target) / Math.max(target * 2, 1), 0, 1),
  };
}

function evaluateUnderdogSpecial(result: GameResult, teamId: string): OutcomeEvaluation {
  const margin = getTeamScore(result, teamId) - getOpponentScore(result, teamId);
  if (margin > 0) {
    return {
      outcome: 'hit',
      success: true,
      magnitude: cl(margin / 14, 0, 1),
    };
  }

  if (margin >= -7) {
    return {
      outcome: 'partial',
      success: false,
      magnitude: cl(1 - (Math.abs(margin) / 8), 0, 1),
    };
  }

  return {
    outcome: 'miss',
    success: false,
    magnitude: cl((Math.abs(margin) - 7) / 14, 0, 1),
  };
}

function getReaction(rng: PrngFn, outcome: CallYourShotReactionOutcome): CallYourShotReactionContent {
  const reactions = getCallYourShotReactions(outcome);
  const index = Math.floor(rng() * reactions.length);
  return reactions[index]!;
}

function getFanConfidenceDelta(outcome: CallYourShotReactionOutcome, magnitude: number): number {
  if (outcome === 'hit') return 2 + Math.round(cl(magnitude, 0, 1) * 2);
  if (outcome === 'miss') return -(3 + Math.round(cl(magnitude, 0, 1) * 3));
  if (magnitude >= 0.9) return 1;
  if (magnitude <= 0.35) return -1;
  return 0;
}

function getMoraleDelta(outcome: CallYourShotReactionOutcome, magnitude: number): number {
  if (outcome === 'hit') return 8 + Math.round(cl(magnitude, 0, 1) * 4);
  if (outcome === 'miss') return -(4 + Math.round(cl(magnitude, 0, 1) * 3));
  return magnitude >= 0.9 ? 2 : 0;
}

function getChemistryDelta(outcome: CallYourShotReactionOutcome, magnitude: number): number {
  if (outcome === 'hit') return 3 + Math.round(cl(magnitude, 0, 1) * 2);
  if (outcome === 'miss') return -(1 + Math.round(cl(magnitude, 0, 1)));
  return magnitude >= 0.9 ? 1 : 0;
}

function getDevBonusMultiplier(outcome: CallYourShotReactionOutcome, magnitude: number): number {
  if (outcome === 'hit') return 1.15 + (cl(magnitude, 0, 1) * 0.1);
  if (outcome === 'miss') return 0.95 - (cl(magnitude, 0, 1) * 0.02);
  return 1 + (cl(magnitude, 0, 1) * 0.05);
}

function findUserTeamId(game: GameState): string | null {
  return Object.values(game.teams).find((team) => team.isUser)?.id ?? null;
}

// ── Declaration Definitions ────────────────────────────

const DECLARATIONS: Record<ShotDeclaration, DeclarationDef> = {
  run_dominant: {
    id: 'run_dominant',
    label: 'We\'re a Running Team',
    description: 'Promise 120+ rushing yards. Hit it for fan-confidence gain; miss it and the recap records the failed run-game promise.',
    evaluate: (result, teamId) => evaluatePositiveThreshold(result.stats[teamId]?.rushingYards ?? 0, 120, 96),
    successHeadline: 'THEY BACKED IT UP! The ground game delivered exactly as promised!',
    failureHeadline: 'All talk, no yards. The running game couldn\'t deliver on the bold prediction.',
  },
  air_attack: {
    id: 'air_attack',
    label: 'We\'ll Dominate the Air',
    description: 'Promise 250+ passing yards. Hit it for fan-confidence gain; miss it and the recap records the failed passing promise.',
    evaluate: (result, teamId) => evaluatePositiveThreshold(result.stats[teamId]?.passingYards ?? 0, 250, 210),
    successHeadline: 'THE AIR RAID DELIVERED! Passing attack was unstoppable, just like they promised!',
    failureHeadline: 'The passing game sputtered. Big talk about the air attack fell flat.',
  },
  defensive_shutout: {
    id: 'defensive_shutout',
    label: 'Our Defense Will Shut Them Out',
    description: 'Promise 10 or fewer opponent points. Hit it for fan-confidence gain; miss it and the recap records the failed defensive promise.',
    evaluate: (result, teamId) => evaluateNegativeThreshold(getOpponentScore(result, teamId), 10, 17),
    successHeadline: 'SHUTDOWN DEFENSE! They said they\'d silence the opponent, and they DID!',
    failureHeadline: 'The defense promised a shutout but couldn\'t deliver. The opponent carved them up.',
  },
  total_domination: {
    id: 'total_domination',
    label: 'Total Domination',
    description: 'Promise a 14+ point win. Hit it for the biggest fan-confidence gain; miss it and the recap records the failed blowout promise.',
    evaluate: (result, teamId) => evaluatePositiveThreshold(getTeamScore(result, teamId) - getOpponentScore(result, teamId), 14, 7),
    successHeadline: 'TOTAL DOMINATION! They called it and DELIVERED a dominant victory!',
    failureHeadline: 'They promised domination but couldn\'t back it up. The bold prediction backfired.',
  },
  underdog_special: {
    id: 'underdog_special',
    label: 'The Underdog Special',
    description: 'Promise any win as the underdog. Hit it for fan-confidence gain; miss by more than one score and the recap records the failed upset promise.',
    evaluate: evaluateUnderdogSpecial,
    successHeadline: 'THE UNDERDOG WINS! Nobody believed them, but they found a way!',
    failureHeadline: 'The underdog story ends in disappointment. They fought hard but fell short.',
  },
};

// ── Eligibility ────────────────────────────────────────

export interface CallYourShotEligibility {
  eligible: boolean;
  reason: string;
}

/** Check if a week is eligible for Call Your Shot */
export function isCallYourShotEligible(
  isRivalryWeek: boolean,
  isDivisionClinch: boolean,
  isPlayoff: boolean,
  week: number,
): CallYourShotEligibility {
  if (isPlayoff) return { eligible: true, reason: 'Playoff week — every game is everything.' };
  if (isDivisionClinch) return { eligible: true, reason: 'Division title on the line.' };
  if (isRivalryWeek) return { eligible: true, reason: 'Rivalry week — time to make a statement.' };
  if (week >= 15) return { eligible: true, reason: 'Late-season push — now or never.' };
  return { eligible: false, reason: 'Not a high-stakes week.' };
}

/** Get all available declarations */
export function getDeclarations(): DeclarationDef[] {
  return Object.values(DECLARATIONS);
}

// ── Resolution ─────────────────────────────────────────

/** Evaluate a Call Your Shot after the game without mutating league state. */
export function evaluateCallYourShotResult(
  rng: PrngFn,
  declaration: ShotDeclaration,
  result: GameResult,
  teamId: string,
): CallYourShotResult {
  const def = DECLARATIONS[declaration];
  const evaluation = def.evaluate(result, teamId);
  const reaction = getReaction(rng, evaluation.outcome);
  const myScore = getTeamScore(result, teamId);
  const oppScore = getOpponentScore(result, teamId);

  return {
    declaration,
    success: evaluation.success,
    outcome: evaluation.outcome,
    magnitude: evaluation.magnitude,
    reaction,
    fanConfidenceDelta: getFanConfidenceDelta(evaluation.outcome, evaluation.magnitude),
    moraleDelta: getMoraleDelta(evaluation.outcome, evaluation.magnitude),
    chemistryDelta: getChemistryDelta(evaluation.outcome, evaluation.magnitude),
    devBonusMultiplier: getDevBonusMultiplier(evaluation.outcome, evaluation.magnitude),
    headline: reaction.headline || (evaluation.success ? def.successHeadline : def.failureHeadline),
    narrative: evaluation.outcome === 'hit'
      ? `${def.label} landed in a ${myScore}-${oppScore} finish. ${reaction.speaker} said: "${reaction.quote}"`
      : evaluation.outcome === 'partial'
        ? `${def.label} nearly landed in a ${myScore}-${oppScore} finish. ${reaction.speaker} said: "${reaction.quote}"`
        : `${def.label} missed in a ${myScore}-${oppScore} finish. ${reaction.speaker} said: "${reaction.quote}"`,
  };
}

/** Resolve a Call Your Shot on the saved game state after the user game ends. */
export function resolveCallYourShot(
  game: GameState,
  result: GameResult,
  rng: PrngFn = RNG.event,
): CallYourShotResult | undefined {
  if (!game.activeCallYourShot) return undefined;

  const userTeamId = findUserTeamId(game);
  if (!userTeamId) return undefined;
  if (result.homeTeamId !== userTeamId && result.awayTeamId !== userTeamId) return undefined;

  const shotResult = evaluateCallYourShotResult(rng, game.activeCallYourShot, result, userTeamId);
  const team = game.teams[userTeamId];
  if (team) {
    team.fanConfidence = cl(team.fanConfidence + shotResult.fanConfidenceDelta, 0, 100);
  }
  delete game.activeCallYourShot;
  result.callYourShotResult = shotResult;
  return shotResult;
}
