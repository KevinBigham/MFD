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
import v31Fixture from './fixtures/v31.json';
import v32Fixture from './fixtures/v32.json';
import v33Fixture from './fixtures/v33.json';
import v34Fixture from './fixtures/v34.json';

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

  it('migrates v30 fixture through v30→v31 to current version', { timeout: 15_000 }, () => {
    const migrated = migrate(v30Fixture as Record<string, unknown>, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);

    // Tutorial state gets visitedScreens on the v30→v31 hop
    const tutorial = migrated['tutorialState'] as Record<string, unknown>;
    expect(tutorial).toBeDefined();
    expect(tutorial['visitedScreens']).toEqual([]);
  });

  it('validates v31 fixture against current schema without migration', () => {
    const result = SaveStateSchema.safeParse(v31Fixture);

    if (!result.success) {
      // Surface Zod errors for debugging
      const errors = result.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      );
      throw new Error(`v31 fixture failed schema validation:\n${errors.join('\n')}`);
    }

    expect(result.success).toBe(true);
    expect(result.data.version).toBe(31);
    expect(result.data.players['p1']?.bloodline).toBeNull();
    expect(result.data.apologyTourThreads).toEqual([]);
    expect(result.data.tutorialState.visitedScreens).toEqual(['/', '/roster']);
  });

  it('migrates v31 fixture through v31→v32 to current version', { timeout: 15_000 }, () => {
    const migrated = migrate(v31Fixture as Record<string, unknown>, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    // Sprint 45 adds a top-level relationship graph, defaulting to empty.
    expect(migrated['relationships']).toEqual([]);
  });

  it('validates v32 fixture against current schema without migration', () => {
    const result = SaveStateSchema.safeParse(v32Fixture);

    if (!result.success) {
      const errors = result.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      );
      throw new Error(`v32 fixture failed schema validation:\n${errors.join('\n')}`);
    }

    expect(result.success).toBe(true);
    expect(result.data.version).toBe(32);
    expect(result.data.relationships).toHaveLength(1);
    expect(result.data.relationships[0]?.type).toBe('coach_tree');
    expect(result.data.relationships[0]?.id).toBe('coach-a:coach-b:coach_tree:2024');
  });

  it('migrates v32 fixture through v32→v33 to current version', { timeout: 15_000 }, () => {
    const migrated = migrate(v32Fixture as Record<string, unknown>, SAVE_VERSION);
    const teams = migrated['teams'] as Record<string, Record<string, unknown>>;

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(migrated['storyArcs']).toEqual([]);
    expect(teams['t1']?.['philosophy']).toBe('maintain');
  });

  it('validates v33 fixture against current schema without migration', () => {
    const result = SaveStateSchema.safeParse(v33Fixture);

    if (!result.success) {
      const errors = result.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      );
      throw new Error(`v33 fixture failed schema validation:\n${errors.join('\n')}`);
    }

    expect(result.success).toBe(true);
    expect(result.data.version).toBe(33);
    expect(result.data.storyArcs).toEqual([]);
    expect(result.data.teams.t1?.philosophy).toBe('maintain');
    expect(result.data.lastPortableExportYear).toBeNull();
  });

  it('migrates v33 fixture through v33→v34 to current version', () => {
    const migrated = migrate(v33Fixture as Record<string, unknown>, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(migrated['lastPortableExportYear']).toBeNull();
  });

  it('validates v34 fixture against current schema without migration', () => {
    const result = SaveStateSchema.safeParse(v34Fixture);

    if (!result.success) {
      const errors = result.error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`,
      );
      throw new Error(`v34 fixture failed schema validation:\n${errors.join('\n')}`);
    }

    expect(result.success).toBe(true);
    expect(result.data.version).toBe(34);
    expect(result.data.mediaCycle).toEqual({
      weeklyDigests: [],
      powerRankingHistory: [],
    });
    expect(result.data.storylineThreads).toEqual([]);
    expect(result.data.storyArcs).toEqual([]);
    expect(result.data.lastPortableExportYear).toBe(2025);
  });

  it('migrates v34 fixture through v34→v35, v35→v36, and v36→v37 to current version', () => {
    const migrated = migrate(v34Fixture as Record<string, unknown>, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(migrated['mediaCycle']).toEqual({
      weeklyDigests: [],
      powerRankingHistory: [],
    });
    expect(migrated['storylineThreads']).toEqual([]);
  });

  it('verifies migration chain has no gaps from v1 to SAVE_VERSION', () => {
    // The migrate function throws if any step is missing.
    // Running v1 to current covers every registered migration.
    const migrated = migrate({ version: 1, teams: {}, players: {} }, SAVE_VERSION);
    expect(migrated['version']).toBe(SAVE_VERSION);
  });
});
