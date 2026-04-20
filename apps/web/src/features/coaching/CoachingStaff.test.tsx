import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CoachingStaff } from './CoachingStaff';

const mockState = {
  coachingStaff: {
    hc: {
      id: 'hc-1',
      name: 'Marcus Reed',
      role: 'HC',
      archetype: 'Strategist',
      traits: [],
      ratings: { gameplan: 84, development: 79, motivation: 76, strategy: 82 },
      level: 5,
      term: 4,
      buyoutPenalty: 3,
      loyalty: 7,
      ambition: 4,
      schemeLean: { offense: 'spread', defense: 'cover_3' },
    },
    oc: null,
    dc: null,
  },
  clinic: {
    xp: { offense: 40, defense: 20 },
    perks: ['off1'],
  },
  coachingMarket: {
    hotSeat: false,
    candidates: {
      HC: [
        {
          id: 'cand-1',
          name: 'Victor Bishop',
          role: 'HC',
          desiredRole: 'HC',
          archetype: 'strategist',
          traits: [],
          ratings: { gameplan: 88, development: 82, motivation: 77, strategy: 85 },
          level: 5,
          fitScore: 89,
          continuityTag: 'ideal',
          reasoning: ['Victor Bishop grades 89/100 for Chicago.'],
          term: 4,
          buyoutPenalty: 3,
          loyalty: 7,
          ambition: 5,
          schemeLean: { offense: 'spread', defense: 'cover_3' },
        },
      ],
      OC: [],
      DC: [],
    },
  },
  userTeam: {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    wins: 9,
    losses: 3,
    ties: 0,
    schemeOff: 'spread',
    offScheme: 'spread',
    schemeDef: 'cover_3',
    defScheme: 'cover_3',
    roster: [
      { id: 'qb-1', name: 'Jay Stone', pos: 'QB', ovr: 86, isStarter: true, ratings: { awareness: 85 }, personality: { workEthic: 7, loyalty: 6, greed: 4, pressure: 7, ambition: 6 }, systemFit: 72 },
      { id: 'wr-1', name: 'Keenan Ward', pos: 'WR', ovr: 84, isStarter: true, ratings: { routeRunning: 85 }, personality: { workEthic: 7, loyalty: 6, greed: 4, pressure: 7, ambition: 6 }, systemFit: 70 },
      { id: 'cb-1', name: 'Ace Bolt', pos: 'CB', ovr: 82, isStarter: true, ratings: { zoneCoverage: 83 }, personality: { workEthic: 7, loyalty: 6, greed: 4, pressure: 7, ambition: 6 }, systemFit: 68 },
      { id: 'lb-1', name: 'Rex Dunn', pos: 'LB', ovr: 80, isStarter: true, ratings: { tackle: 82 }, personality: { workEthic: 7, loyalty: 6, greed: 4, pressure: 7, ambition: 6 }, systemFit: 67 },
    ],
    staff: {
      hc: {
        id: 'hc-1',
        name: 'Marcus Reed',
        role: 'HC',
        archetype: 'Strategist',
        traits: [],
        ratings: { gameplan: 84, development: 79, motivation: 76, strategy: 82 },
        level: 5,
        term: 4,
        buyoutPenalty: 3,
        loyalty: 7,
        ambition: 4,
        schemeLean: { offense: 'spread', defense: 'cover_3' },
      },
      oc: null,
      dc: null,
    },
    clinic: {
      xp: { offense: 40, defense: 20 },
      perks: ['off1'],
    },
    skillSelections: {},
  },
  actions: {
    addClinicXP: () => {},
    applyTeamSchemeChange: () => Promise.resolve(),
    fireStaff: () => Promise.resolve(),
    hireStaff: () => Promise.resolve(),
    promoteStaff: () => Promise.resolve(),
    refreshCoachingMarket: () => Promise.resolve(),
    setHeadCoachSkillSelection: () => Promise.resolve(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectCoachingStaff: (state: typeof mockState) => state.coachingStaff,
  selectClinic: (state: typeof mockState) => state.clinic,
  selectCoachingMarket: (state: typeof mockState) => state.coachingMarket,
  selectUserTeam: (state: typeof mockState) => state.userTeam,
}));

describe('CoachingStaff', () => {
  it('renders the coaching hub with market and development controls', () => {
    const markup = renderToStaticMarkup(<CoachingStaff />);

    expect(markup).toContain('COACHING');
    expect(markup).toContain('Refresh Market');
    expect(markup).toContain('Victor Bishop');
    expect(markup).toContain('STAFF MARKET');
    expect(markup).toContain('SCHEME LAB');
    expect(markup).toContain('DEVELOPMENT');
    expect(markup).toContain('Profile Tape');
    expect(markup).toContain('creating leverage. We got the leverage we wanted tonight.');
  });
});
