import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from '../config';
import { getRegisteredVersions, migrate } from './migrations';
import { SaveStateSchema } from './schema';
import v34Fixture from './fixtures/v34.json';

function stripCurrentAdditions(state: Record<string, unknown>): Record<string, unknown> {
  const clone = structuredClone(state);
  clone['version'] = undefined;
  delete clone['mediaCycle'];
  delete clone['storylineThreads'];
  delete clone['ownerMandates'];
  delete clone['ballotWaitlist'];
  delete clone['ballotEliminatedIds'];
  delete clone['settings'];
  delete clone['leagueEvents'];
  delete clone['decisionReceipts'];
  delete clone['franchisePlans'];
  delete clone['pressMemoryTags'];
  delete clone['gameCapsules'];
  delete clone['memoryGraph'];
  delete clone['navigationMode'];
  delete clone['onboardingMode'];
  const teams = clone['teams'];
  if (teams && typeof teams === 'object') {
    for (const team of Object.values(teams as Record<string, Record<string, unknown>>)) {
      delete team['gmStrategy'];
    }
  }
  const frontOffice = clone['frontOffice'];
  if (frontOffice && typeof frontOffice === 'object') {
    delete (frontOffice as Record<string, unknown>)['agmProfileId'];
    delete (frontOffice as Record<string, unknown>)['agmImpactLog'];
  }
  return clone;
}

describe('save migrations', () => {
  it('migrates the v34 fixture to the current save version', () => {
    const migrated = migrate(structuredClone(v34Fixture) as Record<string, unknown>, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
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

    expect(stripCurrentAdditions(migrated)).toEqual({
      ...structuredClone(v34Fixture),
      version: undefined,
    });
  });

  it('validates the migrated v34 fixture against the current schema', () => {
    const migrated = migrate(structuredClone(v34Fixture) as Record<string, unknown>, SAVE_VERSION);
    const parsed = SaveStateSchema.safeParse(migrated);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.version).toBe(SAVE_VERSION);
      expect(parsed.data.mediaCycle.weeklyDigests).toEqual([]);
      expect(parsed.data.storylineThreads).toEqual([]);
      expect(parsed.data.ownerMandates).toEqual([]);
      expect(parsed.data.ballotWaitlist).toEqual([]);
      expect(parsed.data.ballotEliminatedIds).toEqual([]);
      expect(parsed.data.frontOffice.agmProfileId).toBeNull();
    }
  });

  it('normalizes legacy team GM strategy values while migrating old saves', () => {
    const legacy = structuredClone(v34Fixture) as Record<string, unknown>;
    const teams = legacy['teams'] as Record<string, Record<string, unknown>>;
    const teamIds = Object.keys(teams);
    expect(teamIds.length).toBeGreaterThanOrEqual(2);
    teams[teamIds[0]]!['gmStrategy'] = 'buy';
    teams[teamIds[1]]!['gmStrategy'] = 'sell';

    const migrated = migrate(legacy, SAVE_VERSION);
    const migratedTeams = migrated['teams'] as Record<string, Record<string, unknown>>;

    expect(migratedTeams[teamIds[0]]?.['gmStrategy']).toBe('contend');
    expect(migratedTeams[teamIds[1]]?.['gmStrategy']).toBe('rebuild');
  });

  it('keeps the migration chain continuous from 1 through current version minus one', () => {
    expect(getRegisteredVersions()).toEqual(Array.from({ length: SAVE_VERSION - 1 }, (_, index) => index + 1));
  });
});
