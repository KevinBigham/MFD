import { describe, it, expect } from 'vitest';
import { SaveStateSchema } from './schema';
import { migrate, registerMigration, getRegisteredVersions } from './migrations';
import { SAVE_VERSION } from '../config';
import { createEmptyRecordBook } from '../systems/records';

describe('SaveStateSchema', () => {
  it('validates a minimal valid save', () => {
    const minSave = {
      version: SAVE_VERSION,
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
      records: createEmptyRecordBook(),
      awardsHistory: [],
      hallOfFame: [],
      powerRankings: [],
      franchiseHistory: [],
      playerArchive: [],
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
      offFieldEvents: [],
      recentPressConferences: [],
      coachingHistory: [],
      leagueRivalries: [],
      activeEffects: [],
      gameDayState: {
        recentPackages: [],
        latestPackageId: null,
      },
      weekSummaries: [],
      playoffBracket: null,
      offseasonState: null,
      leagueNews: [],
      activeProposals: [],
      difficultyState: {
        enabled: true,
        adaptiveSlider: 50,
        recentUserResults: [],
        currentStreak: 0,
        adjustmentHistory: [],
      },
    };

    const result = SaveStateSchema.safeParse(minSave);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.offseasonState).toBeNull();
    }
  });

  it('rejects invalid phase', () => {
    const bad = {
      version: 1, seed: 1, year: 2026, week: 1,
      phase: 'invalid_phase',
      difficulty: 'pro',
      players: {}, teams: {}, owners: {},
      schedule: [], draftClass: [], freeAgents: [],
      records: createEmptyRecordBook(), awardsHistory: [], hallOfFame: [], powerRankings: [], franchiseHistory: [], playerArchive: [],
      frontOffice: { xp: 0, level: 1, achievements: [], perks: [], reputation: { players: 0, media: 0, owner: 0 } },
      eventLog: [],
      narrativeState: { activeArcs: [], hooks: [], recentHeadlines: [] },
      gameDayState: { recentPackages: [], latestPackageId: null },
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
      records: createEmptyRecordBook(), awardsHistory: [], hallOfFame: [], powerRankings: [], franchiseHistory: [], playerArchive: [],
      frontOffice: { xp: 500, level: 3, achievements: ['first_win'], perks: [], reputation: { players: 70, media: 60, owner: 80 } },
      eventLog: [],
      narrativeState: { activeArcs: [], hooks: [], recentHeadlines: ['Mahomes throws 5 TDs'] },
      offFieldEvents: [],
      recentPressConferences: [],
      coachingHistory: [],
      leagueRivalries: [],
      activeEffects: [],
      gameDayState: { recentPackages: [], latestPackageId: null },
      weekSummaries: [],
      playoffBracket: null,
      offseasonState: null,
      leagueNews: [],
      activeProposals: [],
      difficultyState: {
        enabled: true,
        adaptiveSlider: 50,
        recentUserResults: [],
        currentStreak: 0,
        adjustmentHistory: [],
      },
    };

    const result = SaveStateSchema.safeParse(save);
    expect(result.success).toBe(true);
  });
});

