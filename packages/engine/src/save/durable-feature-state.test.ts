import { beforeAll, describe, expect, it } from 'vitest';
import { SAVE_VERSION } from '../config/difficulty';
import { DEFAULT_MENTOR_BUDGET } from '../config/mentors';
import { makePlaytestLeagueState } from '../playtesting/harness';
import { makeLeagueState } from '../systems/test-helpers';
import { createSetupState } from '../systems/franchise-setup';
import { createEmptyRecordBook } from '../systems/records';
import type { GameState } from '../types';
import { migrate } from './migrations';
import { SaveStateSchema } from './schema';
import { TrainingCampReportSchema } from './durable-feature-state';
import { createPopulatedDurableState, durableFeatureState } from './durable-feature-state.test-helpers';
import v1 from './fixtures/v1.json';
import v10 from './fixtures/v10.json';
import v20 from './fixtures/v20.json';
import v30 from './fixtures/v30.json';
import v31 from './fixtures/v31.json';
import v32 from './fixtures/v32.json';
import v33 from './fixtures/v33.json';
import v34 from './fixtures/v34.json';

function rawSave(game: GameState, version = game.version): Record<string, unknown> {
  return JSON.parse(JSON.stringify({ ...game, version })) as Record<string, unknown>;
}

function withoutDurableFields(game: GameState, version: number): Record<string, unknown> {
  const raw = rawSave(game, version);
  for (const key of Object.keys(durableFeatureState(game))) delete raw[key];
  return raw;
}

