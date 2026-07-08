import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';

const mockRoster = [
  {
    id: 'p1',
    name: 'Pat Mahomes',
    pos: 'QB',
    ovr: 92,
    pot: 95,
    age: 28,
    morale: 80,
    chemistry: 75,
    systemFit: 85,
    devTrait: 'superstar',
    yearsExp: 7,
    isStarter: true,
    tradeBlock: false,
    injury: null,
    contract: { years: 3, totalValue: 45, guaranteed: 30, salaries: [15, 15, 15], bonuses: [5, 5, 5] },
  },
  {
    id: 'p2',
    name: 'Travis Kelce',
    pos: 'TE',
    ovr: 88,
    pot: 82,
    age: 34,
    morale: 85,
    chemistry: 90,
    systemFit: 80,
    devTrait: 'star',
    yearsExp: 12,
    isStarter: true,
    tradeBlock: false,
    injury: null,
    contract: { years: 2, totalValue: 20, guaranteed: 12, salaries: [10, 10], bonuses: [2, 2] },
  },
];

const mockState = {
  game: {
    week: 6,
    year: 2026,
    teams: {
      'team-1': {
        id: 'team-1',
        city: 'Kansas City',
        name: 'Chiefs',
        abbr: 'KC',
        wins: 4,
        losses: 2,
        ownerId: 'owner-1',
        capSpace: 18.5,
        roster: mockRoster,
        staff: { hc: { ratings: { development: 80 } } },
        owner: null,
        fatigueState: {},
        practiceSquad: [],
        mentoringPairs: [],
        trainingAssignments: {},
      },
    },
    userTeamId: 'team-1',
    freeAgents: [],
    waiverWire: [],
    players: { p1: mockRoster[0], p2: mockRoster[1] },
  },
  actions: {
    activateFromIR: vi.fn(),
    addToPracticeSquad: vi.fn(),
    assignTraining: vi.fn(),
    cutPlayer: vi.fn(),
    elevatePracticeSquadPlayer: vi.fn(),
    placeOnIR: vi.fn(),
    removeFromPracticeSquad: vi.fn(),
    restructure: vi.fn(),
    submitWaiverClaim: vi.fn(),
    toggleTradeBlock: vi.fn(),
  },
  rosterLimit: 50,
  practiceSquadLimit: 10,
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectRoster: (state: typeof mockState) => state.game.teams['team-1'].roster,
  selectRosterLimit: (state: typeof mockState) => state.rosterLimit,
  selectPracticeSquad: (state: typeof mockState) => state.game.teams['team-1'].practiceSquad,
  selectPracticeSquadLimit: (state: typeof mockState) => state.practiceSquadLimit,
  selectFreeAgentPlayers: () => [],
  selectUserTeam: (state: typeof mockState) => state.game.teams['team-1'],
  selectUserTeamId: (state: typeof mockState) => state.game.userTeamId,
  selectFatigueReport: () => [],
  selectWaiverWirePlayers: () => [],
  selectTrainingAssignments: (state: typeof mockState) => state.game.teams['team-1'].trainingAssignments,
}));

vi.mock('@mfd/engine', () => ({
  buildCutAdvisor: () => ({
    overBy: 1,
    suggestions: [{ id: 'p2', name: 'Travis Kelce', pos: 'TE', ovr: 88, age: 34, salary: 10, deadMoney: 6, reason: 'Aging non-starter' }],
  }),
  calcCapHit: (contract: { totalValue: number; years: number }) => contract.totalValue / contract.years,
  calcDeadMoney: () => 6,
  calculateTrainingXP: () => ({ totalXp: 2.5 }),
  getPlayerComparables: () => [],
  getPlayerProjection: (player: { ovr: number; age: number }) => ({
    nextYearOvr: player.ovr,
    peakOvr: player.ovr,
    peakAge: player.age,
    retirementAge: player.age + 5,
  }),
}));

import {
  buildRosterActionReceipt,
  buildRosterCutForecast,
  buildTrainingAssignmentReceipt,
  RosterActionReceiptPanel,
  RosterManagement,
  TrainingAssignmentReceiptPanel,
} from './RosterManagement';

