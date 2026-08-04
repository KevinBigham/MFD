import { useEffect, useMemo, useRef } from 'react';
import type { ChipPose } from '@mfd/design-system/components';
import { analyzeGameFlow, getClinchedStatus, type GameResult, type GameState, type HallOfFameEntry, type Team, type TradeSuggestion } from '@mfd/engine';
import { selectCapProjection, useGameStore } from '../../app/store/game-store';
import { countPendingDecisions } from './decisionsPending';
import { type ChipPoseEvent, resolveChipPoseReaction } from './eventBridge';
import { isChipFeatureEnabled } from './ChipHost';
import { useChipStore, type SetChipPoseOptions } from './store';

const BIG_LOSS_MARGIN = 21;
const BIG_WIN_MARGIN = 21;
const WIN_STREAK_MIN = 3;
const OWNER_PATIENCE_CRITICAL_MAX = 20;
/** Mirrors COMEBACK_LOW_WP in game-day/RecapChipReaction.tsx: a win whose
 * win-probability trajectory dipped this low is a comeback. */
const COMEBACK_LOW_WP = 25;
/** Mirrors the intensity > 20 gate in engine rivalries.ts
 * getRivalryGameContext: below this, a matchup is not a rivalry game. */
const RIVALRY_MIN_INTENSITY = 20;

export interface PoseEmitterSnapshot {
  week: number;
  season: number;
  latestGameId: string | null;
  latestGamePhase: string;
  userTeamId: string | null;
  userWonLatestGame: boolean;
  latestGameMargin: number;
  latestOpponentScore: number;
  latestGameOvertime: boolean;
  latestUserTouchdowns: number;
  userWinStreak: number;
  capProjectionOverLimit: boolean;
  playoffUnderdogWin: boolean;
  tradeRumorSignature: string | null;
  userHallOfFameSignature: string | null;
  userCompletedTradeSignature: string | null;
  userBrokenRecordSignature: string | null;
  userDraftPickSignature: string | null;
  userFaSigningSignature: string | null;
  latestGameComebackWin: boolean;
  userClinchStatus: '' | 'X' | 'Y' | 'E';
  upcomingRivalrySignature: string | null;
  pendingDecisionTotal: number;
  firstLaunchActive: boolean;
  ownerPatienceCritical: boolean;
}

export interface BuildPoseEmitterSnapshotOptions {
  capProjectionOverLimit?: boolean;
  pendingDecisionTotal?: number;
  firstLaunchActive?: boolean;
}

export interface DispatchPoseEventsOptions {
  emittedIds: Set<string>;
  nowMs: () => number;
  setPose: (pose: ChipPose, options?: number | SetChipPoseOptions) => void;
}

export interface PoseEventEmitterProps {
  firstLaunchActive?: boolean;
  enabled?: boolean;
  nowMs?: () => number;
  setPose?: (pose: ChipPose, options?: number | SetChipPoseOptions) => void;
}

function findUserTeam(game: GameState | null): Team | null {
  if (!game) return null;
  return Object.values(game.teams).find((team) => team.isUser) ?? null;
}

function findLatestUserGameResult(game: GameState | null, userTeamId: string | null): GameResult | null {
  if (!game || !userTeamId) return null;
  let latest: GameResult | null = null;
  const consider = (result: GameResult | null | undefined) => {
    if (!result || (result.homeTeamId !== userTeamId && result.awayTeamId !== userTeamId)) return;
    if (!latest || result.year > latest.year || (result.year === latest.year && result.week >= latest.week)) {
      latest = result;
    }
  };

  for (const week of game.schedule) {
    for (const matchup of week.games) {
      consider(matchup.result);
    }
  }

  for (const matchup of game.playoffBracket?.matchups ?? []) {
    consider(matchup.result);
  }

  return latest;
}

function scoreForTeam(result: GameResult | null, teamId: string | null): number | null {
  if (!result || !teamId) return null;
  if (result.homeTeamId === teamId) return result.homeScore;
  if (result.awayTeamId === teamId) return result.awayScore;
  return null;
}

function resultMarginForTeam(result: GameResult | null, teamId: string | null): number {
  const teamScore = scoreForTeam(result, teamId);
  if (!result || !teamId || teamScore === null) return 0;
  const opponentScore = result.homeTeamId === teamId ? result.awayScore : result.homeScore;
  return Math.abs(teamScore - opponentScore);
}

