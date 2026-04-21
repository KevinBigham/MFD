import type { GameState } from '@mfd/engine';
import { deriveDynastyId, deriveDynastyStartYear } from '../lib/career-meta';
import { upsertHallOfFameDynasty } from '../lib/hall-of-fame-archive';

export function syncHallOfFameArchiveAtYearRollover(
  previousYear: number | null,
  game: GameState | null,
  teamId: string | null,
): boolean {
  if (!game || !teamId) return false;
  if (previousYear === null || game.year <= previousYear) return false;

  const team = Object.values(game.teams).find((candidate) => candidate.isUser);
  if (!team) return false;

  const entries = game.hallOfFame ?? [];
  if (entries.length === 0) return false;

  upsertHallOfFameDynasty({
    dynastyId: deriveDynastyId(game),
    teamId: team.id,
    teamCity: team.city,
    teamName: team.name,
    teamAbbr: team.abbr,
    startYear: deriveDynastyStartYear(game),
    lastSyncedYear: game.year,
    entries,
  });

  return true;
}
