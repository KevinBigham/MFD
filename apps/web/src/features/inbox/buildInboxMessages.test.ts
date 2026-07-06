import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { ApologyTourThread, GameDayPackage, OwnerPersonalityEvent, PlayoffMomentum, Team } from '@mfd/engine';
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
    ownerPersonalityInbox: [],
    tradeDeadlineWeek: 9,
    compPickLimit: 4,
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

describe('buildInboxMessages owner personality inbox', () => {
  it('projects saved owner personality events into actionable Ownership messages', () => {
    const ownerEvent = {
      archetypeId: 'patient_builder',
      label: 'Owner wants the room settled',
      desc: 'The owner is calm about the record, but wants the weekly plan cleaned up.',
      moodDelta: -2,
      moraleDelta: 1,
    } satisfies OwnerPersonalityEvent;

    const messages = buildInboxMessages(makeParams({ ownerPersonalityInbox: [ownerEvent] }));
    const ownerMessage = messages.find((message) => message.id.startsWith('owner-personality-'));

    expect(ownerMessage).toMatchObject({
      type: 'DECISION',
      title: 'Owner wants the room settled',
      from: 'Ownership',
      body: [
        'The owner is calm about the record, but wants the weekly plan cleaned up.',
        'Owner mood -2 // Locker room morale +1',
      ].join('\n'),
      read: false,
      actionRequired: true,
      link: '/owner',
      linkLabel: 'Open Owner Room',
    });
    expect(ownerMessage?.consequences).toEqual([
      { id: 'owner-mood-0', label: 'Owner Mood', delta: '-2', direction: 'negative' },
      { id: 'owner-morale-0', label: 'Locker Room Morale', delta: '+1', direction: 'positive' },
    ]);
  });
});

describe('buildInboxMessages weather advisories', () => {
  it('surfaces rain as a forecast-linked intel advisory', () => {
    const messages = buildInboxMessages(makeParams({ weather: 'rain' }));
    const advisory = messages.find((message) => message.id === 'weather-alert');

    expect(advisory).toMatchObject({
      type: 'INTEL',
      title: 'Weather Advisory: Rain favors ball control',
      body: expect.stringContaining('Passing quality will tighten'),
      link: '/league/weather',
      linkLabel: 'Open Forecast',
    });
  });

  it('keeps snow and wind in the urgent game-changing bucket', () => {
    const messages = buildInboxMessages(makeParams({ weather: 'snow' }));
    const advisory = messages.find((message) => message.id === 'weather-alert');

    expect(advisory).toMatchObject({
      type: 'URGENT',
      title: 'Weather Advisory: Snow changes the play sheet',
      body: expect.stringContaining('fumble risk rises'),
      link: '/league/weather',
      linkLabel: 'Open Forecast',
    });
  });

  it('does not generate an advisory for clear conditions', () => {
    const messages = buildInboxMessages(makeParams({ weather: 'clear' }));

    expect(messages.find((message) => message.id === 'weather-alert')).toBeUndefined();
  });
});

describe('buildInboxMessages playoff readiness guidance', () => {
  it('summarizes playoff score and sends the player to concrete pregame checks', () => {
    const messages = buildInboxMessages(makeParams({
      phase: 'playoffs',
      playoffMomentum: {
        teamId: 'afce1',
        momentum: 82,
        narrativeTag: 'hot_streak',
        winStreak: 3,
      } satisfies PlayoffMomentum,
    }));
    const playoff = messages.find((message) => message.id === 'playoff-momentum-12');

    expect(playoff).toMatchObject({
      type: 'INTEL',
      title: 'Playoff readiness update',
      body: [
        'Playoff score 82 with 3 straight wins after a hot streak run.',
        'Before the next playoff game, check Medical, Depth Chart, and Game Plan matchup calls.',
      ].join('\n'),
      from: 'Broadcast Prep',
      actionRequired: false,
    });
    expect(playoff?.body).not.toContain('narrative is active');
    expect(playoff?.body).not.toContain('Momentum sits');
    expect(playoff?.body).not.toContain('streak profile');
  });
});

describe('inbox generated-message boundary', () => {
  const inboxTriageSource = readFileSync(new URL('./InboxTriage.tsx', import.meta.url), 'utf8');
  const buildInboxMessagesSource = readFileSync(new URL('./buildInboxMessages.ts', import.meta.url), 'utf8');

  it('keeps message selection as local display state without durable read receipts', () => {
    expect(inboxTriageSource).toContain('const [selectedMsg, setSelectedMsg]');
    expect(inboxTriageSource).toContain('onClick={() => setSelectedMsg(msg)}');
    expect(inboxTriageSource).not.toContain('useGameStore.getState');
    expect(inboxTriageSource).not.toContain('.actions');
    expect(inboxTriageSource).not.toContain('localStorage');
    expect(inboxTriageSource).not.toContain('sessionStorage');
    expect(inboxTriageSource).toContain('ownerPersonalityInbox');
    expect(buildInboxMessagesSource).not.toContain('localStorage');
    expect(buildInboxMessagesSource).not.toContain('sessionStorage');
    expect(buildInboxMessagesSource).toContain('ownerPersonalityInbox');
    expect(buildInboxMessagesSource).not.toMatch(/narrative is active|Momentum sits|streak profile/i);
  });
});

describe('buildInboxMessages trade deadline guidance', () => {
  it('uses the configured deadline week for regular-season warning copy', () => {
    const messages = buildInboxMessages(makeParams({ week: 8, tradeDeadlineWeek: 9 }));
    const deadline = messages.find((message) => message.id === 'trade-deadline-8');

    expect(deadline).toMatchObject({
      type: 'DECISION',
      title: 'Trade Deadline Closing In',
      body: 'The trade deadline hits after Week 9. Push deals now if you need roster help.',
    });
  });

  it('marks the configured deadline week as urgent', () => {
    const messages = buildInboxMessages(makeParams({ week: 12, tradeDeadlineWeek: 12 }));
    const deadline = messages.find((message) => message.id === 'trade-deadline-12');

    expect(deadline).toMatchObject({
      type: 'URGENT',
      title: 'Trade Deadline Week',
      body: 'This is the last week to complete in-season trades before the market closes.',
    });
  });
});

describe('buildInboxMessages compensatory pick receipts', () => {
  it('includes the active comp-pick limit with saved award rows', () => {
    const messages = buildInboxMessages(makeParams({
      compPickLimit: 2,
      team: {
        id: 'afce1',
        city: 'Buffalo',
        name: 'Blizzards',
        abbr: 'BUF',
        draftPicks: [
          { year: 2027, round: 3, pick: 33, originalTeamId: 'afce1', currentTeamId: 'afce1', isCompPick: true },
          { year: 2027, round: 4, pick: 34, originalTeamId: 'afce1', currentTeamId: 'afce1', isCompPick: true },
        ],
        owner: { approval: 60 },
        capSpace: 25,
        fatigueState: {},
        facilityState: { facilities: [], budget: 0, maxFacilities: 5, upgradeCosts: {} },
      } as unknown as Team,
    }));
    const compPicks = messages.find((message) => message.id === 'comp-picks');

    expect(compPicks).toMatchObject({
      type: 'INTEL',
      title: 'Comp Picks Awarded',
      body: [
        'Round 3 compensation pick added to your board.',
        'Round 4 compensation pick added to your board.',
        'Active comp-pick limit: 2.',
      ].join('\n'),
    });
  });
});
