import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlumniMentorsScreen } from './AlumniMentorsScreen';

const roster = [
  {
    id: 'qb-1',
    firstName: 'Young',
    lastName: 'QB',
    name: 'Young QB',
    pos: 'QB',
    age: 23,
    ovr: 72,
    teamId: 'team-1',
    careerStats: {},
  },
];

const gameState = {
  year: 2031,
  teams: {
    'team-1': {
      id: 'team-1',
      name: 'Blaze',
      isUser: true,
      roster,
    },
  },
  playerArchive: [],
  awardsHistory: [],
  franchiseHistory: [],
  hallOfFame: [],
  records: {},
  activeMentors: [{
    playerId: 'mentor-qb',
    name: 'Retired QB',
    position: 'QB',
    peakOvr: 95,
    mentorRating: 4,
    specialty: 'technique',
    hiredYear: 2031,
    salary: 0.5,
  }],
  mentorBudget: 2,
  trainingCampResults: [],
};

const storeState = {
  game: gameState,
  roster,
  teamId: 'team-1',
  actions: {
    hireMentor: vi.fn(),
    fireMentor: vi.fn(),
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
  selectRoster: (state: typeof storeState) => state.roster,
  selectUserTeamId: (state: typeof storeState) => state.teamId,
}));

describe('AlumniMentorsScreen', () => {
  it('explains mentor receipt ownership without implying render-time progression', () => {
    const markup = renderToStaticMarkup(<AlumniMentorsScreen />);

    expect(markup).toContain('data-spotlight-target="chip.route.mentors.beat-1"');
    expect(markup).toContain('data-spotlight-target="chip.route.mentors.beat-2"');
    expect(markup).toContain('NETWORK SOURCE');
    expect(markup).toContain('Saved activeMentors');
    expect(markup).toContain('Team Ops receipt');
    expect(markup).toContain('Hire/Release commits');
    expect(markup).toContain('reads saved activeMentors and mentorBudget');
    expect(markup).toContain('calculateMentorEffects');
    expect(markup).toContain('does not run progression, update normal mentoring pairs, alter CPU teams, or rewrite training-camp receipts');
    expect(markup).toContain('Mentor Reach');
    expect(markup).toContain('1 active alumni mentor; $2.0M budget remaining.');
    expect(markup).toContain('Retired QB shares technique guidance with Young QB.');
    expect(markup).toContain('1 player');
  });
});
