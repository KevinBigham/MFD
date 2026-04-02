import { calcPlayerValue } from './trade-value';
import type { DraftPick, GameState } from '../types';

function currentYearTransactions(game: GameState, teamId: string, type: string) {
  return game.teams[teamId]?.txLog.filter((entry) => entry.type === type && entry.year === game.year) ?? [];
}

function playerValueForTeam(game: GameState, playerId: string, teamId: string): number {
  const player = game.players[playerId];
  const team = game.teams[teamId];
  if (!player || !team) return 0;
  return calcPlayerValue(game, player, team);
}

function roundForValue(value: number): number {
  if (value >= 1600) return 3;
  if (value >= 1100) return 4;
  if (value >= 700) return 5;
  if (value >= 400) return 6;
  return 7;
}

function nextPickNumber(game: GameState, round: number): number {
  const current = Object.values(game.teams)
    .flatMap((team) => team.draftPicks)
    .filter((pick) => pick.year === game.year && pick.round === round)
    .reduce((max, pick) => Math.max(max, pick.pick), 32);
  return current + 1;
}

export function calculateCompPicks(game: GameState, teamId: string): DraftPick[] {
  const team = game.teams[teamId];
  if (!team) return [];

  team.draftPicks = team.draftPicks.filter((pick) => !(pick.year === game.year && pick.isCompPick));
  const losses = currentYearTransactions(game, teamId, 'LOSE_FA')
    .map((entry) => ({ entry, value: playerValueForTeam(game, entry.playerId ?? '', teamId) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value || (a.entry.playerId ?? '').localeCompare(b.entry.playerId ?? ''));
  const signings = currentYearTransactions(game, teamId, 'SIGN_FA')
    .map((entry) => ({ entry, value: playerValueForTeam(game, entry.playerId ?? '', teamId) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value || (a.entry.playerId ?? '').localeCompare(b.entry.playerId ?? ''));

  const unmatchedLosses = losses.slice(signings.length, signings.length + 4);
  const picks = unmatchedLosses.map(({ value }) => {
    const round = roundForValue(value);
    return {
      round,
      pick: nextPickNumber(game, round),
      originalTeamId: teamId,
      currentTeamId: teamId,
      year: game.year,
      isCompPick: true,
    } satisfies DraftPick;
  });

  team.draftPicks.push(...picks);
  return picks;
}
