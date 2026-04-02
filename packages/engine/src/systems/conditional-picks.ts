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

export function conditionalPickExpectedValue(conditionalPick: ConditionalPick): number {
  const baseValue = calcPickValue(conditionalPick.basePick);
  const upgradedValue = calcPickValue(upgradePick(conditionalPick.basePick, conditionalPick.condition.upgradeRound));
  return (baseValue + upgradedValue) / 2;
}
