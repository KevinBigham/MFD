import { resolveBrowserStorage } from './storageBoundary';

export const CHIP_DOCK_STORAGE_KEY = 'mfd.chip.local';

export type ChipTypewriterSpeed = 'slow' | 'normal' | 'fast';

export type DockPosition = 'left' | 'right';

export const CHIP_TYPEWRITER_SPEEDS: readonly ChipTypewriterSpeed[] = ['slow', 'normal', 'fast'];

/**
 * Typewriter reveal rates in characters per second (H2). 'normal' matches the
 * design-system bubble default (42), so existing players keep the same pacing
 * until they opt into slow or fast.
 */
export const CHIP_TYPEWRITER_SPEED_CHARS_PER_SECOND: Record<ChipTypewriterSpeed, number> = {
  slow: 24,
  normal: 42,
  fast: 84,
};

export interface DockPrefs {
  collapsed: boolean;
  quietForScreen: string | null;
  quietUntilWeek: number | null;
  quietForSeason: number | null;
  reducedGuidance: boolean;
  animationsDisabled: boolean;
  typewriterSpeed: ChipTypewriterSpeed;
  dockPosition: DockPosition;
  /** G7: set once the route-coaching graduation notice has been shown. */
  graduationAcked: boolean;
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
    typewriterSpeed: 'normal',
    dockPosition: 'right',
    graduationAcked: false,
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

function isTypewriterSpeed(value: unknown): value is ChipTypewriterSpeed {
  return value === 'slow' || value === 'normal' || value === 'fast';
}

function isDockPosition(value: unknown): value is DockPosition {
  return value === 'left' || value === 'right';
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
    // Saved prefs from before H2/E10/G7 have no typewriterSpeed, dockPosition,
    // or graduationAcked; treat missing values as valid and let readDockPrefs
    // fill the defaults.
    (prefs.typewriterSpeed === undefined || isTypewriterSpeed(prefs.typewriterSpeed)) &&
    (prefs.dockPosition === undefined || isDockPosition(prefs.dockPosition)) &&
    (prefs.graduationAcked === undefined || typeof prefs.graduationAcked === 'boolean') &&
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
    // Fill fields introduced after the player's save was written (currently
    // typewriterSpeed, dockPosition, graduationAcked) with defaults instead
    // of resetting all prefs.
    return { ...createDefaultDockPrefs(), ...parsed };
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
