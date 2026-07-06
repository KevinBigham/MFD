import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  TeamNeeds,
  buildCpuIntentLedger,
  buildCpuStrategyHistory,
  classifyTeamNeedsIntent,
  filterTeamNeedsCompareOptions,
} from './TeamNeeds';

const mockState = {
  team: { id: 'user', city: 'Chicago', name: 'Blaze', isUser: true },
  teams: {
    user: { id: 'user', city: 'Chicago', name: 'Blaze', isUser: true },
    rival: {
      id: 'rival',
      city: 'Austin',
      name: 'Armadillos',
      isUser: false,
      philosophy: 'contend',
      gmStrategy: 'contend',
      capSpace: 14.5,
      roster: [
        { id: 'rival-vet', name: 'Austin Vet', ovr: 83, age: 31, tradeBlock: true },
        { id: 'rival-core', name: 'Austin Core', ovr: 87, age: 25, tradeBlock: false },
      ],
    },
  },
  report: {
    overall: 'Competitive with a few soft spots',
    criticalNeeds: ['CB', 'OL', 'WR'],
    strengths: ['QB', 'DL', 'LB'],
    draftTargets: ['CB', 'OL', 'WR'],
    faTargets: ['CB', 'WR'],
    capFlexibility: 'moderate',
    positionGrades: [
      { group: 'QB', grade: 'A', avgOvr: 88, starterOvr: 90, depth: 2, ageRisk: 'low', topPlayer: { id: 'qb-1', name: 'Jay Stone', ovr: 92 }, weakestStarter: { id: 'qb-1', name: 'Jay Stone', ovr: 92 } },
      { group: 'CB', grade: 'F', avgOvr: 67, starterOvr: 64, depth: 2, ageRisk: 'medium', topPlayer: { id: 'cb-1', name: 'Ty Knox', ovr: 70 }, weakestStarter: { id: 'cb-2', name: 'Nate Cole', ovr: 64 } },
    ],
  },
  cpuReport: {
    overall: 'Playoff-ready core',
    criticalNeeds: ['OL', 'CB'],
    strengths: ['QB', 'WR'],
    draftTargets: ['OL', 'CB'],
    faTargets: ['OL', 'CB'],
    capFlexibility: 'moderate',
    positionGrades: [
      { group: 'QB', grade: 'A', avgOvr: 89, starterOvr: 91, depth: 2, ageRisk: 'low', topPlayer: { id: 'rival-qb', name: 'Cole Hart', ovr: 91 }, weakestStarter: { id: 'rival-qb', name: 'Cole Hart', ovr: 91 } },
    ],
  },
  comparison: [
    { group: 'QB', teamAGrade: 'A', teamBGrade: 'B', edge: 'teamA', differential: 6 },
    { group: 'CB', teamAGrade: 'F', teamBGrade: 'C', edge: 'teamB', differential: -7 },
  ],
  eventLog: [
    {
      id: 'gm-strategy-rival-2028-0',
      type: 'gm_strategy_shift',
      timestamp: 2028004,
      description: 'Austin shifts from neutral to contend.',
      data: { teamId: 'rival', from: 'neutral', to: 'contend' },
    },
  ],
  leagueNews: [
    {
      id: 'team-philosophy-rival-2028',
      year: 2028,
      week: 1,
      type: 'trade',
      headline: 'AUS SIGNAL CONTEND',
      body: 'Austin is pushing chips in around a playoff window.',
      teamIds: ['rival'],
      playerIds: [],
      importance: 'major',
    },
  ],
  scenarioState: null as any | null,
  actions: {
    refreshTeamNeedsReport: () => Promise.resolve(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectScenarioState: (state: typeof mockState) => state.scenarioState,
  selectGameEventLog: (state: typeof mockState) => state.eventLog,
  selectLeagueNews: (state: typeof mockState) => state.leagueNews,
  selectTeams: (state: typeof mockState) => state.teams,
  selectTeamNeedsById: () => (state: typeof mockState) => state.cpuReport,
  selectUserTeam: (state: typeof mockState) => state.team,
  selectUserTeamNeeds: (state: typeof mockState) => state.report,
  selectTeamNeedsComparison: () => (state: typeof mockState) => state.comparison,
}));

