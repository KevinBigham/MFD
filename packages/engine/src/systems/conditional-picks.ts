import { calcPickValue } from './trade-value';
import type { ConditionalPick, DraftPick, GameState } from '../types';

function upgradePick(basePick: DraftPick, upgradeRound: number): DraftPick {
  return {
    ...basePick,
    round: Math.min(basePick.round, upgradeRound),
  };
}

function conditionMet(game: GameState, conditionalPick: ConditionalPick): boolean {
  const player = game.players[conditionalPick.condition.playerId];
  if (!player) return false;

  const threshold = conditionalPick.condition.threshold;
  if (conditionalPick.condition.type === 'games_played') {
    return (player.stats.gamesPlayed ?? 0) >= threshold;
  }
  if (conditionalPick.condition.type === 'starts') {
    return (player.stats.starts ?? 0) >= threshold;
  }
  if (conditionalPick.condition.type === 'pro_bowl') {
    return (player.careerStats.proBowls ?? 0) >= threshold;
  }
  if (conditionalPick.condition.type === 'playoff_win') {
    const team = player.teamId ? game.teams[player.teamId] : null;
    return (team?.wins ?? 0) >= threshold;
  }
  return false;
}

function syncTeamPick(game: GameState, resolvedPick: DraftPick): void {
  const team = game.teams[resolvedPick.currentTeamId];
  if (!team) return;
  const draftPick = team.draftPicks.find((pick) =>
    pick.year === resolvedPick.year &&
    pick.currentTeamId === resolvedPick.currentTeamId &&
    pick.originalTeamId === resolvedPick.originalTeamId &&
    pick.pick === resolvedPick.pick,
  );
  if (draftPick) {
    draftPick.round = resolvedPick.round;
  }
}

export function resolveConditions(game: GameState): ConditionalPick[] {
  if (!game.conditionalPicks) {
    game.conditionalPicks = [];
  }

  for (const conditionalPick of game.conditionalPicks) {
    if (conditionalPick.resolved) continue;
    const met = conditionMet(game, conditionalPick);
    conditionalPick.basePick.currentTeamId = conditionalPick.toTeamId;
    conditionalPick.resolvedPick = met
      ? upgradePick(conditionalPick.basePick, conditionalPick.condition.upgradeRound)
      : { ...conditionalPick.basePick };
    conditionalPick.resolvedPick.currentTeamId = conditionalPick.toTeamId;
    conditionalPick.resolved = true;
    syncTeamPick(game, conditionalPick.resolvedPick);
  }

  return game.conditionalPicks;
}

export function calcConditionalPickProbability(conditionalPick: ConditionalPick, game?: GameState): number {
  if (conditionalPick.resolved) {
    if (!conditionalPick.resolvedPick) return 0;
    return conditionalPick.resolvedPick.round < conditionalPick.basePick.round ? 1.0 : 0.0;
  }

  if (!game) {
    const threshold = conditionalPick.condition.threshold;
    if (conditionalPick.condition.type === 'games_played' || conditionalPick.condition.type === 'starts') {
      return threshold <= 10 ? 0.75 : threshold <= 14 ? 0.50 : 0.25;
    }
    if (conditionalPick.condition.type === 'pro_bowl') return 0.25;
    if (conditionalPick.condition.type === 'playoff_win') return 0.50;
    return 0.50;
  }

  const player = game.players[conditionalPick.condition.playerId];
  const threshold = conditionalPick.condition.threshold;

  if (conditionalPick.condition.type === 'games_played' || conditionalPick.condition.type === 'starts') {
    const current = conditionalPick.condition.type === 'starts' ? (player?.stats.starts ?? 0) : (player?.stats.gamesPlayed ?? 0);
    if (current >= threshold) return 1.0;
    const remainingWeeks = Math.max(0, 17 - (game.week ?? 0));
    const projectedTotal = current + remainingWeeks * 0.90;
    if (projectedTotal < threshold * 0.6) return 0.10;
    if (projectedTotal < threshold) return Math.min(0.85, Math.max(0.15, projectedTotal / threshold));
    return Math.min(0.95, Math.max(0.70, (current + remainingWeeks * 0.95) / threshold));
  }

  if (conditionalPick.condition.type === 'pro_bowl') {
    if (!player) return 0.25;
    if (player.ovr >= 90) return 0.90;
    if (player.ovr >= 85) return 0.75;
    if (player.ovr >= 80) return 0.40;
    return 0.15;
  }

  if (conditionalPick.condition.type === 'playoff_win') {
    const team = player?.teamId ? game.teams[player.teamId] : null;
    if (!team) return 0.50;
    const winPct = (team.wins + team.ties * 0.5) / Math.max(1, team.wins + team.losses + team.ties);
    if (winPct >= 0.70 || team.gmStrategy === 'contend') return 0.75;
    if (winPct <= 0.35 || team.gmStrategy === 'rebuild') return 0.15;
    return 0.50;
  }

  return 0.50;
}

export function conditionalPickExpectedValue(conditionalPick: ConditionalPick, game?: GameState): number {
  const baseValue = calcPickValue(conditionalPick.basePick);
  const upgradedValue = calcPickValue(upgradePick(conditionalPick.basePick, conditionalPick.condition.upgradeRound));
  const prob = Math.max(0, Math.min(1, calcConditionalPickProbability(conditionalPick, game)));
  return Math.round(baseValue + (upgradedValue - baseValue) * prob);
}
