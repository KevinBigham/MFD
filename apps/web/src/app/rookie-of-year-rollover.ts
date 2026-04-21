import type { GameState } from '@mfd/engine';
import { deriveDynastyId } from '../lib/career-meta';
import { computeRookieOfYear, type RookieOfYearEntry } from '../lib/rookie-of-year';
import { upsertRookieOfYearEntry } from '../lib/rookie-of-year-store';

export function syncRookieOfYearAtYearRollover(
  previousYear: number | null,
  game: GameState | null,
  teamId: string | null,
): RookieOfYearEntry | null {
  if (!game || !teamId) return null;
  if (previousYear === null || game.year <= previousYear) return null;
  if (!game.teams[teamId]) return null;

  const entry = computeRookieOfYear(game, previousYear);
  if (!entry) return null;

  upsertRookieOfYearEntry(deriveDynastyId(game), entry);
  return entry;
}
