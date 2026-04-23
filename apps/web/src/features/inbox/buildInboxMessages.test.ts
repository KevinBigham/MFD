import { describe, expect, it } from 'vitest';
import type { ApologyTourThread, GameDayPackage, Team } from '@mfd/engine';
import { buildInboxMessages } from './buildInboxMessages';

type BuildParams = Parameters<typeof buildInboxMessages>[0];

function makeParams(overrides: Partial<BuildParams> = {}): BuildParams {
  return {
    team: {
      id: 'afce1',
      city: 'Buffalo',
      name: 'Blizzards',
      abbr: 'BUF',
      draftPicks: [],
      owner: { approval: 60 },
      capSpace: 25,
      fatigueState: {},
      facilityState: { facilities: [], budget: 0, maxFacilities: 5, upgradeCosts: {} },
    } as unknown as Team,
    roster: [],
    week: 12,
    narrative: null,
    latestSummary: null,
    phase: 'regular_season',
    latestPackage: null,
    activeArcs: [],
    offFieldEvents: [],
    offseasonState: null,
    recentPressConferences: [],
    coachingNews: [],
    upcomingRivalry: null,
    handshakes: [],
    conditionalPicks: [],
    waiverWire: [],
    weather: null,
    leagueNews: [],
    activeProposals: [],
    trainingAssignments: {},
    difficultyState: null,
    availableMedicalStaff: [],
    playoffMomentum: null,
    ceremonies: [],
    newlyUnlockedAchievements: [],
    latestSeasonReport: null,
    latestDraftRecap: null,
    claimResults: [],
    transactionLog: [],
    tradeSuggestions: [],
    faTargetBoard: { watchlist: [], targets: [], topAvailable: [], bestFits: [], bargains: [] },
    teamNeedsReport: {
      overall: 'Stable roster',
      positionGrades: [],
      criticalNeeds: [],
      strengths: [],
      draftTargets: [],
      faTargets: [],
      capFlexibility: 'moderate',
    },
    warRoomState: null,
    contractExtensions: [],
    coachingMarket: {
      teamId: null,
      updatedYear: 2026,
      updatedWeek: 12,
      hotSeat: false,
      candidates: { HC: [], OC: [], DC: [] },
    },
    currentWeeklyPrepPlan: null,
    latestFilmRoomReport: null,
    upcomingGame: null,
    apologyTourThreads: [],
    ...overrides,
  };
}

function makeThread(overrides: Partial<ApologyTourThread> = {}): ApologyTourThread {
  return {
    id: 'apology-2026-5-game-collapse-1',
    gameId: 'game-collapse-1',
    teamId: 'afce1',
    opponentTeamId: 'afce2',
    namedGameName: 'The Collapse',
    archetype: 'collapse',
    startedYear: 2026,
    startedWeek: 5,
    status: 'active',
    beatsDelivered: ['fan_letter', 'beat_column', 'owner_email'],
    ...overrides,
  };
}

describe('buildInboxMessages Apology Tour', () => {
  it('surfaces apology tour beats in delivery order with the expected urgency', () => {
    const messages = buildInboxMessages(makeParams({
      apologyTourThreads: [makeThread({
        status: 'resolved',
        beatsDelivered: ['fan_letter', 'beat_column', 'owner_email', 'resolution'],
      })],
    })).filter((message) => message.id.startsWith('apology-'));

    expect(messages.map((message) => message.id)).toEqual([
      'apology-apology-2026-5-game-collapse-1-fan_letter',
      'apology-apology-2026-5-game-collapse-1-beat_column',
      'apology-apology-2026-5-game-collapse-1-owner_email',
      'apology-apology-2026-5-game-collapse-1-resolution',
    ]);
    expect(messages.map((message) => message.type)).toEqual(['URGENT', 'INTEL', 'DECISION', 'INTEL']);
    expect(messages.map((message) => message.actionRequired)).toEqual([false, false, true, false]);
    expect(messages[0]?.title).toBe('The Apology Tour Begins');
    expect(messages[3]?.title).toBe('Recovery Logged');
  });

  it('does not duplicate inbox messages when a thread repeats a delivered beat key', () => {
    const messages = buildInboxMessages(makeParams({
      apologyTourThreads: [makeThread({
        beatsDelivered: ['fan_letter', 'fan_letter', 'owner_email'],
      } as ApologyTourThread)],
    })).filter((message) => message.id.startsWith('apology-'));

    expect(messages.map((message) => message.id)).toEqual([
      'apology-apology-2026-5-game-collapse-1-fan_letter',
      'apology-apology-2026-5-game-collapse-1-owner_email',
    ]);
  });
});

describe('buildInboxMessages gameday deeplink', () => {
  const gameDayPackage = {
    id: 'gd-2026-5',
    week: 5,
    year: 2026,
    headline: 'Bills survive Miami in a shootout',
    result: 'win',
    autopsy: {
      diagnosis: 'Explosive plays covered for a leaky middle.',
      leverage: 'Red zone offense flipped the script late.',
      nextFocus: ['Run defense', 'Third-down passing'],
    },
  } as unknown as GameDayPackage;

  it('attaches the presentation deeplink to the latest gameday message', () => {
    const messages = buildInboxMessages(makeParams({ latestPackage: gameDayPackage }));
    const gameday = messages.find((message) => message.id === 'gameday-gd-2026-5');
    expect(gameday).toBeDefined();
    expect(gameday!.link).toBe('/presentation');
    expect(gameday!.linkLabel).toBe('Watch Replay');
  });

  it('does not attach a deeplink when there is no gameday package (fallback summary)', () => {
    const messages = buildInboxMessages(makeParams({
      latestPackage: null,
      latestSummary: {
        id: 'ws-2026-5',
        week: 5,
        result: 'loss',
        headline: 'Rough Monday — regress everywhere',
        record: '3-2',
        ownerDelta: -3,
        notes: ['O-line broke down'],
      } as unknown as Parameters<typeof buildInboxMessages>[0]['latestSummary'],
    }));
    const summary = messages.find((message) => message.id === 'weekly-summary-ws-2026-5');
    expect(summary).toBeDefined();
    expect(summary!.link).toBeUndefined();
    expect(summary!.linkLabel).toBeUndefined();
  });

  it('flags a loss gameday as URGENT and still deeplinks to the replay', () => {
    const loss = { ...gameDayPackage, id: 'gd-loss', result: 'loss' } as unknown as GameDayPackage;
    const messages = buildInboxMessages(makeParams({ latestPackage: loss }));
    const gameday = messages.find((message) => message.id === 'gameday-gd-loss');
    expect(gameday!.type).toBe('URGENT');
    expect(gameday!.actionRequired).toBe(true);
    expect(gameday!.link).toBe('/presentation');
  });
});