describe('v38 durable feature-state contract', () => {
  let populated: GameState;
  beforeAll(() => { populated = createPopulatedDurableState(); });

  it.each([37, 38])('preserves populated v%i fields and normalizes idempotently', (version) => {
    const raw = rawSave(populated, version);
    const original = structuredClone(raw);
    const normalized = SaveStateSchema.parse(migrate(raw, SAVE_VERSION));

    for (const key of Object.keys(durableFeatureState(populated))) {
      expect(normalized[key as keyof typeof normalized], key).toEqual(original[key]);
    }
    expect(normalized.version).toBe(SAVE_VERSION);
    expect(raw).toEqual(original);
    expect(SaveStateSchema.parse(migrate(normalized, SAVE_VERSION))).toEqual(normalized);
  });

  it.each([37, 38])('defaults absent v%i fields without starting onboarding or inventing history', (version) => {
    const normalized = SaveStateSchema.parse(migrate(withoutDurableFields(populated, version), SAVE_VERSION));
    expect(normalized.activeMentors).toEqual([]);
    expect(normalized.mentorBudget).toBe(DEFAULT_MENTOR_BUDGET);
    expect(normalized.userDynastyEras).toEqual([]);
    expect(normalized.trainingCampResults).toEqual([]);
    expect(normalized.pendingPassedPickTargets).toEqual([]);
    expect(normalized).not.toHaveProperty('setupState');
    expect(normalized).not.toHaveProperty('franchiseBlueprint');
    const userId = Object.values(populated.teams).find((team) => team.isUser)!.id;
    expect(normalized.teams[userId]?.era).toBe('The Second Window');
  });

  it.each([0, 1.25, 2.5])('preserves a valid mentor balance of %s without refunding it', (balance) => {
    const raw = { ...rawSave(populated, 37), mentorBudget: balance };
    expect(SaveStateSchema.parse(migrate(raw, SAVE_VERSION)).mentorBudget).toBe(balance);
    expect(SaveStateSchema.parse({ ...raw, activeMentors: [] }).mentorBudget).toBe(balance);
  });

  it('retains a spent budget even if the optional mentor list was absent', () => {
    const raw = rawSave(populated, 37);
    delete raw.activeMentors;
    raw.mentorBudget = 0;
    const normalized = SaveStateSchema.parse(migrate(raw, SAVE_VERSION));
    expect(normalized.activeMentors).toEqual([]);
    expect(normalized.mentorBudget).toBe(0);
  });

  it.each([undefined, null, -1, NaN, Infinity, '2.5'])('rejects active mentors with an invalid budget (%s)', (budget) => {
    for (const version of [37, 38]) {
      const raw = { ...rawSave(populated, version), mentorBudget: budget };
      const migrated = migrate(raw, SAVE_VERSION);
      expect(migrated.mentorBudget).toBe(budget);
      const result = SaveStateSchema.safeParse(migrated);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === 'mentorBudget')).toBe(true);
    }
  });

  it('rejects malformed nested values rather than silently dropping feature data', () => {
    const invalid: Array<[string, Record<string, unknown>]> = [
      ['activeMentors', { activeMentors: [{ ...populated.activeMentors![0], specialty: 'unknown' }] }],
      ['userDynastyEras', { userDynastyEras: [{ ...populated.userDynastyEras![0], endYear: 'later' }] }],
      ['trainingCampResults', { trainingCampResults: [{ ...populated.trainingCampResults![0], injuries: [{ playerId: 'p', playerName: 'P', pos: 'WR', weeksOut: 'two' }] }] }],
      ['pendingPassedPickTargets', { pendingPassedPickTargets: [{ ...populated.pendingPassedPickTargets![0], round: null }] }],
      ['setupState', { setupState: { ...populated.setupState, decisions: { ...populated.setupState!.decisions, depthChartOverrides: { WR: [7] } } } }],
      ['setupState', { setupState: { ...populated.setupState, forecastBoard: { ...populated.setupState!.forecastBoard, cards: [{ ...populated.setupState!.forecastBoard!.cards[0], direction: 'sideways' }] } } }],
      ['setupState', { setupState: { ...populated.setupState, crisisProfile: { ...populated.setupState!.crisisProfile, pressureCards: [{ ...populated.setupState!.crisisProfile!.pressureCards[0], severity: 'unknown' }] } } }],
      ['setupState', { setupState: { ...populated.setupState, blueprint: { ...populated.franchiseBlueprint, weekOneCliffhanger: { ...populated.franchiseBlueprint!.weekOneCliffhanger, unknown: 1 } } } }],
      ['franchiseBlueprint', { franchiseBlueprint: { ...populated.franchiseBlueprint, keyPlayers: [{ ...populated.franchiseBlueprint!.keyPlayers[0], pos: 'XX' }] } }],
    ];
    for (const [field, override] of invalid) {
      const raw = { ...rawSave(populated, 37), ...override };
      const result = SaveStateSchema.safeParse(migrate(raw, SAVE_VERSION));
      expect(result.success, field).toBe(false);
      if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === field), field).toBe(true);
    }
  });

  it('does not turn explicit null or malformed arrays into missing-field defaults', () => {
    for (const field of ['activeMentors', 'userDynastyEras', 'trainingCampResults', 'pendingPassedPickTargets']) {
      for (const value of [null, 'corrupt', {}]) {
        const migrated = migrate({ ...rawSave(populated, 37), [field]: value }, SAVE_VERSION);
        expect(migrated[field]).toEqual(value);
        expect(SaveStateSchema.safeParse(migrated).success, field).toBe(false);
      }
    }
    for (const field of ['setupState', 'franchiseBlueprint']) {
      expect(SaveStateSchema.safeParse({ ...rawSave(populated), [field]: null }).success, field).toBe(false);
    }
  });

  it('preserves a fresh nullable setup state and every recorded camp report field', () => {
    const setup = createSetupState();
    expect(SaveStateSchema.parse({ ...rawSave(populated), setupState: setup }).setupState).toEqual(setup);
    const report = {
      teamId: 'afce1',
      standouts: [{ playerId: 'rookie', playerName: 'Rookie', pos: 'WR' as const, ovrBefore: 70, ovrAfter: 72, reason: 'rookie_standout' as const }],
      injuries: [{ playerId: 'hurt', playerName: 'Hurt', pos: 'LB' as const, weeksOut: 2 }],
      battles: [{ pos: 'QB' as const, winnerId: 'winner', winnerName: 'Winner', loserId: 'loser', loserName: 'Loser', winnerOvr: 85, loserOvr: 83 }],
      headlines: ['A recorded camp.'],
    };
    expect(TrainingCampReportSchema.parse(report)).toEqual(report);
  });

  it.each([['v1', v1], ['v10', v10], ['v20', v20], ['v30', v30], ['v31', v31], ['v32', v32], ['v33', v33], ['v34', v34]])(
    'loads historical %s through the full schema with safe defaults', (_label, fixture) => {
      const raw = structuredClone(fixture) as Record<string, unknown>;
      const result = SaveStateSchema.safeParse(migrate(raw, SAVE_VERSION));
      expect(result.success, result.success ? '' : JSON.stringify(result.error.issues)).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe(SAVE_VERSION);
        expect(result.data.activeMentors).toEqual([]);
        expect(result.data.mentorBudget).toBe(DEFAULT_MENTOR_BUDGET);
        expect(result.data.userDynastyEras).toEqual([]);
        expect(result.data.trainingCampResults).toEqual([]);
        expect(result.data.pendingPassedPickTargets).toEqual([]);
        expect(result.data.setupState).toBeUndefined();
        expect(result.data.franchiseBlueprint).toBeUndefined();
      }
    },
  );

  it('gives engine and playtest constructors independent durable defaults without setup', () => {
    for (const factory of [() => makeLeagueState(), () => makePlaytestLeagueState(42)]) {
      const first = factory();
      const second = factory();
      expect(durableFeatureState(first)).toEqual({
        activeMentors: [], mentorBudget: DEFAULT_MENTOR_BUDGET, userDynastyEras: [],
        trainingCampResults: [], pendingPassedPickTargets: [], setupState: undefined, franchiseBlueprint: undefined,
      });
      expect(first.version).toBe(SAVE_VERSION);
      expect(first.activeMentors).not.toBe(second.activeMentors);
      expect(first.userDynastyEras).not.toBe(second.userDynastyEras);
      expect(first.trainingCampResults).not.toBe(second.trainingCampResults);
      expect(first.pendingPassedPickTargets).not.toBe(second.pendingPassedPickTargets);
    }
  });

  it('fills only the missing legacy record bucket and preserves populated records', () => {
    const records = createEmptyRecordBook();
    records.singleGame.passYds = [{
      category: 'singleGame', stat: 'passYds', value: 410, teamId: 'afce1', teamName: 'AFCE1 Club',
      year: 2025, week: 4, playerId: 'record-qb', playerName: 'Record QB', note: 'Keep this history.',
    }];
    const { franchise, ...legacy } = records;
    const raw = { ...rawSave(populated, 37), records: legacy };
    const original = structuredClone(raw);
    const normalized = SaveStateSchema.parse(migrate(raw, SAVE_VERSION));
    expect(normalized.records).toEqual({ ...legacy, franchise });
    expect(raw).toEqual(original);

    const complete = { ...rawSave(populated, 37), records };
    const migrated = migrate(complete, SAVE_VERSION);
    expect(migrated.records).toBe(records);
    expect(SaveStateSchema.parse(migrated).records).toEqual(records);
    expect(SaveStateSchema.parse(migrate({ ...rawSave(populated, 37), records: [] }, SAVE_VERSION)).records)
      .toEqual(createEmptyRecordBook());
  });

  it('keeps nonempty legacy arrays and malformed record books visible to validation', () => {
    const invalid = [
      ['unmapped historical record'], null, undefined,
      { singleGame: {}, singleSeason: {} },
      { singleGame: [], singleSeason: {}, career: {} },
      { singleGame: { passYds: 'corrupt' }, singleSeason: {}, career: {} },
      { singleGame: {}, singleSeason: {}, career: {}, franchise: null },
    ];
    for (const records of invalid) {
      const migrated = migrate({ ...rawSave(populated, 37), records }, SAVE_VERSION);
      expect(migrated.records).toEqual(records);
      const result = SaveStateSchema.safeParse(migrated);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === 'records')).toBe(true);
    }
  });
});
