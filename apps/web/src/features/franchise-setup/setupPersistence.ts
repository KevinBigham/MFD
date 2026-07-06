export type SetupRunMode = 'full' | 'fast_lane';

export const FIRST_TEN_COMPLETED_KEY = 'mfd:first-ten-completed';
export const SETUP_RUN_MODE_KEY = 'mfd:setup-run-mode';
const SETUP_PRELUDE_DISMISSED_PREFIX = 'mfd:setup-prelude-dismissed:';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readFirstTenMinutesCompleted(storage: StorageLike | null | undefined): boolean {
  return storage?.getItem(FIRST_TEN_COMPLETED_KEY) === 'true';
}

export function readSetupRunMode(storage: StorageLike | null | undefined): SetupRunMode | null {
  const mode = storage?.getItem(SETUP_RUN_MODE_KEY);
  return mode === 'full' || mode === 'fast_lane' ? mode : null;
}

export function persistSetupRunMode(
  storage: StorageLike | null | undefined,
  mode: SetupRunMode,
): void {
  storage?.setItem(SETUP_RUN_MODE_KEY, mode);
}

export function setupRunId(seed: number, teamId: string, year: number): string {
  return `${seed}:${teamId}:${year}`;
}

function preludeDismissedKey(runId: string): string {
  return `${SETUP_PRELUDE_DISMISSED_PREFIX}${runId}`;
}

export function readPreludeDismissed(storage: StorageLike | null | undefined, runId: string): boolean {
  return storage?.getItem(preludeDismissedKey(runId)) === 'true';
}

export function markPreludeDismissed(storage: StorageLike | null | undefined, runId: string): void {
  storage?.setItem(preludeDismissedKey(runId), 'true');
}

export function clearPreludeDismissed(storage: StorageLike | null | undefined, runId: string): void {
  storage?.removeItem(preludeDismissedKey(runId));
}

export function finalizeSetupRun(storage: StorageLike | null | undefined, runId?: string | null): void {
  if (!storage) return;

  const mode = readSetupRunMode(storage) ?? 'full';
  if (mode === 'full') {
    storage.setItem(FIRST_TEN_COMPLETED_KEY, 'true');
  }

  if (runId) {
    clearPreludeDismissed(storage, runId);
  }

  storage.removeItem(SETUP_RUN_MODE_KEY);
}