function opponentScoreAgainstTeam(result: GameResult | null, teamId: string | null): number {
  const teamScore = scoreForTeam(result, teamId);
  if (!result || !teamId || teamScore === null) return -1;
  return result.homeTeamId === teamId ? result.awayScore : result.homeScore;
}

function didTeamWin(result: GameResult | null, teamId: string | null): boolean {
  const teamScore = scoreForTeam(result, teamId);
  if (!result || !teamId || teamScore === null) return false;
  const opponentScore = result.homeTeamId === teamId ? result.awayScore : result.homeScore;
  return teamScore > opponentScore;
}

function userTouchdowns(result: GameResult | null, userTeamId: string | null): number {
  if (!result || !userTeamId) return 0;
  const stats = result.stats[userTeamId];
  if (!stats) return 0;
  return Math.max(0, Math.trunc((stats.passTDs ?? 0) + (stats.rushTDs ?? 0)));
}

function userWinStreakCount(game: GameState | null, userTeamId: string | null): number {
  if (!game || !userTeamId) return 0;
  const summaries = game.weekSummaries ?? [];
  let streak = 0;
  for (let index = summaries.length - 1; index >= 0; index -= 1) {
    const summary = summaries[index];
    if (!summary || summary.teamId !== userTeamId || summary.result !== 'win') break;
    streak += 1;
  }
  return streak;
}

function latestGameDayPhase(game: GameState | null, result: GameResult | null, userTeamId: string | null): string {
  if (!game) return 'regular_season';
  const latestPackage = game.gameDayState.recentPackages.find((entry) => entry.id === game.gameDayState.latestPackageId)
    ?? game.gameDayState.recentPackages.at(-1)
    ?? null;
  if (
    latestPackage
    && result
    && latestPackage.teamId === userTeamId
    && latestPackage.year === result.year
    && latestPackage.week === result.week
  ) {
    return latestPackage.phase;
  }
  return game.phase;
}

function buildTradeRumorSignature(
  tradeSuggestions: readonly TradeSuggestion[] | undefined,
  userTeamId: string | null,
): string | null {
  if (!userTeamId || !tradeSuggestions?.length) return null;

  const playerIds = tradeSuggestions
    .flatMap((suggestion) => suggestion.offer.offering)
    .filter((asset) => asset.type === 'player' && asset.teamId === userTeamId && asset.playerId)
    .map((asset) => asset.playerId!)
    .sort((left, right) => left.localeCompare(right));

  return playerIds.length > 0 ? playerIds.join('|') : null;
}

function entryBelongsToUserTeam(entry: HallOfFameEntry, userTeam: Team | null): boolean {
  if (!userTeam) return false;
  const teamNames = new Set([userTeam.id, userTeam.name, `${userTeam.city} ${userTeam.name}`]);
  return entry.teams.some((team) => teamNames.has(team));
}

function buildUserHallOfFameSignature(game: GameState | null, userTeam: Team | null): string | null {
  if (!game || !userTeam) return null;
  const entries = game.hallOfFame
    .filter((entry) => entryBelongsToUserTeam(entry, userTeam))
    .map((entry) => `${entry.playerId}:${entry.inductionYear}`)
    .sort((left, right) => left.localeCompare(right));
  return entries.length > 0 ? entries.join('|') : null;
}

function isPlayoffUnderdogWin(game: GameState | null, userTeamId: string | null, userWonLatestGame: boolean): boolean {
  if (!game || !userTeamId || !userWonLatestGame) return false;
  return game.playoffMomentum[userTeamId]?.narrativeTag === 'underdog';
}

/**
 * C8: a completed user trade is any offseason trade offer involving the user
 * team whose status moved to 'accepted'. The signature mirrors the HOF/trade
 * rumor approach — sorted stable ids so a new completion diffs exactly once.
 */
function buildUserCompletedTradeSignature(game: GameState | null, userTeamId: string | null): string | null {
  if (!game || !userTeamId) return null;
  const offers = game.offseasonState?.tradeOffers ?? [];
  const completedIds = offers
    .filter((offer) => offer.status === 'accepted' && (offer.fromTeamId === userTeamId || offer.toTeamId === userTeamId))
    .map((offer) => offer.id)
    .sort((left, right) => left.localeCompare(right));
  return completedIds.length > 0 ? completedIds.join('|') : null;
}

