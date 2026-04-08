/**
 * Call Your Shot — Declare team identity on high-stakes weeks.
 *
 * On rivalry, division clinch, or playoff weeks, the player can "Call Their Shot"
 * by declaring an identity. Success grants big morale/chemistry/dev bonuses.
 * Failure brings media scrutiny and morale penalties.
 */
import type { PrngFn } from '../rng';
import type { GameResult } from '../types';

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
  moraleDelta: number;
  chemistryDelta: number;
  devBonusMultiplier: number;
  headline: string;
  narrative: string;
}

// ── Declaration Definitions ────────────────────────────

interface DeclarationDef {
  id: ShotDeclaration;
  label: string;
  description: string;
  /** Condition to succeed (checked against game result) */
  successCheck: (result: GameResult, teamId: string) => boolean;
  successHeadline: string;
  failureHeadline: string;
}

const DECLARATIONS: Record<ShotDeclaration, DeclarationDef> = {
  run_dominant: {
    id: 'run_dominant',
    label: 'We\'re a Running Team',
    description: 'Declare that your ground game will dominate. Rush for 120+ yards to succeed.',
    successCheck: (result, teamId) => {
      const stats = result.stats[teamId];
      return stats ? (stats.rushingYards ?? 0) >= 120 : false;
    },
    successHeadline: 'THEY BACKED IT UP! The ground game delivered exactly as promised!',
    failureHeadline: 'All talk, no yards. The running game couldn\'t deliver on the bold prediction.',
  },
  air_attack: {
    id: 'air_attack',
    label: 'We\'ll Dominate the Air',
    description: 'Declare aerial supremacy. Throw for 250+ yards to succeed.',
    successCheck: (result, teamId) => {
      const stats = result.stats[teamId];
      return stats ? (stats.passingYards ?? 0) >= 250 : false;
    },
    successHeadline: 'THE AIR RAID DELIVERED! Passing attack was unstoppable, just like they promised!',
    failureHeadline: 'The passing game sputtered. Big talk about the air attack fell flat.',
  },
  defensive_shutout: {
    id: 'defensive_shutout',
    label: 'Our Defense Will Shut Them Out',
    description: 'Promise a defensive masterpiece. Hold the opponent to 10 or fewer points to succeed.',
    successCheck: (result, teamId) => {
      const opponentScore = result.homeTeamId === teamId ? result.awayScore : result.homeScore;
      return opponentScore <= 10;
    },
    successHeadline: 'SHUTDOWN DEFENSE! They said they\'d silence the opponent, and they DID!',
    failureHeadline: 'The defense promised a shutout but couldn\'t deliver. The opponent carved them up.',
  },
  total_domination: {
    id: 'total_domination',
    label: 'Total Domination',
    description: 'The boldest call — win by 14+ points. High risk, huge reward.',
    successCheck: (result, teamId) => {
      const myScore = result.homeTeamId === teamId ? result.homeScore : result.awayScore;
      const oppScore = result.homeTeamId === teamId ? result.awayScore : result.homeScore;
      return (myScore - oppScore) >= 14;
    },
    successHeadline: 'TOTAL DOMINATION! They called it and DELIVERED a dominant victory!',
    failureHeadline: 'They promised domination but couldn\'t back it up. The bold prediction backfired.',
  },
  underdog_special: {
    id: 'underdog_special',
    label: 'The Underdog Special',
    description: 'Embrace the underdog role. Just win the game, no matter how. Any win counts.',
    successCheck: (result, teamId) => {
      const myScore = result.homeTeamId === teamId ? result.homeScore : result.awayScore;
      const oppScore = result.homeTeamId === teamId ? result.awayScore : result.homeScore;
      return myScore > oppScore;
    },
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

/** Resolve a Call Your Shot after the game */
export function resolveCallYourShot(
  rng: PrngFn,
  declaration: ShotDeclaration,
  result: GameResult,
  teamId: string,
): CallYourShotResult {
  const def = DECLARATIONS[declaration];
  const success = def.successCheck(result, teamId);

  const moraleDelta = success ? 8 + Math.round(rng() * 4) : -(4 + Math.round(rng() * 3));
  const chemistryDelta = success ? 3 + Math.round(rng() * 2) : -(1 + Math.round(rng()));
  const devBonusMultiplier = success ? 1.15 + rng() * 0.1 : 0.95;

  const myScore = result.homeTeamId === teamId ? result.homeScore : result.awayScore;
  const oppScore = result.homeTeamId === teamId ? result.awayScore : result.homeScore;

  const narrative = success
    ? `The ${def.label} call paid off with a ${myScore}-${oppScore} victory. The locker room is electric.`
    : `The ${def.label} declaration fell flat in a ${myScore}-${oppScore} result. Media scrutiny intensifies.`;

  return {
    declaration,
    success,
    moraleDelta,
    chemistryDelta,
    devBonusMultiplier,
    headline: success ? def.successHeadline : def.failureHeadline,
    narrative,
  };
}
