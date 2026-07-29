import { resolveBrowserStorage } from './storageBoundary';

export const CHIP_DOCK_STORAGE_KEY = 'mfd.chip.local';

export interface DockPrefs {
  collapsed: boolean;
  quietForScreen: string | null;
  quietUntilWeek: number | null;
  quietForSeason: number | null;
  reducedGuidance: boolean;
  animationsDisabled: boolean;
  lastUpdated: string;
}

export type DockPrefsPatch = Partial<Omit<DockPrefs, 'lastUpdated'>>;

export function createDefaultDockPrefs(): DockPrefs {
  return {
    collapsed: false,
    quietForScreen: null,
    quietUntilWeek: null,
    quietForSeason: null,
    reducedGuidance: false,
    animationsDisabled: false,
    lastUpdated: '',
  };
}

export function resolveDockStorage(): Storage | null {
  return resolveBrowserStorage();
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableInteger(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isInteger(value));
}

export function isDockPrefs(value: unknown): value is DockPrefs {
  if (!value || typeof value !== 'object') return false;
  const prefs = value as DockPrefs;
  return (
    typeof prefs.collapsed === 'boolean' &&
    isNullableString(prefs.quietForScreen) &&
    isNullableInteger(prefs.quietUntilWeek) &&
    isNullableInteger(prefs.quietForSeason) &&
    typeof prefs.reducedGuidance === 'boolean' &&
    typeof prefs.animationsDisabled === 'boolean' &&
    typeof prefs.lastUpdated === 'string'
  );
}

export function readDockPrefs(storage: Storage | null = resolveDockStorage()): DockPrefs {
  if (!storage) return createDefaultDockPrefs();
  let raw: string | null;
  try {
    raw = storage.getItem(CHIP_DOCK_STORAGE_KEY);
  } catch {
    return createDefaultDockPrefs();
  }
  if (!raw) return createDefaultDockPrefs();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isDockPrefs(parsed)) return createDefaultDockPrefs();
    return parsed;
  } catch {
    return createDefaultDockPrefs();
  }
}

export function writeDockPrefs(storage: Storage | null, prefs: DockPrefs): void {
  if (!storage) return;
  try {
    storage.setItem(CHIP_DOCK_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Dock controls remain usable when browser storage is unavailable.
  }
}

export function updateDockPrefs(
  storage: Storage | null,
  patch: DockPrefsPatch,
  now: () => Date,
): DockPrefs {
  const prefs = {
    ...readDockPrefs(storage),
    ...patch,
    lastUpdated: now().toISOString(),
  };
  writeDockPrefs(storage, prefs);
  return prefs;
}