/**
 * C11: recent record-book entries owned by the user team. `recentBrokenRecords`
 * is engine-maintained, so the signature only changes when a new user record
 * lands; the season.week id prefix keeps the event id stable and unique.
 */
function buildUserBrokenRecordSignature(game: GameState | null, userTeamId: string | null): string | null {
  if (!game || !userTeamId) return null;
  const entries = (game.recentBrokenRecords ?? [])
    .filter((record) => record.teamId === userTeamId)
    .map((record) => `${record.playerId}:${record.stat}:${record.year}:${record.week}`)
    .sort((left, right) => left.localeCompare(right));
  return entries.length > 0 ? entries.join('|') : null;
}

/**
 * C9: user draft picks across all saved draft recaps. The year prefix keeps
 * each class distinct, so a new pick (or a new class) diffs exactly once.
 */
function buildUserDraftPickSignature(game: GameState | null, userTeamId: string | null): string | null {
  if (!game || !userTeamId) return null;
  const picks = (game.draftRecaps ?? [])
    .filter((recap) => recap.teamId === userTeamId)
    .flatMap((recap) => recap.picks.map((pick) => `${recap.year}:${pick.playerId}`))
    .sort((left, right) => left.localeCompare(right));
  return picks.length > 0 ? picks.join('|') : null;
}

/**
 * C10: free-agent bids the user team won. Won bids persist on the offseason
 * state with status 'won', so a new signing diffs the signature exactly once.
 */
function buildUserFaSigningSignature(game: GameState | null, userTeamId: string | null): string | null {
  if (!game || !userTeamId) return null;
  const bids = Object.values(game.offseasonState?.freeAgencyBids ?? {})
    .flat()
    .filter((bid) => bid.teamId === userTeamId && bid.status === 'won')
    .map((bid) => `${bid.playerId}:${bid.round}`)
    .sort((left, right) => left.localeCompare(right));
  return bids.length > 0 ? bids.join('|') : null;
}

/**
 * C4: user-perspective win-probability trajectory for a finished game. Empty
 * when the result has no stored broadcast — comeback detection stays off
 * rather than re-seeding a broadcast rebuild outside the selector layer.
 */
export function deriveUserWinProbPoints(result: GameResult | null, userTeamId: string | null): number[] {
  if (!result?.broadcast || !userTeamId) return [];
  const userIsHome = result.homeTeamId === userTeamId;
  return analyzeGameFlow(result.broadcast, result.homeTeamId, result.awayTeamId)
    .winProbability
    .map((point) => {
      const wp = userIsHome ? point.homeWinProb : 100 - point.homeWinProb;
      return Number.isFinite(wp) ? wp : 50;
    });
}

/** C4: comeback profile — the trajectory dipped to comeback territory. */
export function isComebackWinProfile(userWinProbPoints: readonly number[]): boolean {
  if (userWinProbPoints.length < 2) return false;
  return Math.min(...userWinProbPoints) <= COMEBACK_LOW_WP;
}

/**
 * C5/C6: engine-owned clinch math ('X' division, 'Y' wildcard berth, 'E'
 * eliminated, '' still alive). getClinchedStatus is a pure read model — same
 * one LeagueStandings renders — so it is safe in the snapshot builder.
 */
function deriveUserClinchStatus(game: GameState | null, userTeamId: string | null): '' | 'X' | 'Y' | 'E' {
  if (!game || !userTeamId) return '';
  return getClinchedStatus(game, userTeamId);
}

/** C7: the user's next unplayed regular-season matchup, scanning from the
 * current week forward. */
function findUpcomingUserMatchup(
  game: GameState | null,
  userTeamId: string | null,
): { week: number; homeTeamId: string; awayTeamId: string } | null {
  if (!game || !userTeamId) return null;
  for (const week of game.schedule) {
    if (week.week < game.week) continue;
    for (const matchup of week.games) {
      if (matchup.result) continue;
      if (matchup.homeTeamId === userTeamId || matchup.awayTeamId === userTeamId) {
        return { week: week.week, homeTeamId: matchup.homeTeamId, awayTeamId: matchup.awayTeamId };
      }
    }
  }
  return null;
}

