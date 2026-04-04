import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ExpansionDraft } from './ExpansionDraft';

const baseState = () => ({
  expansionDraftState: {
    expansionTeam: { city: 'Portland', name: 'Wolves', abbr: 'PDX', conference: 'NFC', division: 'West' },
    protectedPlayers: {},
    availablePlayers: [],
    selectedPlayers: [],
    picksRemaining: 33,
    phase: 'protection',
  },
  userTeam: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    roster: [
      { id: 'p1', name: 'Cole Stone', pos: 'QB', ovr: 92, age: 28 },
      { id: 'p2', name: 'Mace Ford', pos: 'WR', ovr: 88, age: 26 },
    ],
  },
  actions: {
    finalizeExpansionDraft: () => Promise.resolve(),
    protectExpansionPlayers: () => Promise.resolve(),
  },
});

let mockState = baseState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectExpansionDraftState: (state: typeof mockState) => state.expansionDraftState,
  selectUserTeam: (state: typeof mockState) => state.userTeam,
}));

describe('ExpansionDraft', () => {
  beforeEach(() => {
    mockState = baseState();
  });

  it('renders the empty state when no expansion draft exists', () => {
    mockState.expansionDraftState = null as never;
    const markup = renderToStaticMarkup(<ExpansionDraft />);
    expect(markup).toContain('No expansion draft is active');
  });

  it('shows the protection board during the protection phase', () => {
    const markup = renderToStaticMarkup(<ExpansionDraft />);
    expect(markup).toContain('PROTECTION BOARD');
    expect(markup).toContain('COLE STONE');
    expect(markup).toContain('Finalize Protection');
  });

  it('renders the expansion feed after the draft is complete', () => {
    mockState.expansionDraftState.phase = 'complete';
    mockState.expansionDraftState.selectedPlayers = [
      { id: 'p2', name: 'Mace Ford', pos: 'WR', ovr: 88, teamId: 'team-1' },
    ] as typeof mockState.expansionDraftState.selectedPlayers;
    const markup = renderToStaticMarkup(<ExpansionDraft />);
    expect(markup).toContain('EXPANSION FEED');
    expect(markup).toContain('MACE FORD');
  });

  it('shows the number of players lost in the summary panel', () => {
    mockState.expansionDraftState.phase = 'complete';
    mockState.expansionDraftState.selectedPlayers = [
      { id: 'p2', name: 'Mace Ford', pos: 'WR', ovr: 88, teamId: 'team-1' },
    ] as typeof mockState.expansionDraftState.selectedPlayers;
    const markup = renderToStaticMarkup(<ExpansionDraft />);
    expect(markup).toContain('Players Lost');
    expect(markup).toContain('Mace Ford');
  });

  it('renders the finalize control once protection is finished', () => {
    mockState.expansionDraftState.phase = 'complete';
    const markup = renderToStaticMarkup(<ExpansionDraft />);
    expect(markup).toContain('Finalize Expansion Draft');
  });
});
