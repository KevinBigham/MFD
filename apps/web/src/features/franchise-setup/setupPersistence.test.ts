import { describe, expect, it } from 'vitest';
import {
  clearPreludeDismissed,
  finalizeSetupRun,
  FIRST_TEN_COMPLETED_KEY,
  markPreludeDismissed,
  persistSetupRunMode,
  readPreludeDismissed,
  readFirstTenMinutesCompleted,
  SETUP_RUN_MODE_KEY,
} from './setupPersistence';

function createStorageStub() {
  const data = new Map<string, string>();
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
}

describe('setupPersistence', () => {
  it('unlocks Fast Lane only after a completed full Day 1 run', () => {
    const storage = createStorageStub();

    persistSetupRunMode(storage, 'full');
    finalizeSetupRun(storage);

    expect(readFirstTenMinutesCompleted(storage)).toBe(true);
    expect(storage.getItem(SETUP_RUN_MODE_KEY)).toBeNull();
    expect(storage.getItem(FIRST_TEN_COMPLETED_KEY)).toBe('true');
  });

  it('does not unlock Fast Lane after a Fast Lane completion', () => {
    const storage = createStorageStub();

    persistSetupRunMode(storage, 'fast_lane');
    finalizeSetupRun(storage);

    expect(readFirstTenMinutesCompleted(storage)).toBe(false);
    expect(storage.getItem(SETUP_RUN_MODE_KEY)).toBeNull();
    expect(storage.getItem(FIRST_TEN_COMPLETED_KEY)).toBeNull();
  });

  it('persists cold-open dismissal for the active setup run only', () => {
    const storage = createStorageStub();
    const runId = '42:afce1:2026';

    markPreludeDismissed(storage, runId);
    expect(readPreludeDismissed(storage, runId)).toBe(true);

    clearPreludeDismissed(storage, runId);
    expect(readPreludeDismissed(storage, runId)).toBe(false);
  });
});
