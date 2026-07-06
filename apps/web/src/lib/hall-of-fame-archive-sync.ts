import type { GameState } from '@mfd/engine';
import { deriveDynastyId, deriveDynastyStartYear } from './career-meta';
import {
  upsertHallOfFameDynasty,
  type HallOfFameArchiveDynasty,
} from './hall-of-fame-archive';

export function buildHallOfFameArchiveDynastySnapshot(
  game: GameState | null,
  teamId: string | null,
): HallOfFameArchiveDynasty | null {
  if (!game || !teamId) return null;

  const team = game.teams[teamId];
  if (!team?.isUser) return null;

  const entries = game.hallOfFame ?? [];
  if (entries.length === 0) return null;

  return {
    dynastyId: deriveDynastyId(game),
    teamId: team.id,
    teamCity: team.city,
    teamName: team.name,
    teamAbbr: team.abbr,
    startYear: deriveDynastyStartYear(game),
    lastSyncedYear: game.year,
    entries: [...entries],
  };
}

export function syncHallOfFameArchiveSnapshot(
  game: GameState | null,
  teamId: string | null,
): boolean {
  const snapshot = buildHallOfFameArchiveDynastySnapshot(game, teamId);
  if (!snapshot) return false;

  upsertHallOfFameDynasty(snapshot);
  return true;
}