/**
 * C7: rivalry signature for the user's next scheduled game. Pure read of
 * `game.leagueRivalries` — deliberately NOT getRivalryGameContext, which
 * mutates state via ensureLivingWorldState and must stay out of the render
 * path. The intensity gate mirrors that function's > 20 threshold, and the
 * tier cutoffs mirror its rivalryTier helper (76 blood_feud / 51 heated).
 */
export function buildUpcomingRivalrySignature(game: GameState | null, userTeamId: string | null): string | null {
  const matchup = findUpcomingUserMatchup(game, userTeamId);
  if (!game || !matchup) return null;
  const rivalryId = [matchup.homeTeamId, matchup.awayTeamId].sort().join('::');
  const rivalry = (game.leagueRivalries ?? []).find((entry) => entry.id === rivalryId);
  if (!rivalry || rivalry.intensity <= RIVALRY_MIN_INTENSITY) return null;
  const tier = rivalry.intensity >= 76 ? 'blood_feud' : rivalry.intensity >= 51 ? 'heated' : 'budding';
  return `${game.year}:${matchup.week}:${rivalryId}:${tier}`;
}

function ownerPatienceCritical(game: GameState | null, userTeam: Team | null): boolean {
  if (!game || !userTeam?.ownerId) return false;
  const patience = game.owners?.[userTeam.ownerId]?.patience;
  return typeof patience === 'number' && Number.isFinite(patience) && patience <= OWNER_PATIENCE_CRITICAL_MAX;
}

export function buildPoseEmitterSnapshot(
  game: GameState | null,
  options: BuildPoseEmitterSnapshotOptions = {},
): PoseEmitterSnapshot {
  const userTeam = findUserTeam(game);
  const userTeamId = userTeam?.id ?? null;
  const latestGame = findLatestUserGameResult(game, userTeamId);
  const userWonLatestGame = didTeamWin(latestGame, userTeamId);
  const latestGamePhase = latestGameDayPhase(game, latestGame, userTeamId);

  return {
    week: game?.week ?? 0,
    season: game?.year ?? 0,
    latestGameId: latestGame?.id ?? null,
    latestGamePhase,
    userTeamId,
    userWonLatestGame,
    latestGameMargin: resultMarginForTeam(latestGame, userTeamId),
    latestOpponentScore: opponentScoreAgainstTeam(latestGame, userTeamId),
    latestGameOvertime: latestGame?.overtime ?? false,
    latestUserTouchdowns: userTouchdowns(latestGame, userTeamId),
    userWinStreak: userWinStreakCount(game, userTeamId),
    capProjectionOverLimit: options.capProjectionOverLimit ?? false,
    playoffUnderdogWin: latestGamePhase === 'playoffs' && isPlayoffUnderdogWin(game, userTeamId, userWonLatestGame),
    tradeRumorSignature: buildTradeRumorSignature(game?.tradeSuggestions, userTeamId),
    userHallOfFameSignature: buildUserHallOfFameSignature(game, userTeam),
    userCompletedTradeSignature: buildUserCompletedTradeSignature(game, userTeamId),
    userBrokenRecordSignature: buildUserBrokenRecordSignature(game, userTeamId),
    userDraftPickSignature: buildUserDraftPickSignature(game, userTeamId),
    userFaSigningSignature: buildUserFaSigningSignature(game, userTeamId),
    latestGameComebackWin: userWonLatestGame && isComebackWinProfile(deriveUserWinProbPoints(latestGame, userTeamId)),
    userClinchStatus: deriveUserClinchStatus(game, userTeamId),
    upcomingRivalrySignature: buildUpcomingRivalrySignature(game, userTeamId),
    pendingDecisionTotal: Math.max(0, Math.trunc(options.pendingDecisionTotal ?? 0)),
    firstLaunchActive: options.firstLaunchActive ?? false,
    ownerPatienceCritical: ownerPatienceCritical(game, userTeam),
  };
}

function poseEventId(snapshot: PoseEmitterSnapshot, trigger: ChipPoseEvent['trigger'], detail: string): string {
  return `chip.pose.${trigger}.${snapshot.season}.${snapshot.week}.${detail}`;
}

function latestGameChanged(current: PoseEmitterSnapshot, previous: PoseEmitterSnapshot | null): boolean {
  return current.latestGameId !== null && current.latestGameId !== previous?.latestGameId;
}

