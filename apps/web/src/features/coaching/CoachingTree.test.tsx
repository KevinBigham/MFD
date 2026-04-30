import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CoachingTree } from './CoachingTree';

const rootCoach = {
  id: 'root-hc',
  name: 'Dana Vale',
  role: 'HC',
  archetype: 'strategist',
  traits: ['calm_clock'],
  mentorCoachId: 'mentor-direct',
  disciples: ['disciple-one'],
  yearsUnderMentor: 4,
};

const directMentor = {
  id: 'mentor-direct',
  name: 'Mika Stone',
  role: 'HC',
  archetype: 'defensive_minded',
  traits: ['red_zone_wall'],
  mentorCoachId: 'mentor-indirect',
  disciples: ['root-hc'],
  yearsUnderMentor: 5,
};

const indirectMentor = {
  id: 'mentor-indirect',
  name: 'Alex North',
  role: 'HC',
  archetype: 'disciplinarian',
  traits: ['accountability'],
  mentorCoachId: null,
  disciples: ['mentor-direct'],
  yearsUnderMentor: 0,
};

const disciple = {
  id: 'disciple-one',
  name: 'River Cross',
  role: 'OC',
  archetype: 'offensive_minded',
  traits: ['motion_packages'],
  mentorCoachId: 'root-hc',
  disciples: [],
  yearsUnderMentor: 2,
};

const userTeam = {
  id: 'user',
  abbr: 'USR',
  staff: { hc: rootCoach, oc: null, dc: null },
};

const mockState = {
  game: {
    year: 2032,
    eventLog: [],
    coachingHistory: [],
    teams: {
      user: userTeam,
      north: { id: 'north', abbr: 'NTH', staff: { hc: directMentor, oc: null, dc: null } },
      summit: { id: 'summit', abbr: 'SUM', staff: { hc: indirectMentor, oc: null, dc: null } },
      metro: { id: 'metro', abbr: 'MET', staff: { hc: null, oc: disciple, dc: null } },
    },
  },
  userTeam,
};

vi.mock('@mfd/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mfd/engine')>();
  return {
    ...actual,
    buildCoachingLegacy: () => ({
      treeDepth: 3,
      headCoachesProduced: 1,
      coordinatorsPlaced: 1,
      retiredWithEpilogue: 0,
      notableProteges: [disciple],
    }),
  };
});

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.userTeam,
}));

describe('CoachingTree', () => {
  it('renders archetype glyphs next to each coach card', () => {
    const markup = renderToStaticMarkup(<CoachingTree />);

    expect(markup.match(/data-coach-archetype-glyph=/g)).toHaveLength(4);
  });

  it('renders SVG connection lines between linked coaches', () => {
    const markup = renderToStaticMarkup(<CoachingTree />);

    expect(markup).toContain('data-coaching-tree-connection-lines="true"');
    expect(markup).toContain('data-coaching-tree-line="true"');
  });

  it('uses gold stroke for direct mentor relationships', () => {
    const markup = renderToStaticMarkup(<CoachingTree />);

    expect(markup).toContain('data-line-kind="direct-mentor"');
    expect(markup).toContain('stroke="var(--mfd-gold)"');
  });

  it('uses dashed connection lines for indirect relationships', () => {
    const markup = renderToStaticMarkup(<CoachingTree />);

    expect(markup).toContain('data-line-kind="indirect-mentor"');
    expect(markup).toContain('stroke-dasharray="5 5"');
  });

  it('preserves the existing coaching-tree behavior surface', () => {
    const markup = renderToStaticMarkup(<CoachingTree />);

    expect(markup).toContain('COACHING TREE');
    expect(markup).toContain('TREE DEPTH');
    expect(markup).toContain('DANA VALE');
    expect(markup).toContain('MIKA STONE');
    expect(markup).toContain('RIVER CROSS');
  });
});
