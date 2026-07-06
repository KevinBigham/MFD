import { getSalaryCap } from '../config';
import type { GameState, Team } from '../types';
import { calcCapHit } from './contracts';

function roundMoney(value: number): number {
  return Math.round(value * 10) / 10;
}

export function syncTeamCapTotals(game: GameState, team: Team): void {
  const contractCommitments = team.roster.reduce((sum, player) => sum + calcCapHit(player.contract ?? null), 0);
  team.capUsed = roundMoney(contractCommitments + (team.deadCap ?? 0));
  team.capSpace = roundMoney(getSalaryCap(game.year, game) - team.capUsed);
}
