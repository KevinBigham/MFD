import {
  BLOWOUT_LOSS_MIN_MARGIN,
  UGLY_WIN_MAX_MARGIN,
  type WeeklyDialogueVariant,
} from './dialogue/weekly';

export interface ResultOutcomeInput {
  result?: string | null;
  teamScore?: number | null;
  opponentScore?: number | null;
  recentResults?: ReadonlyArray<string | null | undefined>;
}

export function isLossStreak(
  results: ReadonlyArray<string | null | undefined>,
  length: number,
): boolean {
  const streak = results.slice(-length);
  return streak.length === length && streak.every((result) => result === 'loss');
}

/**
 * I2: the single win/loss outcome core shared by the weekly-event resolver
 * (`deriveWeeklyOutcome` in useChipEvents) and the Monday Briefing variant
 * picker (`selectMondayBriefingVariant`). Both carried near-duplicate
 * margin/streak branches; the phase, championship, tie, and no-result
 * fallbacks stay with the callers because they legitimately differ per
 * surface. Returns null for tie/pending/unknown results so each caller keeps
 * its own fallback variant.
 */
export function resolveResultOutcome(input: ResultOutcomeInput): WeeklyDialogueVariant | null {
  const margin = typeof input.teamScore === 'number' && typeof input.opponentScore === 'number'
    ? input.teamScore - input.opponentScore
    : null;

  if (input.result === 'win') {
    return margin !== null && margin <= UGLY_WIN_MAX_MARGIN ? 'uglyWin' : 'cleanWin';
  }

  if (input.result === 'loss') {
    if (isLossStreak(input.recentResults ?? [], 3)) return 'threeLossStreak';
    return margin !== null && margin <= -BLOWOUT_LOSS_MIN_MARGIN ? 'blowoutLoss' : 'loss';
  }

  return null;
}
