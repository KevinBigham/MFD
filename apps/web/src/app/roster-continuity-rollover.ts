import type { GameState } from '@mfd/engine';
import { deriveDynastyId } from '../lib/career-meta';
import { upsertDynastyStarters } from '../lib/roster-continuity-store';

export function syncRosterContinuityAtYearRollover(
  previousYear: number | null,
  game: GameState | null,
  teamId: string | null,
): boolean {
  if (!game || !teamId) return false;
  if (previousYear === null || game.year <= previousYear) return false;

  const team = game.teams[teamId];
  if (!team) return false;

  upsertDynastyStarters(
    deriveDynastyId(game),
    previousYear,
    team.roster.filter((player) => player.isStarter).map((player) => player.id),
  );

  return true;
}
