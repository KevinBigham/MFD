import { buildScrapbookEntry, buildSeasonRecap, type GameState } from '@mfd/engine';
import { shouldOpenSeasonRecapPrompt } from '../features/season/SeasonRecapPrompt';
import { deriveDynastyId } from '../lib/career-meta';
import { appendScrapbookEntry } from '../lib/scrapbook-store';

export function syncScrapbookAtYearRollover(
  previousYear: number | null,
  game: GameState | null,
  teamId: string | null,
  recapPromptSeenThisSession: boolean,
): boolean {
  if (!shouldOpenSeasonRecapPrompt(previousYear, game, teamId, recapPromptSeenThisSession)) {
    return false;
  }
  if (!game || !teamId) return false;

  const recap = buildSeasonRecap(game, teamId);
  if (!recap) return false;

  appendScrapbookEntry(
    deriveDynastyId(game),
    buildScrapbookEntry(recap, game),
  );
  return true;
}