describe('RosterManagement', () => {
  const source = readFileSync(new URL('./RosterManagement.tsx', import.meta.url), 'utf-8');

  it('renders screen header with Roster Management title', () => {
    const markup = renderToStaticMarkup(<RosterManagement />);

    expect(markup).toContain('ROSTER MANAGEMENT');
    expect(markup).toContain('Kansas City Chiefs');
  });

  it('renders roster metrics and player data', () => {
    const markup = renderToStaticMarkup(<RosterManagement />);

    expect(markup).toContain('NEXT CALL');
    expect(markup).toContain('Find the missing starters');
    expect(markup).toContain('Avg OVR');
    expect(markup).toContain('Starters');
    expect(markup).toContain('Roster Size');
    expect(markup).toContain('Pat Mahomes');
    expect(markup).toContain('Travis Kelce');
  });

  it('renders active roster and practice squad limits from store selectors', () => {
    const markup = renderToStaticMarkup(<RosterManagement />);

    expect(markup).toContain('2/50');
    expect(markup).toContain('2/50 active');
    expect(markup).toContain('IR players do not count against the 50-man cap');
    expect(markup).toContain('PRACTICE SQUAD (0/10)');
  });

  it('labels roster source and commit boundaries without implying render-time writes', () => {
    const markup = renderToStaticMarkup(<RosterManagement />);

    expect(markup).toContain('ROSTER SOURCES');
    expect(markup).toContain('selectRoster and selectRosterLimit');
    expect(markup).toContain('selectTrainingAssignments and selectFatigueReport');
    expect(markup).toContain('buildRosterCutForecast');
    expect(markup).toContain('buildCutAdvisor(roster, rosterLimit)');
    expect(markup).toContain('selectPracticeSquad, selectPracticeSquadLimit, selectFreeAgentPlayers, and selectWaiverWirePlayers');
    expect(markup).toContain('Waiver claim, practice-squad add, elevation, release, IR, restructure, and trade-block buttons are explicit store commits.');
    expect(markup).toContain('Opening /roster');
    expect(markup).toContain('does not write roster entries');
    expect(markup).toContain('game results or saved outcomes, or player movement.');
  });

  it('uses explicit manage controls instead of clickable table rows', () => {
    const markup = renderToStaticMarkup(<RosterManagement />);

    expect(markup).toContain('Manage');
    expect(source).not.toContain('onRowClick={(row) => setSelectedPlayer(row)}');
    expect(source).toContain("aria-label={`Manage ${row.original.name}`}");
  });

  it('builds a roster-cut forecast from dead money and advisor context', () => {
    const forecast = buildRosterCutForecast(mockRoster[1] as never, {
      activeRosterCount: 50,
      rosterLimit: 50,
      advisorReason: 'Aging non-starter',
    });

    expect(forecast?.statusLabel).toBe('Cap relief');
    expect(forecast?.deadMoney).toBe(6);
    expect(forecast?.capDelta).toBe(4);
    expect(forecast?.activeRosterAfter).toBe(49);
    expect(forecast?.advisorLabel).toContain('Aging non-starter');
    expect(forecast?.immediateImpact).toContain('waivers');
    expect(forecast?.source).toContain('buildCutAdvisor');
  });

  it('builds a route-local training assignment receipt from existing assignment inputs', () => {
    const receipt = buildTrainingAssignmentReceipt(mockRoster[0] as never, {
      focus: 'conditioning',
      previousAssignment: {
        playerId: 'p1',
        focus: 'film_study',
        weeksAssigned: 2,
        xpGained: 5,
        focusXp: {
          film_study: 5,
          position_drills: 0,
          conditioning: 0,
          mentorship: 0,
          rest: 0,
        },
      },
      projectedXp: 2.5,
      mentorshipBonus: false,
    });

    expect(receipt).toEqual({
      playerName: 'Pat Mahomes',
      focusLabel: 'Conditioning',
      previousFocusLabel: 'Film Study',
      projectedXpLabel: '+2.5 XP/wk preview',
      mentorshipLine: 'No mentor pair bonus on this assignment.',
      commitPath: 'actions.assignTraining -> assignTraining',
      source: 'Saved team.trainingAssignments plus calculateTrainingXP preview; this confirmation appears here only.',
    });
  });

  it('renders the training assignment receipt source and commit boundary', () => {
    const receipt = buildTrainingAssignmentReceipt(mockRoster[0] as never, {
      focus: 'position_drills',
      previousAssignment: null,
      projectedXp: 2.5,
      mentorshipBonus: true,
    });
    const markup = renderToStaticMarkup(<TrainingAssignmentReceiptPanel receipt={receipt} />);

    expect(markup).toContain('TRAINING ASSIGNMENT RECEIPT');
    expect(markup).toContain('Pat Mahomes');
    expect(markup).toContain('Position Drills');
    expect(markup).toContain('Previous focus: Unassigned.');
    expect(markup).toContain('+2.5 XP/wk preview');
    expect(markup).toContain('Mentor pair bonus is active for this focus.');
    expect(markup).toContain('actions.assignTraining -&gt; assignTraining');
    expect(markup).toContain('this confirmation appears here only');
  });

  it('builds a route-local roster action receipt from existing selected-player commit context', () => {
    const forecast = buildRosterCutForecast(mockRoster[1] as never, {
      activeRosterCount: 50,
      rosterLimit: 50,
      advisorReason: 'Aging non-starter',
    });
    const receipt = buildRosterActionReceipt(mockRoster[1] as never, 'cut', forecast);

    expect(receipt).toEqual({
      playerName: 'Travis Kelce',
      actionLabel: 'Released to waivers',
      result: 'Travis Kelce was released through the existing roster cut path. Active count projects to 49; room delta was +$4M.',
      stateTouched: 'Roster, player map ownership, waiver wire, cap totals, transaction log, undo snapshot, and autosave through the existing cut action.',
      source: 'actions.cutPlayer -> cutPlayerToWaiversEngine -> commitGame',
      boundary: 'This confirmation does not move another player, process waivers, repair contracts, change cap formulas, save a separate confirmation log, play games, reroll saved outcomes, or alter save schema.',
      accent: 'red',
    });
  });

  it('renders roster action receipt source and no-extra-write copy', () => {
    const receipt = buildRosterActionReceipt(mockRoster[0] as never, 'trade_block_add');
    const markup = renderToStaticMarkup(<RosterActionReceiptPanel receipt={receipt} />);

    expect(markup).toContain('ROSTER ACTION RECEIPT');
    expect(markup).toContain('Pat Mahomes');
    expect(markup).toContain('Added to trade block');
    expect(markup).toContain('actions.toggleTradeBlock -&gt; commitGame');
    expect(markup).toContain('does not generate offers');
    expect(markup).toContain('save a separate confirmation log');
  });

  it('source-guards the selected-player cut forecast and waiver confirmation copy', () => {
    expect(source).toContain('Cut Forecast');
    expect(source).toContain('buildRosterCutForecast');
    expect(source).toContain('Player goes to waivers');
    expect(source).toContain('calcDeadMoney(confirmCut.contract)');
  });

  it('source-guards training assignment receipts after the existing commit path resolves', () => {
    expect(source).toContain('Training Assignment Receipt');
    expect(source).toContain('await assignTraining(teamId, player.id, nextFocus);');
    expect(source).toContain('onTrainingAssigned?.(buildTrainingAssignmentReceipt(player');
    expect(source).toContain('Saved team.trainingAssignments plus calculateTrainingXP preview');
  });

  it('source-guards roster action receipts after existing selected-player commits resolve', () => {
    expect(source).toContain('Roster Action Receipt');
    expect(source).toContain('await cutPlayer(teamId, confirmCut.id);');
    expect(source).toContain("setRosterActionReceipt(buildRosterActionReceipt(confirmCut, 'cut', forecast));");
    expect(source).toContain('await toggleTradeBlock(teamId, player.id);');
    expect(source).toContain("player.tradeBlock ? 'trade_block_remove' : 'trade_block_add'");
    expect(source).toContain('await restructure(teamId, player.id);');
    expect(source).toContain("buildRosterActionReceipt(player, 'restructure')");
    expect(source).toContain('await placeOnIR(teamId, player.id);');
    expect(source).toContain("buildRosterActionReceipt(player, 'place_ir')");
    expect(source).toContain('await activateFromIR(teamId, player.id);');
    expect(source).toContain("buildRosterActionReceipt(player, 'activate_ir')");
  });
});
