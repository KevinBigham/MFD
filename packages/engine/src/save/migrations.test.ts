import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from '../config';
import { getRegisteredVersions, migrate } from './migrations';
import { SaveStateSchema } from './schema';
import v34Fixture from './fixtures/v34.json';

function stripCurrentAdditions(state: Record<string, unknown>): Record<string, unknown> {
  const clone = structuredClone(state);
  delete clone['version'];
  delete clone['mediaCycle'];
  delete clone['storylineThreads'];
  delete clone['ownerMandates'];
  delete clone['ballotWaitlist'];
  delete clone['ballotEliminatedIds'];
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

  it('trims oversized media-cycle histories during the v36 to v37 migration', () => {
    const legacy = migrate(structuredClone(v34Fixture) as Record<string, unknown>, 36);
    legacy['mediaCycle'] = {
      weeklyDigests: Array.from({ length: 48 }, (_, index) => ({
        weekNumber: index + 1,
        powerRankings: [],
        headlines: [],
        hotTakes: [],
      })),
      powerRankingHistory: Array.from({ length: 52 }, (_, index) => ({
        weekNumber: index + 1,
        rankings: [],
      })),
    };

    const migrated = migrate(legacy, SAVE_VERSION);
    const mediaCycle = migrated['mediaCycle'] as Record<string, unknown[]>;

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(mediaCycle['weeklyDigests']).toHaveLength(34);
    expect(mediaCycle['powerRankingHistory']).toHaveLength(34);
    expect(mediaCycle['weeklyDigests']?.[0]).toMatchObject({ weekNumber: 15 });
    expect(mediaCycle['powerRankingHistory']?.[0]).toMatchObject({ weekNumber: 19 });
  });

  it('keeps week, year, and phase unchanged during the v36 to v37 migration', () => {
    const legacy = migrate(structuredClone(v34Fixture) as Record<string, unknown>, 36);
    const before = {
      year: legacy['year'],
      week: legacy['week'],
      phase: legacy['phase'],
    };

    const migrated = migrate(legacy, SAVE_VERSION);

    expect({
      year: migrated['year'],
      week: migrated['week'],
      phase: migrated['phase'],
    }).toEqual(before);
  });

  it('repairs and trims eventLog during the v37 to v38 migration', () => {
    const legacy = migrate(structuredClone(v34Fixture) as Record<string, unknown>, 37);
    legacy['year'] = 2026;
    legacy['eventLog'] = [
      ...Array.from({ length: 125 }, (_, index) => ({
        id: `weekly_result-2020-1-${index}`,
        type: 'weekly_result',
        timestamp: 2020 * 1000 + index,
        description: `Old result ${index}`,
        data: {},
      })),
      {
        id: 'coach_retirement-2001-1-0',
        type: 'coach_retirement',
        timestamp: 999999,
        description: 'Retired',
        data: {},
      },
      {
        id: 'gm-strategy-t1-2002-0',
        type: 'gm_strategy_shift',
        timestamp: 999999,
        description: 'Strategy',
        data: { year: 2003 },
      },
    ];

    const migrated = migrate(legacy, SAVE_VERSION);
    const eventLog = migrated['eventLog'] as Array<Record<string, unknown>>;

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(eventLog.filter((row) => row['type'] === 'weekly_result')).toHaveLength(100);
    expect(eventLog.some((row) => row['type'] === 'coach_retirement')).toBe(true);
    expect(eventLog.some((row) => row['type'] === 'gm_strategy_shift')).toBe(true);
    expect((eventLog.find((row) => row['type'] === 'coach_retirement')?.['data'] as Record<string, unknown>)['year']).toBe(2001);
    expect((eventLog.find((row) => row['type'] === 'gm_strategy_shift')?.['data'] as Record<string, unknown>)['year']).toBe(2003);
  });

  it('keeps the migration chain continuous from 1 through current version minus one', () => {
    expect(getRegisteredVersions()).toEqual(Array.from({ length: SAVE_VERSION - 1 }, (_, index) => index + 1));
  });
});
