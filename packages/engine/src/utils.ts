/**
 * MFD Engine Utilities
 *
 * Shared pure functions used across engine systems.
 */

/** Clamp a value between min and max. */
export function cl(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/** Sum an array of numbers. */
export function sum(arr: readonly number[]): number {
  let s = 0;
  for (const v of arr) s += v;
  return s;
}

/** Average an array of numbers. Returns 0 for empty arrays. */
export function avg(arr: readonly number[]): number {
  return arr.length === 0 ? 0 : sum(arr) / arr.length;
}

/**
 * Display name for a player. `Player.name` is derived and stripped by the save
 * schema on load, so persisted writers must compose a fallback here.
 */
export function playerDisplayName(player: { name?: string; firstName?: string; lastName?: string; id?: string; playerId?: string }): string {
  const savedName = player.name?.trim();
  if (savedName) return savedName;
  const composedName = `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim();
  return composedName || player.id || player.playerId || 'Unknown Player';
}

/** Comparator for stat-leader ranking: higher value first, tiebreak by player name ASC. */
export function compareStatLeaders<T extends { value: number; playerName: string }>(a: T, b: T): number {
  return b.value - a.value || a.playerName.localeCompare(b.playerName);
}
