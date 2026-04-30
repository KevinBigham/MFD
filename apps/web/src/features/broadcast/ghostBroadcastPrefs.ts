/**
 * Ghost Broadcasts user preference.
 *
 * Persists whether retired-Hall-of-Famer guest commentary should surface
 * in broadcast UIs. Engine still emits ghost lines on every eligible game;
 * the pref only gates rendering, so toggling it is reversible without
 * losing any commentary already attached to past broadcasts.
 *
 * localStorage key is versioned (`mfd.broadcast.ghost.v1`) so a future
 * shape change can roll forward without trampling existing preferences.
 */
export const GHOST_BROADCAST_PREFS_STORAGE_KEY = 'mfd.broadcast.ghost.v1';

export interface GhostBroadcastPrefs {
  enabled: boolean;
  lastUpdated: string;
}

export function createDefaultGhostBroadcastPrefs(): GhostBroadcastPrefs {
  return {
    enabled: true,
    lastUpdated: '',
  };
}

export function resolveGhostBroadcastStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

function isGhostBroadcastPrefs(value: unknown): value is GhostBroadcastPrefs {
  if (!value || typeof value !== 'object') return false;
  const prefs = value as GhostBroadcastPrefs;
  return typeof prefs.enabled === 'boolean' && typeof prefs.lastUpdated === 'string';
}

export function readGhostBroadcastPrefs(
  storage: Storage | null = resolveGhostBroadcastStorage(),
): GhostBroadcastPrefs {
  if (!storage) return createDefaultGhostBroadcastPrefs();
  const raw = storage.getItem(GHOST_BROADCAST_PREFS_STORAGE_KEY);
  if (!raw) return createDefaultGhostBroadcastPrefs();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isGhostBroadcastPrefs(parsed)) return createDefaultGhostBroadcastPrefs();
    return parsed;
  } catch {
    return createDefaultGhostBroadcastPrefs();
  }
}

export function writeGhostBroadcastPrefs(
  storage: Storage | null,
  prefs: GhostBroadcastPrefs,
): void {
  if (!storage) return;
  storage.setItem(GHOST_BROADCAST_PREFS_STORAGE_KEY, JSON.stringify(prefs));
}

export function setGhostBroadcastEnabled(
  storage: Storage | null,
  enabled: boolean,
  now: () => Date = () => new Date(),
): GhostBroadcastPrefs {
  const next: GhostBroadcastPrefs = {
    enabled,
    lastUpdated: now().toISOString(),
  };
  writeGhostBroadcastPrefs(storage, next);
  return next;
}
