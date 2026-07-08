import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Chip, ChipDialogueBubble, type ChipPose } from '@mfd/design-system/components';
import { useReducedMotionPreference } from '../shared/transitions/RouteTransition';

export type RecapChipOutcome =
  | 'BLOWOUT_WIN'
  | 'CLOSE_WIN'
  | 'WIN'
  | 'OT_WIN'
  | 'COMEBACK_WIN'
  | 'CLOSE_LOSS'
  | 'BLOWOUT_LOSS'
  | 'CHOKE_LOSS'
  | 'LOSS'
  | 'OT_LOSS'
  | 'UNKNOWN';

export interface RecapChipOutcomeInput {
  result?: 'pending' | 'win' | 'loss' | 'tie' | null;
  margin?: number | null;
  overtime?: boolean;
  userWinProbPoints?: readonly number[];
}

export interface RecapChipReactionProps {
  outcome: RecapChipOutcome;
  teamName: string;
  opponentName?: string | null;
  userScore?: number | null;
  opponentScore?: number | null;
  reducedMotion?: boolean;
  lingerMs?: number;
}

const RECAP_REACTION_LINGER_MS = 5000;
const REDUCED_MOTION_LINGER_MS = 2000;
const BLOWOUT_MARGIN = 21;
const CLOSE_MARGIN = 7;
const COMEBACK_LOW_WP = 25;
const CHOKE_HIGH_WP = 75;

const OUTCOME_POSES: Record<RecapChipOutcome, ChipPose> = {
  BLOWOUT_WIN: 'rallying',
  CLOSE_WIN: 'fist-bump',
  WIN: 'proud',
  OT_WIN: 'laughing',
  COMEBACK_WIN: 'rallying',
  CLOSE_LOSS: 'frustrated',
  BLOWOUT_LOSS: 'head-in-hands',
  CHOKE_LOSS: 'facepalm',
  LOSS: 'tired',
  OT_LOSS: 'head-in-hands',
  UNKNOWN: 'reviewing-tablet',
};

export function getRecapChipPose(outcome: RecapChipOutcome): ChipPose {
  return OUTCOME_POSES[outcome] ?? OUTCOME_POSES.UNKNOWN;
}

export function getRecapChipLingerMs(reducedMotion: boolean): number {
  return reducedMotion ? REDUCED_MOTION_LINGER_MS : RECAP_REACTION_LINGER_MS;
}

export function shouldCompactRecapChipReaction(elapsedMs: number, reducedMotion: boolean): boolean {
  return elapsedMs >= getRecapChipLingerMs(reducedMotion);
}

function hasComebackProfile(userWinProbPoints: readonly number[]): boolean {
  if (userWinProbPoints.length < 2) return false;
  return Math.min(...userWinProbPoints) <= COMEBACK_LOW_WP;
}

function hasChokeProfile(userWinProbPoints: readonly number[]): boolean {
  if (userWinProbPoints.length < 2) return false;
  return Math.max(...userWinProbPoints) >= CHOKE_HIGH_WP;
}

export function deriveRecapChipOutcome({
  result,
  margin,
  overtime = false,
  userWinProbPoints = [],
}: RecapChipOutcomeInput): RecapChipOutcome {
  if (result !== 'win' && result !== 'loss') return 'UNKNOWN';

  const safeMargin = Math.max(0, Math.trunc(margin ?? 0));

  if (result === 'win') {
    if (hasComebackProfile(userWinProbPoints)) return 'COMEBACK_WIN';
    if (overtime) return 'OT_WIN';
    if (safeMargin > BLOWOUT_MARGIN) return 'BLOWOUT_WIN';
    if (safeMargin <= CLOSE_MARGIN) return 'CLOSE_WIN';
    return 'WIN';
  }

  if (hasChokeProfile(userWinProbPoints)) return 'CHOKE_LOSS';
  if (overtime) return 'OT_LOSS';
  if (safeMargin > BLOWOUT_MARGIN) return 'BLOWOUT_LOSS';
  if (safeMargin <= CLOSE_MARGIN) return 'CLOSE_LOSS';
  return 'LOSS';
}