describe('TeamNeeds', () => {
  it('renders the team needs dashboard with critical needs and strengths', () => {
    const markup = renderToStaticMarkup(<TeamNeeds />);

    expect(markup).toContain('TEAM NEEDS');
    expect(markup).toContain('CRITICAL NEEDS');
    expect(markup).toContain('CB');
    expect(markup).toContain('Jay Stone');
  });

  it('explains cache-aware guidance without implying roster movement', () => {
    const markup = renderToStaticMarkup(<TeamNeeds />);

    expect(markup).toContain('BOARD CONTROLS');
    expect(markup).toContain('Live board');
    expect(markup).toContain('Refreshable');
    expect(markup).toContain('Refresh Board');
    expect(markup).toContain('Refresh Compare');
    expect(markup).toContain('shows the current scouting report for roster rooms');
    expect(markup).toContain('rebuilds the report from the current roster');
    expect(markup).toContain('Bids, signings, draft picks, and roster moves still live on their commit screens');
  });

  it('renders selected CPU intent from saved strategy and needs sources without mutating AI state', () => {
    const markup = renderToStaticMarkup(<TeamNeeds />);

    expect(markup).toContain('CPU INTENT');
    expect(markup).toContain('Win-now buyer');
    expect(markup).toContain('Austin Armadillos');
    expect(markup).toContain('Philosophy');
    expect(markup).toContain('Contend');
    expect(markup).toContain('GM Strategy');
    expect(markup).toContain('$14.5M');
    expect(markup).toContain('moderate // needs OL / CB');
    expect(markup).toContain('Visible market board');
    expect(markup).toContain('INTENT LEDGER');
    expect(markup).toContain('Market Posture');
    expect(markup).toContain('Buying starters');
    expect(markup).toContain('Position Chase');
    expect(markup).toContain('First rooms a buyer would compare before offers');
    expect(markup).toContain('The visible trade board starts with Austin Vet');
    expect(markup).toContain('STRATEGY HISTORY');
    expect(markup).toContain('Front office wire');
    expect(markup).toContain('League desk');
    expect(markup).toContain('GM Strategy Shift');
    expect(markup).toContain('Neutral to Contend');
    expect(markup).toContain('Austin shifts from neutral to contend.');
    expect(markup).toContain('Philosophy Signal');
    expect(markup).toContain('AUS SIGNAL CONTEND');
    expect(markup).toContain('club posture, cap room, roster holes, and public trade-board smoke');
    expect(markup).toContain('Refresh Compare can rebuild the scouting board');
    expect(markup).toContain('does not invent new strategy beats, write news, generate offers');
  });

  it('builds a deterministic read-only CPU intent ledger from saved team and report fields', () => {
    const ledger = buildCpuIntentLedger({
      id: 'seller',
      city: 'Omaha',
      name: 'Owls',
      isUser: false,
      philosophy: 'fire_sale',
      gmStrategy: 'rebuild',
      capSpace: -3.2,
      roster: [
        { id: 'seller-low', name: 'Low Veteran', ovr: 76, age: 33, tradeBlock: true },
        { id: 'seller-high', name: 'High Veteran', ovr: 81, age: 30, tradeBlock: true },
      ],
    } as any, {
      ...mockState.cpuReport,
      capFlexibility: 'tight',
      criticalNeeds: ['QB', 'DL'],
    } as any);

    expect(ledger.map((row) => row.id)).toEqual(['market', 'strategy', 'cap', 'positions', 'tradeBlock']);
    expect(ledger.find((row) => row.id === 'market')).toMatchObject({
      value: 'Selling veterans',
      detail: 'Fire-sale posture points toward cap relief and future assets.',
      accent: 'red',
    });
    expect(ledger.find((row) => row.id === 'cap')).toMatchObject({
      value: '$-3.2M // tight',
      detail: 'Tight cap points planning toward draft picks or low-cost depth.',
    });
    expect(ledger.find((row) => row.id === 'positions')).toMatchObject({
      value: 'QB / DL',
      detail: 'Roster holes to protect picks, youth, and cap planning around.',
    });
    expect(ledger.find((row) => row.id === 'tradeBlock')).toMatchObject({
      value: '2 listed',
      detail: 'The visible trade board starts with High Veteran / Low Veteran.',
    });
  });

  it('classifies and filters comparison CPU intent from saved strategy and philosophy fields', () => {
    const options = [
      { value: 'buyer', intent: classifyTeamNeedsIntent({ philosophy: 'maintain', gmStrategy: 'contend' }) },
      { value: 'seller', intent: classifyTeamNeedsIntent({ philosophy: 'rebuild', gmStrategy: 'neutral' }) },
      { value: 'fire-sale', intent: classifyTeamNeedsIntent({ philosophy: 'fire_sale', gmStrategy: 'contend' }) },
      { value: 'neutral', intent: classifyTeamNeedsIntent({ philosophy: 'maintain', gmStrategy: 'neutral' }) },
    ];

    expect(options.map((option) => option.intent.id)).toEqual(['buyer', 'seller', 'seller', 'neutral']);
    expect(filterTeamNeedsCompareOptions(options, 'buyer').map((option) => option.value)).toEqual(['buyer']);
    expect(filterTeamNeedsCompareOptions(options, 'seller').map((option) => option.value)).toEqual(['seller', 'fire-sale']);
    expect(filterTeamNeedsCompareOptions(options, 'neutral').map((option) => option.value)).toEqual(['neutral']);
    expect(filterTeamNeedsCompareOptions(options, 'all').map((option) => option.value)).toEqual(['buyer', 'seller', 'fire-sale', 'neutral']);
  });

  it('builds deterministic CPU strategy history from saved event and news rows', () => {
    const rows = buildCpuStrategyHistory(
      mockState.teams.rival as any,
      mockState.eventLog as any,
      mockState.leagueNews as any,
    );

    expect(rows).toEqual([
      {
        id: 'event:gm-strategy-rival-2028-0',
        label: 'GM Strategy Shift',
        value: 'Neutral to Contend',
        detail: 'Front office wire: Austin shifts from neutral to contend.',
        source: 'game.eventLog',
        accent: 'gold',
      },
      {
        id: 'news:team-philosophy-rival-2028',
        label: 'Philosophy Signal',
        value: 'AUS SIGNAL CONTEND',
        detail: '2028 Week 1 // League desk: Austin is pushing chips in around a playoff window.',
        source: 'game.leagueNews',
        accent: 'gold',
      },
    ]);
  });

  it('renders comparison intent filters as read-only local controls', () => {
    const markup = renderToStaticMarkup(<TeamNeeds />);

    expect(markup).toContain('COMPARE ROOMS');
    expect(markup).toContain('Any Intent');
    expect(markup).toContain('Sellers');
    expect(markup).toContain('Buyers');
    expect(markup).toContain('Neutral');
    expect(markup).toContain('Showing 1 of 1 CPU clubs');
    expect(markup).toContain('ALL CPU INTENTS');
    expect(markup).toContain('Buyer');
    expect(markup).toContain('local scouting lens over club posture');
    expect(markup).toContain('Refresh Compare rebuilds that report before you decide whether to open a real offer path');
  });

  it('renders scenario planning limits without implying report movement', () => {
    try {
      mockState.scenarioState = {
        activeScenario: {
          id: 'savant',
          name: 'The Savant',
          constraints: { blockTrades: true, blockFreeAgency: true, blockDraft: true },
        },
      };

      const markup = renderToStaticMarkup(<TeamNeeds />);

      expect(markup).toContain('SCENARIO LOCK');
      expect(markup).toContain('The Savant');
      expect(markup).toContain('DRAFT PICKS LOCKED');
      expect(markup).toContain('ACQUISITIONS LOCKED');
      expect(markup).toContain('TRADES LOCKED');
      expect(markup).toContain('REPORT OPEN');
      expect(markup).toContain('Scenario rules are active');
      expect(markup).toContain('Team-needs scouting stays available for roster planning');
      expect(markup).toContain('Refreshing this board only rebuilds the report');
      expect(markup).toContain('SCENARIO LIMITS');
      expect(markup).toContain('COMPARE ROOMS');
    } finally {
      mockState.scenarioState = null;
    }
  });
});