export function derivePoseEvents(
  current: PoseEmitterSnapshot,
  previous: PoseEmitterSnapshot | null,
): ChipPoseEvent[] {
  const events: ChipPoseEvent[] = [];
  const gameChanged = latestGameChanged(current, previous);

  if (gameChanged && current.latestUserTouchdowns > 0) {
    events.push({
      id: poseEventId(current, 'USER_TEAM_TOUCHDOWN', `${current.latestGameId}:${current.latestUserTouchdowns}`),
      trigger: 'USER_TEAM_TOUCHDOWN',
    });
  }

  if (current.firstLaunchActive && !previous?.firstLaunchActive) {
    events.push({
      id: poseEventId(current, 'USER_TEAM_FIRST_LAUNCH', 'first-launch'),
      trigger: 'USER_TEAM_FIRST_LAUNCH',
    });
  }

  if (current.capProjectionOverLimit && !previous?.capProjectionOverLimit) {
    events.push({
      id: poseEventId(current, 'CAP_PROJECTION_OVER_LIMIT', 'cap-projection'),
      trigger: 'CAP_PROJECTION_OVER_LIMIT',
    });
  }

  if (current.ownerPatienceCritical && !previous?.ownerPatienceCritical) {
    events.push({
      id: poseEventId(current, 'OWNER_PATIENCE_CRITICAL', 'owner-patience'),
      trigger: 'OWNER_PATIENCE_CRITICAL',
    });
  }

  if (gameChanged && !current.userWonLatestGame && current.latestGameMargin >= BIG_LOSS_MARGIN) {
    events.push({
      id: poseEventId(current, 'USER_TEAM_LOSS_BIG', `${current.latestGameId}:${current.latestGameMargin}`),
      trigger: 'USER_TEAM_LOSS_BIG',
    });
  }

  if (gameChanged && current.userWonLatestGame && current.latestGameMargin >= BIG_WIN_MARGIN) {
    events.push({
      id: poseEventId(current, 'USER_TEAM_BLOWOUT_WIN', `${current.latestGameId}:${current.latestGameMargin}`),
      trigger: 'USER_TEAM_BLOWOUT_WIN',
    });
  }

  if (gameChanged && current.userWonLatestGame && current.latestOpponentScore === 0) {
    events.push({
      id: poseEventId(current, 'USER_TEAM_SHUTOUT_WIN', `${current.latestGameId}:shutout`),
      trigger: 'USER_TEAM_SHUTOUT_WIN',
    });
  }

  if (gameChanged && current.userWinStreak >= WIN_STREAK_MIN) {
    events.push({
      id: poseEventId(current, 'USER_TEAM_WIN_STREAK', `${current.latestGameId}:streak-${current.userWinStreak}`),
      trigger: 'USER_TEAM_WIN_STREAK',
    });
  }

  if (gameChanged && current.playoffUnderdogWin) {
    events.push({
      id: poseEventId(current, 'PLAYOFF_UPSET_WIN', `${current.latestGameId}:underdog`),
      trigger: 'PLAYOFF_UPSET_WIN',
    });
  }

  if (current.tradeRumorSignature && current.tradeRumorSignature !== previous?.tradeRumorSignature) {
    events.push({
      id: poseEventId(current, 'TRADE_RUMOR_FOR_USER_PLAYER', current.tradeRumorSignature),
      trigger: 'TRADE_RUMOR_FOR_USER_PLAYER',
    });
  }

  if (current.userHallOfFameSignature && current.userHallOfFameSignature !== previous?.userHallOfFameSignature) {
    events.push({
      id: poseEventId(current, 'PLAYER_RETIREMENT_USER_HOF', current.userHallOfFameSignature),
      trigger: 'PLAYER_RETIREMENT_USER_HOF',
    });
  }

  if (current.userCompletedTradeSignature && current.userCompletedTradeSignature !== previous?.userCompletedTradeSignature) {
    events.push({
      id: poseEventId(current, 'USER_TRADE_COMPLETED', current.userCompletedTradeSignature),
      trigger: 'USER_TRADE_COMPLETED',
    });
  }

  if (current.userBrokenRecordSignature && current.userBrokenRecordSignature !== previous?.userBrokenRecordSignature) {
    events.push({
      id: poseEventId(current, 'USER_TEAM_RECORD_BROKEN', current.userBrokenRecordSignature),
      trigger: 'USER_TEAM_RECORD_BROKEN',
    });
  }

  if (current.userDraftPickSignature && current.userDraftPickSignature !== previous?.userDraftPickSignature) {
    events.push({
      id: poseEventId(current, 'USER_DRAFT_PICK_MADE', current.userDraftPickSignature),
      trigger: 'USER_DRAFT_PICK_MADE',
    });
  }

  if (current.userFaSigningSignature && current.userFaSigningSignature !== previous?.userFaSigningSignature) {
    events.push({
      id: poseEventId(current, 'USER_FREE_AGENT_SIGNING', current.userFaSigningSignature),
      trigger: 'USER_FREE_AGENT_SIGNING',
    });
  }

  if (gameChanged && current.latestGameComebackWin) {
    events.push({
      id: poseEventId(current, 'USER_TEAM_COMEBACK_WIN', `${current.latestGameId}:comeback`),
      trigger: 'USER_TEAM_COMEBACK_WIN',
    });
  }

  if (
    (current.userClinchStatus === 'X' || current.userClinchStatus === 'Y')
    && current.userClinchStatus !== previous?.userClinchStatus
  ) {
    events.push({
      id: poseEventId(current, 'USER_TEAM_CLINCH', `clinched-${current.userClinchStatus}`),
      trigger: 'USER_TEAM_CLINCH',
    });
  }

  if (current.userClinchStatus === 'E' && current.userClinchStatus !== previous?.userClinchStatus) {
    events.push({
      id: poseEventId(current, 'USER_TEAM_ELIMINATED', 'eliminated'),
      trigger: 'USER_TEAM_ELIMINATED',
    });
  }

  if (current.upcomingRivalrySignature && current.upcomingRivalrySignature !== previous?.upcomingRivalrySignature) {
    events.push({
      id: poseEventId(current, 'USER_TEAM_RIVALRY_WEEK', current.upcomingRivalrySignature),
      trigger: 'USER_TEAM_RIVALRY_WEEK',
    });
  }

  if (previous && current.pendingDecisionTotal < previous.pendingDecisionTotal) {
    events.push({
      id: poseEventId(current, 'USER_DECISION_LOCKED_IN', `${previous.pendingDecisionTotal}->${current.pendingDecisionTotal}`),
      trigger: 'USER_DECISION_LOCKED_IN',
    });
  }

  return events;
}

