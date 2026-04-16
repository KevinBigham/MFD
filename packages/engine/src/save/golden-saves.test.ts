/**
 * Golden Save Fixture Tests
 *
 * Sprint 39 deliverable: verify that historical save versions
 * load through the full migration pipeline to SAVE_VERSION.
 *
 * Each fixture represents a realistic save from its era.
 * If any migration in the chain breaks, these tests fail.
 */

import { describe, it, expect } from 'vitest';
import { SaveStateSchema } from './schema';
import { migrate } from './migrations';
import { SAVE_VERSION } from '../config';

import v1Fixture from './fixtures/v1.json';
import v10Fixture from './fixtures/v10.json';
import v20Fixture from './fixtures/v20.json';
import v30Fixture from './fixtures/v30.json';

describe('golden save fixtures', () => {
  it('migrates v1 fixture through full pipeline to current version', { timeout: 15_000 }, () => {
    const migrated = migrate(v1Fixture as Record<string, unknown>, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);

    // Player survived the migration chain
    const players = migrated['players'] as Record<string, Record<string, unknown>>;
    expect(players['p1']).toBeDefined();
    expect(players['p1']!['firstName']).toBe('Golden');
    expect(players['p1']!['bloodline']).toBeNull(); // v29->v30 adds bloodline default

    // Team fields added by migration chain
    const teams = migrated['teams'] as Record<string, Record<string, unknown>>;
    expect(teams['t1']!['practiceSquad']).toEqual([]);
    expect(teams['t1']!['stadiumType']).toBe('outdoor');
    expect(teams['t1']!['seasonStats']).toBeDefined();

    // Governance fields (v19+)
    expect(migrated['leagueRules']).toBeDefined();
    expect(migrated['cbaState']).toBeDefined();
    expect(migrated['commissionerState']).toBeDefined();
    expect(migrated['laborState']).toBeDefined();

    // Offseason defaults (v2+)
    expect(migrated['weekSummaries']).toEqual([]);
    expect(migrated['playoffBracket']).toBeNull();

    // Sprint 38 fields
    expect(migrated['apologyTourThreads']).toEqual([]);
  });

  it('migrates v10 fixture through full pipeline to current version', { timeout: 15_000 }, () => {
    const migrated = migrate(v10Fixture as Record<string, unknown>, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);

    // Player data preserved
    const players = migrated['players'] as Record<string, Record<string, unknown>>;
    expect(players['p1']!['firstName']).toBe('Golden');
    expect(players['p1']!['ovr']).toBe(85);
    expect(players['p1']!['bloodline']).toBeNull();

    // v11+ fields added
    expect(migrated['tutorialState']).toBeDefined();
    expect(migrated['dynastyTimeline']).toBeDefined();
    expect(migrated['narrativeIntensity']).toBeDefined();

    // v12+ fields
    expect(migrated['achievements']).toBeDefined();
    expect(migrated['dashboardState']).toBeDefined();

    // Governance (v19+)
    expect(migrated['leagueRules']).toBeDefined();
    expect(migrated['cbaState']).toBeDefined();
  });

  it('migrates v20 fixture through full pipeline to current version', { timeout: 15_000 }, () => {
    const migrated = migrate(v20Fixture as Record<string, unknown>, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);

    // Player data preserved
    const players = migrated['players'] as Record<string, Record<string, unknown>>;
    expect(players['p1']!['firstName']).toBe('Golden');
    expect(players['p1']!['bloodline']).toBeNull();

    // Governance passed through
    expect(migrated['leagueRules']).toBeDefined();

    // v25+ contract fields
    const contract = players['p1']!['contract'] as Record<string, unknown>;
    expect(contract['slices']).toEqual([]);
    expect(contract['guaranteeSchedule']).toEqual([]);

    // Sprint 38 fields
    expect(migrated['apologyTourThreads']).toEqual([]);
    expect(migrated['settings']).toBeDefined();
  });

  it('validates v30 fixture against current schema without migration', () => {
    const result = SaveStateSchema.safeParse(v30Fixture);

    if (!result.success) {
      // Surface Zod errors for debugging
      const errors = result.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      );
      throw new Error(`v30 fixture failed schema validation:\n${errors.join('\n')}`);
    }

    expect(result.success).toBe(true);
    expect(result.data.version).toBe(30);
    expect(result.data.players['p1']?.bloodline).toBeNull();
    expect(result.data.apologyTourThreads).toEqual([]);
  });

  it('verifies migration chain has no gaps from v1 to SAVE_VERSION', () => {
    // The migrate function throws if any step is missing.
    // Running v1 to current covers every registered migration.
    const migrated = migrate({ version: 1, teams: {}, players: {} }, SAVE_VERSION);
    expect(migrated['version']).toBe(SAVE_VERSION);
  });
});
