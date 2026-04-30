import { useEffect, useMemo, useRef } from 'react';
import type { ChipPose } from '@mfd/design-system/components';
import type { GameResult, GameState, HallOfFameEntry, Team, TradeSuggestion } from '@mfd/engine';
import { selectCapProjection, useGameStore } from '../../app/store/game-store';
import { countPendingDecisions } from './decisionsPending';
import { type ChipPoseEvent, resolveChipPoseReaction } from './eventBridge';
import { isChipFeatureEnabled } from './ChipHost';
import { useChipStore, type SetChipPoseOptions } from './store';

const BIG_LOSS_MARGIN = 21;

export interface PoseEmitterSnapshot {
  week: number;
  season: number;
  latestGameId: string | null;
  latestGamePhase: string;
  userTeamId: string | null;
  userWonLatestGame: boolean;
  latestGameMargin: number;
  latestGameOvertime: boolean;
  latestUserTouchdowns: number;
  capProjectionOverLimit: boolean;
  playoffUnderdogWin: boolean;
  tradeRumorSignature: string | null;
  userHallOfFameSignature: string | null;
  pendingDecisionTotal: number;
  firstLaunchActive: boolean;
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
    latestGameOvertime: latestGame?.overtime ?? false,
    latestUserTouchdowns: userTouchdowns(latestGame, userTeamId),
    capProjectionOverLimit: options.capProjectionOverLimit ?? false,
    playoffUnderdogWin: latestGamePhase === 'playoffs' && isPlayoffUnderdogWin(game, userTeamId, userWonLatestGame),
    tradeRumorSignature: buildTradeRumorSignature(game?.tradeSuggestions, userTeamId),
    userHallOfFameSignature: buildUserHallOfFameSignature(game, userTeam),
    pendingDecisionTotal: Math.max(0, Math.trunc(options.pendingDecisionTotal ?? 0)),
    firstLaunchActive: options.firstLaunchActive ?? false,
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

  if (gameChanged && !current.userWonLatestGame && current.latestGameMargin >= BIG_LOSS_MARGIN) {
    events.push({
      id: poseEventId(current, 'USER_TEAM_LOSS_BIG', `${current.latestGameId}:${current.latestGameMargin}`),
      trigger: 'USER_TEAM_LOSS_BIG',
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
