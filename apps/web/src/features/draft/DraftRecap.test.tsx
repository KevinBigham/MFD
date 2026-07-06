import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DraftRecap as DraftRecapRecord } from '@mfd/engine';
import { DraftRecap, buildDraftRecapFollowThrough } from './DraftRecap';

const mockDraftRecaps: DraftRecapRecord[] = [
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
];

const mockState = {
  userTeam: { id: 'team-1', city: 'Chicago', name: 'Blaze' },
  draftRecaps: mockDraftRecaps,
  teams: {
    'team-1': { id: 'team-1', city: 'Chicago', name: 'Blaze' },
    'team-2': { id: 'team-2', city: 'Austin', name: 'Armadillos' },
  },
  game: {
    players: {
      p1: { id: 'p1', name: 'Jay Reed', pos: 'WR', ovr: 86, age: 24, yearsExp: 2, teamId: 'team-2' },
      p2: { id: 'p2', name: 'Drew Moss', pos: 'LB', ovr: 90, age: 24, yearsExp: 2, teamId: 'team-1' },
    },
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectDraftRecaps: (state: typeof mockState) => state.draftRecaps,
  selectTeams: (state: typeof mockState) => state.teams,
}));

describe('DraftRecap', () => {
  it('renders the class grade, pick table, and league highlights', () => {
    const markup = renderToStaticMarkup(<DraftRecap />);

    expect(markup).toContain('DRAFT RECAP');
    expect(markup).toContain('CLASS GRADE');
    expect(markup).toContain('Drew Moss');
    expect(markup).toContain('STEAL');
    expect(markup).toContain('Caleb Pike');
    expect(markup).toContain('DRAFT RECAP SOURCES');
    expect(markup).toContain('selectDraftRecaps filters saved game.draftRecaps to the user team');
    expect(markup).toContain('Changing it only swaps which saved recap is displayed.');
    expect(markup).toContain('Recaps are generated upstream by finalizePostDraft during week advance');
    expect(markup).toContain('this route does not generate or repair recap rows');
    expect(markup).toContain('DraftPickRevealCard, class grades, best value, reaches, steals, league highlights, player profile links, and pick verdicts all read the selected saved recap.');
    expect(markup).toContain('Open Drew Moss draft recap profile');
    expect(markup).toContain('Open Jay Reed draft recap profile');
    expect(markup).toContain('Open Caleb Pike draft recap profile');
    expect(markup).toContain('CLASS FOLLOW-THROUGH');
    expect(markup).toContain('2031 class');
    expect(markup).toContain('game.players');
    expect(markup).toContain('selectTeams');
    expect(markup).toContain('Top pick');
    expect(markup).toContain('Best value');
    expect(markup).toContain('86 OVR');
    expect(markup).toContain('90 OVR');
    expect(markup).toContain('Austin Armadillos // WR // Age 24 // 2 years exp // +4 OVR since draft night.');
    expect(markup).toContain('Chicago Blaze // LB // Age 24 // 2 years exp // +6 OVR since draft night.');
    expect(markup).toContain('Open Jay Reed class follow-through profile');
    expect(markup).toContain('Open Drew Moss class follow-through profile');
    expect(markup).toContain('Source: saved recap picks plus current game.players and team map.');
    expect(markup).toContain('does not change recaps, player ratings');
    expect(markup).toContain('autosave, or game outcomes');
  });

  it('renders the recap source boundary in the empty state', () => {
    const originalRecaps = mockState.draftRecaps;
    mockState.draftRecaps = [];

    try {
      const markup = renderToStaticMarkup(<DraftRecap />);

      expect(markup).toContain('No draft recap is archived yet.');
      expect(markup).toContain('DRAFT RECAP SOURCES');
      expect(markup).toContain('0 classes');
      expect(markup).toContain('empty');
      expect(markup).toContain('this route does not generate or repair recap rows');
    } finally {
      mockState.draftRecaps = originalRecaps;
    }
  });

  it('labels saved recap picks without a current live player row without inferring history', () => {
    const followThrough = buildDraftRecapFollowThrough({
      recap: mockState.draftRecaps[0] ?? null,
      playersById: {},
      teams: null,
    });

    expect(followThrough?.rows[0]).toMatchObject({
      label: 'Top pick',
      playerId: 'p1',
      currentOvr: null,
      currentTeam: 'No live player row',
      accent: 'default',
    });
    expect(followThrough?.rows[0]?.detail).toContain('Current game.players has no live row');
    expect(followThrough?.rows[0]?.detail).toContain('does not infer a retirement, release, or history event');
  });
});
