import { describe, it, expect } from 'vitest';
import { SaveStateSchema } from './schema';
import { migrate, registerMigration, getRegisteredVersions } from './migrations';
import { SAVE_VERSION } from '../config';
import { initCBA } from '../systems/cba-engine';
import { initCommissioner } from '../systems/commissioner';
import { initLaborState } from '../systems/labor-relations';
import { initLeagueRules } from '../systems/league-rules';
import { createEmptyRecordBook } from '../systems/records';
import { makeLeagueState } from '../systems/test-helpers';

describe('SaveStateSchema', () => {
  it('uses save version 34 for Vault backup UX', () => {
    expect(SAVE_VERSION).toBe(34);
  });

  it('validates a minimal valid save', () => {
    const year = 2026;
    const minSave = {
      version: SAVE_VERSION,
      seed: 12345,
      year,
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
      playerSeasonHistory: {},
      faTargetBoard: {
        teamId: null,
        watchlist: [],
        targets: [],
      },
      teamNeedsCache: {},
      warRoomState: null,
      contractExtensions: [],
      storyArcs: [],
      leagueRules: initLeagueRules(year),
      cbaState: initCBA(year),
      commissionerState: initCommissioner(year),
      laborState: initLaborState(),
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
      expect(result.data.playerSeasonHistory).toEqual({});
      expect(result.data.settings).toEqual({ halftimeDecisions: 'on' });
      expect(result.data.faTargetBoard).toMatchObject({
        teamId: null,
        watchlist: [],
        targets: [],
      });
      expect(result.data.teamNeedsCache).toEqual({});
      expect(result.data.warRoomState).toBeNull();
      expect(result.data.contractExtensions).toEqual([]);
      expect(result.data.socialFeed).toEqual([]);
      expect(result.data.tradeDeadlineState).toBeUndefined();
      expect(result.data.scenarioState).toBeUndefined();
      expect(result.data.apologyTourThreads).toEqual([]);
      expect(result.data.storyArcs).toEqual([]);
      expect(result.data.lastPortableExportYear).toBeNull();
    }
  });

  it('migrates v32 saves by defaulting story arcs and team philosophies', () => {
    const legacy = makeLeagueState();
    legacy.version = 32;
    delete legacy.storyArcs;
    for (const team of Object.values(legacy.teams)) {
      delete team.philosophy;
    }

    const migrated = migrate(legacy as unknown as Record<string, unknown>, SAVE_VERSION);
    const teams = migrated['teams'] as Record<string, Record<string, unknown>>;

    expect(migrated['storyArcs']).toEqual([]);
    expect(Object.values(teams).every((team) => team['philosophy'] === 'maintain')).toBe(true);
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
    const year = 2026;
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
      version: 1, seed: 42, year, week: 5,
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
      playerSeasonHistory: {},
      faTargetBoard: {
        teamId: null,
        watchlist: [],
        targets: [],
      },
      teamNeedsCache: {},
      warRoomState: null,
      contractExtensions: [],
      leagueRules: initLeagueRules(year),
      cbaState: initCBA(year),
      commissionerState: initCommissioner(year),
      laborState: initLaborState(),
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

  it('adds v27 default UI wiring fields to minimal saves', () => {
    const year = 2026;
    const result = SaveStateSchema.safeParse({
      version: SAVE_VERSION,
      seed: 1,
      year,
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
      playerSeasonHistory: {},
      faTargetBoard: {
        teamId: null,
        watchlist: [],
        targets: [],
      },
      teamNeedsCache: {},
      warRoomState: null,
      contractExtensions: [],
      leagueRules: initLeagueRules(year),
      cbaState: initCBA(year),
      commissionerState: initCommissioner(year),
      laborState: initLaborState(),
      difficultyState: {
        enabled: true,
        adaptiveSlider: 50,
        recentUserResults: [],
        currentStreak: 0,
        adjustmentHistory: [],
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.postGameUi).toEqual({
      pressConferenceQueue: [],
      audioCueQueue: [],
      pendingHalftimeDecision: null,
    });
    expect(result.data.breakingNewsQueue).toEqual([]);
    expect(result.data.ownerPersonalityInbox).toEqual([]);
    expect(result.data.commissionerDisciplineLog).toEqual([]);
    expect(result.data.earnedDoctrines).toEqual([]);
    expect(result.data.seasonNearMissReceipts).toEqual([]);
  });

  it('migrates v19 saves to include governance defaults', () => {
    const migrated = migrate({
      version: 19,
      year: 2030,
      teams: {
        t1: {
          id: 't1',
          franchiseTags: null,
        },
      },
    }, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(migrated['leagueRules']).toBeTruthy();
    expect(migrated['cbaState']).toBeTruthy();
    expect(migrated['commissionerState']).toBeTruthy();
    expect(migrated['laborState']).toBeTruthy();
    expect((migrated['teams'] as Record<string, { franchiseTags?: unknown[] }>).t1.franchiseTags).toEqual([]);
  });

  it('migrates v25 saves to v27 with dormant feature defaults', () => {
    const migrated = migrate({
      version: 25,
      seed: 77,
      year: 2032,
      week: 8,
      players: {},
      teams: {},
      weeklyPrepPlans: {
        USER: {
          teamId: 'USER',
          opponentTeamId: 'OPP',
          year: 2032,
          week: 8,
          offensiveFocus: 'balanced',
          defensiveFocus: 'balanced',
          practiceIntensity: 'normal',
          keyMatchupPlayerId: null,
          snapManagement: 'normal',
          specialSituation: 'balanced',
        },
      },
    }, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(migrated['postGameUi']).toEqual({
      pressConferenceQueue: [],
      audioCueQueue: [],
      pendingHalftimeDecision: null,
    });
    expect(migrated['breakingNewsQueue']).toEqual([]);
    expect(migrated['ownerPersonalityInbox']).toEqual([]);
    expect(migrated['commissionerDisciplineLog']).toEqual([]);
    expect(migrated['earnedDoctrines']).toEqual([]);
    expect(migrated['seasonNearMissReceipts']).toEqual([]);
    expect(migrated['settings']).toEqual({ halftimeDecisions: 'on' });
    expect(migrated['weeklyPrepPlans']).toEqual({
      USER: expect.objectContaining({
        contingencyRules: [],
        trickPlays: [],
      }),
    });
  });

  it('migrates v27 saves to v28 with fan confidence and halftime defaults', () => {
    const migrated = migrate({
      version: 27,
      difficulty: 'rookie',
      teams: {
        USER: {
          id: 'USER',
          franchiseIdentity: {
            fanbase: 64,
          },
        },
      },
      postGameUi: {
        pressConferenceQueue: [],
        audioCueQueue: [],
      },
    }, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect((migrated['teams'] as Record<string, Record<string, unknown>>).USER.fanConfidence).toBe(64);
    expect(migrated['settings']).toEqual({ halftimeDecisions: 'off' });
    expect(migrated['postGameUi']).toEqual({
      pressConferenceQueue: [],
      audioCueQueue: [],
      pendingHalftimeDecision: null,
    });
  });

  it('migrates v28 saves to v29 with apology tour defaults', () => {
    const migrated = migrate({
      version: 28,
      teams: {},
      players: {},
    }, 29);

    expect(migrated['version']).toBe(29);
    expect(migrated['apologyTourThreads']).toEqual([]);
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
      privateWorkoutsRemaining: 3,
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

  it('migrates v15 saves to include advanced scouting defaults', () => {
    const migrated = migrate({
      version: 15,
      year: 2030,
      draftClass: [{
        id: 'prospect-1',
        firstName: 'Test',
        lastName: 'Prospect',
        pos: 'WR',
        college: 'Texas',
        ratings: { awareness: 82, speed: 90, stamina: 84 },
        projectedRound: 1,
        scoutGrade: 79,
        trueGrade: 86,
        personality: { workEthic: 7, loyalty: 5, greed: 4, pressure: 6, ambition: 7 },
        traits: [],
        archetype: null,
        characterArchetype: 'balanced',
        bustProbability: 0.18,
        stealProbability: 0.11,
        scoutingReports: [],
        combine: null,
      }],
      scoutingDepartment: {
        scouts: [{
          id: 'scout-1',
          name: 'Scout One',
          tier: 'good',
          specialty: 'WR',
          salary: 1.5,
          accuracy: 0.84,
        }],
        availableScouts: [],
        budget: 4.5,
        maxScouts: 5,
      },
      offseasonState: {
        round: 1,
        expiringPlayerIds: [],
        reSignDecisions: {},
        freeAgencyBids: {},
        scoutingState: {
          'prospect-1': {
            prospectId: 'prospect-1',
            actions: ['film'],
            accuracy: 0.38,
            visibleScoutGrade: 80,
            notes: ['Old note'],
            proDayRating: null,
          },
        },
        tradeOffers: [],
        draftOrder: [],
        currentDraftPickIndex: 0,
        completedDraftPickIds: [],
      },
    }, SAVE_VERSION);

    const prospect = (migrated['draftClass'] as Array<Record<string, unknown>>)[0]!;
    const scout = ((migrated['scoutingDepartment'] as Record<string, unknown>)['scouts'] as Array<Record<string, unknown>>)[0]!;
    const scoutingState = (((migrated['offseasonState'] as Record<string, unknown>)['scoutingState'] as Record<string, Record<string, unknown>>)['prospect-1'])!;

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(prospect['region']).toBe('south');
    expect(scout['scope']).toBe('national');
    expect(scout['region']).toBeNull();
    expect((migrated['scoutingDepartment'] as Record<string, unknown>)['privateWorkoutsRemaining']).toBe(3);
    expect(scoutingState['confidence']).toBeGreaterThan(0);
    expect(scoutingState['riskBand']).toBe('unknown');
    expect(scoutingState['characterRead']).toBe('unknown');
    expect(((migrated['offseasonState'] as Record<string, unknown>)['scoutingWatchlist'])).toEqual([]);
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

  it('migrates v12 saves to include war room planning state', () => {
    const migrated = migrate({
      version: 12,
      year: 2031,
      week: 9,
      teams: {
        t1: {
          id: 't1',
          isUser: true,
          roster: [],
          txLog: [],
        },
      },
    }, 13);

    expect(migrated['version']).toBe(13);
    expect(migrated['gamePlan']).toBeNull();
    expect(migrated['opponentReports']).toEqual([]);
    expect(migrated['draftRecaps']).toEqual([]);
    expect(migrated['tradeSuggestions']).toEqual([]);
    expect(migrated['waiverResults']).toEqual([]);
  });

  it('migrates v13 saves to include scout report state defaults', () => {
    const migrated = migrate({
      version: 13,
      year: 2032,
      week: 3,
      players: {
        p1: {
          id: 'p1',
          name: 'Legacy Veteran',
          careerStats: { seasons: 8, gp: 136, passYds: 28600, seasonStartOvr: 84, previousSeasonOvr: 81 },
        },
      },
      teams: {
        t1: {
          id: 't1',
          isUser: true,
          roster: [{ id: 'p1', name: 'Legacy Veteran', pos: 'QB', ovr: 84 }],
          txLog: [],
        },
      },
      tradeSuggestions: [],
      gamePlan: null,
      opponentReports: [],
      draftRecaps: [],
      waiverResults: [],
    }, 14);

    expect(migrated['version']).toBe(14);
    expect(migrated['playerSeasonHistory']).toEqual({});
    expect(migrated['faTargetBoard']).toEqual({
      teamId: null,
      watchlist: [],
      targets: [],
    });
    expect(migrated['teamNeedsCache']).toEqual({});
    expect(migrated['warRoomState']).toBeNull();
    expect(migrated['contractExtensions']).toEqual([]);
    expect((migrated['players'] as Record<string, Record<string, unknown>>).p1?.['careerStats']).toMatchObject({
      seasons: 8,
      gp: 136,
      passYds: 28600,
    });
  });

  it('migrates v14 saves to include sideline empire state defaults', () => {
    const migrated = migrate({
      version: 14,
      year: 2033,
      week: 6,
      teams: {
        t1: {
          id: 't1',
          isUser: true,
          schemeOff: 'spread',
          schemeDef: 'cover_3',
          offScheme: 'spread',
          defScheme: 'cover_3',
          staff: {
            hc: { id: 'hc-1', name: 'Coach One', role: 'HC', archetype: 'Strategist', traits: [], ratings: { gameplan: 82 }, level: 4 },
            oc: null,
            dc: null,
          },
          coachingStaff: { hc: null, oc: null, dc: null },
          roster: [],
          txLog: [],
        },
      },
    }, 15);

    expect(migrated['version']).toBe(15);
    expect(migrated['coachingMarket']).toEqual({
      teamId: null,
      updatedYear: 2033,
      updatedWeek: 6,
      hotSeat: false,
      candidates: {
        HC: [],
        OC: [],
        DC: [],
      },
    });
    expect(migrated['weeklyPrepPlans']).toEqual({});
    expect(migrated['weeklyPrepHistory']).toEqual([]);
    expect(migrated['filmRoomHistory']).toEqual([]);
    expect(((migrated['teams'] as Record<string, Record<string, unknown>>).t1?.['staff'] as Record<string, Record<string, unknown>>).hc).toMatchObject({
      id: 'hc-1',
      term: 3,
      buyoutPenalty: 2,
      loyalty: 5,
      ambition: 5,
      lastHiredYear: 2033,
    });
    expect((migrated['teams'] as Record<string, Record<string, unknown>>).t1).toMatchObject({
      schemeOff: 'spread',
      schemeDef: 'cover_3',
      offScheme: 'spread',
      defScheme: 'cover_3',
    });
  });

  it('migrates v16 saves to include prime time state defaults', () => {
    const migrated = migrate({
      version: 16,
      year: 2034,
      week: 9,
      phase: 'regular_season',
      difficulty: 'pro',
      teams: {
        t1: {
          id: 't1',
          isUser: true,
          roster: [],
          txLog: [],
        },
      },
      players: {},
      schedule: [],
      freeAgents: [],
      records: createEmptyRecordBook(),
      awardsHistory: [],
      hallOfFame: [],
      powerRankings: [],
      franchiseHistory: [],
      playerArchive: [],
      playerSeasonHistory: {},
      frontOffice: {
        xp: 0,
        level: 1,
        achievements: [],
        perks: [],
        reputation: { players: 50, media: 50, owner: 50 },
      },
      eventLog: [],
      narrativeState: { activeArcs: [], hooks: [], recentHeadlines: [] },
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
      faTargetBoard: { teamId: null, watchlist: [], targets: [] },
      teamNeedsCache: {},
      warRoomState: null,
      contractExtensions: [],
      coachingMarket: {
        teamId: null,
        updatedYear: 2034,
        updatedWeek: 9,
        hotSeat: false,
        candidates: { HC: [], OC: [], DC: [] },
      },
      weeklyPrepPlans: {},
      weeklyPrepHistory: [],
      filmRoomHistory: [],
      difficultyState: {
        enabled: true,
        adaptiveSlider: 50,
        recentUserResults: [],
        currentStreak: 0,
        adjustmentHistory: [],
      },
      availableMedicalStaff: [],
      playoffMomentum: {},
      scoutingDepartment: {
        scouts: [],
        availableScouts: [],
        budget: 5,
        maxScouts: 5,
        privateWorkoutsRemaining: 3,
      },
      conditionalPicks: [],
      waiverOrder: [],
      waiverWire: [],
      waiverClaims: [],
      waiverResults: [],
      handshakes: [],
      tutorialState: {
        active: false,
        currentStepIndex: 0,
        steps: [],
        completedSteps: [],
        dismissed: false,
      },
      agents: [],
      narrativeIntensity: {
        current: 50,
        recentBeats: [],
        cooldownWeeks: 0,
      },
      ceremonies: [],
      dynastyTimeline: [],
      achievements: [],
      dashboardState: {
        activeLayoutId: 'layout:default',
        layouts: [],
        pinnedWidgets: [],
      },
      seasonReports: [],
      gamePlan: null,
      opponentReports: [],
      draftRecaps: [],
      tradeSuggestions: [],
    }, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(migrated['socialFeed']).toEqual([]);
    expect(migrated['tradeDeadlineState']).toBeUndefined();
    expect(migrated['scenarioState']).toBeUndefined();
  });

  it('migrates v17 saves to include franchise identity and sprint 18 defaults', () => {
    const migrated = migrate({
      version: 17,
      year: 2035,
      week: 1,
      phase: 'preseason',
      difficulty: 'pro',
      teams: {
        t1: {
          id: 't1',
          city: 'Chicago',
          name: 'Blaze',
          abbr: 'CHI',
          stadiumType: 'outdoor',
          isUser: true,
          roster: [],
          txLog: [],
        },
      },
      players: {},
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
      playerSeasonHistory: {},
      frontOffice: {
        xp: 0,
        level: 1,
        achievements: [],
        perks: [],
        reputation: { players: 50, media: 50, owner: 50 },
      },
      eventLog: [],
      narrativeState: { activeArcs: [], hooks: [], recentHeadlines: [] },
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
      socialFeed: [],
      activeProposals: [],
      faTargetBoard: { teamId: null, watchlist: [], targets: [] },
      teamNeedsCache: {},
      warRoomState: null,
      contractExtensions: [],
      coachingMarket: {
        teamId: null,
        updatedYear: 2035,
        updatedWeek: 1,
        hotSeat: false,
        candidates: { HC: [], OC: [], DC: [] },
      },
      weeklyPrepPlans: {},
      weeklyPrepHistory: [],
      filmRoomHistory: [],
      difficultyState: {
        enabled: true,
        adaptiveSlider: 50,
        recentUserResults: [],
        currentStreak: 0,
        adjustmentHistory: [],
      },
      availableMedicalStaff: [],
      playoffMomentum: {},
      scoutingDepartment: {
        scouts: [],
        availableScouts: [],
        budget: 5,
        maxScouts: 5,
        privateWorkoutsRemaining: 3,
      },
      conditionalPicks: [],
      waiverOrder: [],
      waiverWire: [],
      waiverClaims: [],
      waiverResults: [],
      handshakes: [],
      tutorialState: {
        active: false,
        currentStepIndex: 0,
        steps: [],
        completedSteps: [],
        dismissed: false,
      },
      agents: [],
      narrativeIntensity: {
        current: 50,
        recentBeats: [],
        cooldownWeeks: 0,
      },
      ceremonies: [],
      dynastyTimeline: [],
      achievements: [],
      dashboardState: {
        activeLayoutId: 'layout:default',
        layouts: [],
        pinnedWidgets: [],
      },
      seasonReports: [],
      gamePlan: null,
      opponentReports: [],
      draftRecaps: [],
      tradeSuggestions: [],
    }, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect((migrated['teams'] as Record<string, Record<string, unknown>>).t1?.['franchiseIdentity']).toMatchObject({
      fanbase: 55,
      prestige: 50,
      marketSize: 'medium',
      marketModifier: 1,
      stadiumName: 'Chicago Stadium',
      stadiumDeal: null,
      stadiumLevel: 1,
      attendance: 70,
      relocationHistory: [],
    });
    expect(migrated['allDecadeTeams']).toEqual([]);
    expect(migrated['stadiumDealOffers']).toEqual([]);
    expect(migrated['expansionDraftState']).toBeUndefined();
  });

  it('migrates v18 saves to include locker room, endorsements, rivalries, and jersey defaults', () => {
    const migrated = migrate({
      version: 18,
      year: 2036,
      week: 1,
      phase: 'preseason',
      difficulty: 'pro',
      teams: {
        t1: {
          id: 't1',
          city: 'Chicago',
          name: 'Blaze',
          abbr: 'CHI',
          stadiumType: 'outdoor',
          conference: 'AFC',
          division: 'East',
          isUser: true,
          roster: [{
            id: 'p1',
            firstName: 'Marcus',
            lastName: 'Cole',
            name: 'Marcus Cole',
            pos: 'QB',
            age: 30,
            ovr: 90,
            pot: 92,
            ratings: { awareness: 90, speed: 82, stamina: 88 },
            devTrait: 'superstar',
            personality: { workEthic: 8, loyalty: 7, greed: 5, pressure: 8, ambition: 9 },
            traits: ['captain'],
            archetype: null,
            contract: null,
            teamId: 't1',
            draftYear: 2028,
            draftRound: 1,
            draftPick: 12,
            college: 'Test U',
            yearsExp: 8,
            careerStats: { seasons: 8, gp: 120, snaps: 7000 },
            traitMilestones: {},
            traitPowerLevel: {},
            injury: null,
            morale: 78,
            chemistry: 74,
            systemFit: 72,
            isStarter: true,
            role: 'Starter',
            roleWeeks: 17,
            tradeBlock: false,
            holdout: false,
            agentId: null,
            stats: {
              gamesPlayed: 17,
              passYds: 0,
              passTD: 0,
              passINT: 0,
              passAtt: 0,
              passComp: 0,
              rushYds: 0,
              rushAtt: 0,
              rushTD: 0,
              fumbles: 0,
              rec: 0,
              recYds: 0,
              recTD: 0,
              targets: 0,
              sacks: 0,
              defINT: 0,
              tackles: 0,
              fgMade: 0,
              fgAtt: 0,
              yacYds: 0,
            },
          }],
          txLog: [],
        },
      },
      players: {
        p1: {
          id: 'p1',
          firstName: 'Marcus',
          lastName: 'Cole',
          name: 'Marcus Cole',
          pos: 'QB',
          age: 30,
          ovr: 90,
          pot: 92,
          ratings: { awareness: 90, speed: 82, stamina: 88 },
          devTrait: 'superstar',
          personality: { workEthic: 8, loyalty: 7, greed: 5, pressure: 8, ambition: 9 },
          traits: ['captain'],
          archetype: null,
          contract: null,
          teamId: 't1',
          draftYear: 2028,
          draftRound: 1,
          draftPick: 12,
          college: 'Test U',
          yearsExp: 8,
          careerStats: { seasons: 8, gp: 120, snaps: 7000 },
          traitMilestones: {},
          traitPowerLevel: {},
          injury: null,
          morale: 78,
          chemistry: 74,
          systemFit: 72,
          isStarter: true,
          role: 'Starter',
          roleWeeks: 17,
          tradeBlock: false,
          holdout: false,
          agentId: null,
          stats: {
            gamesPlayed: 17,
            passYds: 0,
            passTD: 0,
            passINT: 0,
            passAtt: 0,
            passComp: 0,
            rushYds: 0,
            rushAtt: 0,
            rushTD: 0,
            fumbles: 0,
            rec: 0,
            recYds: 0,
            recTD: 0,
            targets: 0,
            sacks: 0,
            defINT: 0,
            tackles: 0,
            fgMade: 0,
            fgAtt: 0,
            yacYds: 0,
          },
        },
      },
      owners: {},
      schedule: [],
      draftClass: [],
      freeAgents: [],
      records: createEmptyRecordBook(),
      awardsHistory: [],
      hallOfFame: [],
      powerRankings: [],
      franchiseHistory: [],
      playerArchive: [{
        playerId: 'p1',
        firstName: 'Marcus',
        lastName: 'Cole',
        name: 'Marcus Cole',
        positions: ['QB'],
        peakOvr: 92,
        peakYear: 2034,
        firstYear: 2028,
        lastYear: 2035,
        retirementYear: null,
        teamHistory: [{ teamId: 't1', firstYear: 2028, lastYear: 2035 }],
      }],
      playerSeasonHistory: {},
      frontOffice: {
        xp: 0,
        level: 1,
        achievements: [],
        perks: [],
        reputation: { players: 50, media: 50, owner: 50 },
      },
      eventLog: [],
      narrativeState: { activeArcs: [], hooks: [], recentHeadlines: [] },
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
      socialFeed: [],
      activeProposals: [],
      faTargetBoard: { teamId: null, watchlist: [], targets: [] },
      teamNeedsCache: {},
      warRoomState: null,
      contractExtensions: [],
      coachingMarket: {
        teamId: null,
        updatedYear: 2036,
        updatedWeek: 1,
        hotSeat: false,
        candidates: { HC: [], OC: [], DC: [] },
      },
      weeklyPrepPlans: {},
      weeklyPrepHistory: [],
      filmRoomHistory: [],
      difficultyState: {
        enabled: true,
        adaptiveSlider: 50,
        recentUserResults: [],
        currentStreak: 0,
        adjustmentHistory: [],
      },
      availableMedicalStaff: [],
      playoffMomentum: {},
      scoutingDepartment: {
        scouts: [],
        availableScouts: [],
        budget: 5,
        maxScouts: 5,
        privateWorkoutsRemaining: 3,
      },
      conditionalPicks: [],
      waiverOrder: [],
      waiverWire: [],
      waiverClaims: [],
      waiverResults: [],
      handshakes: [],
      tutorialState: {
        active: false,
        currentStepIndex: 0,
        steps: [],
        completedSteps: [],
        dismissed: false,
      },
      agents: [],
      narrativeIntensity: {
        current: 50,
        recentBeats: [],
        cooldownWeeks: 0,
      },
      ceremonies: [],
      dynastyTimeline: [],
      achievements: [],
      dashboardState: {
        activeLayoutId: 'layout:default',
        layouts: [],
        pinnedWidgets: [],
      },
      seasonReports: [],
      gamePlan: null,
      opponentReports: [],
      draftRecaps: [],
      tradeSuggestions: [],
    }, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect((migrated['teams'] as Record<string, Record<string, unknown>>).t1?.['lockerRoom']).toMatchObject({
      culture: expect.any(String),
      cultureScore: expect.any(Number),
      tensions: [],
    });
    expect((migrated['teams'] as Record<string, Record<string, unknown>>).t1?.['retiredJerseys']).toEqual([]);
    expect(((migrated['players'] as Record<string, Record<string, unknown>>).p1?.['endorsements'])).toEqual([]);
    expect((migrated['players'] as Record<string, Record<string, unknown>>).p1?.['cliqueId']).not.toBeUndefined();
    expect((migrated['players'] as Record<string, Record<string, unknown>>).p1?.['jerseyNumber']).toBeGreaterThan(0);
    expect((migrated['playerArchive'] as Array<Record<string, unknown>>)[0]?.['jerseyNumber']).toBeNull();
    expect(migrated['playerRivalries']).toEqual([]);
    expect(migrated['farewellTours']).toEqual([]);
    expect(migrated['endorsementOffers']).toEqual([]);
  });

  it('v24→v25 migration adds slices and guaranteeSchedule to contracts', () => {
    const migrated = migrate({
      version: 24,
      players: {
        p1: {
          id: 'p1',
          contract: {
            playerId: 'p1',
            teamId: 't1',
            years: 3,
            totalValue: 30,
            yearlyBreakdown: [
              { year: 0, baseSalary: 8, capHit: 11, deadCap: 9, guaranteed: true },
              { year: 1, baseSalary: 8, capHit: 11, deadCap: 6, guaranteed: false },
              { year: 2, baseSalary: 8, capHit: 11, deadCap: 3, guaranteed: false },
            ],
            guaranteed: 8,
            signingBonus: 9,
            voidYears: 0,
            franchiseTag: null,
            incentives: [],
          },
        },
      },
      teams: {},
    }, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    const player = (migrated['players'] as Record<string, any>).p1;
    const c = player.contract;
    expect(c.slices).toEqual([]);
    expect(c.guaranteeSchedule).toEqual([]);
    expect(c.baseSalary).toBe(8);
    expect(c.prorated).toBe(3); // 9/3
    expect(c.originalYears).toBe(3);
    expect(c.restructured).toBe(false);
    // guaranteeType backfilled on yearly breakdown
    expect(c.yearlyBreakdown[0].guaranteeType).toBe('GAS');
  });

  it('v24→v25 migration handles player without contract', () => {
    const migrated = migrate({
      version: 24,
      players: {
        p1: { id: 'p1', contract: null },
      },
      teams: {},
    }, SAVE_VERSION);

    const player = (migrated['players'] as Record<string, any>).p1;
    expect(player.contract).toBeNull();
  });

  it('v29→v30 migration defaults player and draft prospect bloodlines', () => {
    const migrated = migrate({
      version: 29,
      players: {
        p1: { id: 'p1', name: 'Legacy Player' },
      },
      draftClass: [{ id: 'prospect-1', firstName: 'Draft', lastName: 'Prospect' }],
    }, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect((migrated['players'] as Record<string, Record<string, unknown>>).p1?.['bloodline']).toBeNull();
    expect((migrated['draftClass'] as Array<Record<string, unknown>>)[0]?.['bloodline']).toBeNull();
  });

  it('v33→v34 migration promotes the legacy manual-save marker into portable export metadata', () => {
    const migrated = migrate({
      version: 33,
      lastManualSaveYear: 9,
      teams: {},
      players: {},
    }, SAVE_VERSION);

    expect(migrated['version']).toBe(SAVE_VERSION);
    expect(migrated['lastPortableExportYear']).toBe(9);
    expect(migrated['lastManualSaveYear']).toBe(9);
  });

  it('round-trips player and draft prospect bloodline data through the save schema', () => {
    const game = makeLeagueState('draft', 1);
    const player = game.teams.afce1.roster[0]!;
    player.bloodline = {
      parentPlayerId: 'legend-qb',
      parentName: 'Marcus Cole',
      parentTeamId: 'afce1',
      parentPosition: 'QB',
      relationship: 'son',
      legacyTag: 'franchise_royalty',
    };
    game.draftClass = [{
      id: 'prospect-legacy',
      firstName: 'Draft',
      lastName: 'Cole',
      pos: 'QB',
      college: 'Test U',
      region: 'south',
      ratings: { awareness: 88, speed: 82, stamina: 85 },
      projectedRound: 1,
      scoutGrade: 84,
      trueGrade: 88,
      personality: { workEthic: 8, loyalty: 6, greed: 4, pressure: 7, ambition: 8 },
      traits: [],
      archetype: null,
      characterArchetype: 'balanced',
      bustProbability: 0.08,
      stealProbability: 0.12,
      scoutingReports: [],
      combine: null,
      bloodline: player.bloodline,
    }];

    const parsed = SaveStateSchema.parse(game);

    expect(parsed.players[player.id]?.bloodline).toMatchObject({ parentName: 'Marcus Cole' });
    expect((parsed.draftClass[0] as Record<string, unknown>)['bloodline']).toMatchObject({ parentName: 'Marcus Cole' });
  });
});