export function buildRecapChipCopy({
  outcome,
  teamName,
  opponentName,
  userScore,
  opponentScore,
}: {
  outcome: RecapChipOutcome;
  teamName: string;
  opponentName?: string | null;
  userScore?: number | null;
  opponentScore?: number | null;
}): string {
  const opponent = opponentName ? ` over ${opponentName}` : '';
  const againstOpponent = opponentName ? ` against ${opponentName}` : '';
  const score = typeof userScore === 'number' && typeof opponentScore === 'number'
    ? ` ${userScore}-${opponentScore}.`
    : '.';

  switch (outcome) {
    case 'BLOWOUT_WIN':
      return `${teamName} won by 22+ points${opponent}${score} Must Do: open Film Room before changing starters or Game Plan. Where: Film Room. Consequence: it names the role or matchup that carried the win before the next move changes it.`;
    case 'CLOSE_WIN':
      return `${teamName} won by one score${opponent}${score} Must Do: set first backup and final-drive call before Advance Week. Where: Recap, Depth Chart, Game Plan. Consequence: a missed backup order or late call leaves the next close game on an unassigned backup or a call the roster cannot handle.`;
    case 'OT_WIN':
      return `${teamName} won in overtime${opponent}${score} Must Do: identify the tired starter and set the first backup before Advance Week. Where: Roster, Depth Chart, Game Plan. Consequence: tired starters put backups without assigned roles on the field next kickoff.`;
    case 'COMEBACK_WIN':
      return `${teamName} won after trailing${againstOpponent}${score} Must Do: identify slow-start cause before Game Plan changes. Where: Recap, Game Plan. Consequence: missed protection hits next week before comeback calls help.`;
    case 'BLOWOUT_LOSS':
      return `${teamName} lost by 22+ points${score} Must Do: identify the worst missed block, coverage bust, tackle miss, or injury. Where: Recap, Roster, Depth Chart, Game Plan. Consequence: leaving that miss uncovered repeats next game.`;
    case 'CLOSE_LOSS':
      return `${teamName} lost by one score${score} Must Do: find the missed backup or late call before Advance Week. Where: Recap, Depth Chart, Game Plan. Consequence: one backup-order or play-call miss repeats the same late-game miss next week.`;
    case 'OT_LOSS':
      return `${teamName} lost in overtime${score} Must Do: name the tired starter, injury, or late call before Advance Week. Where: Roster and Game Plan. Consequence: fatigue, injury, or late-call misses repeat.`;
    case 'CHOKE_LOSS':
      return `${teamName} lost after leading${score} Must Do: identify the late call or tired starter before changing roster. Where: Recap, Roster, Game Plan. Consequence: late-game misses repeat and cut owner patience and job security.`;
    case 'WIN':
      return `${teamName} won${opponent}${score} Must Do: open Film Room before roster or Game Plan changes. Where: Film Room. Consequence: it names any injury, role, or matchup miss before a change benches what carried the win.`;
    case 'LOSS':
      return `${teamName} lost${score} Must Do: identify the biggest matchup miss before Advance Week. Where: Recap or Film Room. Consequence: fixing a covered position spends cap space or depth while the real miss stays exposed.`;
    default:
      return `${teamName} has the recap ready. Must Do: open Recap before roster, cap, or Game Plan moves. Where: Recap. Consequence: irreversible cuts, trades, or contract moves outlive one unclear result.`;
  }
}

export function getRecapChipReactionStyle(compact: boolean, reducedMotion: boolean): CSSProperties {
  return {
    opacity: compact ? 0.78 : 1,
    transform: compact ? 'translateY(-4px) scale(0.96)' : 'translateY(0) scale(1)',
    transition: reducedMotion ? 'none' : 'opacity 320ms ease, transform 320ms ease',
  };
}

export function RecapChipReaction({
  outcome,
  teamName,
  opponentName = null,
  userScore = null,
  opponentScore = null,
  reducedMotion,
  lingerMs,
}: RecapChipReactionProps) {
  const prefersReducedMotion = useReducedMotionPreference();
  const effectiveReducedMotion = reducedMotion ?? prefersReducedMotion;
  const [compact, setCompact] = useState(false);
  const pose = getRecapChipPose(outcome);
  const copy = useMemo(() => buildRecapChipCopy({
    outcome,
    teamName,
    opponentName,
    userScore,
    opponentScore,
  }), [opponentName, opponentScore, outcome, teamName, userScore]);

  useEffect(() => {
    setCompact(false);
    const delay = lingerMs ?? getRecapChipLingerMs(effectiveReducedMotion);
    const timer = window.setTimeout(() => setCompact(true), delay);
    return () => window.clearTimeout(timer);
  }, [effectiveReducedMotion, lingerMs, outcome]);

  return (
    <section
      aria-live="polite"
      data-recap-chip-reaction={outcome}
      data-recap-chip-state={compact ? 'compact' : 'intro'}
      style={{
        ...getRecapChipReactionStyle(compact, effectiveReducedMotion),
        border: '2px solid var(--mfd-green)',
        borderRadius: '8px',
        background: 'var(--mfd-panel)',
        boxShadow: '0 0 0 2px var(--mfd-bg), var(--mfd-shadow-lg)',
        padding: '12px',
      }}
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr)',
        gap: '12px',
        alignItems: 'center',
      }}>
        <Chip pose={pose} size="lg" reducedMotion={effectiveReducedMotion} ariaLabel={`Chip reacts to ${outcome.toLowerCase().replaceAll('_', ' ')}`} />
        <ChipDialogueBubble
          text={copy}
          pose={pose}
          pointer="left"
          reducedMotion={effectiveReducedMotion}
          monoBody
        />
      </div>
    </section>
  );
}
