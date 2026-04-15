import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlayerProfile } from './PlayerProfile';

const mockBundle = {
  profile: {
    player: {
      id: 'p-1',
      name: 'Jay Stone',
      pos: 'QB',
      age: 25,
      ovr: 91,
      devTrait: 'superstar',
      teamId: 'user',
      draftPick: 12,
      jerseyNumber: 12,
      bloodline: {
        parentPlayerId: 'legend-qb',
        parentName: 'Marcus Cole',
        parentTeamId: 'user',
        parentPosition: 'QB',
        relationship: 'son',
        legacyTag: 'franchise_royalty',
      },
      endorsements: [{ id: 'deal-1', playerId: 'p-1', brandName: 'Apex Athletics', revenuePerYear: 6, yearsTotal: 3, yearsRemaining: 2, tier: 'global', moraleBonus: 6, requirement: { type: 'min_ovr', value: 90 }, active: true }],
    },
    contractDetails: {
      yearByYear: [{ year: 2027, baseSalary: 18, capHit: 22, deadCap: 8 }],
      totalValue: 72,
      guaranteedRemaining: 38,
    },
    developmentArc: [{ age: 23, ovr: 84 }, { age: 24, ovr: 88 }, { age: 25, ovr: 91 }],
    careerStats: [{ season: 2026, team: 'Chicago Blaze', gamesPlayed: 17, gamesStarted: 17, keyStats: { passYds: 4800, passTD: 36 } }],
    personalityReport: {
      traits: ['captain'],
      agentStyle: 'old school',
      mediaPresence: 'high',
      lockerRoomImpact: 'positive',
    },
    awardsWon: ['2026 MVP'],
    mentorHistory: [{ mentorName: 'Rick Mason', bonus: 2 }],
    injuryHistory: [],
    legacyHistoryPartial: false,
  },
  value: { tradeValue: 94, marketValue: 23, surplus: 9 },
  comparables: [{ id: 'p-2', name: 'Cole Hart', ovr: 89, age: 26, pos: 'QB' }],
  projection: { nextYearOvr: 93, peakOvr: 95, peakAge: 28, retirementAge: 37 },
};

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ playerId: 'p-1' }),
  useNavigate: () => () => Promise.resolve(),
}));

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: any) => unknown) => selector({
    bundle: mockBundle,
    team: { id: 'user', city: 'Chicago', name: 'Blaze' },
    rivalries: [{ id: 'riv-1', playerAId: 'p-1', playerBId: 'p-3', playerAName: 'Jay Stone', playerBName: 'Duke Hayes', intensity: 64, tier: 'heated', origin: 'Week 3, 2027: Hayes baited Stone into two picks' }],
    farewellCandidates: [],
    farewellTours: [],
    actions: { startFarewellTour: () => Promise.resolve() },
  }),
  selectPlayerProfileBundle: () => (state: any) => state.bundle,
  selectTeamById: () => (state: any) => state.team,
  selectPlayerRivalries: () => (state: any) => state.rivalries,
  selectFarewellCandidates: (state: any) => state.farewellCandidates,
  selectFarewellTours: (state: any) => state.farewellTours,
}));

vi.mock('../../app/store/ui-store', () => ({
  useUiStore: (selector: (state: { setFocusedPlayerContext: () => void }) => unknown) => selector({
    setFocusedPlayerContext: () => undefined,
  }),
}));

describe('PlayerProfile', () => {
  it('renders the player header and projection details', () => {
    const markup = renderToStaticMarkup(<PlayerProfile />);

    expect(markup).toContain('JAY STONE');
    expect(markup).toContain('TRADE VALUE');
    expect(markup).toContain('2026 MVP');
    expect(markup).toContain('BLOODLINE');
    expect(markup).toContain('Son of Marcus Cole');
    expect(markup).toContain('Retirement Age');
    expect(markup).toContain('Open Endorsements');
    expect(markup).toContain('View Rivalries');
  });
});
