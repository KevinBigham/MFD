import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScenarioSelect } from './ScenarioSelect';

let baseState: { scenarioState: any | null; availableScenarios: any[]; actions: any } = {
  scenarioState: null,
  availableScenarios: [
    { id: 'rebuild', name: 'The Rebuild', tagline: 'Inherited a dumpster fire. Now light it up.', description: 'Fix the mess.', difficulty: 'pro', seasonLimit: 3, objectives: [{ id: 'o1', description: 'Win 10 games', completed: false }], bonusObjectives: [], constraints: {} },
    { id: 'cap_hell', name: 'Cap Hell', tagline: '$45M over. No picks. Aging stars. Good luck.', description: 'Escape the cap crunch.', difficulty: 'all_pro', seasonLimit: 2, objectives: [{ id: 'o2', description: 'Get under the cap', completed: false }], bonusObjectives: [], constraints: {} },
    { id: 'dynasty_or_bust', name: 'Dynasty or Bust', tagline: 'Back-to-back or bust.', description: 'Keep the window open.', difficulty: 'rookie', seasonLimit: 2, objectives: [{ id: 'o3', description: 'Win another title', completed: false }], bonusObjectives: [], constraints: {} },
    { id: 'expansion', name: 'The Expansion', tagline: 'Build from nothing.', description: 'Start fresh.', difficulty: 'all_pro', seasonLimit: 4, objectives: [{ id: 'o4', description: 'Win 8 games', completed: false }], bonusObjectives: [], constraints: {} },
    { id: 'the_savant', name: 'The Savant', tagline: 'Draft only.', description: 'No trades. No free agents.', difficulty: 'hall_of_fame', seasonLimit: 5, objectives: [{ id: 'o5', description: 'Win a championship', completed: false }], bonusObjectives: [], constraints: { blockTrades: true, blockFreeAgency: true } },
  ],
  actions: {
    startScenarioChallenge: () => Promise.resolve(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof baseState) => unknown) => selector(baseState),
  selectAvailableScenarios: (state: typeof baseState) => state.availableScenarios,
  selectScenarioState: (state: typeof baseState) => state.scenarioState,
}));

describe('ScenarioSelect', () => {
  it('renders scenario cards with source-backed constraint badges', () => {
    const markup = renderToStaticMarkup(<ScenarioSelect />);

    expect(markup).toContain('SCENARIO CHALLENGES');
    expect(markup).toContain('SCENARIO SOURCES');
    expect(markup).toContain('getAvailableScenarios()');
    expect(markup).toContain('getScenarioConstraintCoverage');
    expect(markup).toContain('actions.startScenarioChallenge');
    expect(markup).toContain('createSeedGameState');
    expect(markup).toContain('startScenario');
    expect(markup).toContain('commitGame');
    expect(markup).toContain('Opening /scenarios does not start or grade challenges');
    expect(markup).toContain('replace the dynasty');
    expect(markup).toContain('THE REBUILD');
    expect(markup).toContain('CAP HELL');
    expect(markup).toContain('HALL_OF_FAME');
    expect(markup).toContain('TRADE ACTIONS');
    expect(markup).toContain('OFFSEASON FREE AGENCY');
    expect(markup).toContain('Start Challenge');
  });

  it('renders the active scenario progress view', () => {
    baseState = {
      ...baseState,
      scenarioState: {
        activeScenario: {
          id: 'the_savant',
          name: 'The Savant',
          tagline: 'Draft only.',
          description: 'No trades. No free agents.',
          difficulty: 'hall_of_fame',
          seasonLimit: 5,
          objectives: [{ id: 'o5', description: 'Win a championship', completed: false }],
          bonusObjectives: [{ id: 'b5', description: 'Build an 85+ OVR roster', completed: true }],
          constraints: { blockTrades: true, blockFreeAgency: true, blockDraft: true },
        },
        scenarioSeason: 2,
        completedScenarios: [{ id: 'rebuild', score: 88, grade: 'A' }],
      },
    };

    const markup = renderToStaticMarkup(<ScenarioSelect />);

    expect(markup).toContain('TRADE ACTIONS');
    expect(markup).toContain('OFFSEASON FREE AGENCY');
    expect(markup).toContain('USER DRAFT PICKS');
    expect(markup).toContain('CURRENTLY ENFORCED');
    expect(markup).toContain('Trade-market, direct, deadline, and draft war-room trade paths are blocked today.');
    expect(markup).toContain('Enforced: Generated trade-market offers // Accepted Trade Center market offers // Direct proposals and counters // Accepted Trade Deadline user offers // Draft war-room trades');
    expect(markup).toContain('Still open: Team-needs reports // Trade-block scouting // Depth chart and cap planning // Draft board review without trade accepts');
    expect(markup).toContain('Offseason bids, street free-agent signings, waiver claims, and practice-squad acquisitions are blocked today.');
    expect(markup).toContain('Enforced: Submit free-agent bids // Sign street free agents // Waiver claims // Practice-squad acquisitions');
    expect(markup).toContain('Still open: FA target-board refresh and watchlist // Team-needs reports // Waiver and practice-squad review without acquisition // Internal development planning');
    expect(markup).toContain('User draft-pick submissions are blocked today.');
    expect(markup).toContain('Enforced: User draft picks');
    expect(markup).toContain('Still open: Scouting reports // Draft board rankings // War-room review without Make Pick // Team-needs planning');
    expect(markup).toContain('BLOCKED ACTION GUIDE');
    expect(markup).toContain('ATTEMPT STAYS UNCOMMITTED');
    expect(markup).toContain('Blocked trade attempts leave rosters, picks, cap, deadline boards, and draft war-room offers unchanged.');
    expect(markup).toContain('Blocked acquisition attempts leave bids, waiver claims, practice-squad adds, free agents, roster spots, and cap totals unchanged.');
    expect(markup).toContain('Blocked draft-pick attempts leave the draft board, roster, picks, and prospect pool unchanged.');
    expect(markup).toContain('Next move: Use your current roster, depth chart, draft board, internal development, and cap tools until the scenario ends.');
    expect(markup).not.toContain('TRADES BLOCKED');
    expect(markup).not.toContain('FA BLOCKED');
    expect(markup).toContain('SEASON 2 / 5');
    expect(markup).toContain('DONE');
  });

  it('renders the completed scenarios section', () => {
    const markup = renderToStaticMarkup(<ScenarioSelect />);

    expect(markup).toContain('COMPLETED SCENARIOS');
    expect(markup).toContain('rebuild');
    expect(markup).toContain('88');
  });
});
