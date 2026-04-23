import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from '../config';
import { getRegisteredVersions, migrate } from './migrations';
import { SaveStateSchema } from './schema';
import v34Fixture from './fixtures/v34.json';

function stripSprint67Additions(state: Record<string, unknown>): Record<string, unknown> {
  const clone = structuredClone(state);
  delete clone['version'];
  delete clone['mediaCycle'];
  delete clone['storylineThreads'];
  return clone;
}

describe('save migrations', () => {
  it('migrates the v34 fixture to save version 35', () => {
    const migrated = migrate(structuredClone(v34Fixture) as Record<string, unknown>, SAVE_VERSION);

    expect(migrated['version']).toBe(35);
    expect(migrated['mediaCycle']).toEqual({
      weeklyDigests: [],
      powerRankingHistory: [],
    });
    expect(migrated['storylineThreads']).toEqual([]);
  });

  it('does not mutate the v34 fixture input during migration', () => {
    const original = structuredClone(v34Fixture) as Record<string, unknown>;
    const snapshot = JSON.stringify(original);

    migrate(original, SAVE_VERSION);

    expect(JSON.parse(snapshot)).toEqual(original);
  });

  it('preserves every pre-existing v34 fixture field byte-identically', () => {
    const migrated = migrate(structuredClone(v34Fixture) as Record<string, unknown>, SAVE_VERSION);

    expect(stripSprint67Additions(migrated)).toEqual({
      ...structuredClone(v34Fixture),
      version: undefined,
    });
  });

  it('validates the migrated v34 fixture against the current schema', () => {
    const migrated = migrate(structuredClone(v34Fixture) as Record<string, unknown>, SAVE_VERSION);
    const parsed = SaveStateSchema.safeParse(migrated);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.version).toBe(35);
      expect(parsed.data.mediaCycle.weeklyDigests).toEqual([]);
      expect(parsed.data.storylineThreads).toEqual([]);
    }
  });

  it('keeps the migration chain continuous from 1 through 34', () => {
    expect(getRegisteredVersions()).toEqual(Array.from({ length: 34 }, (_, index) => index + 1));
  });
});
