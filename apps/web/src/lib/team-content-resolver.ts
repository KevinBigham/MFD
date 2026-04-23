import { getTeamContent, type GameState, type TeamIdentityContent } from '@mfd/engine';
import { useGameStore } from '../app/store/game-store';

/**
 * Resolves team content from either a canonical abbr ('CHI') or a runtime team uid ('js2vt4ghp').
 *
 * `getTeamContent` keys on canonical abbr (upper-cased), but `game.teams` is keyed by runtime uid
 * generated at dynasty creation. Callers historically passed `userTeam.id` (the uid) and silently
 * fell back to default colors because the direct lookup missed.
 *
 * Resolution order:
 *   1. Direct abbr lookup (covers call sites that already pass a canonical abbr).
 *   2. Runtime-uid lookup via `game.teams[uid].abbr` → content lookup by abbr.
 *   3. null.
 *
 * Pure function — no store reads, no side effects. Callers that cannot easily pass `game` should
 * use `resolveTeamContentFromStore` below, which bridges via `useGameStore.getState()`.
 */
export function resolveTeamContent(
  game: GameState | null | undefined,
  teamIdOrAbbr: string | null | undefined,
): TeamIdentityContent | null {
  if (!teamIdOrAbbr) return null;

  const direct = getTeamContent(teamIdOrAbbr);
  if (direct) return direct;

  if (game?.teams) {
    const team = game.teams[teamIdOrAbbr];
    if (team?.abbr) {
      return getTeamContent(team.abbr);
    }
  }

  return null;
}

/**
 * Convenience wrapper for call sites deep inside render trees where threading `game` through
 * every prop would churn many files. Reads the current game from the Zustand store via
 * `getState()` — non-subscriptive, but acceptable here because parent screens already subscribe
 * to the store and re-render whenever the game changes (which re-triggers these helpers).
 *
 * Defensive against test doubles: some test files mock `useGameStore` as a bare selector
 * function without `getState`. In that case, fall back to direct-only resolution — tests that
 * pass canonical abbrs keep working; tests that pass runtime uids will get null, which is the
 * same behavior they got before this fix existed.
 *
 * Prefer `resolveTeamContent(game, idOrAbbr)` when `game` is already in scope — that form is
 * pure and easier to test.
 */
export function resolveTeamContentFromStore(
  teamIdOrAbbr: string | null | undefined,
): TeamIdentityContent | null {
  let game: GameState | null = null;
  const store = useGameStore as unknown as { getState?: () => { game: GameState | null } };
  if (typeof store.getState === 'function') {
    game = store.getState().game ?? null;
  }
  return resolveTeamContent(game, teamIdOrAbbr);
}