export function dispatchPoseEvents(events: readonly ChipPoseEvent[], options: DispatchPoseEventsOptions): void {
  for (const event of events) {
    if (options.emittedIds.has(event.id)) continue;

    const reaction = resolveChipPoseReaction(event.trigger);
    options.emittedIds.add(event.id);
    options.setPose(reaction.pose, {
      durationMs: reaction.durationMs,
      nowMs: options.nowMs(),
      priority: reaction.priority,
    });
  }
}

function readUiNowMs(): number {
  return Date.now();
}

function setChipStorePose(pose: ChipPose, options?: number | SetChipPoseOptions): void {
  useChipStore.getState().setPose(pose, options);
}

export function PoseEventEmitter({
  firstLaunchActive = false,
  enabled = isChipFeatureEnabled(),
  nowMs = readUiNowMs,
  setPose = setChipStorePose,
}: PoseEventEmitterProps) {
  const game = useGameStore((state) => state.game);
  const capProjectionOverLimit = useGameStore((state) =>
    selectCapProjection(state).some((projection) => projection.freeSpace < 0),
  );
  const pendingDecisionTotal = useGameStore((state) => countPendingDecisions(state).total);
  const emittedIds = useRef(new Set<string>());
  const previousSnapshot = useRef<PoseEmitterSnapshot | null>(null);
  const snapshot = useMemo(
    () => buildPoseEmitterSnapshot(game, {
      capProjectionOverLimit,
      firstLaunchActive,
      pendingDecisionTotal,
    }),
    [capProjectionOverLimit, firstLaunchActive, game, pendingDecisionTotal],
  );

  useEffect(() => {
    if (!enabled) {
      previousSnapshot.current = snapshot;
      return;
    }

    const events = derivePoseEvents(snapshot, previousSnapshot.current);
    previousSnapshot.current = snapshot;
    dispatchPoseEvents(events, {
      emittedIds: emittedIds.current,
      nowMs,
      setPose,
    });
  }, [enabled, nowMs, setPose, snapshot]);

  return null;
}
