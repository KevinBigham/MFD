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
  it('renders scenario cards and difficulty badges', () => {
    const markup = renderToStaticMarkup(<ScenarioSelect />);

    expect(markup).toContain('SCENARIO CHALLENGES');
    expect(markup).toContain('THE REBUILD');
    expect(markup).toContain('CAP HELL');
    expect(markup).toContain('HALL_OF_FAME');
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
          constraints: { blockTrades: true, blockFreeAgency: true },
        },
        scenarioSeason: 2,
        completedScenarios: [{ id: 'rebuild', score: 88, grade: 'A' }],
      },
    };

    const markup = renderToStaticMarkup(<ScenarioSelect />);

    expect(markup).toContain('TRADES BLOCKED');
    expect(markup).toContain('FA BLOCKED');
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
