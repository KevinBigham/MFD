import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

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
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectRoster: (state: typeof mockState) => state.game.teams['team-1'].roster,
  selectPracticeSquad: (state: typeof mockState) => state.game.teams['team-1'].practiceSquad,
  selectFreeAgentPlayers: () => [],
  selectUserTeam: (state: typeof mockState) => state.game.teams['team-1'],
  selectUserTeamId: (state: typeof mockState) => state.game.userTeamId,
  selectFatigueReport: () => [],
  selectWaiverWirePlayers: () => [],
  selectTrainingAssignments: (state: typeof mockState) => state.game.teams['team-1'].trainingAssignments,
}));

vi.mock('@mfd/engine', () => ({
  calcCapHit: (contract: { totalValue: number; years: number }) => contract.totalValue / contract.years,
  calculateTrainingXP: () => ({ totalXp: 2.5 }),
}));

import { RosterManagement } from './RosterManagement';

describe('RosterManagement', () => {
  it('renders screen header with Roster Management title', () => {
    const markup = renderToStaticMarkup(<RosterManagement />);

    expect(markup).toContain('ROSTER MANAGEMENT');
    expect(markup).toContain('Kansas City Chiefs');
  });

  it('renders roster metrics and player data', () => {
    const markup = renderToStaticMarkup(<RosterManagement />);

    expect(markup).toContain('AVG OVR');
    expect(markup).toContain('STARTERS');
    expect(markup).toContain('ROSTER SIZE');
    expect(markup).toContain('Pat Mahomes');
    expect(markup).toContain('Travis Kelce');
  });
});