describe('migration pipeline', () => {
  it('runs migrations sequentially', () => {
    registerMigration(110, (state) => ({ ...state, migratedFrom110: true }));
    registerMigration(111, (state) => ({ ...state, migratedFrom111: true }));

    const result = migrate({ version: 110 }, 112);
    expect(result['version']).toBe(112);
    expect(result['migratedFrom110']).toBe(true);
    expect(result['migratedFrom111']).toBe(true);
  });

  it('throws on missing migration', () => {
    expect(() => migrate({ version: 99 }, 100)).toThrow('No migration found');
  });

  it('no-ops when already at target version', () => {
    const state = { version: 5, data: 'unchanged' };
    const result = migrate(state, 5);
    expect(result).toEqual(state);
  });

  it('migrates v1 saves to include season loop defaults', () => {
    const migrated = migrate({
      version: 1,
      teams: {
        t1: { wins: 3, losses: 2, ties: 0 },
      },
    }, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(migrated['weekSummaries']).toEqual([]);
    expect(migrated['playoffBracket']).toBeNull();
    expect((migrated['teams'] as Record<string, Record<string, unknown>>).t1).toMatchObject({
      wins: 3,
      losses: 2,
      ties: 0,
      practiceSquad: [],
      stadiumType: 'outdoor',
      mentoringPairs: [],
      trainingAssignments: {},
      medicalStaff: null,
      fatigueState: {},
      seasonStats: {
        gamesPlayed: 5,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDifferential: 0,
        totalYards: 0,
        passingYards: 0,
        rushingYards: 0,
        turnoversLost: 0,
        turnoversForced: 0,
        sacksFor: 0,
        sacksAgainst: 0,
        drives: 0,
        thirdDownConversions: 0,
        thirdDownAttempts: 0,
        timeOfPossession: 0,
        fgMade: 0,
        fgAttempted: 0,
        punts: 0,
        pressuresAllowed: 0,
        yacYards: 0,
        redZoneTrips: 0,
        redZoneScores: 0,
      },
    });
  });

  it('migrates v2 saves to include offseason defaults', () => {
    const migrated = migrate({
      version: 2,
      teams: {
        t1: {
          wins: 10,
          losses: 7,
          ties: 0,
          seasonStats: {
            gamesPlayed: 17,
            pointsFor: 300,
            pointsAgainst: 280,
            pointDifferential: 20,
            totalYards: 5200,
            passingYards: 3400,
            rushingYards: 1800,
            turnoversLost: 18,
            turnoversForced: 20,
            sacksFor: 35,
            sacksAgainst: 28,
          },
        },
      },
      weekSummaries: [],
      playoffBracket: null,
    }, 3);

    expect(migrated['version']).toBe(3);
    expect(migrated['offseasonState']).toBeNull();
  });

  it('migrates v3 saves to include game day defaults and preserve headlines', () => {
    const migrated = migrate({
      version: 3,
      narrativeState: {
        activeArcs: [],
        hooks: [],
        recentHeadlines: ['Week 18: afce1 Club beat afce2 Club 24-17'],
      },
      offFieldEvents: [],
      recentPressConferences: [],
      coachingHistory: [],
      leagueRivalries: [],
      activeEffects: [],
      offseasonState: null,
    }, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(migrated['narrativeState']).toEqual({
      activeArcs: [],
      hooks: [],
      recentHeadlines: ['Week 18: afce1 Club beat afce2 Club 24-17'],
    });
    expect(migrated['gameDayState']).toEqual({
      recentPackages: [],
      latestPackageId: null,
    });
  });

  it('migrates v4 saves to include legacy history defaults', () => {
    const migrated = migrate({
      version: 4,
      narrativeState: {
        activeArcs: [],
        hooks: [],
        recentHeadlines: ['Dynasty save in progress'],
      },
      gameDayState: {
        recentPackages: [],
        latestPackageId: null,
      },
      offFieldEvents: [],
      recentPressConferences: [],
      coachingHistory: [],
      leagueRivalries: [],
      activeEffects: [],
      offseasonState: null,
    }, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(migrated['franchiseHistory']).toEqual([]);
    expect(migrated['playerArchive']).toEqual([]);
  });

  it('migrates v5 saves to include sprint 6 dynasty defaults', () => {
    const migrated = migrate({
      version: 5,
      teams: {
        t1: {
          id: 't1',
          city: 'Test',
          name: 'Club',
        },
      },
      records: [],
      hallOfFame: [],
      franchiseHistory: [],
      playerArchive: [],
      gameDayState: {
        recentPackages: [],
        latestPackageId: null,
      },
      offFieldEvents: [],
      recentPressConferences: [],
      coachingHistory: [],
      leagueRivalries: [],
      activeEffects: [],
      weekSummaries: [],
      offseasonState: null,
    }, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(migrated['awardsHistory']).toEqual([]);
    expect(migrated['powerRankings']).toEqual([]);
    expect(migrated['records']).toEqual(createEmptyRecordBook());
    expect((migrated['teams'] as Record<string, { mentoringPairs?: unknown }>).t1.mentoringPairs).toEqual([]);
  });

  it('migrates v6 saves to include living world defaults', () => {
    const migrated = migrate({
      version: 6,
      teams: {
        t1: {
          division: 'AFC East',
          rivalries: [{ teamId: 't2', heat: 52, trophyName: null, history: [] }],
          rivals: { t2: { heat: 6 } },
        },
        t2: {
          division: 'AFC East',
          rivalries: [{ teamId: 't1', heat: 48, trophyName: null, history: [] }],
          rivals: { t1: { heat: 5 } },
        },
      },
      narrativeState: {
        activeArcs: [],
        hooks: [],
        recentHeadlines: ['Training camp opens'],
      },
      gameDayState: {
        recentPackages: [],
        latestPackageId: null,
      },
      weekSummaries: [],
      offseasonState: null,
    }, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(migrated['offFieldEvents']).toEqual([]);
    expect(migrated['recentPressConferences']).toEqual([]);
    expect(migrated['coachingHistory']).toEqual([]);
    expect(migrated['leagueRivalries']).toEqual([{
      id: 't1::t2',
      teamA: 't1',
      teamB: 't2',
      intensity: 52,
      isDivision: true,
      history: [],
      lastMetYear: null,
      lastMetWeek: null,
    }]);
    expect(migrated['activeEffects']).toEqual([]);
  });

  it('migrates v7 saves to include front-office defaults', () => {
    const migrated = migrate({
      version: 7,
      year: 2027,
      week: 4,
      teams: {
        t1: {
          wins: 3,
          losses: 1,
          ties: 0,
          seasonStats: { pointDifferential: 14 },
        },
        t2: {
          wins: 1,
          losses: 3,
          ties: 0,
          seasonStats: { pointDifferential: -14 },
        },
      },
      draftClass: [{
        id: 'prospect-1',
        firstName: 'Front',
        lastName: 'Office',
        pos: 'QB',
        college: 'Test State',
        ratings: {},
        projectedRound: 1,
        scoutGrade: 76,
        trueGrade: 84,
        personality: { workEthic: 7, loyalty: 5, greed: 4, pressure: 6, ambition: 7 },
        traits: [],
        archetype: null,
        characterArchetype: 'balanced',
        bustProbability: 0.1,
        stealProbability: 0.1,
        scoutingReports: [],
      }],
      narrativeState: {
        activeArcs: [],
        hooks: [],
        recentHeadlines: [],
      },
      gameDayState: {
        recentPackages: [],
        latestPackageId: null,
      },
      offFieldEvents: [],
      recentPressConferences: [],
      coachingHistory: [],
      leagueRivalries: [],
      activeEffects: [],
      weekSummaries: [],
      offseasonState: null,
    }, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(migrated['scoutingDepartment']).toEqual({
      scouts: [],
      availableScouts: [],
      budget: 5,
      maxScouts: 5,
    });
    expect(migrated['conditionalPicks']).toEqual([]);
    expect(migrated['waiverClaims']).toEqual([]);
    expect(migrated['waiverWire']).toEqual([]);
    expect(migrated['handshakes']).toEqual([]);
    expect((migrated['draftClass'] as Array<{ combine?: unknown }>)[0]!.combine).toBeNull();
    expect((migrated['teams'] as Record<string, { practiceSquad?: unknown; stadiumType?: unknown }>).t1.practiceSquad).toEqual([]);
    expect((migrated['teams'] as Record<string, { practiceSquad?: unknown; stadiumType?: unknown }>).t1.stadiumType).toBe('outdoor');
    expect(migrated['waiverOrder']).toEqual(['t2', 't1']);
  });

  it('migrates v8 saves to include sprint 9 broadcast surfaces state', () => {
    const migrated = migrate({
      version: 8,
      teams: {
        t1: {
          wins: 3,
          losses: 2,
          ties: 0,
          practiceSquad: [],
          mentoringPairs: [],
          stadiumType: 'outdoor',
          seasonStats: {
            gamesPlayed: 5,
            pointsFor: 120,
            pointsAgainst: 110,
            pointDifferential: 10,
            totalYards: 1800,
            passingYards: 1200,
            rushingYards: 600,
            turnoversLost: 3,
            turnoversForced: 4,
            sacksFor: 8,
            sacksAgainst: 6,
          },
        },
      },
    }, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(migrated['leagueNews']).toEqual([]);
    expect(migrated['activeProposals']).toEqual([]);
    expect(migrated['difficultyState']).toEqual({
      enabled: true,
      adaptiveSlider: 50,
      recentUserResults: [],
      currentStreak: 0,
      adjustmentHistory: [],
    });
    expect((migrated['teams'] as Record<string, { trainingAssignments: Record<string, unknown> }>).t1.trainingAssignments).toEqual({});
  });

  it('migrates v9 saves to include sprint 10 iron man state', () => {
    const migrated = migrate({
      version: 9,
      teams: {
        t1: {
          wins: 3,
          losses: 2,
          ties: 0,
          practiceSquad: [],
          mentoringPairs: [],
          trainingAssignments: {},
          stadiumType: 'outdoor',
          owner: { archetypeId: 'legacy_builder' },
          roster: [
            {
              id: 'p1',
              injury: {
                type: 'knee',
                severity: 'out',
                gamesOut: 4,
              },
            },
          ],
          seasonStats: {
            gamesPlayed: 5,
            pointsFor: 120,
            pointsAgainst: 110,
            pointDifferential: 10,
            totalYards: 1800,
            passingYards: 1200,
            rushingYards: 600,
            turnoversLost: 3,
            turnoversForced: 4,
            sacksFor: 8,
            sacksAgainst: 6,
          },
        },
      },
    }, 10);

    expect(migrated['version']).toBe(10);
    expect(migrated['availableMedicalStaff']).toEqual([]);
    expect(migrated['playoffMomentum']).toEqual({});
    expect((migrated['teams'] as Record<string, {
      medicalStaff: unknown;
      fatigueState: Record<string, unknown>;
      facilityState: { budget: number; facilities: Array<{ type: string; level: number }> };
      roster: Array<{ injury: Record<string, unknown> }>;
    }>).t1.medicalStaff).toBeNull();
    expect((migrated['teams'] as Record<string, {
      medicalStaff: unknown;
      fatigueState: Record<string, unknown>;
      facilityState: { budget: number; facilities: Array<{ type: string; level: number }> };
      roster: Array<{ injury: Record<string, unknown> }>;
    }>).t1.fatigueState).toEqual({});
    expect((migrated['teams'] as Record<string, {
      medicalStaff: unknown;
      fatigueState: Record<string, unknown>;
      facilityState: { budget: number; facilities: Array<{ type: string; level: number }> };
      roster: Array<{ injury: Record<string, unknown> }>;
    }>).t1.facilityState.budget).toBe(12);
    expect((migrated['teams'] as Record<string, {
      medicalStaff: unknown;
      fatigueState: Record<string, unknown>;
      facilityState: { budget: number; facilities: Array<{ type: string; level: number }> };
      roster: Array<{ injury: Record<string, unknown> }>;
    }>).t1.facilityState.facilities).toHaveLength(5);
    expect((migrated['teams'] as Record<string, {
      medicalStaff: unknown;
      fatigueState: Record<string, unknown>;
      facilityState: { budget: number; facilities: Array<{ type: string; level: number }> };
      roster: Array<{ injury: Record<string, unknown> }>;
    }>).t1.roster[0]!.injury).toMatchObject({
      type: 'knee',
      severity: 'out',
      severityTier: 'severe',
      gamesOut: 4,
      gamesRecovered: 0,
      reinjuryRisk: expect.any(Number),
      affectedRatings: expect.any(Array),
      ratingPenalty: 0,
      onIR: false,
    });
  });

  it('migrates v10 saves to include sprint 11 opening night state', () => {
    const migrated = migrate({
      version: 10,
      players: {
        p1: {
          id: 'p1',
          name: 'Test Player',
        },
      },
      teams: {
        t1: {
          isUser: true,
          roster: [{ id: 'p1', name: 'Test Player' }],
        },
      },
    }, 11);

    expect(migrated['version']).toBe(11);
    expect(migrated['tutorialState']).toMatchObject({
      active: false,
      currentStepIndex: 0,
      dismissed: false,
    });
    expect(migrated['agents']).toEqual([]);
    expect(migrated['narrativeIntensity']).toMatchObject({
      current: 50,
      recentBeats: [],
      cooldownWeeks: 0,
    });
    expect(migrated['ceremonies']).toEqual([]);
    expect(migrated['dynastyTimeline']).toEqual([]);
    expect((migrated['players'] as Record<string, Record<string, unknown>>).p1?.['agentId']).toBeNull();
  });

  it('migrates v11 saves to include sprint 12 prestige systems', () => {
    const migrated = migrate({
      version: 11,
      year: 2030,
      week: 15,
      teams: {
        t1: {
          id: 't1',
          isUser: true,
          roster: [
            {
              id: 'wr-1',
              pos: 'WR',
              ovr: 81,
              ratings: { speed: 92, awareness: 70 },
            },
            {
              id: 'rb-1',
              pos: 'RB',
              ovr: 79,
              ratings: { speed: 88, awareness: 66 },
            },
            {
              id: 'ol-1',
              pos: 'OL',
              ovr: 76,
              ratings: { awareness: 82 },
            },
          ],
        },
      },
      schedule: [
        {
          week: 15,
          games: [
            { homeTeamId: 't1', awayTeamId: 't2', result: null },
          ],
        },
      ],
    }, 12);

    expect(migrated['version']).toBe(12);
    expect(Array.isArray(migrated['achievements'])).toBe(true);
    expect((migrated['achievements'] as Array<Record<string, unknown>>).length).toBeGreaterThanOrEqual(50);
    expect(migrated['dashboardState']).toMatchObject({
      activeLayoutId: expect.any(String),
      pinnedWidgets: [],
    });
    expect(migrated['seasonReports']).toEqual([]);
    expect((migrated['teams'] as Record<string, Record<string, unknown>>).t1?.['specialTeams']).toMatchObject({
      kickReturner: 'wr-1',
      puntReturner: 'wr-1',
      longSnapper: 'ol-1',
    });
    expect((migrated['schedule'] as Array<{ games: Array<Record<string, unknown>> }>)[0]?.games[0]).toMatchObject({
      flexed: false,
      primetime: false,
      broadcastNetwork: null,
    });
  });
});
