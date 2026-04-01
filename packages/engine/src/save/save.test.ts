import { describe, it, expect } from 'vitest';
import { SaveStateSchema } from './schema';
import { migrate, registerMigration, getRegisteredVersions } from './migrations';

describe('SaveStateSchema', () => {
  it('validates a minimal valid save', () => {
    const minSave = {
      version: 1,
      seed: 12345,
      year: 2026,
      week: 1,
      phase: 'preseason',
      difficulty: 'pro',
      players: {},
      teams: {},
      owners: {},
      schedule: [],
      draftClass: [],
      freeAgents: [],
      records: [],
      hallOfFame: [],
      frontOffice: {
        xp: 0,
        level: 1,
        achievements: [],
        perks: [],
        reputation: { players: 50, media: 50, owner: 50 },
      },
      eventLog: [],
      narrativeState: {
        activeArcs: [],
        hooks: [],
        recentHeadlines: [],
      },
    };

    const result = SaveStateSchema.safeParse(minSave);
    expect(result.success).toBe(true);
  });

  it('rejects invalid phase', () => {
    const bad = {
      version: 1, seed: 1, year: 2026, week: 1,
      phase: 'invalid_phase',
      difficulty: 'pro',
      players: {}, teams: {}, owners: {},
      schedule: [], draftClass: [], freeAgents: [],
      records: [], hallOfFame: [],
      frontOffice: { xp: 0, level: 1, achievements: [], perks: [], reputation: { players: 0, media: 0, owner: 0 } },
      eventLog: [],
      narrativeState: { activeArcs: [], hooks: [], recentHeadlines: [] },
    };
    const result = SaveStateSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('validates a player with contract', () => {
    const player = {
      id: 'p1',
      firstName: 'Patrick',
      lastName: 'Mahomes',
      pos: 'QB',
      age: 30,
      ovr: 99,
      ratings: { arm: 98, accuracy: 95 },
      devTrait: 'x-factor',
      personality: { workEthic: 9, loyalty: 7, greed: 4, pressure: 9, ambition: 10 },
      traits: ['clutch', 'captain'],
      archetype: { archetype: 'pocket_passer', label: 'Pocket Passer', description: 'Elite from the pocket' },
      contract: {
        playerId: 'p1',
        teamId: 't1',
        years: 4,
        totalValue: 200,
        yearlyBreakdown: [
          { year: 2026, baseSalary: 45, capHit: 50, deadCap: 80, guaranteed: true },
        ],
        guaranteed: 120,
        signingBonus: 40,
        voidYears: 0,
        franchiseTag: null,
        incentives: [],
      },
      teamId: 't1',
      draftYear: 2017,
      draftRound: 1,
      draftPick: 10,
      college: 'Texas Tech',
      yearsExp: 9,
      careerStats: { seasons: 9, gp: 140, snaps: 8000 },
      traitMilestones: {},
      traitPowerLevel: {},
      injury: null,
      morale: 85,
    };

    const save = {
      version: 1, seed: 42, year: 2026, week: 5,
      phase: 'regular_season', difficulty: 'legend',
      players: { p1: player },
      teams: {}, owners: {},
      schedule: [], draftClass: [], freeAgents: [],
      records: [], hallOfFame: [],
      frontOffice: { xp: 500, level: 3, achievements: ['first_win'], perks: [], reputation: { players: 70, media: 60, owner: 80 } },
      eventLog: [],
      narrativeState: { activeArcs: [], hooks: [], recentHeadlines: ['Mahomes throws 5 TDs'] },
    };

    const result = SaveStateSchema.safeParse(save);
    expect(result.success).toBe(true);
  });
});

describe('migration pipeline', () => {
  it('runs migrations sequentially', () => {
    registerMigration(0, (state) => ({ ...state, migratedFrom0: true }));
    registerMigration(1, (state) => ({ ...state, migratedFrom1: true }));

    const result = migrate({ version: 0 }, 2);
    expect(result['version']).toBe(2);
    expect(result['migratedFrom0']).toBe(true);
    expect(result['migratedFrom1']).toBe(true);
  });

  it('throws on missing migration', () => {
    expect(() => migrate({ version: 99 }, 100)).toThrow('No migration found');
  });

  it('no-ops when already at target version', () => {
    const state = { version: 5, data: 'unchanged' };
    const result = migrate(state, 5);
    expect(result).toEqual(state);
  });
});
