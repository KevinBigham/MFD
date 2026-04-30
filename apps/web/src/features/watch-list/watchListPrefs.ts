export const WATCH_LIST_STORAGE_KEY = 'mfd.watchlist.v1';
export const WATCH_LIST_CHANGE_EVENT = 'mfd-watchlist-change';

export interface WatchListPrefs {
  playerIds: string[];
  updatedAt: string;
}

export function createDefaultWatchListPrefs(): WatchListPrefs {
  return {
    playerIds: [],
    updatedAt: '',
  };
}

export function resolveWatchListStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

export function isWatchListPrefs(value: unknown): value is WatchListPrefs {
  if (!value || typeof value !== 'object') return false;
  const prefs = value as WatchListPrefs;
  return (
    Array.isArray(prefs.playerIds) &&
    prefs.playerIds.every((id) => typeof id === 'string') &&
    typeof prefs.updatedAt === 'string'
  );
}

function normalizePrefs(prefs: WatchListPrefs): WatchListPrefs {
  return {
    playerIds: [...new Set(prefs.playerIds.filter((id) => id.trim().length > 0))],
    updatedAt: prefs.updatedAt,
  };
}

function emitWatchListChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(WATCH_LIST_CHANGE_EVENT));
}

export function getWatchList(storage: Storage | null = resolveWatchListStorage()): WatchListPrefs {
  if (!storage) return createDefaultWatchListPrefs();
  const raw = storage.getItem(WATCH_LIST_STORAGE_KEY);
  if (!raw) return createDefaultWatchListPrefs();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isWatchListPrefs(parsed)) return createDefaultWatchListPrefs();
    return normalizePrefs(parsed);
  } catch {
    return createDefaultWatchListPrefs();
  }
}

export function writeWatchList(
  prefs: WatchListPrefs,
  storage: Storage | null = resolveWatchListStorage(),
): WatchListPrefs {
  const next = normalizePrefs(prefs);
  if (!storage) return next;
  storage.setItem(WATCH_LIST_STORAGE_KEY, JSON.stringify(next));
  emitWatchListChange();
  return next;
}

export function addToWatchList(
  playerId: string,
  storage: Storage | null = resolveWatchListStorage(),
  now: () => Date = () => new Date(),
): WatchListPrefs {
  const current = getWatchList(storage);
  if (current.playerIds.includes(playerId)) return current;
  return writeWatchList({
    playerIds: [...current.playerIds, playerId],
    updatedAt: now().toISOString(),
  }, storage);
}

export function removeFromWatchList(
  playerId: string,
  storage: Storage | null = resolveWatchListStorage(),
  now: () => Date = () => new Date(),
): WatchListPrefs {
  const current = getWatchList(storage);
  if (!current.playerIds.includes(playerId)) return current;
  return writeWatchList({
    playerIds: current.playerIds.filter((id) => id !== playerId),
    updatedAt: now().toISOString(),
  }, storage);
}

export function isOnWatchList(playerId: string, storage: Storage | null = resolveWatchListStorage()): boolean {
  return getWatchList(storage).playerIds.includes(playerId);
}

export function subscribeWatchList(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === WATCH_LIST_STORAGE_KEY) listener();
  };

  window.addEventListener(WATCH_LIST_CHANGE_EVENT, listener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(WATCH_LIST_CHANGE_EVENT, listener);
    window.removeEventListener('storage', handleStorage);
  };
}
