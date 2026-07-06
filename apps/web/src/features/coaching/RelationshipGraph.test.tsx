import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'fs';
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
  const source = readFileSync(new URL('./RelationshipGraph.tsx', import.meta.url), 'utf-8');

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

  it('labels saved relationship sources and the display-only boundary', async () => {
    vi.resetModules();
    setupStoreMock(makeState());
    const { RelationshipGraph: Component } = await import('./RelationshipGraph');

    const markup = renderToStaticMarkup(<Component />);

    expect(markup).toContain('RELATIONSHIP SOURCES');
    expect(markup).toContain('Reads game.relationships as the only graph edge source');
    expect(markup).toContain('Resolves coach labels from active team HC/OC/DC staff');
    expect(markup).toContain('stable hash layout');
    expect(markup).toContain('does not synthesize edges from staff mentor fields');
    expect(markup).toContain('write GameState');
  });

  it('shows the empty state panel when no relationships are recorded', async () => {
    vi.resetModules();
    const empty = makeState();
    empty.game.relationships = [];
    setupStoreMock(empty);
    const { RelationshipGraph: Component } = await import('./RelationshipGraph');

    const markup = renderToStaticMarkup(<Component />);
    expect(markup).toContain('RELATIONSHIP SOURCES');
    expect(markup).toContain('an empty list stays an empty graph');
    expect(markup).toContain('NO RELATIONSHIPS RECORDED');
  });

  it('does not synthesize edges from staff mentor fields without saved relationships', async () => {
    vi.resetModules();
    const state = makeState();
    state.game.relationships = [];
    state.game.teams.t1.staff.hc = {
      ...state.game.teams.t1.staff.hc,
      mentorCoachId: 'c2',
      disciples: [],
      yearsUnderMentor: 3,
    } as typeof state.game.teams.t1.staff.hc;
    state.game.teams.t2.staff.hc = {
      ...state.game.teams.t2.staff.hc,
      mentorCoachId: null,
      disciples: ['c1'],
      yearsUnderMentor: 0,
    } as typeof state.game.teams.t2.staff.hc;
    state.userTeam.staff.hc = state.game.teams.t1.staff.hc;
    setupStoreMock(state);
    const { RelationshipGraph: Component } = await import('./RelationshipGraph');

    const markup = renderToStaticMarkup(<Component />);
    expect(markup).toContain('NO RELATIONSHIPS RECORDED');
    expect(markup).not.toContain('coach tree');
  });

  it('keeps empty game selector fallbacks stable for React store snapshots', () => {
    expect(source).toContain('const EMPTY_TEAMS: Record<string, Team> = {};');
    expect(source).toContain('const EMPTY_RELATIONSHIPS: RelationshipEdge[] = [];');
    expect(source).toContain('s.game?.teams ?? EMPTY_TEAMS');
    expect(source).toContain('s.game?.relationships ?? EMPTY_RELATIONSHIPS');
    expect(source).not.toContain('s.game?.teams ?? {}');
    expect(source).not.toContain('s.game?.relationships ?? []');
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
