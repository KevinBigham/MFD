import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PowerRanking } from '@mfd/engine';

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectPowerRankings: (state: typeof mockState) => state.rankings,
  selectUserTeamId: (state: typeof mockState) => state.userTeamId,
}));

const mockState: { rankings: PowerRanking[]; userTeamId: string | null } = {
  rankings: [],
  userTeamId: 'team-me',
};

import { PowerRankingsTicker } from './PowerRankingsTicker';

function makeRanking(overrides: Partial<PowerRanking> = {}): PowerRanking {
  return {
    rank: 1,
    teamId: 'team-1',
    teamName: 'Alpha',
    score: 92.4,
    previousRank: 3,
    delta: 2,
    blurb: 'Elite on both sides.',
    record: '4-0',
    ...overrides,
  };
}

describe('PowerRankingsTicker', () => {
  it('renders an empty-state note when rankings are empty', () => {
    mockState.rankings = [];
    const html = renderToStaticMarkup(<PowerRankingsTicker />);
    expect(html).toContain('Rankings populate after the first regular-season week.');
  });

  it('renders a header with the count of visible entries vs total', () => {
    mockState.rankings = [
      makeRanking({ rank: 1, teamId: 'team-1', teamName: 'Alpha' }),
      makeRanking({ rank: 2, teamId: 'team-2', teamName: 'Beta' }),
      makeRanking({ rank: 3, teamId: 'team-3', teamName: 'Gamma' }),
    ];
    const html = renderToStaticMarkup(<PowerRankingsTicker limit={2} />);
    expect(html).toContain('POWER RANKINGS');
    expect(html).toContain('2 of 3');
  });

  it('renders one tile per entry with rank badge, team name, record, and score', () => {
    mockState.rankings = [
      makeRanking({ rank: 1, teamId: 'team-1', teamName: 'Alpha', record: '4-0', score: 92.4 }),
    ];
    const html = renderToStaticMarkup(<PowerRankingsTicker />);
    expect(html).toContain('#1');
    expect(html).toContain('ALPHA');
    expect(html).toContain('4-0');
    expect(html).toContain('92.4');
  });

  it('shows UP delta for positive movers', () => {
    mockState.rankings = [makeRanking({ delta: 3 })];
    const html = renderToStaticMarkup(<PowerRankingsTicker />);
    expect(html).toContain('+3');
  });

  it('shows DOWN delta for negative movers', () => {
    mockState.rankings = [makeRanking({ delta: -4 })];
    const html = renderToStaticMarkup(<PowerRankingsTicker />);
    expect(html).toContain('-4');
  });

  it('shows an em-dash for even deltas', () => {
    mockState.rankings = [makeRanking({ delta: 0 })];
    const html = renderToStaticMarkup(<PowerRankingsTicker />);
    expect(html).toContain('—');
  });

  it('highlights the user team regardless of rank', () => {
    mockState.rankings = [
      makeRanking({ rank: 1, teamId: 'team-1', teamName: 'Alpha' }),
      makeRanking({ rank: 8, teamId: 'team-me', teamName: 'Mine' }),
    ];
    const html = renderToStaticMarkup(<PowerRankingsTicker />);
    expect(html).toContain('MINE');
    expect(html).toContain('var(--mfd-cyan)');
  });

  it('applies gold border for the top-5 tiles', () => {
    mockState.rankings = [makeRanking({ rank: 1 })];
    const html = renderToStaticMarkup(<PowerRankingsTicker />);
    expect(html).toContain('var(--mfd-gold)');
  });

  it('applies red border for the bottom-5 tiles', () => {
    mockState.rankings = [
      makeRanking({ rank: 1, teamId: 'team-1', teamName: 'Alpha' }),
      makeRanking({ rank: 2, teamId: 'team-2', teamName: 'Beta' }),
      makeRanking({ rank: 3, teamId: 'team-3', teamName: 'Gamma' }),
      makeRanking({ rank: 4, teamId: 'team-4', teamName: 'Delta' }),
      makeRanking({ rank: 5, teamId: 'team-5', teamName: 'Epsi' }),
      makeRanking({ rank: 6, teamId: 'team-6', teamName: 'Zeta' }),
      makeRanking({ rank: 7, teamId: 'team-7', teamName: 'Eta' }),
    ];
    const html = renderToStaticMarkup(<PowerRankingsTicker />);
    expect(html).toContain('ETA');
    // tile role=button means clickable decoration
    expect(html).toContain('var(--mfd-red)');
  });

  it('wires role=button when clickable is true (default)', () => {
    mockState.rankings = [makeRanking()];
    const html = renderToStaticMarkup(<PowerRankingsTicker />);
    expect(html).toContain('role="button"');
  });

  it('skips role=button when clickable is false', () => {
    mockState.rankings = [makeRanking()];
    const html = renderToStaticMarkup(<PowerRankingsTicker clickable={false} />);
    expect(html).not.toContain('role="button"');
  });

  it('truncates to the limit prop', () => {
    mockState.rankings = Array.from({ length: 10 }, (_unused, index) =>
      makeRanking({ rank: index + 1, teamId: `t${index + 1}`, teamName: `Team${index + 1}` }),
    );
    const html = renderToStaticMarkup(<PowerRankingsTicker limit={3} />);
    expect(html).toContain('TEAM1');
    expect(html).toContain('TEAM2');
    expect(html).toContain('TEAM3');
    expect(html).not.toContain('TEAM4');
  });
});
