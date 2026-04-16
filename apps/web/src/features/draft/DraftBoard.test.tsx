import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DraftBoard } from './DraftBoard';

const mockState = {
  phase: 'draft',
  userTeam: {
    id: 'user',
    draftPicks: [{ year: 2027, round: 1, pick: 1, originalTeamId: 'user', currentTeamId: 'user', isCompPick: false }],
  },
  needsReport: { criticalNeeds: ['WR'] },
  draftClass: [
    {
      id: 'prospect-1',
      firstName: 'Jalen',
      lastName: 'North',
      pos: 'WR',
      college: 'Texas',
      projectedRound: 1,
      scoutGrade: 81,
      bloodline: {
        parentPlayerId: 'legend-wr',
        parentName: 'Marcus North',
        parentTeamId: 'user',
        parentPosition: 'WR',
        relationship: 'son',
        legacyTag: 'famous_name',
      },
    },
  ],
  offseasonState: {
    draftOrder: [{ id: 'user-2027-1-1-user', teamId: 'user', round: 1, pick: 1, overall: 1, originalTeamId: 'user' }],
    scoutingState: {
      'prospect-1': {
        prospectId: 'prospect-1',
        actions: ['film', 'interview'],
        accuracy: 0.51,
        confidence: 51,
        visibleScoutGrade: 84,
        notes: [],
        proDayRating: null,
        assignedScoutId: 'scout-1',
        riskBand: 'balanced',
        ceilingBand: 'impact',
        characterRead: 'steady',
        privateWorkoutRatings: [],
      },
    },
  },
  currentEntry: { teamId: 'user', round: 1, pick: 1, overall: 1 },
  warRoomState: {
    draftGrade: 'B+',
    timeRemaining: 90,
    incomingOffers: [],
    userCanTradeUp: [],
  },
  actions: {
    acceptDraftTradeOffer: () => Promise.resolve(),
    advanceWeek: () => Promise.resolve(),
    makeDraftPick: () => Promise.resolve(),
    refreshWarRoom: () => Promise.resolve(),
    rejectDraftTradeOffer: () => Promise.resolve(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectCurrentDraftEntry: (state: typeof mockState) => state.currentEntry,
  selectDraftClass: (state: typeof mockState) => state.draftClass,
  selectOffseasonState: (state: typeof mockState) => state.offseasonState,
  selectPhase: (state: typeof mockState) => state.phase,
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectUserTeamNeeds: (state: typeof mockState) => state.needsReport,
  selectWarRoomState: (state: typeof mockState) => state.warRoomState,
}));

vi.mock('@mfd/engine', async () => {
  const actual = await vi.importActual<object>('@mfd/engine');
  return {
    ...actual,
    calcPickValue: () => 100,
  };
});

describe('DraftBoard', () => {
  it('renders scouting confidence and intel badges on the big board', () => {
    const markup = renderToStaticMarkup(<DraftBoard />);

    expect(markup).toContain('DRAFT BOARD');
    expect(markup).toContain('51%');
    expect(markup).toContain('Bloodline');
    expect(markup).toContain('balanced');
    expect(markup).toContain('steady');
  });
});
