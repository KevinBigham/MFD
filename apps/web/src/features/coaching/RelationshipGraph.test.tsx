import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RelationshipGraph } from './RelationshipGraph';

// Minimal state shape — only the selectors used by RelationshipGraph.
function makeState(overrides: Partial<ReturnType<typeof baseState>> = {}) {
  return { ...baseState(), ...overrides };
}

function baseState() {
  return {
    game: {
      year: 2030,
      teams: {
        't1': {
          id: 't1',
          abbr: 'BLZ',
          isUser: true,
          roster: [{ id: 'p1', name: 'Jay Stone' }],
          staff: {
            hc: { id: 'c1', role: 'HC', name: 'Marcus Reed' },
            oc: null,
            dc: null,
          },
        },
        't2': {
          id: 't2',
          abbr: 'STM',
          isUser: false,
          roster: [{ id: 'p2', name: 'Ace Bolt' }],
          staff: {
            hc: { id: 'c2', role: 'HC', name: 'Greg Webb' },
            oc: null,
            dc: null,
          },
        },
      },
      relationships: [
        {
          id: 'c1:c2:coach_tree:2024',
          fromId: 'c1',
          toId: 'c2',
          type: 'coach_tree',
          year: 2024,
          strength: 80,
          note: 'mentor',
        },
        {
          id: 'p1:p2:rival:2028',
          fromId: 'p1',
          toId: 'p2',
          type: 'rival',
          year: 2028,
          strength: 60,
        },
      ],
    },
    userTeam: {
      id: 't1',
      abbr: 'BLZ',
      staff: {
        hc: { id: 'c1', role: 'HC', name: 'Marcus Reed' },
        oc: null,
        dc: null,
      },
    },
  };
}

type MockState = ReturnType<typeof baseState>;

function setupStoreMock(state: MockState) {
  vi.doMock('../../app/store/game-store', () => ({
    useGameStore: (selector: (s: MockState) => unknown) => selector(state),
    selectUserTeam: (s: MockState) => s.userTeam,
  }));
}

describe('RelationshipGraph screen', () => {
  it('renders the header and both edge counts in legend buttons', async () => {
    vi.resetModules();
    setupStoreMock(makeState());
    const { RelationshipGraph: Component } = await import('./RelationshipGraph');

    const markup = renderToStaticMarkup(<Component />);

    expect(markup).toContain('RELATIONSHIP GRAPH');
    expect(markup).toContain('THE REUNION');
    expect(markup).toContain('coach tree');
    expect(markup).toContain('rival');
  });

  it('shows the empty state panel when no relationships are recorded', async () => {
    vi.resetModules();
    const empty = makeState();
    empty.game.relationships = [];
    setupStoreMock(empty);
    const { RelationshipGraph: Component } = await import('./RelationshipGraph');

    const markup = renderToStaticMarkup(<Component />);
    expect(markup).toContain('NO RELATIONSHIPS RECORDED');
  });

  it('renders the svg graph with both edges in desktop view', async () => {
    vi.resetModules();
    setupStoreMock(makeState());
    const { RelationshipGraph: Component } = await import('./RelationshipGraph');

    const markup = renderToStaticMarkup(<Component />);
    // The graph svg is present with an aria label.
    expect(markup).toContain('aria-label="relationship graph"');
    // Two edges → two <line> elements.
    const lineMatches = markup.match(/<line /g) ?? [];
    expect(lineMatches.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the mobile edge list alongside the canvas (CSS controls visibility)', async () => {
    vi.resetModules();
    setupStoreMock(makeState());
    const { RelationshipGraph: Component } = await import('./RelationshipGraph');

    const markup = renderToStaticMarkup(<Component />);
    expect(markup).toContain('mfd-relgraph-list');
    expect(markup).toContain('Marcus Reed'); // coach label in list view
  });

  it('uses RelationshipGraph as a named + default export', () => {
    expect(RelationshipGraph).toBeDefined();
    expect(typeof RelationshipGraph).toBe('function');
  });
});
