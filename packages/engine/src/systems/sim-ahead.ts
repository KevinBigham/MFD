import type { GameState, WeeklySummary } from '../types';
import { advanceFranchiseWeek } from './franchise-week';

export type SimAheadTarget =
  | 'next_user_game'
  | 'trade_deadline'
  | 'end_regular_season'
  | 'end_phase'
  | 'playoffs'
  | { weeks: number };

export type SimAheadStopReason =
  | 'target_reached'
  | 'user_game'
  | 'trade_deadline'
  | 'expansion_draft'
  | 'cba_interrupt'
  | 'phase_changed'
  | 'user_injury'
  | 'safety_guard';

export interface SimAheadFrame {
  year: number;
  week: number;
  phase: GameState['phase'];
  weeksSimmed: number;
  record: string | null;
  summaryHeadline: string | null;
  stopReason?: SimAheadStopReason;
}

export interface SimAheadResult {
  nextState: GameState;
  frames: SimAheadFrame[];
  weeksSimmed: number;
  stopReason: SimAheadStopReason;
  latestSummary: WeeklySummary | null;
}

export type SimAheadProgress = (frame: SimAheadFrame) => void;

function findUserTeam(game: GameState) {
  return Object.values(game.teams).find((team) => team.isUser) ?? null;
}

function userRecord(game: GameState): string | null {
  const team = findUserTeam(game);
  if (!team) return null;
  return `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}`;
}

function latestSummary(game: GameState): WeeklySummary | null {
  return game.weekSummaries.at(-1) ?? null;
}

function frameFor(game: GameState, weeksSimmed: number, stopReason?: SimAheadStopReason): SimAheadFrame {
  return {
    year: game.year,
    week: game.week,
    phase: game.phase,
    weeksSimmed,
    record: userRecord(game),
    summaryHeadline: latestSummary(game)?.headline ?? null,
    ...(stopReason ? { stopReason } : {}),
  };
}

function hasPendingUserGame(game: GameState): boolean {
  const userTeam = findUserTeam(game);
  if (!userTeam) return false;

  if (game.phase === 'regular_season') {
    const week = game.schedule.find((entry) => entry.week === game.week);
    return Boolean(week?.games.some((matchup) =>
      !matchup.result
      && (matchup.homeTeamId === userTeam.id || matchup.awayTeamId === userTeam.id),
    ));
  }

  if (game.phase === 'playoffs') {
    return Boolean(game.playoffBracket?.matchups.some((matchup) =>
      matchup.week === game.week
      && !matchup.result
      && (matchup.homeTeamId === userTeam.id || matchup.awayTeamId === userTeam.id),
    ));
  }

  return false;
}

function hasSevereUserInjury(previous: GameState, next: GameState): boolean {
  const userTeam = findUserTeam(next);
  if (!userTeam) return false;

  return userTeam.roster.some((player) => {
    const tier = player.injury?.severityTier;
    if (tier !== 'severe' && tier !== 'season_ending') return false;
    const previousInjury = previous.players[player.id]?.injury;
    return previousInjury?.id !== player.injury?.id || previousInjury?.gamesOut !== player.injury?.gamesOut;
  });
}

function isCbaInterrupt(game: GameState): boolean {
  const status = game.cbaState.status;
  return status === 'negotiating' || status === 'awaiting_owner_vote' || status === 'lockout';
}

function isTradeDeadlineInterrupt(previous: GameState, next: GameState): boolean {
  return previous.phase === 'regular_season'
    && next.phase === 'regular_season'
    && previous.week === next.week
    && Boolean(next.tradeDeadlineState?.isDeadlineWeek);
}

function targetAlreadyReached(game: GameState, target: SimAheadTarget): SimAheadStopReason | null {
  if (target === 'next_user_game' && hasPendingUserGame(game)) return 'user_game';
  if (target === 'playoffs' && game.phase === 'playoffs') return 'target_reached';
  if (target === 'trade_deadline' && Boolean(game.tradeDeadlineState?.isDeadlineWeek)) return 'trade_deadline';
  if (target === 'end_regular_season' && game.phase !== 'regular_season') return 'target_reached';
  if (typeof target === 'object' && target.weeks <= 0) return 'target_reached';
  return null;
}

function reachedTarget(previous: GameState, next: GameState, target: SimAheadTarget, weeksSimmed: number): SimAheadStopReason | null {
  if (target === 'next_user_game' && hasPendingUserGame(next)) return 'user_game';
  if (target === 'playoffs' && next.phase === 'playoffs') return 'target_reached';
  if (target === 'trade_deadline' && isTradeDeadlineInterrupt(previous, next)) return 'trade_deadline';
  if (target === 'end_regular_season' && previous.phase === 'regular_season' && next.phase !== 'regular_season') return 'target_reached';
  if (target === 'end_phase' && previous.phase !== next.phase) return 'phase_changed';
  if (typeof target === 'object' && weeksSimmed >= Math.max(0, target.weeks)) return 'target_reached';
  return null;
}

function safetyLimitFor(target: SimAheadTarget): number {
  if (typeof target === 'object') return Math.min(Math.max(target.weeks, 0), 52);
  if (target === 'next_user_game') return 24;
  if (target === 'trade_deadline') return 24;
  if (target === 'end_regular_season') return 32;
  if (target === 'end_phase') return 32;
  return 52;
}

export function simulateWeeks(
  game: GameState,
  target: SimAheadTarget,
  onProgress?: SimAheadProgress,
): SimAheadResult {
  const frames: SimAheadFrame[] = [];
  const initialStop = targetAlreadyReached(game, target);
  if (initialStop) {
    const frame = frameFor(game, 0, initialStop);
    frames.push(frame);
    onProgress?.(frame);
    return {
      nextState: game,
      frames,
      weeksSimmed: 0,
      stopReason: initialStop,
      latestSummary: latestSummary(game),
    };
  }

  let current = game;
  let stopReason: SimAheadStopReason | undefined;
  const maxWeeks = safetyLimitFor(target);

  for (let weeksSimmed = 1; weeksSimmed <= maxWeeks; weeksSimmed += 1) {
    const previous = current;
    current = advanceFranchiseWeek(previous).nextState;

    stopReason = reachedTarget(previous, current, target, weeksSimmed)
      ?? (isTradeDeadlineInterrupt(previous, current) ? 'trade_deadline' : null)
      ?? (current.expansionDraftState ? 'expansion_draft' : null)
      ?? (isCbaInterrupt(current) ? 'cba_interrupt' : null)
      ?? (hasSevereUserInjury(previous, current) ? 'user_injury' : null)
      ?? (previous.phase !== current.phase && target !== 'playoffs' && target !== 'end_regular_season' ? 'phase_changed' : null)
      ?? (weeksSimmed >= maxWeeks ? 'safety_guard' : null)
      ?? undefined;

    const frame = frameFor(current, weeksSimmed, stopReason);
    frames.push(frame);
    onProgress?.(frame);

    if (stopReason) {
      return {
        nextState: current,
        frames,
        weeksSimmed,
        stopReason,
        latestSummary: latestSummary(current),
      };
    }
  }

  const frame = frameFor(current, maxWeeks, 'safety_guard');
  frames.push(frame);
  onProgress?.(frame);
  return {
    nextState: current,
    frames,
    weeksSimmed: maxWeeks,
    stopReason: 'safety_guard',
    latestSummary: latestSummary(current),
  };
}
