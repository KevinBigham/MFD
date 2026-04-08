import { getActiveRule } from './league-rules';
import { calcPlayerValue } from './trade-value';
import type { DraftPick, GameState, Position } from '../types';

// ── Position Weights for Comp Pick Valuation ──────────────

const COMP_POSITION_WEIGHTS: Record<Position, number> = {
  QB: 1.4,
  WR: 1.2,
  CB: 1.2,
  DL: 1.2,
  OL: 1.1,
  LB: 1.1,
  RB: 1.0,
  TE: 1.0,
  S: 1.0,
  K: 0.5,
  P: 0.5,
};

function currentYearTransactions(game: GameState, teamId: string, type: string) {
  return game.teams[teamId]?.txLog.filter((entry) => entry.type === type && entry.year === game.year) ?? [];
}

function compPickScore(game: GameState, playerId: string, teamId: string): number {
  const player = game.players[playerId];
  const team = game.teams[teamId];
  if (!player || !team) return 0;

  const baseValue = calcPlayerValue(game, player, team);
  const posWeight = COMP_POSITION_WEIGHTS[player.pos] ?? 1.0;
  const ageFactor = player.age <= 27 ? 1.15 : player.age >= 31 ? 0.75 : 1.0;

  return Math.round(baseValue * posWeight * ageFactor);
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
  const limit = game.leagueRules ? Number(getActiveRule(game.leagueRules, 'comp_pick_limit', game.year)) : 4;

  team.draftPicks = team.draftPicks.filter((pick) => !(pick.year === game.year && pick.isCompPick));
  const losses = currentYearTransactions(game, teamId, 'LOSE_FA')
    .map((entry) => ({ entry, value: compPickScore(game, entry.playerId ?? '', teamId) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value || (a.entry.playerId ?? '').localeCompare(b.entry.playerId ?? ''));
  const signings = currentYearTransactions(game, teamId, 'SIGN_FA')
    .map((entry) => ({ entry, value: compPickScore(game, entry.playerId ?? '', teamId) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value || (a.entry.playerId ?? '').localeCompare(b.entry.playerId ?? ''));

  const unmatchedLosses = losses.slice(signings.length, signings.length + limit);
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
