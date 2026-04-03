import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DraftRecap } from './DraftRecap';

const mockState = {
  userTeam: { id: 'team-1', city: 'Chicago', name: 'Blaze' },
  draftRecaps: [
    {
      year: 2031,
      teamId: 'team-1',
      classGrade: 'A',
      picks: [
        { playerId: 'p1', playerName: 'Jay Reed', teamId: 'team-1', position: 'WR', ovr: 82, round: 1, pick: 18, projectedPick: 10, valueDelta: 8, verdict: 'fair' },
        { playerId: 'p2', playerName: 'Drew Moss', teamId: 'team-1', position: 'LB', ovr: 84, round: 4, pick: 120, projectedPick: 40, valueDelta: 80, verdict: 'steal' },
      ],
      bestValue: { playerId: 'p2', playerName: 'Drew Moss', teamId: 'team-1', position: 'LB', ovr: 84, round: 4, pick: 120, projectedPick: 40, valueDelta: 80, verdict: 'steal' },
      biggestReach: { playerId: 'p1', playerName: 'Jay Reed', teamId: 'team-1', position: 'WR', ovr: 82, round: 1, pick: 18, projectedPick: 10, valueDelta: 8, verdict: 'fair' },
      steals: [{ playerId: 'p2', playerName: 'Drew Moss', teamId: 'team-1', position: 'LB', ovr: 84, round: 4, pick: 120, projectedPick: 40, valueDelta: 80, verdict: 'steal' }],
      leagueHighlights: [
        { playerId: 'top-1', playerName: 'Caleb Pike', teamId: 'team-2', position: 'QB', ovr: 85, round: 1, pick: 1, projectedPick: 1, valueDelta: 0, verdict: 'fair' },
      ],
    },
  ],
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectDraftRecaps: (state: typeof mockState) => state.draftRecaps,
}));

describe('DraftRecap', () => {
  it('renders the class grade, pick table, and league highlights', () => {
    const markup = renderToStaticMarkup(<DraftRecap />);

    expect(markup).toContain('DRAFT RECAP');
    expect(markup).toContain('CLASS GRADE');
    expect(markup).toContain('Drew Moss');
    expect(markup).toContain('STEAL');
    expect(markup).toContain('Caleb Pike');
  });
});
